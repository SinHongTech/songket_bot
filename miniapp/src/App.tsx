import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";
import LogoSplash from "./public/components/LogoSplash";
import PrivacyTerms from "./public/components/PrivacyTerms";
import { safeStorage } from "./shared/storage";

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

const routes = [
  { path: "/", Component: PublicApp, errorElement: <RootErrorBoundary /> },
  { path: "/dashboard", Component: AdminApp, errorElement: <RootErrorBoundary /> },
  { path: "/splash", Component: LogoSplash, errorElement: <RootErrorBoundary /> },
  { path: "/privacy-terms", Component: PrivacyTermsPage, errorElement: <RootErrorBoundary /> },
  { path: "*", Component: PublicApp, errorElement: <RootErrorBoundary /> },
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
