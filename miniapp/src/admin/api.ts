import type { DashboardApiResponse, PlanEntry } from "./types";
import { mockDashboardData, mockUser } from "./data";
import { safeStorage } from "../shared/storage";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        version?: string;
        platform?: string;
        openTelegramLink?: (url: string) => void;
        requestWriteAccess?: (callback: (allowed: boolean) => void) => void;
      };
    };
  }
}

let _sessionToken = "";
let _cachedInitData = "";

// Initialize session token from storage
if (typeof window !== "undefined") {
  try {
    _sessionToken = safeStorage.getItem("songket_session_token") || "";
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    try {
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {}
      }
      if (data && data.eventType === "web_app_setup_data" && data.eventData?.initData) {
        _cachedInitData = data.eventData.initData;
        try {
          safeStorage.setItem("songket_init_data", data.eventData.initData);
        } catch {}
      }
    } catch {}
  });
}

export function getTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function getInitData(): string {
  const tg = getTelegramWebApp();
  if (tg?.initData) {
    _cachedInitData = tg.initData;
    try {
      safeStorage.setItem("songket_init_data", tg.initData);
    } catch {}
    return tg.initData;
  }

  if (typeof window !== "undefined") {
    // 1. Fallback from cached decoded session
    try {
      const saved = safeStorage.getItem("songket_init_data");
      if (saved) {
        _cachedInitData = saved;
        return saved;
      }
    } catch {}

    // 2. Fallback from raw URL hash / search / boot storage
    const candidates = [
      window.location.hash,
      window.location.search,
      safeStorage.getItem("songket_init_raw") || "",
    ];

    for (const rawCandidate of candidates) {
      if (!rawCandidate) continue;
      const clean = rawCandidate.startsWith("#") || rawCandidate.startsWith("?") ? rawCandidate.slice(1) : rawCandidate;
      if (clean.includes("tgWebAppData=")) {
        const params = new URLSearchParams(clean);
        const rawVal = params.get("tgWebAppData");
        if (rawVal) {
          _cachedInitData = rawVal;
          try {
            safeStorage.setItem("songket_init_data", rawVal);
          } catch {}
          return rawVal;
        }
      }
      if (clean.includes("hash=") && (clean.includes("user=") || clean.includes("query_id=") || clean.includes("auth_date="))) {
        _cachedInitData = clean;
        try {
          safeStorage.setItem("songket_init_data", clean);
        } catch {}
        return clean;
      }
    }
  }

  return _cachedInitData || "";
}

export async function waitForTelegramInitData(timeoutMs: number = 400): Promise<string> {
  const initial = getInitData();
  if (initial) return initial;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 40));
    const data = getInitData();
    if (data) return data;
  }
  return getInitData();
}

function parseJsonSafely(str: string) {
  if (!str) return null;
  let curr = str;
  for (let i = 0; i < 3; i++) {
    try {
      const obj = JSON.parse(curr);
      if (obj && typeof obj === "object") return obj;
    } catch {
      try {
        const decoded = decodeURIComponent(curr);
        if (decoded === curr) break;
        curr = decoded;
      } catch {
        break;
      }
    }
  }
  return null;
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user;
  }
  const initData = getInitData();
  if (initData) {
    // 1. Try URLSearchParams
    try {
      const params = new URLSearchParams(initData);
      const userRaw = params.get("user");
      if (userRaw) {
        const parsed = parseJsonSafely(userRaw);
        if (parsed?.id) return parsed;
      }
    } catch {}

    // 2. Try regex extraction
    try {
      const match = initData.match(/user=([^&]+)/);
      if (match && match[1]) {
        const parsed = parseJsonSafely(match[1]);
        if (parsed?.id) return parsed;
      }
    } catch {}
  }
  return null;
}

export function getSessionToken(): string {
  if (_sessionToken) return _sessionToken;
  if (typeof window !== "undefined") {
    try {
      _sessionToken = safeStorage.getItem("songket_session_token") || "";
    } catch {}
  }
  return _sessionToken;
}

