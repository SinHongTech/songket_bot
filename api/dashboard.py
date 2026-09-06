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
        super_admin_ids,
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
        is_totp_enabled,
        get_user_totp_secret,
        set_pending_totp,
        get_pending_totp,
        save_user_totp,
        disable_user_totp,
        verify_user_totp_or_backup,
    )
    from api.totp import (
        generate_totp_secret,
        get_totp_uri,
        verify_totp_code,
        generate_backup_codes,
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
        super_admin_ids,
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
        is_totp_enabled,
        get_user_totp_secret,
        set_pending_totp,
        get_pending_totp,
        save_user_totp,
        disable_user_totp,
        verify_user_totp_or_backup,
    )
    from totp import (
        generate_totp_secret,
        get_totp_uri,
        verify_totp_code,
        generate_backup_codes,
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BeydaWebApp")

METRICS = ("scanned", "files", "urls", "malicious", "deleted", "suspicious", "errors", "oversize")


def build_dashboard(user_id: int, days: int = 31) -> dict:
    history_days = max(31, min(90, int(days or 31)))
    allowed_groups = get_allowed_groups()
    group_ids = groups_for_user(user_id, allowed_groups)
    groups = []
    totals = {m: 0 for m in METRICS}
    today = date.fromisoformat(local_date())

    for gid in group_ids:
        daily = []
        title = None
        for offset in range(history_days - 1, -1, -1):
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

    return {"authorized": True, "user_id": user_id, "groups": groups, "totals": totals, "days": history_days}


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
            init_raw = body.get("initData", "")
            raw_hash = body.get("rawHash", "")
            platform = body.get("platform", "")
            unsafe_user = body.get("initDataUnsafe", {}).get("user") if isinstance(body.get("initDataUnsafe"), dict) else None
            init_len = len(init_raw)

            logger.info("[Dashboard API] POST incoming action='%s', initData length=%d, platform=%s", action or "fetch_dashboard", init_len, platform)
            print(f"[Dashboard API] 📥 Incoming POST action='{action or 'fetch_dashboard'}' initData_len={init_len} platform='{platform}' unsafe_user={repr(unsafe_user)}", flush=True)
            if init_raw:
                print(f"[Dashboard API] 📥 initData snippet: {repr(init_raw[:160])}", flush=True)

            # ── 1. Unauthenticated Login Endpoints (PIN / TOTP) ──────────────
            if action == "login_pin":
                pin = str(body.get("pin", "")).strip()
                target_uid = int(body.get("user_id") or 0)
                
                # Check target user or all candidate admin UIDs
                candidate_uids = [target_uid] if target_uid else list(super_admin_ids()) + list(whitelist_ids())
                matched_uid = None
                locked_sec = 0

                for candidate in candidate_uids:
                    lock = pin_lock_seconds(candidate)
                    if lock > 0:
                        locked_sec = max(locked_sec, lock)
                        continue
                    if verify_pin(candidate, pin):
                        matched_uid = candidate
                        break

                if matched_uid:
                    reset_pin_fail(matched_uid)
                    token = create_session(matched_uid)
                    logger.info("[PIN] login_pin SUCCESS for uid=%d", matched_uid)
                    print(f"[Dashboard API] 🟢 PIN Login SUCCESS for uid={matched_uid}, session={token[:8]}..", flush=True)
                    return self._json(200, {"ok": True, "session": token, "user_id": matched_uid})

                rec_uid = candidate_uids[0] if candidate_uids else 1221693150
                fails = record_pin_fail(rec_uid)
                curr_lock = pin_lock_seconds(rec_uid)
                logger.warning("[PIN] login_pin INCORRECT (attempt=%s, locked=%ds)", fails.get("count", 0), curr_lock)
                print(f"[Dashboard API] ❌ PIN Login INCORRECT (attempt={fails.get('count', 0)}, locked={curr_lock}s)", flush=True)
                return self._json(
                    200,
                    {
                        "ok": False,
                        "locked": curr_lock,
                        "attempts": fails.get("count", 0),
                        "error": "Incorrect PIN",
                    },
                )

            if action == "login_totp":
                code = str(body.get("code", "")).strip()
                candidate_uids = list(super_admin_ids()) + list(whitelist_ids())
                matched_uid = None

                for candidate in candidate_uids:
                    if verify_user_totp_or_backup(candidate, code):
                        matched_uid = candidate
                        break

                if matched_uid:
                    reset_pin_fail(matched_uid)
                    token = create_session(matched_uid)
                    logger.info("[TOTP] login_totp SUCCESS for uid=%d", matched_uid)
                    print(f"[Dashboard API] 🟢 TOTP Login SUCCESS for uid={matched_uid}, session={token[:8]}..", flush=True)
                    return self._json(200, {"ok": True, "session": token, "user_id": matched_uid})

                print(f"[Dashboard API] ❌ TOTP Login failed: invalid code", flush=True)
                return self._json(400, {"ok": False, "error": "Invalid 2FA code or backup code"})

            # ── 2. Authenticate via Telegram HMAC, Unsafe User or PIN Session ─
            user, debug_str = verify_telegram_init_data(init_raw, raw_hash=raw_hash, unsafe_user=unsafe_user)
            if not user:
                session_tok = body.get("session", "")
                if session_tok:
                    s_uid = validate_session(session_tok)
                    if s_uid and (s_uid in super_admin_ids() or s_uid in whitelist_ids()):
                        user = {"id": s_uid, "first_name": f"Admin_{s_uid}", "username": "admin"}
                        debug_str = "OK (session)"
                        logger.info("[Dashboard API] Telegram session authenticated via active PIN session for uid=%d", s_uid)
                        print(f"[Dashboard API] 🟢 Authenticated via active PIN session for uid={s_uid}", flush=True)

            if not user:
                logger.warning("[Dashboard API] Rejected POST request: %s (len=%d, platform=%s)", debug_str, init_len, platform)
                print(f"[Dashboard API] ❌ Auth Failed: {debug_str} (initData len={init_len}, platform={platform})", flush=True)
                return self._json(
                    401,
                    {
                        "authorized": False,
                        "error": f"Auth failed: {debug_str}",
                        "debug": {
                            "platform": platform,
                            "initData_len": init_len,
                            "has_raw_hash": bool(raw_hash),
                            "has_unsafe_user": bool(unsafe_user),
                        },
                    },
                )

            uid = int(user["id"])
            super_admin = is_super_admin(uid)
            is_admin = super_admin or uid in whitelist_ids()
            logger.info("[Dashboard API] User uid=%d (super_admin=%s, is_admin=%s)", uid, super_admin, is_admin)
            print(f"[Dashboard API] 🟢 Auth Success: uid={uid} (@{user.get('username', 'none')}) super_admin={super_admin} is_admin={is_admin} action={action or 'fetch_dashboard'}", flush=True)

            # ── PIN & TOTP Actions (Dedicated for Manage Tab) ───────────
            if action == "check_pin":
                exists = pin_exists(uid)
                locked = pin_lock_seconds(uid)
                totp_on = is_totp_enabled(uid)
                logger.info("[PIN] check_pin uid=%d exists=%s locked=%ds totp=%s", uid, exists, locked, totp_on)
                return self._json(
                    200,
                    {
                        "ok": True,
                        "pin_exists": exists,
                        "locked": locked,
                        "totp_enabled": totp_on,
                    },
                )

            if action == "totp_status":
                return self._json(200, {"ok": True, "totp_enabled": is_totp_enabled(uid)})

            if action == "setup_totp":
                sec = generate_totp_secret()
                set_pending_totp(uid, sec)
                uname = user.get("username") or user.get("first_name") or f"Admin_{uid}"
                uri = get_totp_uri(sec, uname, "Songket")
                logger.info("[TOTP] setup_totp initiated for uid=%d", uid)
                return self._json(200, {"ok": True, "secret": sec, "uri": uri})

            if action == "confirm_setup_totp":
                code = body.get("code", "")
                pending = get_pending_totp(uid)
                if not pending:
                    return self._json(400, {"ok": False, "error": "Setup session expired. Please tap setup again."})
                if not verify_totp_code(pending, code, window=1):
                    return self._json(400, {"ok": False, "error": "Invalid 6-digit code. Please check your Google Authenticator app."})
                backups = generate_backup_codes(3)
                save_user_totp(uid, pending, backups)
                logger.info("[TOTP] 2FA enabled for uid=%d", uid)
                return self._json(200, {"ok": True, "totp_enabled": True, "backup_codes": backups})

            if action == "reset_pin_with_totp":
                code = body.get("code", "")
                if not is_totp_enabled(uid):
                    return self._json(400, {"ok": False, "error": "Google Authenticator (2FA) is not enabled on this account."})
                if not verify_user_totp_or_backup(uid, code):
                    fails = record_pin_fail(uid)
                    logger.warning("[TOTP] reset_pin_with_totp FAILED for uid=%d (attempt=%s)", uid, fails.get("count", 0))
                    return self._json(400, {"ok": False, "error": "Invalid 6-digit code or backup code."})
                reset_user_pin(uid)
                reset_pin_fail(uid)
                logger.info("[TOTP] reset_pin_with_totp SUCCESS for uid=%d", uid)
                return self._json(200, {"ok": True, "pin_exists": False, "message": "PIN reset successfully! Please create your new PIN."})

            if action == "disable_totp":
                code = body.get("code", "")
                pin = body.get("pin", "")
                valid = False
                if pin and verify_pin(uid, pin):
                    valid = True
                elif code and verify_user_totp_or_backup(uid, code):
                    valid = True
                if not valid:
                    return self._json(400, {"ok": False, "error": "Verification failed. Incorrect PIN or code."})
                disable_user_totp(uid)
                logger.info("[TOTP] 2FA disabled for uid=%d", uid)
                return self._json(200, {"ok": True, "totp_enabled": False})

            if action == "reset_pin":
                # Legacy open reset - only if TOTP is NOT enabled
                if is_totp_enabled(uid):
                    return self._json(400, {"ok": False, "totp_required": True, "error": "2FA is active. Please use your Google Authenticator code to reset."})
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
                print(f"[Dashboard API] ⚠️ Access denied for uid={uid} (@{user.get('username')}) - not in whitelist. Whitelist: {whitelist_ids()}", flush=True)
                return self._json(
                    200,
                    {
                        "authorized": False,
                        "is_super_admin": False,
                        "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
                        "error": f"User {uid} not in whitelist",
                    },
                )

            return self._json(200, self._full_payload(uid, user, super_admin, body))
        except Exception:
            logger.exception("Mini App error")
            return self._json(500, {"authorized": False, "error": "Server error"})

    def _full_payload(self, uid: int, user: dict, super_admin: bool, body: dict, session: str = "") -> dict:
        tok = session or body.get("session") or create_session(uid)
        payload = {
            "authorized": True,
            "is_super_admin": super_admin,
            "user": {"id": uid, "first_name": user.get("first_name", ""), "username": user.get("username", "")},
            "dashboard": build_dashboard(uid, int(body.get("days", 7))),
            "config": get_system_config() if super_admin else None,
            "plans": get_plan_catalog() if super_admin else None,
            "subscriptions": list_subscriptions() if super_admin else None,
            "pin_exists": pin_exists(uid),
            "totp_enabled": is_totp_enabled(uid),
            "session": tok,
        }
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
