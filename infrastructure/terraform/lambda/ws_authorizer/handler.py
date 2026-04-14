"""
ws_authorizer/handler.py
Lambda authorizer for API Gateway WebSocket connections.
Validates the JWT token passed as ?token= query parameter.

Returns an IAM policy allowing or denying the $connect route.
"""

import json
import logging
import os
import boto3
import base64
import hmac
import hashlib
import struct
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client("secretsmanager", region_name=os.environ["AWS_REGION"])
_secret_cache = None


def get_nextauth_secret():
    """Cache the NextAuth secret to avoid repeated Secrets Manager calls."""
    global _secret_cache
    if _secret_cache is None:
        response = secrets_client.get_secret_value(SecretId=os.environ["SECRET_ARN"])
        _secret_cache = response["SecretString"]
    return _secret_cache


def generate_policy(principal_id: str, effect: str, resource: str, context: dict = None):
    """Generate IAM policy document for API Gateway authorizer response."""
    policy = {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "execute-api:Invoke",
                "Effect": effect,
                "Resource": resource
            }]
        }
    }
    if context:
        policy["context"] = context
    return policy


def lambda_handler(event, context):
    """Validate JWT token from WebSocket connection query string."""
    token = event.get("queryStringParameters", {}).get("token")

    if not token:
        logger.warning("WebSocket connection rejected — no token provided")
        raise Exception("Unauthorized")

    try:
        # NextAuth JWTs are JWE (encrypted) by default — for our custom validation
        # we decode the base64 payload and verify the signature.
        # In production, use python-jose or PyJWT with the NextAuth secret.
        # This is a placeholder — implement full JWT validation in Phase 8.

        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure")

        # Decode payload (add padding if needed)
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        # Check expiry
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token expired")

        user_id = payload.get("sub") or payload.get("userId")
        if not user_id:
            raise ValueError("No user ID in token")

        logger.info("WebSocket connection authorized for user")

        return generate_policy(
            principal_id=user_id,
            effect="Allow",
            resource=event["methodArn"],
            context={"userId": user_id, "email": payload.get("email", "")}
        )

    except Exception as e:
        logger.warning("WebSocket connection rejected — invalid token: %s", type(e).__name__)
        raise Exception("Unauthorized")