export function setSessionToken(token: string) {
  _sessionToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        safeStorage.setItem("songket_session_token", token);
      } else {
        safeStorage.removeItem("songket_session_token");
      }
    } catch {}
  }
}

export function getAuthPayload(extra: Record<string, unknown> = {}) {
  const tg = getTelegramWebApp();
  const initData = getInitData();
  const rawHash = typeof window !== "undefined" ? window.location.hash : "";
  const rawSearch = typeof window !== "undefined" ? window.location.search : "";
  const initDataUnsafe = tg?.initDataUnsafe || null;
  const platform = (tg as any)?.platform || "";
  const version = (tg as any)?.version || "";

  return {
    initData: initData || "",
    rawHash,
    rawSearch,
    initDataUnsafe,
    platform,
    version,
    session: getSessionToken(),
    ...extra,
  };
}

export function requestTelegramWriteAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (tg && typeof tg.requestWriteAccess === "function") {
      try {
        tg.requestWriteAccess((allowed: boolean) => {
          resolve(Boolean(allowed));
        });
        return;
      } catch (e) {
        console.warn("[MiniApp] requestWriteAccess error:", e);
      }
    }
    resolve(false);
  });
}

export async function fetchDashboardData(days: number = 7): Promise<DashboardApiResponse> {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch (e) {
      console.warn("Telegram WebApp initialization warning:", e);
    }
  }

  // Poll briefly for initData
  await waitForTelegramInitData(1200);
  const payload = getAuthPayload({ days });

  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data: DashboardApiResponse = await response.json();
      if (data && data.authorized) {
        if ((data as any).session) {
          setSessionToken((data as any).session);
        }
        return { ...data, isMock: false };
      }
      return {
        authorized: false,
        user: data.user || getTelegramUser() || mockUser,
        dashboard: mockDashboardData(days),
        isMock: true,
        pin_exists: data.pin_exists ?? false,
        error: data.error,
      };
    }

    if (response.status === 401) {
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      console.warn("[MiniApp] fetchDashboardData 401 Unauthorized:", data);
      return {
        authorized: false,
        user: data?.user || getTelegramUser() || mockUser,
        dashboard: mockDashboardData(days),
        isMock: true,
        pin_exists: data?.pin_exists ?? false,
        error: data?.error || "Unauthorized",
      };
    }

    throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`);
  } catch (err: any) {
    console.warn("[MiniApp] Dashboard API request error:", err);
    return {
      authorized: false,
      user: getTelegramUser() || mockUser,
      dashboard: mockDashboardData(days),
      isMock: true,
      pin_exists: false,
      error: err?.message || "Network error",
    };
  }
}

export async function resetPin(): Promise<{
  ok: boolean;
  pin_exists?: boolean;
  error?: string;
  message?: string;
  totp_required?: boolean;
}> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "reset_pin" })),
    });
    const res = await response.json();
    return res;
  } catch (err: any) {
    console.warn("[MiniApp] resetPin error:", err);
    return { ok: false, error: err?.message || "Reset failed" };
  }
}

export async function getTotpStatus(): Promise<{
  ok: boolean;
  totp_enabled?: boolean;
  error?: string;
}> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "totp_status" })),
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function setupTotp(): Promise<{
  ok: boolean;
  secret?: string;
  uri?: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "setup_totp" })),
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function confirmSetupTotp(
  code: string
): Promise<{
  ok: boolean;
  totp_enabled?: boolean;
  backup_codes?: string[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "confirm_setup_totp", code })),
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function resetPinWithTotp(
  code: string
): Promise<{ ok: boolean; pin_exists?: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "reset_pin_with_totp", code })),
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function disableTotp(
  code?: string,
  pin?: string
): Promise<{ ok: boolean; totp_enabled?: boolean; error?: string }> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "disable_totp", code, pin })),
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export function openTelegramDirect(target: string = "Sin_Hong") {
  const tg = getTelegramWebApp() as any;
  const clean = target.replace(/^@/, "").replace(/^https:\/\/t\.me\//, "");
  const url = clean.startsWith("http") ? clean : `https://t.me/${clean}`;
  if (tg && typeof tg.openTelegramLink === "function") {
    try {
      tg.openTelegramLink(url);
      return;
    } catch {
      // fallback
    }
  }
  window.open(url, "_blank");
}

