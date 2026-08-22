"""Telegram Mini App API: validates initData and returns dashboard data only
to whitelisted users. Deployed on Vercel at POST /api/dashboard."""
import json
import logging
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler

from api.common import get_chat, groups_for_user, kv_json_get, local_date, verify_telegram_init_data, whitelist_ids

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BeydaWebApp")

ALLOWED_GROUPS = set()
for _x in os.environ.get("ALLOWED_GROUP_IDS", "").split(","):
    if _x.strip():
        try:
            ALLOWED_GROUPS.add(int(_x.strip()))
        except ValueError:
            pass

METRICS = ("scanned", "files", "urls", "malicious", "deleted", "suspicious", "errors", "oversize")


def build_dashboard(user_id: int, days: int = 7) -> dict:
    days = max(1, min(31, days))
    group_ids = groups_for_user(user_id, ALLOWED_GROUPS)
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
            if uid not in whitelist_ids():
                return self._json(
                    200,
                    {
                        "authorized": False,
                        "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                    },
                )

            return self._json(
                200,
                {
                    "authorized": True,
                    "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                    "dashboard": build_dashboard(uid, int(body.get("days", 7))),
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
