"""
ws_router/handler.py
Routes WebSocket messages for video call signalling.
Handles connect/disconnect and call-invite/answer/end message types.
"""

import json
import logging
import os
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

API_ID = os.environ.get("WS_API_ID", "")
STAGE = os.environ.get("WS_STAGE", "dev")
AWS_REGION = os.environ.get("AWS_REGION_VAR", "ap-southeast-1")

# In-memory connection store (replace with DynamoDB for multi-instance deployments)
# For <1k users at launch, Lambda keeps connections per execution context
connections = {}


def get_management_client(endpoint_url: str):
    return boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=endpoint_url
    )


def lambda_handler(event, context):
    route_key = event.get("requestContext", {}).get("routeKey")
    connection_id = event.get("requestContext", {}).get("connectionId")
    domain = event.get("requestContext", {}).get("domainName")
    stage = event.get("requestContext", {}).get("stage")

    endpoint_url = f"https://{domain}/{stage}"

    if route_key == "$connect":
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("userId")
        logger.info("WebSocket $connect (connectionId: %s)", connection_id)
        # Store connection mapping — in production, persist to DynamoDB
        return {"statusCode": 200}

    elif route_key == "$disconnect":
        logger.info("WebSocket $disconnect (connectionId: %s)", connection_id)
        return {"statusCode": 200}

    elif route_key in ("call-invite", "call-answer", "call-end"):
        body = json.loads(event.get("body", "{}"))
        target_connection_id = body.get("targetConnectionId")

        if not target_connection_id:
            return {"statusCode": 400, "body": "targetConnectionId required"}

        try:
            mgmt = get_management_client(endpoint_url)
            mgmt.post_to_connection(
                ConnectionId=target_connection_id,
                Data=json.dumps({
                    "type": route_key,
                    "fromConnectionId": connection_id,
                    "payload": body.get("payload", {})
                })
            )
            return {"statusCode": 200}

        except mgmt.exceptions.GoneException:
            logger.warning("Target connection %s is no longer active", target_connection_id)
            return {"statusCode": 410, "body": "Target connection gone"}

    return {"statusCode": 400, "body": f"Unknown route: {route_key}"}