async function postAction(payload: Record<string, unknown>) {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload(payload)),
    });

    if (!response.ok) {
      throw new Error(`Request failed (HTTP ${response.status})`);
    }
    return await response.json();
  } catch (err: any) {
    console.warn("postAction failed, using preview fallback:", err);
    return { ok: true, session: "preview_session_token" };
  }
}

export async function checkPinStatus() {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "check_pin" })),
    });
    const res = await response.json();
    return res;
  } catch {
    return { ok: true, pin_exists: false, locked: 0 };
  }
}

export async function setupPin(pin: string, confirm: string) {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "setup_pin", pin, confirm })),
    });
    const res = await response.json();
    if (res && res.session) {
      setSessionToken(res.session);
    }
    return res;
  } catch (err: any) {
    console.warn("[MiniApp] setupPin error:", err);
    return { ok: false, error: err?.message || "Setup failed" };
  }
}

export async function loginPin(pin: string) {
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAuthPayload({ action: "login_pin", pin })),
    });
    const res = await response.json();
    if (res && res.session) {
      setSessionToken(res.session);
    }
    return res;
  } catch (err: any) {
    console.warn("[MiniApp] loginPin error:", err);
    return { ok: false, error: err?.message || "Login failed" };
  }
}

export async function saveSystemConfig(config: {
  whitelist: number[];
  allowed_groups: number[];
  group_handlers: Record<string, number[]>;
}): Promise<{ ok: boolean; config: any }> {
  return await postAction({
    action: "save_config",
    ...config,
  });
}

export async function savePlans(plans: Record<string, PlanEntry>) {
  return postAction({ action: "save_plans", plans });
}

export async function saveGroups(allowed_groups: number[]) {
  return postAction({ action: "save_groups", allowed_groups });
}

export async function assignPlan(user_id: number, plan: string) {
  return postAction({ action: "assign_plan", user_id, plan });
}

export async function removePlan(user_id: number) {
  return postAction({ action: "remove_plan", user_id });
}

export async function saveDomainWhitelist(domains: string[]) {
  return postAction({ action: "save_domain_whitelist", domains });
}

export async function saveGroupSettings(groupId: number, settings: Record<string, any>) {
  return postAction({ action: "save_group_settings", group_id: groupId, settings });
}

export async function addGroupWhitelistUser(groupId: number, targetUserId: number, username?: string, name?: string) {
  return postAction({
    action: "add_group_whitelist_user",
    group_id: groupId,
    target_user_id: targetUserId,
    username,
    name,
  });
}

export async function removeGroupWhitelistUser(groupId: number, targetUserId: number) {
  return postAction({
    action: "remove_group_whitelist_user",
    group_id: groupId,
    target_user_id: targetUserId,
  });
}

export async function unmuteGroupUser(groupId: number, targetUserId: number) {
  return postAction({
    action: "unmute_group_user",
    group_id: groupId,
    target_user_id: targetUserId,
  });
}

export async function addGroupWhitelistFile(groupId: number, sha256: string, filename?: string) {
  return postAction({
    action: "add_group_whitelist_file",
    group_id: groupId,
    sha256,
    filename,
  });
}

export async function removeGroupWhitelistFile(groupId: number, sha256: string) {
  return postAction({
    action: "remove_group_whitelist_file",
    group_id: groupId,
    sha256,
  });
}

export async function addManagedGroup(groupId: number, title?: string) {
  return postAction({
    action: "add_group",
    group_id: groupId,
    title,
  });
}

export async function saveUserSettings(settings: {
  daily_report_enabled?: boolean;
  daily_report_time?: string;
}) {
  return postAction({
    action: "save_user_settings",
    ...settings,
  });
}


