import { useState, useEffect } from "react";
import { createBrowserRouter, createHashRouter, RouterProvider, useLocation } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";
import LogoSplash from "./public/components/LogoSplash";
import PrivacyTerms from "./public/components/PrivacyTerms";
import { safeStorage } from "./shared/storage";
import { fetchDashboardData, getCachedDashboardData, getTelegramWebApp, extractInitString } from "./admin/api";
import type { DashboardApiResponse } from "./admin/types";

function PrivacyTermsPage() {
  const isKm = safeStorage.getItem("songket.lang") === "km";
  const bodyFont = isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif";
  return <PrivacyTerms isKm={isKm} bodyFont={bodyFont} />;
}

function RootErrorBoundary() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "#0a0d14", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 18, color: "#d4a72c", marginBottom: 12 }}>Songket Security</h2>
      <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>An unexpected issue occurred. Tap below to reload the app.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "#d4a72c",
          color: "#0f172a",
          border: "none",
          padding: "10px 20px",
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reload
      </button>
    </div>
  );
}

function AppGateway() {
  const location = useLocation();
  const search = location.search || "";
  const forceHome = search.includes("home=1") || search.includes("preview=1") || Boolean((location.state as any)?.fromAdmin);

  const [checking, setChecking] = useState<boolean>(() => {
    if (forceHome) return false;
    const cached = getCachedDashboardData();
    if (cached && cached.authorized) return false;
    return true;
  });

  const [authData, setAuthData] = useState<DashboardApiResponse | null>(() => {
    if (forceHome) return null;
    const cached = getCachedDashboardData();
    if (cached && cached.authorized) return cached;
    return null;
  });

  useEffect(() => {
    if (forceHome) {
      setChecking(false);
      return;
    }

    let isMounted = true;
    const tg = getTelegramWebApp();
    if (tg) {
      try { tg.ready(); } catch {}
      try { tg.expand(); } catch {}
    }

    async function checkRoleAndAuth(forceRefresh = false) {
      try {
        const data = await fetchDashboardData(90, forceRefresh);
        if (isMounted) {
          if (data && data.authorized) {
            setAuthData(data);
          } else {
            setAuthData(null);
          }
          setChecking(false);
        }
      } catch {
        if (isMounted) {
          setAuthData(null);
          setChecking(false);
        }
      }
    }

    checkRoleAndAuth(false);

    // Listen for late-arriving Telegram Desktop / Web handshake
    const handleMsg = (e: MessageEvent) => {
      try {
        const str = extractInitString(e.data);
        if (str && str.includes("hash=") && isMounted) {
          checkRoleAndAuth(true);
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);

    return () => {
      isMounted = false;
      window.removeEventListener("message", handleMsg);
    };
  }, [forceHome]);

  if (checking) {
    return <LogoSplash />;
  }

  if (authData && authData.authorized) {
    return <AdminApp initialData={authData} />;
  }

  return <PublicApp />;
}

const routes = [
  { path: "/", Component: AppGateway, errorElement: <RootErrorBoundary /> },
  { path: "/landing", Component: PublicApp, errorElement: <RootErrorBoundary /> },
  { path: "/dashboard", Component: AdminApp, errorElement: <RootErrorBoundary /> },
  { path: "/splash", Component: LogoSplash, errorElement: <RootErrorBoundary /> },
  { path: "/privacy-terms", Component: PrivacyTermsPage, errorElement: <RootErrorBoundary /> },
  { path: "*", Component: AppGateway, errorElement: <RootErrorBoundary /> },
];

let router: ReturnType<typeof createBrowserRouter>;
try {
  router = createBrowserRouter(routes);
} catch {
  router = createHashRouter(routes);
}

export default function App() {
  return <RouterProvider router={router} />;
}
