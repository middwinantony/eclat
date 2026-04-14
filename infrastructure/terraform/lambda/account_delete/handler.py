"""
account_delete/handler.py
Hard-deletes all user data 30 days after account soft-deletion.
Triggered by SQS account_delete queue.

GDPR compliance: deletes all PII, messages, photos, and profile data.
Audit record is retained (user_id anonymised) for legal compliance.

Message format:
{
  "user_id": "uuid",
  "requested_at": "2026-03-27T10:00:00Z"
}
"""

import json
import logging
import os
import boto3
import psycopg2
from datetime import datetime, timezone, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client("secretsmanager", region_name=os.environ["AWS_REGION"])
s3_client = boto3.client("s3")

PROFILES_BUCKET = os.environ.get("PROFILES_BUCKET", "")


def get_db_connection():
    secret = secrets_client.get_secret_value(SecretId=os.environ["DB_SECRET"])
    return psycopg2.connect(secret["SecretString"])


def delete_s3_user_files(user_id: str):
    """Delete all S3 objects for a user from the profiles bucket."""
    if not PROFILES_BUCKET:
        return

    paginator = s3_client.get_paginator("list_objects_v2")
    prefix = f"users/{user_id}/"

    for page in paginator.paginate(Bucket=PROFILES_BUCKET, Prefix=prefix):
        objects = page.get("Contents", [])
        if objects:
            s3_client.delete_objects(
                Bucket=PROFILES_BUCKET,
                Delete={"Objects": [{"Key": obj["Key"]} for obj in objects]}
            )
            logger.info("Deleted %d S3 objects for user (prefix: %s)", len(objects), prefix)


def lambda_handler(event, context):
    batch_item_failures = []

    for record in event["Records"]:
        message_id = record["messageId"]
        conn = None
        try:
            body = json.loads(record["body"])
            user_id = body["user_id"]
            requested_at = datetime.fromisoformat(body["requested_at"])

            # Safety check: only delete if 30 days have passed since request
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            if requested_at > thirty_days_ago:
                logger.info(
                    "Skipping deletion for user — 30-day period not elapsed (messageId: %s)",
                    message_id
                )
                continue

            logger.info("Starting hard-delete for user (messageId: %s)", message_id)

            conn = get_db_connection()
            cur = conn.cursor()

            # Verify user is actually soft-deleted
            cur.execute(
                "SELECT id FROM users WHERE id = %s AND deleted_at IS NOT NULL",
                (user_id,)
            )
            if not cur.fetchone():
                logger.warning(
                    "User not found or not soft-deleted (messageId: %s) — skipping",
                    message_id
                )
                conn.close()
                continue

            # Delete in correct order to respect foreign key constraints
            tables_to_delete = [
                "messages",
                "conversations",
                "matches",
                "daily_queue",
                "notifications",
                "event_rsvps",
                "blocks",
                "profile_hides",
                "matchmaker_notes",
                "subscriptions",
                "payment_events",
                "verification_submissions",
                "profiles",
                "usage_logs",
            ]

            for table in tables_to_delete:
                cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
                logger.info("Deleted from %s (messageId: %s)", table, message_id)

            # Anonymise audit logs rather than deleting — retain for legal compliance
            cur.execute("""
                UPDATE audit_logs
                SET user_id = NULL, ip_address = '[deleted]', metadata = '{}'
                WHERE user_id = %s
            """, (user_id,))

            # Finally delete the user record itself
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))

            conn.commit()
            logger.info("Database deletion complete (messageId: %s)", message_id)

            # Delete S3 files after successful DB deletion
            delete_s3_user_files(user_id)

            logger.info("Hard-delete complete for user (messageId: %s)", message_id)

        except Exception as e:
            logger.error("Failed to hard-delete user (messageId: %s): %s", message_id, str(e))
            if conn:
                conn.rollback()
            batch_item_failures.append({"itemIdentifier": message_id})
        finally:
            if conn:
                conn.close()

    return {"batchItemFailures": batch_item_failures}
