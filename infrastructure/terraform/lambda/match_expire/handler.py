"""
match_expire/handler.py
Expires unseen daily queue entries older than 7 days.
Triggered by EventBridge every 6 hours.
"""

import json
import logging
import os
import boto3
import psycopg2
from datetime import date, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client("secretsmanager", region_name=os.environ["AWS_REGION"])


def get_db_connection():
    secret = secrets_client.get_secret_value(SecretId=os.environ["DB_SECRET"])
    return psycopg2.connect(secret["SecretString"])


def lambda_handler(event, context):
    logger.info("Starting match expiry check")
    expiry_date = date.today() - timedelta(days=7)
    conn = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE daily_queue
            SET action = 'expired'
            WHERE action = 'unseen'
              AND date < %s
            RETURNING id
        """, (expiry_date,))

        expired_count = cur.rowcount
        conn.commit()

        logger.info("Expired %d stale queue entries older than %s", expired_count, expiry_date)
        return {
            "statusCode": 200,
            "body": json.dumps({"expired": expired_count, "cutoff_date": expiry_date.isoformat()})
        }

    except Exception as e:
        logger.error("Error expiring matches: %s", str(e))
        raise
    finally:
        if conn:
            conn.close()
