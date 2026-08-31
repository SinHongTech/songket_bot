"""
PED Telegram Security Bot — entry point.

Long-polls Telegram for updates (via a local `telegram-bot-api` server by
default) and dispatches each one to a worker thread so a slow VirusTotal
scan or the suspicious-message delay never blocks the polling loop.
"""
from __future__ import annotations

import logging
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from bot import config
from bot.handlers import process_update
from bot.redis_client import kv_get, kv_set
from bot.telegram_api import TelegramAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("BeydaBot.main")

OFFSET_KEY = "bot:update_offset"
_running = True


def _handle_shutdown(signum, frame) -> None:  # noqa: ANN001
    global _running
    logger.info("Received signal %s, shutting down...", signum)
    _running = False


def _safe_process(api: TelegramAPI, update: dict) -> None:
    try:
        process_update(api, update)
    except Exception:
        logger.exception("Unhandled error while processing update %s", update.get("update_id"))


def main() -> None:
    config.validate()
    if not config.BOT_TOKEN:
        logger.critical("Cannot start without BOT_TOKEN. Exiting.")
        sys.exit(1)

    api = TelegramAPI()
    api.delete_webhook()  # getUpdates is rejected while a webhook is registered

    # Menu button opens the command menu (Privacy / Help / Terms by default).
    api.set_chat_menu_button("commands")
    api.set_my_commands([
        {"command": "privacy", "description": "Privacy Policy"},
        {"command": "help", "description": "How to use Songket"},
        {"command": "terms", "description": "Terms of Service"},
        {"command": "lang", "description": "My chat language"},
        {"command": "app", "description": "Open Mini App"},
    ])

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    offset = int(kv_get(OFFSET_KEY) or 0)
    logger.info("Starting long-polling loop from offset=%d", offset)

    with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
        while _running:
            try:
                updates = api.get_updates(offset=offset, timeout=config.POLL_TIMEOUT)
            except Exception as exc:
                logger.error("get_updates failed: %s", exc)
                time.sleep(5)
                continue

            for update in updates:
                offset = update["update_id"] + 1
                executor.submit(_safe_process, api, update)

            if updates:
                kv_set(OFFSET_KEY, offset)

    logger.info("Bot stopped.")


if __name__ == "__main__":
    main()
