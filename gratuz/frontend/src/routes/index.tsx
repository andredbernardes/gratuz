import { createBrowserRouter } from "react-router"
import Login from "@/pages/login"
import Dashboard from "@/pages/dashboard"
import Configuracoes from "@/pages/configuracoes"
import MainLayout from "@/layout/mainLayout"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "configuracoes", element: <Configuracoes /> },
    ],
  },
])
