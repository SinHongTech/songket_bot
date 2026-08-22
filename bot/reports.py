"""Persist and read daily per-group scan statistics.

The same Upstash Redis account is shared with the Vercel Mini App
(`api/dashboard.py`), which reads the `report:{date}:{group_id}` keys
written here to render the security dashboard.
"""
from __future__ import annotations

from datetime import datetime

from bot import config
from bot.redis_client import kv_json_get, kv_json_set

REPORT_METRICS = (
    "scanned", "files", "urls", "malicious", "deleted", "suspicious", "errors", "oversize",
)


def local_date() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(config.REPORT_TIMEZONE)).date().isoformat()
    except Exception:
        return datetime.utcnow().date().isoformat()


def record_report(chat_id: int, chat_title: str, metric: str, amount: int = 1) -> None:
    """Persist one daily metric for a Telegram group.

    Reports are keyed by group, not by admin, so one group is counted once
    no matter how many admins are watching its dashboard.
    """
    day = local_date()
    key = f"report:{day}:{chat_id}"
    report = kv_json_get(key) or {
        "date": day,
        "group_id": chat_id,
        "group_title": chat_title or str(chat_id),
        **{m: 0 for m in REPORT_METRICS},
    }
    report["group_title"] = chat_title or report.get("group_title") or str(chat_id)
    report[metric] = int(report.get(metric, 0)) + amount
    kv_json_set(key, report, ttl=config.REPORT_TTL_SECONDS)


def get_report(chat_id: int, day: str) -> dict:
    return kv_json_get(f"report:{day}:{chat_id}") or {"date": day, "group_id": chat_id, **{m: 0 for m in REPORT_METRICS}}
