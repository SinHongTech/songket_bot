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
        primary_admin_ids,
        add_super_admin,
        remove_super_admin,
        explicit_group_map,
        kv_set,
        kv_get,
        kv_mget,
        kv_json_get,
        kv_json_mget,
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
        get_domain_whitelist,
        save_domain_whitelist,
        get_threat_events,
        get_group_settings,
        set_group_settings,
        get_group_whitelisted_users,
        add_group_whitelisted_user,
        remove_group_whitelisted_user,
        get_group_muted_users,
        add_group_muted_user,
        remove_group_muted_user,
        get_group_whitelisted_files,
        add_group_whitelisted_file,
        remove_group_whitelisted_file,
        get_known_users,
        get_known_groups,
        add_allowed_group,
        remove_allowed_group,
        add_group_handler,
        record_known_group,
        remove_known_group,
        unlink_group_for_user,
        unlink_group_completely,
        get_candidate_groups_for_user,
        get_user_daily_report_settings,
        set_user_daily_report_settings,
        set_user_date_preferences,
        send_security_report_to_user_dm,
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
        primary_admin_ids,
        add_super_admin,
        remove_super_admin,
        explicit_group_map,
        kv_set,
        kv_get,
        kv_mget,
        kv_json_get,
        kv_json_mget,
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
        get_domain_whitelist,
        save_domain_whitelist,
        get_threat_events,
        get_group_settings,
        set_group_settings,
        get_group_whitelisted_users,
        add_group_whitelisted_user,
        remove_group_whitelisted_user,
        get_group_muted_users,
        add_group_muted_user,
        remove_group_muted_user,
        get_group_whitelisted_files,
        add_group_whitelisted_file,
        remove_group_whitelisted_file,
        get_known_users,
        get_known_groups,
        add_allowed_group,
        remove_allowed_group,
        add_group_handler,
        record_known_group,
        remove_known_group,
        unlink_group_for_user,
        unlink_group_completely,
        get_candidate_groups_for_user,
        get_user_daily_report_settings,
        set_user_daily_report_settings,
        set_user_date_preferences,
        send_security_report_to_user_dm,
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


