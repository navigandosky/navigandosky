import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Map, MapPin, Shirt, FileText, LogOut } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_5ab32c84-76f1-4a2b-a9a5-9ab0c1424cd8/artifacts/70h8z9e6_Logo%20firma%20Spoke2%20completo.png";

const menuItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/admin/spaces", label: "Spazi Matterport", icon: Map },
  { to: "/admin/pois", label: "Punti di Interesse", icon: MapPin },
  { to: "/admin/costumes", label: "Archivio Costumi", icon: Shirt },
  { to: "/admin/project", label: "Progetto Spoke", icon: FileText }
];

export default function AdminLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isAuth = localStorage.getItem("admin_authenticated");
    if (!isAuth) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1A1918] text-white">
        <div className="p-6">
          <Link to="/" className="block mb-8">
            <h1 className="font-serif text-xl text-white">Spoke Galaveras</h1>
            <p className="font-sans text-xs text-white/50 mt-1">Admin Panel</p>
          </Link>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all ${
                    isActive
                      ? "bg-[#C5A059] text-white"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`menu-${item.to.split('/').pop()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-sans text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-white transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-sans text-sm">Esci</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-serif text-3xl text-[#2A2A2A]">{title}</h1>
        </header>

        {/* Content */}
        {children}
      </main>

      {/* Fixed Logo */}
      <div className="fixed bottom-4 right-4 opacity-50">
        <img src={LOGO_URL} alt="Spoke Logo" className="h-10 w-auto" />
      </div>
    </div>
  );
}
