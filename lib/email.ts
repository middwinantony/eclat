import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.EMAIL_FROM ?? "eclat <noreply@eclat.com>"

/* eslint-disable no-secrets/no-secrets */
function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>eclat</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F4;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.07);padding:40px 40px 32px;">
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.04em;color:#1C1218;">eclat</span>
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#A8476A;margin-left:4px;vertical-align:middle;margin-bottom:4px;"></span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;border-top:1px solid rgba(0,0,0,0.06);margin-top:32px;">
              <p style="margin:0;font-size:11px;color:#B0A0A8;line-height:1.6;">
                Not for everyone. Intentionally.<br />
                eclat — Private membership community
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
/* eslint-enable no-secrets/no-secrets */

export async function sendVerificationApproved(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0]
  await resend.emails.send({
    from:    FROM,
    to,
    subject: "You're in — welcome to eclat.",
    html: baseHtml(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1C1218;letter-spacing:-0.03em;">
        Welcome, ${firstName}.
      </h1>
      <p style="margin:0 0 20px;font-size:14px;color:#7A6670;line-height:1.7;">
        Your application has been approved. You now have access to eclat — a curated community built for people who take their connections seriously.
      </p>
      <a href="${process.env.NEXTAUTH_URL ?? "https://eclat.app"}/login"
         style="display:inline-block;background:#A8476A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">
        Sign in to eclat →
      </a>
      <p style="margin:20px 0 0;font-size:12px;color:#B0A0A8;line-height:1.6;">
        Complete your profile to start receiving curated introductions.
      </p>
    `),
  })
}

export async function sendVerificationRejected(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0]
  await resend.emails.send({
    from:    FROM,
    to,
    subject: "Your eclat application",
    html: baseHtml(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1C1218;letter-spacing:-0.03em;">
        Hi ${firstName},
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#7A6670;line-height:1.7;">
        Thank you for applying to eclat. After reviewing your application, we're unable to offer membership at this time.
      </p>
      <p style="margin:0;font-size:14px;color:#7A6670;line-height:1.7;">
        We review all applications carefully against our community criteria. If you believe this decision was made in error or would like more information, please reply to this email.
      </p>
    `),
  })
}
