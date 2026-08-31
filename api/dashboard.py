"""Telegram Mini App API: validates initData and returns dashboard data only
to whitelisted users. Deployed on Vercel at POST /api/dashboard."""
import json
import logging
import os
import time
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler

try:
    from api.common import (
        PIN_AUTH_ENABLED,
        create_session,
        get_allowed_groups,
        get_chat,
        get_plan_catalog,
        get_system_config,
        groups_for_user,
        is_super_admin,
        kv_json_get,
        list_subscriptions,
        local_date,
        pin_exists,
        pin_lock_seconds,
        record_pin_fail,
        reset_pin_fail,
        save_plan_catalog,
        save_system_config,
        set_subscription,
        setup_pin,
        validate_session,
        verify_pin,
        verify_telegram_init_data,
        whitelist_ids,
    )
except ImportError:
    from common import (
        PIN_AUTH_ENABLED,
        create_session,
        get_allowed_groups,
        get_chat,
        get_plan_catalog,
        get_system_config,
        groups_for_user,
        is_super_admin,
        kv_json_get,
        list_subscriptions,
        local_date,
        pin_exists,
        pin_lock_seconds,
        record_pin_fail,
        reset_pin_fail,
        save_plan_catalog,
        save_system_config,
        set_subscription,
        setup_pin,
        validate_session,
        verify_pin,
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
            is_admin = super_admin or uid in whitelist_ids()

            # ── PIN gate (admin dashboard second factor) ──────────────────
            if PIN_AUTH_ENABLED and is_admin:
                session_uid = validate_session(body.get("session", ""))
                if session_uid != uid:
                    action = body.get("action", "")
                    logger.info(
                        "PIN gate | uid=%s | action=%s | pin_set=%s | lock=%ss",
                        uid, action or "-", pin_exists(uid), pin_lock_seconds(uid),
                    )

                    if action == "setup_pin":
                        ok, err = setup_pin(uid, body.get("pin", ""), body.get("confirm", ""))
                        if not ok:
                            return self._json(400, {"authorized": False, "pin_status": "setup", "error": err})
                        reset_pin_fail(uid)
                        token = create_session(uid)
                        return self._json(200, self._full_payload(uid, user, super_admin, body, token))

                    if action == "login_pin":
                        lock = pin_lock_seconds(uid)
                        if lock > 0:
                            return self._json(200, {"authorized": False, "pin_status": "login", "locked": lock})
                        if verify_pin(uid, body.get("pin", "")):
                            reset_pin_fail(uid)
                            token = create_session(uid)
                            return self._json(200, self._full_payload(uid, user, super_admin, body, token))
                        fails = record_pin_fail(uid)
                        return self._json(
                            200,
                            {
                                "authorized": False,
                                "pin_status": "login",
                                "locked": pin_lock_seconds(uid),
                                "attempts": fails.get("count", 0),
                                "error": "Incorrect PIN",
                            },
                        )

                    if not pin_exists(uid):
                        return self._json(200, {"authorized": False, "pin_status": "setup"})
                    lock = pin_lock_seconds(uid)
                    if lock > 0:
                        return self._json(200, {"authorized": False, "pin_status": "login", "locked": lock})
                    return self._json(200, {"authorized": False, "pin_status": "login"})

            # Action: Save System Configuration (Super Admin only)
            if body.get("action") == "save_config":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                whitelist = [int(x) for x in body.get("whitelist", []) if str(x).strip()]
                allowed_groups = [int(x) for x in body.get("allowed_groups", []) if str(x).strip()]
                group_handlers = body.get("group_handlers", {})
                ok = save_system_config(whitelist, allowed_groups, group_handlers)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Save plan catalog (Super Admin only)
            if body.get("action") == "save_plans":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                catalog = body.get("plans", {})
                ok = save_plan_catalog(catalog)
                return self._json(200, {"ok": ok, "plans": get_plan_catalog()})

            # Action: Assign a plan to a user (Super Admin only)
            if body.get("action") == "assign_plan":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                try:
                    target = int(body.get("user_id", 0))
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid user_id"})
                plan = str(body.get("plan", "")).strip()
                catalog = get_plan_catalog()
                if plan not in catalog:
                    return self._json(400, {"ok": False, "error": "Unknown plan"})
                expiry = int(time.time()) + int(os.environ.get("PLAN_EXPIRY_DAYS", "30")) * 86400
                ok = set_subscription(target, plan, expiry)
                return self._json(200, {"ok": ok, "subscriptions": list_subscriptions()})

            # Action: Revoke a plan (reset to free) (Super Admin only)
            if body.get("action") == "remove_plan":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                try:
                    target = int(body.get("user_id", 0))
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid user_id"})
                ok = set_subscription(target, "personal_free", 0)
                return self._json(200, {"ok": ok, "subscriptions": list_subscriptions()})

            if not super_admin and uid not in whitelist_ids():
                return self._json(
                    200,
                    {
                        "authorized": False,
                        "is_super_admin": False,
                        "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                    },
                )

            return self._json(200, self._full_payload(uid, user, super_admin, body))
        except Exception:
            logger.exception("Mini App error")
            return self._json(500, {"authorized": False, "error": "Server error"})

    def _full_payload(self, uid: int, user: dict, super_admin: bool, body: dict, session: str = "") -> dict:
        payload = {
            "authorized": True,
            "is_super_admin": super_admin,
            "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
            "dashboard": build_dashboard(uid, int(body.get("days", 7))),
            "config": get_system_config() if super_admin else None,
            "plans": get_plan_catalog() if super_admin else None,
            "subscriptions": list_subscriptions() if super_admin else None,
        }
        if session:
            payload["session"] = session
        return payload

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