def build_dashboard(user_id: int, days: int = 90, allowed_groups: list = None, known_groups: dict = None) -> dict:
    history_days = max(1, min(90, int(days or 90)))
    if allowed_groups is None:
        allowed_groups = get_allowed_groups()
    if known_groups is None:
        known_groups = get_known_groups()
    group_ids = groups_for_user(user_id, allowed_groups)
    groups = []
    totals = {m: 0 for m in METRICS}
    today = date.fromisoformat(local_date())

    days_list = [(today - timedelta(days=offset)).isoformat() for offset in range(history_days - 1, -1, -1)]

    # Generate all report keys for batch fetch
    all_report_keys = []
    key_map = {}
    for gid in group_ids:
        for day in days_list:
            k = f"report:{day}:{gid}"
            key_map[(gid, day)] = len(all_report_keys)
            all_report_keys.append(k)

    # Batch MGET all daily reports in 1 single roundtrip
    all_reports = kv_json_mget(all_report_keys) if all_report_keys else []

    for gid in group_ids:
        daily = []
        title = None
        for day in days_list:
            idx = key_map.get((gid, day))
            report = (
                all_reports[idx]
                if idx is not None and idx < len(all_reports) and isinstance(all_reports[idx], dict)
                else {}
            )
            if not title:
                title = report.get("group_title")
            row = {"date": day, **{m: int(report.get(m, 0) or 0) for m in METRICS}}
            daily.append(row)
            for k in totals:
                totals[k] += row[k]
        if not title or title == str(gid) or title == "Group":
            title = known_groups.get(str(gid)) or known_groups.get(gid)
            if not title or title == str(gid) or title == "Group":
                chat = get_chat(gid)
                title = (chat or {}).get("title") or known_groups.get(str(gid)) or str(gid)
        if title and title != str(gid) and title != "Group":
            record_known_group(gid, title)
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
            raw_search = body.get("rawSearch", "")
            platform = body.get("platform", "")
            unsafe_user = body.get("initDataUnsafe", {}).get("user") if isinstance(body.get("initDataUnsafe"), dict) else None
            init_len = len(init_raw)

            logger.info("[Dashboard API] POST incoming action='%s', initData length=%d, platform=%s", action or "fetch_dashboard", init_len, platform)

            # ── 1. Authenticate via Telegram HMAC, Unsafe User or PIN Session ─
            user, debug_str = verify_telegram_init_data(
                init_raw,
                raw_hash=raw_hash,
                raw_search=raw_search,
                unsafe_user=unsafe_user,
            )
            if not user:
                session_tok = body.get("session", "")
                if session_tok:
                    s_uid = validate_session(session_tok)
                    if s_uid and (s_uid in super_admin_ids() or s_uid in whitelist_ids()):
                        user = {"id": s_uid, "first_name": f"Admin_{s_uid}", "username": "admin"}
                        debug_str = "OK (session)"
                        logger.info("[Dashboard API] Telegram session authenticated via active PIN session for uid=%d", s_uid)

            if not user:
                logger.warning("[Dashboard API] Rejected POST request: %s (len=%d, platform=%s)", debug_str, init_len, platform)
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
            u_name = user.get("username", "")
            super_admin = is_super_admin(uid, u_name)
            is_admin = super_admin or uid in whitelist_ids() or str(u_name).lower().lstrip("@") in {"sin_hong", "sinhong"}
            user_groups = groups_for_user(uid, get_allowed_groups())
            logger.info("[Dashboard API] User uid=%d username=@%s (super_admin=%s, is_admin=%s)", uid, u_name, super_admin, is_admin)

            # ── 2. PIN & TOTP Actions (Bound Strictly to Authenticated uid) ──
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

            if action == "login_totp":
                code = str(body.get("code", "")).strip()
                if not is_totp_enabled(uid):
                    return self._json(400, {"ok": False, "error": "Google Authenticator (2FA) is not enabled on this account."})
                if verify_user_totp_or_backup(uid, code):
                    reset_pin_fail(uid)
                    token = create_session(uid)
                    logger.info("[TOTP] login_totp SUCCESS for uid=%d", uid)
                    full_data = self._full_payload(uid, user or {"id": uid}, is_super_admin(uid), body, session=token)
                    full_data["ok"] = True
                    full_data["session"] = token
                    full_data["user_id"] = uid
                    return self._json(200, full_data)
                fails = record_pin_fail(uid)
                logger.warning("[TOTP] login_totp INCORRECT for uid=%d (attempt=%s)", uid, fails.get("count", 0))
                return self._json(400, {"ok": False, "error": "Invalid 2FA code or backup code"})

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
                full_data = self._full_payload(uid, user or {"id": uid}, is_super_admin(uid), body, session=token)
                full_data["ok"] = True
                full_data["session"] = token
                full_data["user_id"] = uid
                return self._json(200, full_data)

            if action == "login_pin":
                lock = pin_lock_seconds(uid)
                if lock > 0:
                    logger.warning("[PIN] login_pin REJECTED for uid=%d (locked for %ds)", uid, lock)
                    return self._json(200, {"ok": False, "locked": lock, "error": f"Locked. Try again in {lock}s"})
                if verify_pin(uid, body.get("pin", "")):
                    reset_pin_fail(uid)
                    token = create_session(uid)
                    logger.info("[PIN] login_pin SUCCESS for uid=%d", uid)
                    full_data = self._full_payload(uid, user or {"id": uid}, is_super_admin(uid), body, session=token)
                    full_data["ok"] = True
                    full_data["session"] = token
                    full_data["user_id"] = uid
                    return self._json(200, full_data)
                fails = record_pin_fail(uid)
                curr_lock = pin_lock_seconds(uid)
                logger.warning("[PIN] login_pin INCORRECT for uid=%d (attempt=%s, locked=%ds)", uid, fails.get("count", 0), curr_lock)
                return self._json(
                    200,
                    {
                        "ok": False,
                        "locked": curr_lock,
                        "attempts": fails.get("count", 0),
                        "error": "Incorrect PIN",
                    },
                )

            # Check PIN session for all sensitive management mutations
            if action in {"save_config", "save_groups", "save_plans", "assign_plan", "remove_plan", "add_super_admin", "remove_super_admin"}:
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
                super_admins = [int(x) for x in body.get("super_admin_ids", []) if str(x).strip()]
                ok = save_system_config(whitelist, allowed_groups, group_handlers, super_admins)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Add Super Admin (Super Admin + TOTP verification)
            if body.get("action") == "add_super_admin":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                if not is_totp_enabled(uid):
                    return self._json(400, {
                        "ok": False,
                        "error": "2FA (Google Authenticator) is required on your account before adding Super Admins. Please enable 2FA in Account settings.",
                        "totp_required": True,
                    })
                code = str(body.get("totp_code") or body.get("code") or "").strip()
                if not code or not verify_user_totp_or_backup(uid, code):
                    return self._json(400, {"ok": False, "error": "Invalid Authenticator (2FA) code."})
                try:
                    target_uid = int(body.get("target_user_id") or body.get("user_id") or 0)
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid user_id"})
                if not target_uid:
                    return self._json(400, {"ok": False, "error": "Missing target_user_id"})
                
                ok = add_super_admin(target_uid)
                wl = whitelist_ids()
                if target_uid not in wl:
                    wl.add(target_uid)
                    kv_set("config:whitelist_user_ids", ",".join(str(x) for x in sorted(list(wl))))
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Remove Super Admin (Super Admin + TOTP verification)
            if body.get("action") == "remove_super_admin":
                if not super_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized. Super Admin access required."})
                if not is_totp_enabled(uid):
                    return self._json(400, {
                        "ok": False,
                        "error": "2FA (Google Authenticator) is required on your account before removing Super Admins. Please enable 2FA in Account settings.",
                        "totp_required": True,
                    })
                code = str(body.get("totp_code") or body.get("code") or "").strip()
                if not code or not verify_user_totp_or_backup(uid, code):
                    return self._json(400, {"ok": False, "error": "Invalid Authenticator (2FA) code."})
                try:
                    target_uid = int(body.get("target_user_id") or body.get("user_id") or 0)
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid user_id"})
                if not target_uid:
                    return self._json(400, {"ok": False, "error": "Missing target_user_id"})
                if target_uid in primary_admin_ids():
                    return self._json(400, {"ok": False, "error": "Primary Super Admin (ADMIN_CHAT_ID) cannot be removed."})
                
                ok = remove_super_admin(target_uid)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Save monitored groups (any authorized admin)
            if body.get("action") == "save_groups":
                if not (super_admin or uid in whitelist_ids()):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                groups = [int(x) for x in body.get("allowed_groups", []) if str(x).strip()]
                ok = save_allowed_groups(groups)
                return self._json(200, {"ok": ok, "config": get_system_config()})

            # Action: Add / Link group directly from Mini App UI (handles both super & group admin)
            if body.get("action") in {"add_group", "link_group"}:
                if not (super_admin or uid in whitelist_ids() or is_admin):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                try:
                    raw_gid = body.get("group_id")
                    new_gid = int(raw_gid)
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid group_id"})
                if not new_gid:
                    return self._json(400, {"ok": False, "error": "Missing group_id"})

                # Add to allowed groups so bot monitors it
                add_allowed_group(new_gid)

                # Link to admin's explicit group handler mapping so admin can manage it
                add_group_handler(uid, new_gid)

                # Record / cache title
                g_title = str(body.get("title", "")).strip()
                if not g_title:
                    chat_info = get_chat(new_gid)
                    if chat_info and chat_info.get("title"):
                        g_title = chat_info["title"]
                if g_title:
                    record_known_group(new_gid, g_title)

                return self._json(200, {
                    "ok": True,
                    "group_id": new_gid,
                    "title": g_title or f"Group {new_gid}",
                    "config": get_system_config(),
                })

            # Action: Remove / Unlink group (handles both super & group admin)
            if body.get("action") in {"remove_group", "unlink_group"}:
                if not (super_admin or uid in whitelist_ids() or is_admin):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                try:
                    raw_gid = body.get("group_id")
                    target_gid = int(raw_gid)
                except (TypeError, ValueError):
                    return self._json(400, {"ok": False, "error": "Invalid group_id"})
                if not target_gid:
                    return self._json(400, {"ok": False, "error": "Missing group_id"})

                unlink_group_for_user(uid, target_gid)
                return self._json(200, {
                    "ok": True,
                    "group_id": target_gid,
                    "config": get_system_config(),
                })

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

            # Action: Save Trusted Domain Whitelist (Any authorized admin)
            if body.get("action") == "save_domain_whitelist":
                if not is_admin:
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                domains = body.get("domains", [])
                ok = save_domain_whitelist(domains)
                return self._json(200, {"ok": ok, "domain_whitelist": get_domain_whitelist()})

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

            # Action: Save Group Settings (Language, Safe Timer, etc.)
            if body.get("action") == "save_group_settings":
                gid = int(body.get("group_id", 0))
                if not gid or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                settings_data = body.get("settings", {})
                ok = set_group_settings(gid, settings_data)
                return self._json(200, {"ok": ok, "settings": get_group_settings(gid)})

            # Action: Add User to Group Whitelist
            if body.get("action") == "add_group_whitelist_user":
                gid = int(body.get("group_id", 0))
                target_uid = int(body.get("target_user_id", 0))
                if not gid or not target_uid or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                u_name = str(body.get("username", "")).lstrip("@")
                d_name = str(body.get("name", ""))
                ok = add_group_whitelisted_user(gid, target_uid, username=u_name, name=d_name)
                if target_uid and u_name:
                    record_known_user(target_uid, u_name, d_name)
                return self._json(200, {"ok": ok, "whitelisted_users": get_group_whitelisted_users(gid)})

            # Action: Remove User from Group Whitelist
            if body.get("action") == "remove_group_whitelist_user":
                gid = int(body.get("group_id", 0))
                target_uid = int(body.get("target_user_id", 0))
                if not gid or not target_uid or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                ok = remove_group_whitelisted_user(gid, target_uid)
                return self._json(200, {"ok": ok, "whitelisted_users": get_group_whitelisted_users(gid)})

            # Action: Unmute User in Group
            if body.get("action") == "unmute_group_user":
                gid = int(body.get("group_id", 0))
                target_uid = int(body.get("target_user_id", 0))
                if not gid or not target_uid or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                ok = remove_group_muted_user(gid, target_uid)
                return self._json(200, {"ok": ok, "muted_users": get_group_muted_users(gid)})

            # Action: Add File to Group Whitelist
            if body.get("action") == "add_group_whitelist_file":
                gid = int(body.get("group_id", 0))
                sha = str(body.get("sha256", "")).strip().lower()
                fname = str(body.get("filename", "")).strip()
                if not gid or not sha or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                ok = add_group_whitelisted_file(gid, sha, filename=fname)
                return self._json(200, {"ok": ok, "whitelisted_files": get_group_whitelisted_files(gid)})

            # Action: Remove File from Group Whitelist
            if body.get("action") == "remove_group_whitelist_file":
                gid = int(body.get("group_id", 0))
                sha = str(body.get("sha256", "")).strip().lower()
                if not gid or not sha or not (super_admin or gid in user_groups):
                    return self._json(403, {"ok": False, "error": "Unauthorized"})
                ok = remove_group_whitelisted_file(gid, sha)
                return self._json(200, {"ok": ok, "whitelisted_files": get_group_whitelisted_files(gid)})

            # Action: Save User Preferences & Report Settings
            if body.get("action") == "save_user_settings":
                en = body.get("daily_report_enabled")
                t_str = body.get("daily_report_time")
                freq = body.get("report_frequency")
                rlang = body.get("report_lang") or body.get("lang")
                ok = set_user_daily_report_settings(
                    uid,
                    enabled=en,
                    time_str=t_str,
                    frequency=freq,
                    lang=rlang,
                )
                return self._json(200, {"ok": ok, "user_settings": get_user_daily_report_settings(uid)})

            # Action: Save User Date Preferences
            if body.get("action") == "save_date_preferences":
                ok = set_user_date_preferences(
                    uid,
                    home_date_from=body.get("home_date_from"),
                    home_date_to=body.get("home_date_to"),
                    threats_date_from=body.get("threats_date_from"),
                    threats_date_to=body.get("threats_date_to"),
                    history_date_from=body.get("history_date_from"),
                    history_date_to=body.get("history_date_to"),
                    last_read_threat_ts=body.get("last_read_threat_ts"),
                )
                return self._json(200, {"ok": ok, "user_settings": get_user_daily_report_settings(uid)})

            # Action: Request Immediate Report Delivery to Telegram DM (Daily, Weekly, Monthly)
            if body.get("action") == "request_report":
                period = str(body.get("period", "daily")).strip().lower()
                rlang = body.get("report_lang") or body.get("lang")
                result = send_security_report_to_user_dm(uid, period=period, lang=rlang)
                return self._json(200, result)

            user_groups = groups_for_user(uid, get_allowed_groups())
            has_dashboard_access = super_admin or is_admin or uid in whitelist_ids() or bool(user_groups)

            if not has_dashboard_access:
                logger.warning("[Dashboard API] Access denied for uid=%d (@%s) - not in whitelist and no group access", uid, user.get("username"))
                k_info = get_known_users().get(str(uid), {})
                fn = user.get("first_name", "")
                ln = user.get("last_name", "")
                un = user.get("username") or k_info.get("username", "")
                full_n = f"{fn} {ln}".strip() or k_info.get("name", "") or (f"@{un}" if un else f"Admin_{uid}")
                return self._json(
                    200,
                    {
                        "authorized": False,
                        "is_super_admin": False,
                        "user": {"id": uid, "first_name": fn, "last_name": ln, "username": un, "name": full_n},
                        "error": f"User {uid} not in whitelist",
                    },
                )

            return self._json(200, self._full_payload(uid, user, super_admin, body))
        except Exception:
            logger.exception("Mini App error")
            return self._json(500, {"authorized": False, "error": "Server error"})

    def _full_payload(self, uid: int, user: dict, super_admin: bool, body: dict, session: str = "") -> dict:
        tok = session or body.get("session") or create_session(uid)
        days = max(1, min(90, int(body.get("days") or 90)))

        # 1. First fetch base system and user configuration keys in 1 fast roundtrip
        base_keys = [
            "config:allowed_groups",
            "known_groups",
            "config:known_groups",
            "config:group_handlers",
            "meta:known_users",
            "config:domain_whitelist",
            "config:whitelist_user_ids",
            "config:super_admin_ids",
            "config:plan_catalog",
            "subs:index",
            f"user_candidate_groups:{uid}",
            f"settings:user:{uid}",
            f"pin:{uid}",
            f"totp:secret:{uid}",
            f"pin:fail:{uid}",
            f"pin:lock:{uid}",
            "threat_events:recent",
        ]
        kv_mget(base_keys)

        # Cache shared group maps
        allowed_groups = get_allowed_groups()
        known_groups = get_known_groups()

        # 2. Gather group inviter & title cache keys for all allowed & known groups
        all_candidate_gids = set(allowed_groups)
        for g in known_groups:
            if str(g).lstrip("-").isdigit():
                all_candidate_gids.add(int(g))

        group_meta_keys = []
        for gid in all_candidate_gids:
            group_meta_keys.extend([
                f"cache:chat_title:{gid}",
                f"group:inviter:{gid}",
                f"cache:is_admin:{gid}:{uid}",
                f"settings:group:{gid}",
                f"whitelist:users:{gid}",
                f"muted:users:{gid}",
                f"whitelist:files:{gid}",
            ])

        group_ids = groups_for_user(uid, allowed_groups)
        today = date.fromisoformat(local_date())
        days_list = [(today - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)]
        for gid in group_ids:
            for day in days_list:
                group_meta_keys.append(f"report:{day}:{gid}")
                group_meta_keys.append(f"threat_events:{day}:{gid}")

        subs_raw = kv_get("subs:index") or ""
        for s_uid in str(subs_raw).split(","):
            if s_uid.strip():
                group_meta_keys.append(f"sub:{s_uid.strip()}")

        if group_meta_keys:
            kv_mget(group_meta_keys)

        # Build dashboard summary (instant in-memory lookup)
        dash = build_dashboard(uid, days=days, allowed_groups=allowed_groups, known_groups=known_groups)

        # Threat Events (instant in-memory lookup)
        raw_threats = get_threat_events(group_ids, days=days)

        # Apply role-based ID & group privacy rules
        threat_events = []
        for ev in raw_threats:
            item = dict(ev)
            if not super_admin:
                # Regular Admin: mask numeric IDs, keep usernames and group names
                item["sender_id"] = None
                item["group_id"] = None
            threat_events.append(item)

        # Per-group settings, whitelisted users, muted users, and approved files (instant in-memory lookup)
        group_details = {}
        for gid in group_ids:
            group_details[str(gid)] = {
                "settings": get_group_settings(gid),
                "whitelisted_users": get_group_whitelisted_users(gid),
                "muted_users": get_group_muted_users(gid),
                "whitelisted_files": get_group_whitelisted_files(gid),
            }

        known_users = get_known_users()
        known_info = known_users.get(str(uid), {})
        first_name = user.get("first_name", "")
        last_name = user.get("last_name", "")
        u_name = user.get("username") or known_info.get("username", "")

        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = known_info.get("name", "")
        if not full_name:
            full_name = f"@{u_name}" if u_name else f"Admin_{uid}"

        if not first_name and full_name:
            parts = full_name.split(" ", 1)
            first_name = parts[0]
            if len(parts) > 1 and not last_name:
                last_name = parts[1]

        payload = {
            "authorized": True,
            "is_super_admin": super_admin,
            "user": {
                "id": uid,
                "first_name": first_name,
                "last_name": last_name,
                "username": u_name,
                "name": full_name,
            },
            "dashboard": dash,
            "candidate_groups": get_candidate_groups_for_user(uid),
            "user_settings": get_user_daily_report_settings(uid),
            "threat_events": threat_events,
            "domain_whitelist": get_domain_whitelist(),
            "group_details": group_details,
            "known_users": known_users,
            "known_groups": known_groups,
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
