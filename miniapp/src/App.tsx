import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, useNavigate, useLocation } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";
import { getInitData, fetchDashboardData } from "./admin/api";

function RootEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  const isManualLanding = location.search.includes("home") || Boolean((location.state as any)?.fromAdmin);

  useEffect(() => {
    if (isManualLanding) {
      setChecking(false);
      return;
    }

    const initData = getInitData();
    // If not inside Telegram, stay on public landing page
    if (!initData) {
      setChecking(false);
      return;
    }

    // Inside Telegram on initial launch: check authorization
    fetchDashboardData(7)
      .then((data) => {
        if (data && data.authorized) {
          // Whitelisted admin or super admin: navigate straight to dashboard on initial open!
          if (location.pathname === "/" && !isManualLanding) {
            navigate({ pathname: "/dashboard", search: location.search, hash: window.location.hash }, { replace: true });
          }
        }
      })
      .catch((err) => {
        console.warn("Auto-route check error:", err);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [navigate, location.pathname, isManualLanding]);

  if (checking && getInitData() && location.pathname === "/" && !isManualLanding) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#0a0a0c", color: "#d4af37" }}>
        <div className="spin-animation" style={{ width: 36, height: 36, border: "3px solid #d4af37", borderTopColor: "transparent", borderRadius: "50%", marginBottom: 14 }}></div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: "0.04em" }}>Songket Security</div>
      </div>
    );
  }

  return <PublicApp />;
}

const router = createBrowserRouter([
  { path: "/", Component: RootEntry },
  { path: "/dashboard", Component: AdminApp },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
