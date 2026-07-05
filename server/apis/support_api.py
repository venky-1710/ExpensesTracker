import os
import smtplib
from email.message import EmailMessage
from fastapi import HTTPException

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

async def send_contact_email(
    first_name: str,
    last_name: str,
    work_email: str,
    phone_number: str,
    message: str
):
    """
    Sends an email to the admin with the contact form details.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please contact support directly."
        )

    full_name = f"{first_name} {last_name}".strip()
    
    subject = f"New Contact Request from {full_name}"
    
    body = f"""You have received a new message from the ExpensesTracker Contact Form.

Name: {full_name}
Email: {work_email}
Phone: {phone_number}

Message:
{message}
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 30px 10px; color: #333333; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-top: 3px solid #222222; }}
            .header {{ padding: 30px; border-bottom: 1px solid #f0f0f0; }}
            .header h1 {{ margin: 0; font-size: 22px; font-weight: 400; color: #111111; letter-spacing: 0.5px; }}
            .content {{ padding: 30px; }}
            .row {{ margin-bottom: 24px; }}
            .label {{ font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; display: block; }}
            .value {{ font-size: 15px; color: #222222; }}
            .value a {{ color: #222222; text-decoration: underline; }}
            .message-box {{ padding: 0; margin-top: 12px; font-size: 15px; color: #444444; line-height: 1.6; white-space: pre-wrap; }}
            .footer {{ text-align: center; padding: 25px; font-size: 12px; color: #999999; border-top: 1px solid #f0f0f0; background: #fafafa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Contact Request</h1>
            </div>
            <div class="content">
                <div class="row">
                    <span class="label">Name</span>
                    <span class="value">{full_name}</span>
                </div>
                <div class="row">
                    <span class="label">Email Address</span>
                    <span class="value"><a href="mailto:{work_email}">{work_email}</a></span>
                </div>
                <div class="row">
                    <span class="label">Phone Number</span>
                    <span class="value">{phone_number or 'Not provided'}</span>
                </div>
                <div class="row">
                    <span class="label">Message</span>
                    <div class="message-box">{message}</div>
                </div>
            </div>
            <div class="footer">
                Sent via ExpensesTracker • Reply directly to this email to respond.
            </div>
        </div>
    </body>
    </html>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_USERNAME
    msg["To"] = SMTP_USERNAME  # Send to the admin's own email
    msg["Reply-To"] = work_email
    
    msg.set_content(body)
    msg.add_alternative(html_body, subtype='html')

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to send email. Please try again later."
        )
