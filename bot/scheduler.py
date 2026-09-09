"""
Background scheduler for sending automated Daily Security DM Reports to admins.

Checks every 30 seconds against the user's configured report time (default: 07:00 AM
in Asia/Phnom_Penh timezone) and delivers a rich security summary directly to their DM.
"""
from __future__ import annotations

import logging
import threading
import time

from bot import config
from bot.redis_client import kv_get, kv_set
from bot.reports import (
    format_daily_dm_report,
    get_user_daily_report_settings,
    local_date,
    local_time_str,
)
from bot.telegram_api import TelegramAPI
from bot.utils import is_super_admin, super_admin_ids, whitelist_user_ids

logger = logging.getLogger("BeydaBot.scheduler")

_scheduler_running = False
_scheduler_thread: threading.Thread | null = None


def _check_and_send_daily_reports(api: TelegramAPI) -> None:
    cur_time = local_time_str()  # "HH:MM"
    cur_date = local_date()      # "YYYY-MM-DD"

    # All candidate admins who can receive daily reports
    all_users = whitelist_user_ids() | super_admin_ids()

    for uid in all_users:
        try:
            settings = get_user_daily_report_settings(uid)
            if not settings.get("enabled", True):
                continue

            target_time = settings.get("time", "07:00")
            if target_time != cur_time:
                continue

            sent_key = f"daily_report_sent:{cur_date}:{uid}"
            if kv_get(sent_key):
                continue

            logger.info("Generating daily DM report for user %d at %s...", uid, cur_time)
            report_text = format_daily_dm_report(api, uid, target_date=cur_date)
            if report_text:
                api.send_message(uid, report_text, parse_mode="HTML")
                logger.info("✓ Daily DM report sent successfully to user %d", uid)
            else:
                logger.debug("No active monitored groups to report for user %d", uid)

            # Mark sent for today with 48h TTL
            kv_set(sent_key, "1", ttl=86400 * 2)
        except Exception as exc:
            logger.warning("Failed to deliver daily DM report to user %d: %s", uid, exc)


def _scheduler_loop(api: TelegramAPI) -> None:
    logger.info("Daily report background scheduler started (checks every 30s in %s)...", config.REPORT_TIMEZONE)
    while _scheduler_running:
        try:
            _check_and_send_daily_reports(api)
        except Exception as exc:
            logger.error("Error in scheduler loop: %s", exc)
        time.sleep(30)


def start_daily_report_scheduler(api: TelegramAPI) -> None:
    global _scheduler_running, _scheduler_thread
    if _scheduler_running:
        return
    _scheduler_running = True
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        args=(api,),
        name="DailyReportScheduler",
        daemon=True,
    )
    _scheduler_thread.start()


def stop_daily_report_scheduler() -> None:
    global _scheduler_running
    _scheduler_running = False
