import type { DashboardApiResponse, PlanEntry } from "./types";
import { mockDashboardData, mockUser } from "./data";

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
      };
    };
  }
}

// In-memory session: cleared on every fresh WebApp open, so PIN is required
// each time the app is (re)opened. Not persisted to storage.
let _sessionToken = "";
let _cachedInitData = "";

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
    try { sessionStorage.setItem("songket_init_data", tg.initData); } catch {}
    return tg.initData;
  }

  if (typeof window !== "undefined") {
    // 1. Hash param fallback (e.g. #tgWebAppData=...)
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    if (hash.includes("tgWebAppData=")) {
      const params = new URLSearchParams(hash);
      const raw = params.get("tgWebAppData");
      if (raw) {
        _cachedInitData = raw;
        try { sessionStorage.setItem("songket_init_data", raw); } catch {}
        return raw;
      }
    }
    // 2. Search param fallback (e.g. ?tgWebAppData=...)
    const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
    if (search.includes("tgWebAppData=")) {
      const params = new URLSearchParams(search);
      const raw = params.get("tgWebAppData");
      if (raw) {
        _cachedInitData = raw;
        try { sessionStorage.setItem("songket_init_data", raw); } catch {}
        return raw;
      }
    }
    // 3. Fallback from current browser session
    try {
      const saved = sessionStorage.getItem("songket_init_data");
      if (saved) {
        _cachedInitData = saved;
        return saved;
      }
    } catch {}
  }

  return _cachedInitData || "";
}

export async function waitForTelegramInitData(timeoutMs: number = 800): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = getInitData();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 50));
  }
  return getInitData();
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user;
  }
  const initData = getInitData();
  if (initData) {
    // 1. Try URLSearchParams with both raw and decoded user strings
    try {
      const params = new URLSearchParams(initData);
      const userRaw = params.get("user");
      if (userRaw) {
        try {
          return JSON.parse(userRaw);
        } catch {
          return JSON.parse(decodeURIComponent(userRaw));
        }
      }
    } catch {}

    // 2. Try regex extraction
    try {
      const match = initData.match(/user=([^&]+)/);
      if (match && match[1]) {
        try {
          return JSON.parse(decodeURIComponent(match[1]));
        } catch {
          return JSON.parse(match[1]);
        }
      }
    } catch {}
  }
  return null;
}

export function getSessionToken(): string {
  return _sessionToken;
}

export function setSessionToken(token: string) {
  _sessionToken = token;
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

  const initData = await waitForTelegramInitData(800);
  console.log("[MiniApp] fetchDashboardData initData present:", Boolean(initData), "length:", initData.length);

  // If outside Telegram or no initData available:
  if (!initData) {
    console.log("[MiniApp] fetchDashboardData: No initData available, loading preview mock data");
    return {
      authorized: false,
      user: mockUser,
      dashboard: mockDashboardData(days),
      isMock: true,
      pin_exists: false,
    };
  }

  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initData, days, session: getSessionToken() }),
    });

    console.log("[MiniApp] fetchDashboardData HTTP status:", response.status);

    if (response.ok || response.status === 401) {
      const data: DashboardApiResponse = await response.json();
      console.log("[MiniApp] fetchDashboardData received payload:", data);
      if (data && !data.authorized) {
        return {
          authorized: false,
          user: data.user || getTelegramUser() || mockUser,
          dashboard: mockDashboardData(days),
          isMock: true,
          pin_exists: data.pin_exists ?? false,
        };
      }
      return { ...data, isMock: false };
    }

    throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`);
  } catch (err: any) {
    console.warn("[MiniApp] Dashboard API request error:", err);
    return {
      authorized: false,
      user: getTelegramUser() || mockUser,
      dashboard: mockDashboardData(days),
      isMock: false,
      pin_exists: false,
    };
  }
}

export async function resetPin(): Promise<{ ok: boolean; pin_exists?: boolean; error?: string; message?: string }> {
  const initData = await waitForTelegramInitData(500);
  console.log("[MiniApp] resetPin initData present:", Boolean(initData));
  if (!initData) return { ok: false, error: "Telegram initData required" };
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "reset_pin" }),
    });
    const res = await response.json();
    console.log("[MiniApp] resetPin response:", res);
    return res;
  } catch (err: any) {
    console.warn("[MiniApp] resetPin error:", err);
    return { ok: false, error: err?.message || "Reset failed" };
  }
}

export function openTelegramDirect(username: string = "Sin_Hong") {
  const tg = getTelegramWebApp() as any;
  const clean = username.replace(/^@/, "");
  const url = `https://t.me/${clean}`;
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
  const initData = await waitForTelegramInitData(500);
  if (!initData) {
    // Local dev preview mode
    return { ok: true, session: "preview_session_token", ...payload };
  }

  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, session: getSessionToken(), ...payload }),
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
  const initData = await waitForTelegramInitData(500);
  if (!initData) {
    return { ok: true, pin_exists: false, locked: 0 };
  }
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "check_pin" }),
    });
    const res = await response.json();
    console.log("[MiniApp] checkPinStatus response:", res);
    return res;
  } catch {
    return { ok: true, pin_exists: false, locked: 0 };
  }
}

export async function setupPin(pin: string, confirm: string) {
  const initData = await waitForTelegramInitData(500);
  console.log("[MiniApp] setupPin calling, initData present:", Boolean(initData));
  if (!initData) {
    if (pin !== confirm) {
      return { ok: false, error: "PINs do not match" };
    }
    return { ok: true, session: "preview_session_token" };
  }
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "setup_pin", pin, confirm }),
    });
    const res = await response.json();
    console.log("[MiniApp] setupPin response (HTTP " + response.status + "):", res);
    return res;
  } catch (err: any) {
    console.warn("[MiniApp] setupPin error:", err);
    return { ok: false, error: err?.message || "Setup failed" };
  }
}

export async function loginPin(pin: string) {
  const initData = await waitForTelegramInitData(500);
  console.log("[MiniApp] loginPin calling, initData present:", Boolean(initData));
  if (!initData) {
    return { ok: true, session: "preview_session_token" };
  }
  try {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "login_pin", pin }),
    });
    const res = await response.json();
    console.log("[MiniApp] loginPin response (HTTP " + response.status + "):", res);
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
