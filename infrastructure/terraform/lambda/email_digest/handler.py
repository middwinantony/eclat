"""
email_digest/handler.py
Processes email jobs from the SQS email queue and sends via AWS SES.

Message format expected in SQS:
{
  "to": "user@example.com",
  "subject": "You have a new match on eclat",
  "template": "new-match",
  "data": { ... template variables ... }
}
"""

import json
import logging
import os
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses_client = boto3.client("ses", region_name=os.environ.get("AWS_REGION_VAR", "ap-southeast-1"))
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@eclat.in")

TEMPLATES = {
    "new-match": {
        "subject": "You have a new match on eclat ✨",
        "body_html": "<h1>You have a new match!</h1><p>Log in to eclat to start the conversation.</p>",
        "body_text": "You have a new match on eclat. Log in to start the conversation."
    },
    "new-message": {
        "subject": "New message from your match",
        "body_html": "<h1>New message</h1><p>You have a new message waiting on eclat.</p>",
        "body_text": "You have a new message waiting on eclat."
    },
    "verification-approved": {
        "subject": "Your eclat profile has been verified",
        "body_html": "<h1>Welcome to eclat</h1><p>Your identity has been verified. You can now browse matches.</p>",
        "body_text": "Your identity has been verified. You can now browse matches on eclat."
    },
    "subscription-confirmed": {
        "subject": "Your eclat membership is active",
        "body_html": "<h1>Membership Confirmed</h1><p>Your eclat subscription is now active.</p>",
        "body_text": "Your eclat subscription is now active."
    }
}


def lambda_handler(event, context):
    """Process a batch of SQS email messages."""
    batch_item_failures = []

    for record in event["Records"]:
        message_id = record["messageId"]
        try:
            body = json.loads(record["body"])
            to_email = body["to"]
            template_key = body.get("template", "new-match")
            template = TEMPLATES.get(template_key, TEMPLATES["new-match"])

            # IMPORTANT: Never log email addresses or personal data
            logger.info("Sending %s email (messageId: %s)", template_key, message_id)

            ses_client.send_email(
                Source=FROM_EMAIL,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": template["subject"], "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": template["body_text"], "Charset": "UTF-8"},
                        "Html": {"Data": template["body_html"], "Charset": "UTF-8"}
                    }
                }
            )
            logger.info("Email sent successfully (messageId: %s)", message_id)

        except Exception as e:
            logger.error("Failed to send email for messageId %s: %s", message_id, str(e))
            batch_item_failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": batch_item_failures}
