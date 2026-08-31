"""
Thin client around the Telegram Bot API.

Talks to either a self-hosted `telegram-bot-api` server (see
`telegram-bot-api/`) or the public `api.telegram.org`, selected via
`config.USE_LOCAL_BOT_API`. Using the local server removes the 20MB file
download cap imposed by the public API.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import requests

from bot import config

logger = logging.getLogger("BeydaBot.telegram")


class TelegramAPI:
    def __init__(self, token: str = config.BOT_TOKEN, use_local: bool = config.USE_LOCAL_BOT_API):
        if not token:
            logger.critical("TelegramAPI initialized without BOT_TOKEN")
        self.token = token
        if use_local:
            self.api_base = f"{config.TELEGRAM_LOCAL_API_URL}/bot{token}"
            self.file_base = f"{config.TELEGRAM_LOCAL_API_URL}/file/bot{token}"
        else:
            self.api_base = f"https://api.telegram.org/bot{token}"
            self.file_base = f"https://api.telegram.org/file/bot{token}"
        self.session = requests.Session()

    # ── low level ────────────────────────────────────────────────────────
    def _post(self, method: str, payload: dict, timeout: int = 10) -> dict:
        try:
            r = self.session.post(f"{self.api_base}/{method}", json=payload, timeout=timeout)
            data = r.json()
            if not data.get("ok"):
                logger.warning("%s failed: %s", method, data)
            return data
        except Exception as exc:
            logger.error("%s error: %s", method, exc)
            return {"ok": False, "error": str(exc)}

    def _get(self, method: str, params: Optional[dict] = None, timeout: int = 10) -> dict:
        try:
            r = self.session.get(f"{self.api_base}/{method}", params=params or {}, timeout=timeout)
            data = r.json()
            if not data.get("ok"):
                logger.warning("%s failed: %s", method, data)
            return data
        except Exception as exc:
            logger.error("%s error: %s", method, exc)
            return {"ok": False, "error": str(exc)}

    # ── updates ──────────────────────────────────────────────────────────
    def get_updates(self, offset: int, timeout: int = config.POLL_TIMEOUT) -> list[dict]:
        data = self._get(
            "getUpdates",
            params={
                "offset": offset,
                "timeout": timeout,
                "allowed_updates": json.dumps(["message", "edited_message", "callback_query"]),
            },
            timeout=timeout + 10,
        )
        if data.get("ok"):
            return data.get("result", [])
        return []

    def delete_webhook(self) -> None:
        # getUpdates (long polling) is rejected while a webhook is set.
        self._post("deleteWebhook", {"drop_pending_updates": False})

    # ── messaging ────────────────────────────────────────────────────────
    def send_message(self, chat_id: int, text: str, reply_markup: Optional[dict] = None) -> Optional[int]:
        payload: dict = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        data = self._post("sendMessage", payload)
        if data.get("ok"):
            return data["result"]["message_id"]
        return None

    def edit_message_text(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[dict] = None,
        parse_mode: str = "HTML",
    ) -> bool:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        data = self._post("editMessageText", payload)
        return data.get("ok", False)

    def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False,
    ) -> bool:
        payload: dict = {
            "callback_query_id": callback_query_id,
            "show_alert": show_alert,
        }
        if text:
            # Telegram Bot API enforces a strict 200-character limit on answerCallbackQuery
            payload["text"] = text[:197] + "..." if len(text) > 200 else text
        data = self._post("answerCallbackQuery", payload)
        return data.get("ok", False)

    def edit_message_reply_markup(
        self,
        chat_id: int,
        message_id: int,
        reply_markup: Optional[dict] = None,
    ) -> bool:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        data = self._post("editMessageReplyMarkup", payload)
        return data.get("ok", False)

    def delete_message(self, chat_id: int, message_id: int) -> bool:
        return self._post("deleteMessage", {"chat_id": chat_id, "message_id": message_id}).get("ok", False)

    # ── files ────────────────────────────────────────────────────────────
    def get_file_path(self, file_id: str) -> Optional[str]:
        data = self._get("getFile", params={"file_id": file_id}, timeout=15)
        logger.info("getFile response for %s: %s", file_id, data)
        if data.get("ok"):
            file_path = data["result"].get("file_path")
            logger.info("Extracted file_path for %s: %s", file_id, file_path)
            return file_path
        return None

    def download_file(self, file_id: str, timeout: int = 30) -> Optional[bytes]:
        file_path = self.get_file_path(file_id)
        if not file_path:
            return None

        if config.USE_LOCAL_BOT_API and file_path.startswith("/"):
            try:
                with open(file_path, "rb") as f:
                    return f.read()
            except Exception as exc:
                logger.error("File read from disk error: %s", exc)
                return None

        try:
            r = self.session.get(
                f"{self.file_base}/{file_path}",
                timeout=timeout,
            )

            if r.status_code == 200:
                return r.content

            logger.error(
                "File download HTTP %s for %s",
                r.status_code,
                file_path,
            )

        except Exception as exc:
            logger.error("File download error: %s", exc)

        return None

    # ── chats ────────────────────────────────────────────────────────────
    def get_chat(self, chat_id: int) -> Optional[dict]:
        data = self._post("getChat", {"chat_id": chat_id})
        return data.get("result") if data.get("ok") else None

    def get_chat_member(self, chat_id: int, user_id: int) -> Optional[dict]:
        data = self._post("getChatMember", {"chat_id": chat_id, "user_id": user_id})
        return data.get("result") if data.get("ok") else None

    def is_group_admin(self, user_id: int, chat_id: int) -> bool:
        member = self.get_chat_member(chat_id, user_id)
        return bool(member) and member.get("status") in {"creator", "administrator"}

    def restrict_chat_member(
        self,
        chat_id: int,
        user_id: int,
        can_send_messages: bool = False,
        can_send_other_messages: bool = False,
        can_add_web_page_previews: bool = False,
    ) -> bool:
        data = self._post(
            "restrictChatMember",
            {
                "chat_id": chat_id,
                "user_id": user_id,
                "permissions": {
                    "can_send_messages": can_send_messages,
                    "can_send_other_messages": can_send_other_messages,
                    "can_add_web_page_previews": can_add_web_page_previews,
                },
            },
        )
        return data.get("ok", False)

    def unrestrict_chat_member(self, chat_id: int, user_id: int) -> bool:
        data = self._post(
            "restrictChatMember",
            {
                "chat_id": chat_id,
                "user_id": user_id,
                "permissions": {
                    "can_send_messages": True,
                    "can_send_other_messages": True,
                    "can_add_web_page_previews": True,
                    "can_send_media_messages": True,
                    "can_send_polls": True,
                },
            },
        )
        return data.get("ok", False)

    def ban_chat_member(self, chat_id: int, user_id: int) -> bool:
        return self._post("banChatMember", {"chat_id": chat_id, "user_id": user_id}).get("ok", False)

    def set_chat_menu_button(self, web_app_url: str, text: str = "Menu") -> dict:
        return self._post(
            "setChatMenuButton",
            {"menu_button": {"type": "web_app", "text": text, "web_app": {"url": web_app_url}}},
        )
