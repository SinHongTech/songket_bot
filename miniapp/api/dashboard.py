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
        alert_super_admin,
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
        reset_user_pin,
        save_allowed_groups,
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
        alert_super_admin,
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
        reset_user_pin,
        save_allowed_groups,
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
            action = body.get("action", "")
            init_len = len(body.get("initData", ""))
            logger.info("[Dashboard API] POST incoming action='%s', initData length=%d", action or "fetch_dashboard", init_len)

            user, debug_str = verify_telegram_init_data(body.get("initData", ""))
            if not user:
                logger.warning("[Dashboard API] Rejected POST request: %s (len=%d)", debug_str, init_len)
                try:
                    alert_super_admin(f"⚠️ [MiniApp Auth Failed]\nReason: {debug_str}\nAction: {action or 'fetch_dashboard'}\ninitData Length: {init_len}")
                except Exception:
                    pass
                return self._json(401, {"authorized": False, "error": f"Invalid or expired Telegram session ({debug_str})"})

            uid = int(user["id"])
            super_admin = is_super_admin(uid)
            is_admin = super_admin or uid in whitelist_ids()
            logger.info("[Dashboard API] User uid=%d (super_admin=%s, is_admin=%s)", uid, super_admin, is_admin)
            try:
                alert_super_admin(f"🟢 [MiniApp Auth Success]\nUser: {uid} (@{user.get('username', 'none')})\nSuperAdmin: {super_admin} | Admin: {is_admin}\nAction: {action or 'fetch_dashboard'}")
            except Exception:
                pass

            # ── PIN Actions (Dedicated for Manage Tab) ────────────────────
            if action == "check_pin":
                exists = pin_exists(uid)
                locked = pin_lock_seconds(uid)
                logger.info("[PIN] check_pin uid=%d exists=%s locked=%ds", uid, exists, locked)
                return self._json(
                    200,
                    {
                        "ok": True,
                        "pin_exists": exists,
                        "locked": locked,
                    },
                )

            if action == "reset_pin":
                logger.info("[PIN] reset_pin requested for uid=%d", uid)
                reset_user_pin(uid)
                reset_pin_fail(uid)
                logger.info("[PIN] reset_pin SUCCESS for uid=%d", uid)
                return self._json(200, {"ok": True, "pin_exists": False, "message": "PIN reset. Please setup a new PIN."})

            if action == "setup_pin":
                pin_len = len(body.get("pin", ""))
                logger.info("[PIN] setup_pin requested for uid=%d (digits=%d)", uid, pin_len)
                ok, err = setup_pin(uid, body.get("pin", ""), body.get("confirm", ""))
                if not ok:
                    logger.warning("[PIN] setup_pin FAILED for uid=%d: %s", uid, err)
                    return self._json(400, {"ok": False, "error": err})
                reset_pin_fail(uid)
                token = create_session(uid)
                logger.info("[PIN] setup_pin SUCCESS for uid=%d", uid)
                return self._json(200, {"ok": True, "session": token})

            if action == "login_pin":
                lock = pin_lock_seconds(uid)
                if lock > 0:
                    logger.warning("[PIN] login_pin REJECTED for uid=%d (locked for %ds)", uid, lock)
                    return self._json(200, {"ok": False, "locked": lock, "error": f"Locked. Try again in {lock}s"})
                if verify_pin(uid, body.get("pin", "")):
                    reset_pin_fail(uid)
                    token = create_session(uid)
                    logger.info("[PIN] login_pin SUCCESS for uid=%d", uid)
                    return self._json(200, {"ok": True, "session": token})
                fails = record_pin_fail(uid)
                logger.warning("[PIN] login_pin INCORRECT for uid=%d (attempt=%s)", uid, fails.get("count", 0))
                return self._json(
                    200,
                    {
                        "ok": False,
                        "locked": pin_lock_seconds(uid),
                        "attempts": fails.get("count", 0),
                        "error": "Incorrect PIN",
                    },
                )

            # Check PIN session for all sensitive management mutations
            if action in {"save_config", "save_groups", "save_plans", "assign_plan", "remove_plan"}:
                session_uid = validate_session(body.get("session", ""))
                if session_uid != uid:
                    return self._json(403, {"ok": False, "error": "PIN verification required for management changes."})

            # Action: Save System Configuration (Super Admin only)
            if body.get("action") == "save_config":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                whitelist = [int(x) for x in body.get("whitelist", []) if str(x).strip()]
                allowed_groups = [int(x) for x in body.get("allowed_groups", []) if str(x).strip()]
                group_handlers = body.get("group_handlers", {})
                ok = save_system_config(whitelist, allowed_groups, group_handlers)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Save monitored groups (any authorized admin)
            if body.get("action") == "save_groups":
                if not (super_admin or uid in whitelist_ids()):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                groups = [int(x) for x in body.get("allowed_groups", []) if str(x).strip()]
                ok = save_allowed_groups(groups)
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
            "pin_exists": pin_exists(uid),
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
