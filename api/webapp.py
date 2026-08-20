"""Telegram Mini App API: validates initData and returns dashboard data only to whitelisted users."""
import json, logging
from http.server import BaseHTTPRequestHandler
from datetime import timedelta, date
from api.common import verify_telegram_init_data, whitelist_ids, groups_for_user, kv_json_get, local_date, get_chat
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BeydaWebApp")

ALLOWED_GROUPS = set()
for x in os.environ.get("ALLOWED_GROUP_IDS", "").split(","):
    if x.strip():
        try: ALLOWED_GROUPS.add(int(x.strip()))
        except ValueError: pass


def build_dashboard(user_id: int, days: int = 7) -> dict:
    days = max(1, min(31, days))
    group_ids = groups_for_user(user_id, ALLOWED_GROUPS)
    groups = []
    totals = {"scanned":0,"files":0,"urls":0,"malicious":0,"deleted":0,"suspicious":0,"errors":0,"oversize":0}
    today = date.fromisoformat(local_date())
    for gid in group_ids:
        daily = []
        title = None
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            report = kv_json_get(f"report:{day}:{gid}") or {}
            if not title: title = report.get("group_title")
            row = {"date":day,"scanned":int(report.get("scanned",0)),"files":int(report.get("files",0)),"urls":int(report.get("urls",0)),"malicious":int(report.get("malicious",0)),"deleted":int(report.get("deleted",0)),"suspicious":int(report.get("suspicious",0)),"errors":int(report.get("errors",0)),"oversize":int(report.get("oversize",0))}
            daily.append(row)
            for k in totals: totals[k] += row[k]
        if not title:
            chat = get_chat(gid)
            title = (chat or {}).get("title") or str(gid)
        groups.append({"id":gid,"title":title,"daily":daily})
    return {"authorized": True, "user_id": user_id, "groups": groups, "totals": totals, "days": days}


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self._respond(204, "")

    def do_GET(self):
        self._respond(200, json.dumps({"ok":True,"service":"Telegram Security Mini App"}))

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length",0))
            body = json.loads(self.rfile.read(length) or b"{}")
            user = verify_telegram_init_data(body.get("initData", ""))
            if not user:
                return self._json(401, {"authorized":False,"error":"Invalid or expired Telegram session"})
            uid = int(user["id"])
            if uid not in whitelist_ids():
                return self._json(200, {"authorized":False,"user":{"id":uid,"first_name":user.get("first_name",""),"username":user.get("username","")}})
            return self._json(200, {"authorized":True,"user":{"id":uid,"first_name":user.get("first_name",""),"username":user.get("username","")},"dashboard":build_dashboard(uid, int(body.get("days",7)))})
        except Exception as exc:
            logger.exception("Mini App error")
            return self._json(500, {"authorized":False,"error":"Server error"})

    def _json(self, status, obj):
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode())

    def _respond(self,status,body):
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode())
