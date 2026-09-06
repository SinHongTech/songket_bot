import { createBrowserRouter, RouterProvider } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";
import LogoSplash from "./public/components/LogoSplash";
import PrivacyTerms from "./public/components/PrivacyTerms";

function PrivacyTermsPage() {
  const isKm = typeof window !== "undefined" && localStorage.getItem("songket.lang") === "km";
  const bodyFont = isKm ? "'Kantumruy Pro', sans-serif" : "'Outfit', sans-serif";
  return <PrivacyTerms isKm={isKm} bodyFont={bodyFont} />;
}

const router = createBrowserRouter([
  { path: "/", Component: PublicApp },
  { path: "/dashboard", Component: AdminApp },
  { path: "/splash", Component: LogoSplash },
  { path: "/privacy-terms", Component: PrivacyTermsPage },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
