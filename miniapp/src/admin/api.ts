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

export function getTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function getInitData(): string {
  const tg = getTelegramWebApp();
  if (tg?.initData) return tg.initData;

  if (typeof window !== "undefined") {
    // 1. Hash param fallback (e.g. #tgWebAppData=...)
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    if (hash.includes("tgWebAppData=")) {
      const params = new URLSearchParams(hash);
      const data = params.get("tgWebAppData");
      if (data) return data;
    }
    // 2. Search param fallback (e.g. ?tgWebAppData=...)
    const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
    if (search.includes("tgWebAppData=")) {
      const params = new URLSearchParams(search);
      const data = params.get("tgWebAppData");
      if (data) return data;
    }
  }
  return "";
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

  const initData = getInitData();

  // If outside Telegram / local development without valid initData
  if (!initData) {
    console.info("No Telegram initData detected. Checking local API or using preview mode.");
    try {
      const devRes = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: "", days }),
      });
      if (devRes.ok) {
        const data = await devRes.json();
        if (data && data.authorized) {
          return data;
        }
      }
    } catch {
      // In dev without API running, fallback to dev preview data
    }

    return {
      authorized: true,
      user: tg?.initDataUnsafe?.user || mockUser,
      dashboard: mockDashboardData(days),
      isMock: true,
    };
  }

  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initData, days, session: getSessionToken() }),
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`);
  }

  const data: DashboardApiResponse = await response.json();
  return data;
}

async function postAction(payload: Record<string, unknown>) {
  const initData = getInitData();

  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, session: getSessionToken(), ...payload }),
  });

  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status})`);
  }
  return await response.json();
}

export async function checkPinStatus() {
  const initData = getInitData();
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, action: "check_pin" }),
  });
  return await response.json();
}

export async function setupPin(pin: string, confirm: string) {
  const initData = getInitData();
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, action: "setup_pin", pin, confirm }),
  });
  return await response.json();
}

export async function loginPin(pin: string) {
  const initData = getInitData();
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, action: "login_pin", pin }),
  });
  return await response.json();
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
