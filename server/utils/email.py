import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from utils.logger import logger

def _send_email_sync(to_email: str, subject: str, html_content: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip().strip('"\'')
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip().strip('"\'')
    smtp_username = smtp_username or None
    smtp_password = smtp_password or None

    if not smtp_username or not smtp_password:
        logger.error("[EMAIL] SMTP credentials not configured in environment variables.")
        raise ValueError("SMTP credentials missing")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_username
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        logger.info(f"[EMAIL] Connecting to {smtp_server}:{smtp_port}...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, msg.as_string())
        server.quit()
        logger.info(f"[EMAIL] Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send email to {to_email}: {str(e)}")
        raise e

async def send_reset_email(to_email: str, otp: str):
    """
    Sends a beautifully formatted HTML email containing the OTP code asynchronously.
    """
    subject = "Your Password Reset Code"
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
            &copy; {os.getenv("DATABASE_NAME", "ExpensesTracker")} Team
          </p>
        </div>
      </body>
    </html>
    """
    
    # Run the blocking SMTP operation in a separate thread so we don't block the FastAPI event loop
    await asyncio.to_thread(_send_email_sync, to_email, subject, html_content)
