import { createBrowserRouter, RouterProvider } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";
import LogoSplash from "./public/components/LogoSplash";
const router = createBrowserRouter([
  { path: "/", Component: PublicApp },
  { path: "/dashboard", Component: AdminApp },
  { path: "/splash", Component: LogoSplash },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
