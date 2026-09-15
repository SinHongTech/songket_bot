import type { DashboardApiResponse, PlanEntry, SystemConfig } from "./types";
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

export function getTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function extractInitString(data: any): string {
  if (!data) return "";
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        return extractInitString(parsed);
      }
    } catch {}
    if (data.includes("hash=")) return data;
  }
  if (typeof data === "object") {
    const cand =
      data.initData ||
      (data.eventData && (typeof data.eventData === "string" ? data.eventData : data.eventData.initData)) ||
      (data.data && data.data.initData) ||
      (data.event_data && data.event_data.init_data) ||
      "";
    if (typeof cand === "string" && cand.includes("hash=")) {
      return cand;
    }
  }
  return "";
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    try {
      const str = extractInitString(event.data);
      if (str && str.includes("hash=")) {
        _cachedInitData = str;
        (window as any).__songket_init_data = str;
        try {
          safeStorage.setItem("songket_init_data", str);
          sessionStorage.setItem("songket_init_data", str);
          localStorage.setItem("songket_init_data", str);
        } catch {}
      }
    } catch {}
  });
}

export function getInitData(): string {
  // 1. PRIMARY: Always prioritize live window.Telegram.WebApp.initData from Telegram runtime
  const tg = getTelegramWebApp();
  if (tg?.initData && tg.initData.trim().length > 0 && tg.initData.includes("hash=")) {
    const liveData = tg.initData.trim();
    _cachedInitData = liveData;
    if (typeof window !== "undefined") (window as any).__songket_init_data = liveData;
    try {
      safeStorage.setItem("songket_init_data", liveData);
      sessionStorage.setItem("songket_init_data", liveData);
    } catch {}
    return liveData;
  }

  // 2. Check live URL hash / search for tgWebAppData
  if (typeof window !== "undefined") {
    const candidates = [
      (window as any).__songket_init_raw || "",
      window.location.hash || "",
      window.location.search || "",
      safeStorage.getItem("songket_init_raw") || "",
      sessionStorage.getItem("songket_init_raw") || "",
      localStorage.getItem("songket_init_raw") || "",
    ];

    for (const rawCandidate of candidates) {
      if (!rawCandidate) continue;
      const clean = rawCandidate.startsWith("#") || rawCandidate.startsWith("?") ? rawCandidate.slice(1) : rawCandidate;
      if (clean.includes("tgWebAppData=")) {
        try {
          const params = new URLSearchParams(clean);
          const rawVal = params.get("tgWebAppData");
          if (rawVal && rawVal.includes("hash=")) {
            _cachedInitData = rawVal;
            (window as any).__songket_init_data = rawVal;
            return rawVal;
          }
        } catch {}
        const m = clean.match(/tgWebAppData=([^&]+)/);
        if (m && m[1]) {
          try {
            const decoded = decodeURIComponent(m[1]);
            if (decoded.includes("hash=")) {
              _cachedInitData = decoded;
              (window as any).__songket_init_data = decoded;
              return decoded;
            }
          } catch {}
        }
      }
      if (clean.includes("hash=") && (clean.includes("user=") || clean.includes("query_id=") || clean.includes("auth_date="))) {
        _cachedInitData = clean;
        (window as any).__songket_init_data = clean;
        return clean;
      }
    }
  }

  // 3. Check memory / message event cache
  if (typeof window !== "undefined" && (window as any).__songket_init_data) {
    const wData = String((window as any).__songket_init_data).trim();
    if (wData.includes("hash=")) {
      _cachedInitData = wData;
      return wData;
    }
  }

  if (_cachedInitData && _cachedInitData.includes("hash=")) {
    return _cachedInitData;
  }

  // 4. Stored fallback
  if (typeof window !== "undefined") {
    try {
      const saved =
        safeStorage.getItem("songket_init_data") ||
        sessionStorage.getItem("songket_init_data") ||
        localStorage.getItem("songket_init_data");
      if (saved && saved.includes("hash=")) {
        _cachedInitData = saved;
        (window as any).__songket_init_data = saved;
        return saved;
      }
    } catch {}
  }

  return "";
}

export async function waitForTelegramInitData(timeoutMs: number = 1500): Promise<string> {
  const initial = getInitData();
  if (initial && initial.includes("hash=")) return initial;

  return new Promise((resolve) => {
    let resolved = false;
    let pollTimer: any = null;
    let timeoutTimer: any = null;

    const cleanup = () => {
      resolved = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("message", onMessage);
      }
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };

    const onMessage = (event: MessageEvent) => {
      try {
        const str = extractInitString(event.data);
        if (str && str.includes("hash=")) {
          _cachedInitData = str;
          if (typeof window !== "undefined") (window as any).__songket_init_data = str;
          try {
            safeStorage.setItem("songket_init_data", str);
          } catch {}
          cleanup();
          resolve(str);
        }
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("message", onMessage);
    }

    pollTimer = setInterval(() => {
      const data = getInitData();
      if (data && data.includes("hash=")) {
        cleanup();
        resolve(data);
      }
    }, 25);

    timeoutTimer = setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(getInitData());
      }
    }, timeoutMs);
  });
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

