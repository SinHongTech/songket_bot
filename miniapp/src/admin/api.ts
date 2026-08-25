import type { DashboardApiResponse } from "./types";
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

export function getTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
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

  const initData = tg?.initData || "";

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
    body: JSON.stringify({ initData, days }),
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`);
  }

  const data: DashboardApiResponse = await response.json();
  return data;
}
