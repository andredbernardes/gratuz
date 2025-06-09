import { Link, Outlet, useLocation } from "react-router"

export default function MainLayout() {
  const { pathname } = useLocation()

  return (
    <div className="h-screen w-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 dark:bg-gray-950 border-r shadow-sm p-4 shrink-0 border-none">
        <h2 className="text-xl font-bold mb-6 text-blue-600">Gratuz</h2>
        <nav className="space-y-2">
          <Link
            to="/dashboard"
            className={`block px-4 py-2 rounded hover:bg-gray-800 ${
              pathname === "/dashboard" ? "bg-blue-100 font-semibold" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/configuracoes"
            className={`block px-4 py-2 rounded hover:bg-gray-800 ${
              pathname === "/configuracoes" ? "bg-blue-100 font-semibold" : ""
            }`}
          >
            Configurações
          </Link>
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Navbar */}
        <header className="dark:bg-gray-900 border-b px-6 py-4 shadow-sm">
          <div className="text-right text-sm text-gray-400">Bem-vindo 👋</div>
        </header>

        {/* Conteúdo principal em largura total */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
