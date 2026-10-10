"""
Minimal SMTP email sender for manager confirmation notices and task
reminders. Configure via env vars (works with Gmail SMTP, SendGrid SMTP,
Mailtrap, etc.):

  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM

If these aren't set, send_email() logs to stdout instead of failing —
so the rest of the app keeps working in dev without an email account.
"""
from __future__ import annotations
import os
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "noreply@meeting-ai-assistant.local")


def send_email(to: str, subject: str, body: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        print(f"[email_service] SMTP not configured — would send to {to}:\nSubject: {subject}\n{body}\n")
        return False
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"[email_service] Failed to send to {to}: {e}")
        return False


def meeting_confirmed_email(manager_email: str, meeting_title: str, meeting_id: int, task_count: int) -> bool:
    subject = f"Confirmed: \"{meeting_title}\" — all tasks assigned"
    body = (
        f"\"{meeting_title}\" has been processed and confirmed.\n\n"
        f"{task_count} task(s) extracted and assigned.\n"
        f"View it here: /meetings/{meeting_id}\n\n"
        "— AI Meeting Assistant"
    )
    return send_email(manager_email, subject, body)
