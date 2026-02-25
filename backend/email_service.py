import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "hello@sherpatravel.uk")
SMTP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
FROM_NAME = "Sherpa Travel"


def send_email(to_email: str, subject: str, html_body: str):
    """Send an HTML email via Google Workspace SMTP."""
    if not SMTP_PASSWORD:
        print("WARNING: SMTP_APP_PASSWORD not set, skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{FROM_NAME} <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


def send_welcome_email(to_email: str, first_name: str = ""):
    """Send branded welcome email to new users."""
    name = first_name or "there"
    subject = f"Welcome to Sherpa, {name}! 🌍"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#111614; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:560px; margin:0 auto; padding:32px 20px;">

    <!-- Header -->
    <div style="text-align:center; padding:24px 0 20px;">
      <h1 style="margin:0; font-size:28px; color:#f0ede8; letter-spacing:1px;">
        Sherpa Travel
      </h1>
      <p style="margin:4px 0 0; font-size:13px; color:#7a7870;">
        AI-powered travel planning
      </p>
    </div>

    <!-- Main card -->
    <div style="background-color:#1a2020; border-radius:12px; padding:32px 28px; border:1px solid rgba(127,182,133,0.2);">

      <h2 style="margin:0 0 16px; font-size:22px; color:#a8c9ad;">
        Hey {name}, welcome aboard! &#x1F44B;
      </h2>

      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#c8c4bc;">
        Thanks for signing up to Sherpa. You now have unlimited access to
        personalised travel itineraries built around your actual flights,
        hotel, and preferences.
      </p>

      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#c8c4bc;">
        Here's how to get the most out of it:
      </p>

      <!-- Steps -->
      <div style="margin-bottom:24px;">
        <div style="display:flex; margin-bottom:16px;">
          <div style="min-width:36px; height:36px; background:rgba(127,182,133,0.15); border-radius:50%; text-align:center; line-height:36px; font-size:15px; margin-right:14px;">
            &#x2728;
          </div>
          <div>
            <p style="margin:0 0 2px; font-size:14px; font-weight:bold; color:#f0ede8;">Get inspired</p>
            <p style="margin:0; font-size:13px; color:#7a7870;">Tell Sherpa your dates, budget, and travel style. It'll suggest three destinations perfect for you.</p>
          </div>
        </div>

        <div style="display:flex; margin-bottom:16px;">
          <div style="min-width:36px; height:36px; background:rgba(127,182,133,0.15); border-radius:50%; text-align:center; line-height:36px; font-size:15px; margin-right:14px;">
            &#x2708;&#xFE0F;
          </div>
          <div>
            <p style="margin:0 0 2px; font-size:14px; font-weight:bold; color:#f0ede8;">Book your travel</p>
            <p style="margin:0; font-size:13px; color:#7a7870;">Find flights, check if you need a car, and pick your hotel. Sherpa links you to the best deals.</p>
          </div>
        </div>

        <div style="display:flex; margin-bottom:16px;">
          <div style="min-width:36px; height:36px; background:rgba(127,182,133,0.15); border-radius:50%; text-align:center; line-height:36px; font-size:15px; margin-right:14px;">
            &#x1F5D3;&#xFE0F;
          </div>
          <div>
            <p style="margin:0 0 2px; font-size:14px; font-weight:bold; color:#f0ede8;">Build your itinerary</p>
            <p style="margin:0; font-size:13px; color:#7a7870;">Get a full day-by-day plan with restaurants, activities, and local tips tailored to you.</p>
          </div>
        </div>

        <div style="display:flex;">
          <div style="min-width:36px; height:36px; background:rgba(127,182,133,0.15); border-radius:50%; text-align:center; line-height:36px; font-size:15px; margin-right:14px;">
            &#x1F4CD;
          </div>
          <div>
            <p style="margin:0 0 2px; font-size:14px; font-weight:bold; color:#f0ede8;">Export your map</p>
            <p style="margin:0; font-size:13px; color:#7a7870;">Download all your spots to Google Maps so everything is on your phone when you arrive.</p>
          </div>
        </div>
      </div>

      <!-- CTA button -->
      <div style="text-align:center; padding:8px 0 4px;">
        <a href="https://sherpatravel.uk"
           style="display:inline-block; background-color:#7fb685; color:#111614; text-decoration:none;
                  font-size:15px; font-weight:bold; padding:14px 36px; border-radius:8px;">
          Start planning your trip &#x2192;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center; padding:24px 0 8px;">
      <p style="margin:0 0 6px; font-size:12px; color:#7a7870;">
        Got questions or feedback? Just reply to this email.
      </p>
      <p style="margin:0; font-size:11px; color:#4a4a42;">
        Sherpa Travel &middot; sherpatravel.uk
      </p>
    </div>

  </div>
</body>
</html>
"""

    return send_email(to_email, subject, html)
