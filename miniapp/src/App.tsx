import { createBrowserRouter, RouterProvider } from "react-router";
import PublicApp from "./public/PublicApp";
import AdminApp from "./admin/AdminApp";

const router = createBrowserRouter([
  { path: "/", Component: PublicApp },
  { path: "/dashboard", Component: AdminApp },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
