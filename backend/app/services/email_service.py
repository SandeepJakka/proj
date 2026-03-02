"""
email_service.py
────────────────
Handles transactional email delivery for Healthora using Gmail SMTP.

No third-party email packages are required — only Python built-ins:
  - smtplib      : SMTP client
  - ssl          : TLS context for secure connection
  - email.mime.* : Build multi-part MIME email messages

Usage:
    from app.services.email_service import send_otp_email
    result = send_otp_email("user@example.com", "123456")
"""

import smtplib
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

# ── Logger ─────────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send a branded OTP verification email to the user via Gmail SMTP.

    Args:
        to_email : Recipient email address.
        otp      : 6-digit OTP string.

    Returns:
        True  — email was dispatched successfully.
        False — sending failed; error is logged but never re-raised.
    """

    # ── 1.  Build the HTML body ─────────────────────────────────────────────
    html_body = f"""\
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your Healthora Verification Code</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7ff;
                 font-family:'Segoe UI',Arial,sans-serif;">

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f4f7ff;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border-radius:16px;overflow:hidden;
                          box-shadow:0 4px 24px rgba(0,89,255,0.08);">

              <!-- ── Logo / Header ── -->
              <tr>
                <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;
                           border-bottom:3px solid #2563EB;">
                  <h1 style="margin:0;color:#2563EB;font-size:30px;font-weight:800;
                             letter-spacing:-0.5px;">🏥 Healthora</h1>
                  <p style="margin:6px 0 0;color:#6B7280;font-size:13px;">
                    Your personal AI health assistant
                  </p>
                </td>
              </tr>

              <!-- ── Body ── -->
              <tr>
                <td style="padding:36px 40px 28px;">
                  <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:22px;font-weight:700;">
                    Verify your email address
                  </h2>
                  <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7;">
                    Use the code below to verify your Healthora account.
                  </p>

                  <!-- ── OTP Box ── -->
                  <div style="background:#EFF6FF;border:2px solid #2563EB;
                              border-radius:12px;padding:28px;text-align:center;
                              margin-bottom:28px;">
                    <p style="margin:0 0 10px;color:#2563EB;font-size:12px;
                               font-weight:700;letter-spacing:3px;
                               text-transform:uppercase;">
                      Your Verification Code
                    </p>
                    <span style="font-size:44px;font-weight:800;
                                 letter-spacing:12px;color:#1a1a2e;
                                 font-family:'Courier New',monospace;">
                      {otp}
                    </span>
                  </div>

                  <!-- ── Expiry note ── -->
                  <p style="margin:0 0 16px;color:#374151;font-size:14px;
                             text-align:center;">
                    ⏱ This code expires in <strong>10 minutes</strong>.
                  </p>

                  <!-- ── Ignore notice ── -->
                  <p style="margin:0;color:#9CA3AF;font-size:13px;
                             line-height:1.6;">
                    If you did not request this, please ignore this email.
                    Your account will not be activated without verification.
                  </p>
                </td>
              </tr>

              <!-- ── Footer ── -->
              <tr>
                <td style="background:#F9FAFB;padding:20px 40px;
                           border-top:1px solid #E5E7EB;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                    This is an automated message from Healthora. Do not reply.<br/>
                    © 2026 Healthora · AI-powered healthcare companion
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>

    </body>
    </html>
    """

    # ── 2.  Construct the MIME message ──────────────────────────────────────
    message = MIMEMultipart("alternative")
    message["Subject"] = "Your Healthora Verification Code"
    message["From"]    = f"Healthora <{settings.GMAIL_SENDER_EMAIL}>"
    message["To"]      = to_email

    # Attach the HTML part (plain-text fallback is optional but good practice)
    plain_text = (
        f"Your Healthora verification code is: {otp}\n\n"
        "This code expires in 10 minutes.\n"
        "If you did not request this, please ignore this email."
    )
    message.attach(MIMEText(plain_text, "plain"))
    message.attach(MIMEText(html_body, "html"))

    # ── 3.  Send via Gmail SMTP with STARTTLS ───────────────────────────────
    try:
        # Create a secure TLS context
        context = ssl.create_default_context()

        # Connect to Gmail on port 587 (STARTTLS)
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()                                    # Identify ourselves
            server.starttls(context=context)                 # Upgrade to TLS
            server.ehlo()                                    # Re-identify over TLS
            server.login(
                settings.GMAIL_SENDER_EMAIL,
                settings.GMAIL_APP_PASSWORD,
            )
            server.sendmail(
                settings.GMAIL_SENDER_EMAIL,
                to_email,
                message.as_string(),
            )

        logger.info("[email_service] OTP email sent successfully to %s", to_email)
        return True

    except smtplib.SMTPAuthenticationError as e:
        # Wrong credentials — most likely the App Password is incorrect
        logger.error(
            "[email_service] Gmail SMTP authentication failed. "
            "Check GMAIL_SENDER_EMAIL and GMAIL_APP_PASSWORD in .env. Error: %s", e
        )
        return False

    except smtplib.SMTPException as e:
        logger.error("[email_service] SMTP error while sending to %s: %s", to_email, e)
        return False

    except Exception as e:
        logger.error(
            "[email_service] Unexpected error while sending OTP email to %s: %s",
            to_email, e
        )
        return False


# ── Quick standalone test ───────────────────────────────────────────────────────
# Run with:  python -m app.services.email_service
if __name__ == "__main__":
    result = send_otp_email("test@example.com", "123456")
    print("Email sent!" if result else "Email failed — check logs above.")

def send_password_reset_email(to_email: str, otp: str) -> bool:
    """Send a password reset code email."""
    html_body = f"""\
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset your Healthora password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7ff;
                 font-family:'Segoe UI',Arial,sans-serif;">

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f4f7ff;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border-radius:16px;overflow:hidden;
                          box-shadow:0 4px 24px rgba(0,89,255,0.08);">

              <!-- ── Logo / Header ── -->
              <tr>
                <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;
                           border-bottom:3px solid #2563EB;">
                  <h1 style="margin:0;color:#2563EB;font-size:30px;font-weight:800;
                             letter-spacing:-0.5px;">🏥 Healthora</h1>
                </td>
              </tr>

              <!-- ── Body ── -->
              <tr>
                <td style="padding:36px 40px 28px;">
                  <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:22px;font-weight:700;">
                    Reset your password
                  </h2>
                  <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7;">
                    Use this code to reset your password. Valid for 10 minutes.
                  </p>

                  <!-- ── OTP Box ── -->
                  <div style="background:#EFF6FF;border:2px solid #2563EB;
                              border-radius:12px;padding:28px;text-align:center;
                              margin-bottom:28px;">
                    <span style="font-size:44px;font-weight:800;
                                 letter-spacing:12px;color:#1a1a2e;
                                 font-family:'Courier New',monospace;">
                      {otp}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset your Healthora password"
    message["From"]    = f"Healthora <{settings.GMAIL_SENDER_EMAIL}>"
    message["To"]      = to_email

    plain_text = (
        f"Your Healthora password reset code is: {otp}\n\n"
        "This code expires in 10 minutes.\n"
        "If you did not request this, please ignore this email."
    )
    message.attach(MIMEText(plain_text, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(
                settings.GMAIL_SENDER_EMAIL,
                settings.GMAIL_APP_PASSWORD,
            )
            server.sendmail(
                settings.GMAIL_SENDER_EMAIL,
                to_email,
                message.as_string(),
            )

        logger.info("[email_service] Password reset email sent successfully to %s", to_email)
        return True

    except Exception as e:
        logger.error("[email_service] Unexpected error while sending password reset email to %s: %s", to_email, e)
        return False

def send_reminder_email(to_email: str, medicine_name: str, dosage: str, instructions: str) -> bool:
    """Send medicine reminder email."""
    html_body = f"""
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: #2563EB; color: white; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800;">H</div>
            <h2 style="color: #0F1117; margin-top: 12px;">Medicine Reminder</h2>
        </div>
        <div style="background: #F0F7FF; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #2563EB;">
            <h3 style="color: #2563EB; margin: 0 0 8px 0;">💊 {medicine_name}</h3>
            {f'<p style="color: #374151; margin: 4px 0;">Dosage: <strong>{dosage}</strong></p>' if dosage else ''}
            {f'<p style="color: #374151; margin: 4px 0;">Instructions: <strong>{instructions}</strong></p>' if instructions else ''}
        </div>
        <p style="color: #6B7280; font-size: 13px; text-align: center;">
            This is an automated reminder from Healthora.<br>
            Always follow your doctor's prescription.
        </p>
    </div>
    """
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"💊 Time to take {medicine_name} — Healthora Reminder"
        msg['From'] = f"Healthora <{settings.GMAIL_SENDER_EMAIL}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html'))
        
        context = ssl.create_default_context()
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls(context=context)
            server.login(settings.GMAIL_SENDER_EMAIL, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_SENDER_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Reminder email failed: {e}")
        return False

def send_weekly_summary_email(to_email: str, user_name: str, active_reminders: int, reports_this_week: int, reminder_list: list) -> bool:
    """Send weekly health summary email."""
    reminder_items = ''.join([f'<li style="color: #374151; margin: 4px 0;">{med}</li>' for med in reminder_list[:5]])
    
    html_body = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: #2563EB; color: white; width: 56px; height: 56px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800;">H</div>
            <h2 style="color: #0F1117; margin-top: 12px;">Your Weekly Health Summary</h2>
            <p style="color: #6B7280; margin: 4px 0;">Hi {user_name}, here's your health activity this week</p>
        </div>
        
        <div style="background: #F0F7FF; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <h3 style="color: #2563EB; margin: 0 0 12px 0;">📊 This Week's Activity</h3>
            <p style="color: #374151; margin: 8px 0;">✅ <strong>{active_reminders}</strong> active medicine reminders</p>
            <p style="color: #374151; margin: 8px 0;">📄 <strong>{reports_this_week}</strong> reports analyzed</p>
        </div>
        
        {f'<div style="background: #FFF7ED; border-radius: 12px; padding: 20px; margin-bottom: 16px;"><h3 style="color: #F59E0B; margin: 0 0 12px 0;">💊 Your Active Medicines</h3><ul style="margin: 0; padding-left: 20px;">{reminder_items}</ul></div>' if reminder_list else ''}
        
        <div style="text-align: center; margin-top: 24px;">
            <p style="color: #374151; margin-bottom: 16px;">Keep up with your health journey!</p>
            <a href="https://healthora.app" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open Healthora</a>
        </div>
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
            This is your weekly summary from Healthora.<br>
            © 2026 Healthora · AI-powered healthcare companion
        </p>
    </div>
    """
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"📊 Your Weekly Health Summary — Healthora"
        msg['From'] = f"Healthora <{settings.GMAIL_SENDER_EMAIL}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html'))
        
        context = ssl.create_default_context()
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls(context=context)
            server.login(settings.GMAIL_SENDER_EMAIL, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_SENDER_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Weekly summary email failed: {e}")
        return False