export function getCachedDashboardData(): DashboardApiResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = safeStorage.getItem("songket.admin.cachedDashboard");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.authorized === true && !parsed.isMock && parsed.dashboard) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function clearMiniAppCache() {
  if (typeof window === "undefined") return;
  try {
    safeStorage.removeItem("songket.admin.cachedDashboard");
    sessionStorage.removeItem("songket.admin.cachedDashboard");
    localStorage.removeItem("songket.admin.cachedDashboard");
    _inFlightDashboardPromise = null;
  } catch {}
}

export function clearAllAuthData() {
  if (typeof window === "undefined") return;
  try {
    clearMiniAppCache();
    safeStorage.removeItem("songket_session_token");
    safeStorage.removeItem("songket_init_data");
    safeStorage.removeItem("songket_init_raw");
    sessionStorage.removeItem("songket_init_data");
    sessionStorage.removeItem("songket_init_raw");
    localStorage.removeItem("songket_init_data");
    localStorage.removeItem("songket_init_raw");
    (window as any).__songket_init_data = "";
    (window as any).__songket_init_raw = "";
    _cachedInitData = "";
    _sessionToken = "";
  } catch {}
}

export async function refreshDashboardWithFreshAuth(days: number = 90): Promise<DashboardApiResponse> {
  clearMiniAppCache();
  const tg = getTelegramWebApp();
  if (tg) {
    try { tg.ready(); } catch {}
    try { tg.expand(); } catch {}
  }
  return fetchDashboardData(days, true);
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

let _inFlightDashboardPromise: Promise<DashboardApiResponse> | null = null;

export async function fetchDashboardData(days: number = 90, force: boolean = false): Promise<DashboardApiResponse> {
  if (force) {
    _inFlightDashboardPromise = null;
  }
  if (_inFlightDashboardPromise) {
    return _inFlightDashboardPromise;
  }

  const doFetch = async (): Promise<DashboardApiResponse> => {
    const tg = getTelegramWebApp();
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {
        console.warn("Telegram WebApp initialization warning:", e);
      }
    }

    // Wait for reactive Telegram handshake (returns immediately if already present)
    const initData = await waitForTelegramInitData(1500);
    const payload = getAuthPayload({ days, initData: initData || getInitData() });

    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn("[MiniApp] Server returned non-JSON response:", text.slice(0, 150));
      }

      if (response.ok && data && typeof data === "object") {
        if (data.authorized) {
          if (data.session) {
            setSessionToken(data.session);
          }
          try {
            safeStorage.setItem("songket.admin.cachedDashboard", JSON.stringify(data));
          } catch {}
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

      throw new Error(data?.error || `Failed to fetch dashboard data (HTTP ${response.status})`);
    } catch (err: any) {
      console.warn("[MiniApp] Dashboard API request error:", err);
      const cached = getCachedDashboardData();
      if (cached && cached.authorized) return cached;
      return {
        authorized: false,
        user: getTelegramUser() || mockUser,
        dashboard: mockDashboardData(days),
        isMock: true,
        pin_exists: false,
        error: err?.message || "Network error",
      };
    } finally {
      _inFlightDashboardPromise = null;
    }
  };

  _inFlightDashboardPromise = doFetch();
  return _inFlightDashboardPromise;
}

export async function resetPin(): Promise<{
  ok: boolean;
  pin_exists?: boolean;
  error?: string;
  message?: string;
  totp_required?: boolean;
  mfa_not_assigned?: boolean;
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
  super_admin_ids?: number[];
}): Promise<{ ok: boolean; config: any }> {
  return await postAction({
    action: "save_config",
    ...config,
  });
}

export async function addSuperAdmin(targetUserId: number, totpCode: string): Promise<{ ok: boolean; config?: SystemConfig; error?: string; totp_required?: boolean }> {
  return await postAction({
    action: "add_super_admin",
    target_user_id: targetUserId,
    totp_code: totpCode,
  });
}

export async function removeSuperAdmin(targetUserId: number, totpCode: string): Promise<{ ok: boolean; config?: SystemConfig; error?: string; totp_required?: boolean }> {
  return await postAction({
    action: "remove_super_admin",
    target_user_id: targetUserId,
    totp_code: totpCode,
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

export async function removeManagedGroup(groupId: number) {
  return postAction({
    action: "remove_group",
    group_id: groupId,
  });
}

export async function saveUserSettings(settings: {
  daily_report_enabled?: boolean;
  daily_report_time?: string;
  report_frequency?: "daily" | "weekly" | "monthly";
  report_lang?: "both" | "kh" | "en";
}) {
  return postAction({
    action: "save_user_settings",
    ...settings,
  });
}

export async function saveUserDatePreferences(dates: {
  home_date_from?: string;
  home_date_to?: string;
  threats_date_from?: string;
  threats_date_to?: string;
  history_date_from?: string;
  history_date_to?: string;
  last_read_threat_ts?: number;
}) {
  return postAction({
    action: "save_date_preferences",
    ...dates,
  });
}

export async function requestReport(
  period: "daily" | "weekly" | "monthly" = "daily",
  lang?: "both" | "kh" | "en"
): Promise<{ ok: boolean; message?: string; error?: string }> {
  return postAction({
    action: "request_report",
    period,
    report_lang: lang,
  });
}



