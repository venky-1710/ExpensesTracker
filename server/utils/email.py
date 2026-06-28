import os
import resend
from utils.logger import logger

resend.api_key = os.getenv("RESEND_API_KEY", "")

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

    try:
        logger.info(f"[EMAIL] Sending OTP email to {to_email} via Resend...")
        params = {
            "from": from_address,
            "to": [to_email],
            "subject": "Your Password Reset Code",
            "html": html_content,
        }
        response = resend.Emails.send(params)
        logger.info(f"[EMAIL] Email sent successfully. ID: {response.get('id')}")
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send email to {to_email}: {str(e)}")
        raise e
