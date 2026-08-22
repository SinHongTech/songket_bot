"""
Register the deployed Mini App as the bot's chat menu button.

Usage:
    BOT_TOKEN=... WEB_APP_URL=https://your-project.vercel.app python setup_webapp.py
"""
import os
import sys

import requests

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEB_APP_URL = os.environ.get("WEB_APP_URL", "")

if not BOT_TOKEN or not WEB_APP_URL:
    print("Set BOT_TOKEN and WEB_APP_URL first.")
    sys.exit(1)

API = f"https://api.telegram.org/bot{BOT_TOKEN}"


def call(method: str, payload: dict) -> dict:
    r = requests.post(f"{API}/{method}", json=payload, timeout=15)
    data = r.json()
    print(method, data)
    return data


if __name__ == "__main__":
    call(
        "setChatMenuButton",
        {"menu_button": {"type": "web_app", "text": "Security Dashboard", "web_app": {"url": WEB_APP_URL}}},
    )
    print("Mini App:", WEB_APP_URL)
