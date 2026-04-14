###############################################################################
# realtime.tf
# API Gateway WebSocket API for video call signalling.
#
# Pusher handles in-app messaging and notifications (managed service, no infra).
# API Gateway WebSocket handles video call room signalling (Daily.co handshake).
#
# Flow:
#   1. User A clicks "Video call" → POST /api/calls/initiate
#   2. App Runner creates Daily.co room → returns roomId
#   3. User A connects to WebSocket → sends {type: "call-invite", roomId, toUserId}
#   4. Lambda forwards invite to User B's WebSocket connection
#   5. User B connects to Daily.co room with their own token
###############################################################################

# ─── API Gateway WebSocket API ────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "eclat-${var.environment}-websocket"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"
  description                = "WebSocket API for eclat video call signalling"

  tags = { Name = "eclat-${var.environment}-websocket-api" }
}

# ─── Lambda Authorizer ────────────────────────────────────────────────────────
# Validates the JWT token passed as a query parameter on WebSocket connect.
# WebSocket connections can't send Authorization headers, so JWT goes in ?token=

data "archive_file" "ws_authorizer" {
  type        = "zip"
  output_path = "${path.module}/lambda/ws_authorizer.zip"
  source {
    content  = file("${path.module}/lambda/ws_authorizer/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "ws_authorizer" {
  function_name    = "eclat-ws-authorizer-${var.environment}"
  description      = "Validates JWT token for WebSocket connection authentication"
  filename         = data.archive_file.ws_authorizer.output_path
  source_code_hash = data.archive_file.ws_authorizer.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      ENVIRONMENT = var.environment
      SECRET_ARN  = try(aws_secretsmanager_secret.nextauth_secret[0].arn, "")
    }
  }

  dynamic "vpc_config" {
    for_each = var.enable_vpc ? [1] : []
    content {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  tags = { Name = "eclat-${var.environment}-ws-authorizer" }
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.websocket.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.ws_authorizer.invoke_arn
  identity_sources = ["route.request.querystring.token"]
  name             = "jwt-authorizer"
}

# ─── WebSocket Message Router Lambda ─────────────────────────────────────────
# Routes WebSocket messages to the correct handler based on message type.

data "archive_file" "ws_router" {
  type        = "zip"
  output_path = "${path.module}/lambda/ws_router.zip"
  source {
    content  = file("${path.module}/lambda/ws_router/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "ws_router" {
  function_name    = "eclat-ws-router-${var.environment}"
  description      = "Routes WebSocket messages for video call signalling"
  filename         = data.archive_file.ws_router.output_path
  source_code_hash = data.archive_file.ws_router.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      WS_API_ID      = aws_apigatewayv2_api.websocket.id
      WS_STAGE       = var.environment
      AWS_REGION_VAR = var.aws_region
    }
  }

  dynamic "vpc_config" {
    for_each = var.enable_vpc ? [1] : []
    content {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  tags = { Name = "eclat-${var.environment}-ws-router" }
}

# Grant API Gateway permission to invoke the router Lambda
resource "aws_lambda_permission" "ws_router" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_router.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ws_authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/authorizers/*"
}

# ─── IAM for WebSocket → Lambda management API ────────────────────────────────
# ws_router needs permission to call apigatewayv2:PostToConnection

resource "aws_iam_role_policy" "lambda_websocket_post" {
  name = "eclat-${var.environment}-lambda-websocket-post"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["execute-api:ManageConnections"]
      Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/${var.environment}/POST/@connections/*"
    }]
  })
}

# ─── Routes ───────────────────────────────────────────────────────────────────

# $connect route — called when a client establishes WebSocket connection
resource "aws_apigatewayv2_route" "connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  route_key          = "$connect"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.ws_router.id}"
}

# $disconnect route — called when client disconnects
resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_router.id}"
}

# call-invite route — User A sending call invite to User B
resource "aws_apigatewayv2_route" "call_invite" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "call-invite"
  target    = "integrations/${aws_apigatewayv2_integration.ws_router.id}"
}

# call-answer route — User B accepting the call
resource "aws_apigatewayv2_route" "call_answer" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "call-answer"
  target    = "integrations/${aws_apigatewayv2_integration.ws_router.id}"
}

# call-end route — either user ending the call
resource "aws_apigatewayv2_route" "call_end" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "call-end"
  target    = "integrations/${aws_apigatewayv2_integration.ws_router.id}"
}

# ─── Lambda Integration ───────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "ws_router" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_router.invoke_arn
  integration_method = "POST"
}

# ─── Stage and Deployment ─────────────────────────────────────────────────────

# API Gateway account-level CloudWatch Logs role — required to enable logging on any stage
resource "aws_iam_role" "apigw_cloudwatch" {
  name = "eclat-${var.environment}-apigw-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apigw_cloudwatch" {
  role       = aws_iam_role.apigw_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.apigw_cloudwatch.arn

  depends_on = [aws_iam_role_policy_attachment.apigw_cloudwatch]
}

resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = var.environment
  auto_deploy = true

  default_route_settings {
    logging_level            = "INFO"
    data_trace_enabled       = var.environment != "prod" # Full trace in non-prod only
    throttling_burst_limit   = 500
    throttling_rate_limit    = 100
  }

  depends_on = [aws_api_gateway_account.main]

  tags = { Name = "eclat-${var.environment}-websocket-stage" }
}
