import os
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils.logger import logger

def _send_smtp_email_blocking(to_email: str, subject: str, html_content: str):
    """Core helper to send emails via Google SMTP."""
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_username or not smtp_password:
        logger.warning("[EMAIL] SMTP credentials missing in .env. Skipping email.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ExpenseTracker <{smtp_username}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        # Use Gmail's SMTP server
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, msg.as_string())
        server.quit()
        logger.info(f"[EMAIL] Successfully sent email to {to_email}")
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send email to {to_email}: {str(e)}")
        raise e


async def send_smtp_email(to_email: str, subject: str, html_content: str):
    """Send an email without blocking the asyncio event loop."""
    await asyncio.to_thread(_send_smtp_email_blocking, to_email, subject, html_content)


async def send_reset_email(to_email: str, otp: str):
    """Send OTP password reset email via Resend API (works on all hosting platforms)."""
    app_name = os.getenv("DATABASE_NAME", "ExpenseTrack")
    from_address = os.getenv("EMAIL_FROM", "onboarding@resend.dev")

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #6d4aff; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Use the following 6-digit code to complete the process:
          </p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px;">{otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            &copy; {app_name} Team
          </p>
        </div>
      </body>
    </html>
    """

    await send_smtp_email(to_email, "Your Password Reset Code", html_content)
    logger.info(f"[EMAIL DEV MODE] Sent OTP: {otp}")


async def send_signup_otp_email(to_email: str, otp: str):
    """Send OTP email for signup verification via Resend API."""
    app_name = os.getenv("DATABASE_NAME", "ExpenseTrack")
    from_address = os.getenv("EMAIL_FROM", "onboarding@resend.dev")

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #6d4aff; text-align: center; margin-bottom: 20px;">Verify your email</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            Thank you for registering! Please use the following 6-digit code to complete your sign-up:
          </p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px;">{otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            &copy; {app_name} Team
          </p>
        </div>
      </body>
    </html>
    """

    await send_smtp_email(to_email, "Your Signup Verification Code", html_content)
    logger.info(f"[EMAIL DEV MODE] Sent OTP: {otp}")

async def send_event_reminder_email(to_email: str, event_title: str, event_time: str, reminder_type: str):
    """Send calendar event reminder email."""
    app_name = os.getenv("DATABASE_NAME", "ExpenseTrack")
    from_address = os.getenv("EMAIL_FROM", "onboarding@resend.dev")

    if reminder_type == "1_day":
        subject = f"Reminder: '{event_title}' is tomorrow!"
        heading = f"Upcoming Event Tomorrow"
        body_text = f"This is a friendly reminder that your event <strong>'{event_title}'</strong> is scheduled for tomorrow at <strong>{event_time}</strong>."
    else:
        subject = f"Reminder: '{event_title}' is today!"
        heading = f"Upcoming Event Today"
        body_text = f"This is a friendly reminder that your event <strong>'{event_title}'</strong> is happening today at <strong>{event_time}</strong>."

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #6d4aff; text-align: center; margin-bottom: 20px;">{heading}</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            {body_text}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            &copy; {app_name} Team
          </p>
        </div>
      </body>
    </html>
    """

    await send_smtp_email(to_email, subject, html_content)

async def send_event_created_email(
    to_email: str,
    event_title: str,
    event_time: str,
    description: str = "",
    amount: float = None,
    payment_category: str = "",
    payment_method: str = "",
):
    """Send a rich calendar event confirmation email with description and payment details."""
    app_name = "ExpenseTrack"
    from_address = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
    subject = f"✅ Event Scheduled: \"{event_title}\""

    # Optional rows
    desc_row = ""
    if description:
        desc_row = f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <span style="color:#888;font-size:13px;">📝 Description</span><br/>
            <span style="color:#333;font-size:14px;">{description}</span>
          </td>
        </tr>"""

    amount_row = ""
    if amount:
        cat_label  = f" &nbsp;|&nbsp; Category: <strong>{payment_category}</strong>" if payment_category else ""
        meth_label = f" &nbsp;|&nbsp; via <strong>{payment_method}</strong>" if payment_method else ""
        amount_row = f"""
        <tr>
          <td style="padding:10px 0;">
            <span style="color:#888;font-size:13px;">💳 Payment Due</span><br/>
            <span style="background:#ecfdf5;color:#065f46;font-size:16px;font-weight:700;padding:4px 10px;border-radius:6px;display:inline-block;margin-top:4px;">
              ₹{amount:,.2f}
            </span>
            <span style="color:#555;font-size:13px;">{cat_label}{meth_label}</span>
          </td>
        </tr>"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#6d4aff 0%,#10b981 100%);padding:36px 40px;text-align:center;">
                <div style="font-size:44px;margin-bottom:8px;">📅</div>
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Event Scheduled!</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your calendar event has been confirmed</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px 40px;">
                <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">
                  Hey there! 👋 Your event has been added to your calendar. Here's a summary:
                </p>

                <!-- Event card -->
                <div style="background:#f9f7ff;border:1px solid #e8e3ff;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                        <span style="color:#888;font-size:13px;">📌 Event Title</span><br/>
                        <span style="color:#1a1a2e;font-size:17px;font-weight:700;">{event_title}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                        <span style="color:#888;font-size:13px;">🕐 Scheduled Time</span><br/>
                        <span style="color:#333;font-size:14px;font-weight:600;">{event_time}</span>
                      </td>
                    </tr>
                    {desc_row}
                    {amount_row}
                  </table>
                </div>

                <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                  <p style="margin:0;color:#065f46;font-size:13px;line-height:1.5;">
                    🔔 <strong>Reminder:</strong> We'll notify you the day before and when the event is about to start.
                    {"<br/>💳 You'll also be asked to confirm payment once the event day arrives." if amount else ""}
                  </p>
                </div>

                <p style="margin:0;color:#888;font-size:13px;line-height:1.5;">
                  Manage your events anytime from your <strong>{app_name}</strong> calendar.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
                <p style="margin:0;color:#bbb;font-size:12px;">&copy; {app_name} &mdash; Your Smart Expense Companion</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    await send_smtp_email(to_email, subject, html_content)
