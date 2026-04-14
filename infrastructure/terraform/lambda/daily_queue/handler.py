"""
daily_queue/handler.py
Generates the daily curated match queue for all active, verified eclat users.

Triggered by EventBridge at 02:00 SGT (18:00 UTC) daily.

Logic:
  1. Fetch all active+verified users
  2. For each user, find eligible profiles matching their preferences
  3. Exclude: already liked/passed, blocked, hidden, already in queue today
  4. Score candidates by preference overlap
  5. Insert top N into daily_queue table (N = plan limit: 7/15/unlimited)
"""

import json
import logging
import os
import boto3
import psycopg2
from datetime import date

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client("secretsmanager", region_name=os.environ["AWS_REGION"])


def get_db_connection():
    """Fetch DATABASE_URL from Secrets Manager and return a psycopg2 connection."""
    secret = secrets_client.get_secret_value(SecretId=os.environ["DB_SECRET"])
    database_url = secret["SecretString"]
    return psycopg2.connect(database_url)


PLAN_LIMITS = {
    "select": 7,
    "reserve": 15,
    "noir": 999,  # Effectively unlimited
    "free": 3,
}


def lambda_handler(event, context):
    logger.info("Starting daily queue generation for %s", date.today().isoformat())
    conn = None
    processed = 0
    errors = 0

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch all active + verified users
        cur.execute("""
            SELECT u.id, u.plan, p.gender, p.city, p.country
            FROM users u
            JOIN profiles p ON p.user_id = u.id
            WHERE u.verification_status = 'approved'
              AND u.plan_status = 'active'
              AND p.is_visible = true
              AND u.deleted_at IS NULL
        """)
        users = cur.fetchall()
        logger.info("Found %d active users to generate queues for", len(users))

        today = date.today()

        for user_id, plan, gender, city, country in users:
            try:
                daily_limit = PLAN_LIMITS.get(plan, 3)

                # Find eligible candidates — full matching logic will be implemented
                # in Phase 9 when preferences schema is finalised
                cur.execute("""
                    INSERT INTO daily_queue (user_id, target_profile_id, date, action)
                    SELECT %s, p.user_id, %s, 'unseen'
                    FROM profiles p
                    JOIN users u ON u.id = p.user_id
                    WHERE p.user_id != %s
                      AND p.is_visible = true
                      AND u.verification_status = 'approved'
                      AND u.plan_status = 'active'
                      AND u.deleted_at IS NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM daily_queue dq
                          WHERE dq.user_id = %s AND dq.target_profile_id = p.user_id
                            AND dq.date = %s
                      )
                      AND NOT EXISTS (
                          SELECT 1 FROM blocks b
                          WHERE (b.blocker_id = %s AND b.blocked_id = p.user_id)
                             OR (b.blocker_id = p.user_id AND b.blocked_id = %s)
                      )
                    ORDER BY RANDOM()
                    LIMIT %s
                    ON CONFLICT DO NOTHING
                """, (
                    user_id, today, user_id,
                    user_id, today,
                    user_id, user_id,
                    daily_limit
                ))
                processed += 1

            except Exception as e:
                logger.error("Failed to generate queue for user %s: %s", user_id, str(e))
                errors += 1
                conn.rollback()

        conn.commit()
        logger.info(
            "Daily queue generation complete. Processed: %d, Errors: %d",
            processed, errors
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "processed": processed,
                "errors": errors,
                "date": today.isoformat()
            })
        }

    except Exception as e:
        logger.error("Fatal error in daily queue generation: %s", str(e))
        raise
    finally:
        if conn:
            conn.close()
