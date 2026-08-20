"""
Utility script to register the Telegram webhook with your Vercel deployment URL.

Usage:
    python setup_webhook.py

Set these environment variables before running:
    BOT_TOKEN   — your Telegram bot token from BotFather
    VERCEL_URL  — your Vercel deployment URL (e.g. https://your-bot.vercel.app)

Example:
    BOT_TOKEN=123456:ABC... VERCEL_URL=https://your-bot.vercel.app python setup_webhook.py
"""

import os
import sys
import requests

BOT_TOKEN = os.environ.get("BOT_TOKEN")
VERCEL_URL = os.environ.get("VERCEL_URL")

if not BOT_TOKEN:
    print("ERROR: BOT_TOKEN environment variable is not set.")
    sys.exit(1)

if not VERCEL_URL:
    print("ERROR: VERCEL_URL environment variable is not set.")
    sys.exit(1)

WEBHOOK_URL = f"{VERCEL_URL.rstrip('/')}/api/webhook"
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"


def set_webhook():
    print(f"Setting webhook to: {WEBHOOK_URL}")
    resp = requests.post(
        f"{TELEGRAM_API}/setWebhook",
        json={
            "url": WEBHOOK_URL,
            "allowed_updates": ["message", "edited_message"],
            "drop_pending_updates": True,
        },
        timeout=15,
    )
    data = resp.json()
    if data.get("ok"):
        print("✅ Webhook set successfully!")
        print(f"   URL: {WEBHOOK_URL}")
    else:
        print("❌ Failed to set webhook:")
        print(f"   {data}")


def get_webhook_info():
    resp = requests.get(f"{TELEGRAM_API}/getWebhookInfo", timeout=10)
    data = resp.json()
    if data.get("ok"):
        info = data["result"]
        print("\n── Current Webhook Info ──────────────────────")
        print(f"  URL:             {info.get('url', 'not set')}")
        print(f"  Pending updates: {info.get('pending_update_count', 0)}")
        print(f"  Last error:      {info.get('last_error_message', 'none')}")
        print("──────────────────────────────────────────────\n")
    else:
        print("Could not fetch webhook info:", data)


if __name__ == "__main__":
    set_webhook()
    get_webhook_info()
