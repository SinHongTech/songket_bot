"""Telegram Mini App API: validates initData and returns dashboard data only
to whitelisted users. Deployed on Vercel at POST /api/dashboard."""
import json
import logging
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler

try:
    from api.common import (
        get_allowed_groups,
        get_chat,
        get_system_config,
        groups_for_user,
        is_super_admin,
        kv_json_get,
        local_date,
        save_system_config,
        verify_telegram_init_data,
        whitelist_ids,
    )
except ImportError:
    from common import (
        get_allowed_groups,
        get_chat,
        get_system_config,
        groups_for_user,
        is_super_admin,
        kv_json_get,
        local_date,
        save_system_config,
        verify_telegram_init_data,
        whitelist_ids,
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BeydaWebApp")

METRICS = ("scanned", "files", "urls", "malicious", "deleted", "suspicious", "errors", "oversize")


def build_dashboard(user_id: int, days: int = 7) -> dict:
    days = max(1, min(31, days))
    allowed_groups = get_allowed_groups()
    group_ids = groups_for_user(user_id, allowed_groups)
    groups = []
    totals = {m: 0 for m in METRICS}
    today = date.fromisoformat(local_date())

    for gid in group_ids:
        daily = []
        title = None
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            report = kv_json_get(f"report:{day}:{gid}") or {}
            if not title:
                title = report.get("group_title")
            row = {"date": day, **{m: int(report.get(m, 0)) for m in METRICS}}
            daily.append(row)
            for k in totals:
                totals[k] += row[k]
        if not title:
            chat = get_chat(gid)
            title = (chat or {}).get("title") or str(gid)
        groups.append({"id": gid, "title": title, "daily": daily})

    return {"authorized": True, "user_id": user_id, "groups": groups, "totals": totals, "days": days}


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A002
        pass

    def do_OPTIONS(self):  # noqa: N802
        self._respond(204, "")

    def do_GET(self):  # noqa: N802
        self._json(200, {"ok": True, "service": "Telegram Security Mini App"})

    def do_POST(self):  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            user = verify_telegram_init_data(body.get("initData", ""))
            if not user:
                return self._json(401, {"authorized": False, "error": "Invalid or expired Telegram session"})

            uid = int(user["id"])
            super_admin = is_super_admin(uid)

            # Action: Save System Configuration (Super Admin only)
            if body.get("action") == "save_config":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                whitelist = [int(x) for x in body.get("whitelist", []) if str(x).strip()]
                allowed_groups = [int(x) for x in body.get("allowed_groups", []) if str(x).strip()]
                group_handlers = body.get("group_handlers", {})
                ok = save_system_config(whitelist, allowed_groups, group_handlers)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            if not super_admin and uid not in whitelist_ids():
                return self._json(
                    200,
                    {
                        "authorized": False,
                        "is_super_admin": False,
                        "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                    },
                )

            return self._json(
                200,
                {
                    "authorized": True,
                    "is_super_admin": super_admin,
                    "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                    "dashboard": build_dashboard(uid, int(body.get("days", 7))),
                    "config": get_system_config() if super_admin else None,
                },
            )
        except Exception:
            logger.exception("Mini App error")
            return self._json(500, {"authorized": False, "error": "Server error"})

    def _json(self, status: int, obj: dict) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode())

    def _respond(self, status: int, body: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body.encode())
