import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, List, Users, Settings } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: "Dashboard", icon: Home, page: "Dashboard" },
    { name: "Leads", icon: List, page: "Leads" },
    { name: "Buyers", icon: Users, page: "Buyers" },
  ];

  const isActive = (page) => {
    const url = createPageUrl(page);
    return currentPath === url || currentPath === url + "/";
  };

  // Hide nav on detail/add pages
  const hideNav = currentPath.includes("LeadDetail") || currentPath.includes("AddLead");

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
      
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-50">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex items-center justify-around py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.page);
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.page)}
                    className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
                      active
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? "stroke-[2.5]" : ""}`} />
                    <span className={`text-xs mt-1 ${active ? "font-semibold" : ""}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}