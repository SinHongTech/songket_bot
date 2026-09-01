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
    web_app_dest = (WEB_APP_URL.rstrip("/") + "/dashboard") if WEB_APP_URL else ""
    call(
        "setChatMenuButton",
        {
            "menu_button": {
                "type": "web_app",
                "text": "🛡️ Mini App",
                "web_app": {"url": web_app_dest},
            }
        },
    )
    call(
        "setMyCommands",
        {
            "commands": [
                {"command": "scan", "description": "Scan link or file for threats"},
                {"command": "plan", "description": "My Plan & Scan Limits"},
                {"command": "privacy", "description": "Privacy Policy"},
                {"command": "help", "description": "How to use Songket"},
                {"command": "terms", "description": "Terms of Service"},
            ]
        },
    )
    print("Chat menu button set to Mini App:", web_app_dest)
