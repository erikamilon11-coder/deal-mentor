import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, List, Users, Settings as SettingsIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import PageTransition from "@/components/PageTransition";
import { ThemeProvider } from "@/components/ThemeProvider";

// Track scroll positions for main tabs
const scrollCache = new Map();
const TAB_PAGES = ["Dashboard", "Leads", "Buyers"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const scrollContainerRef = useRef(null);
  const [navigationDirection, setNavigationDirection] = useState(1);

  const navItems = [
    { name: "Dashboard", icon: Home, page: "Dashboard" },
    { name: "Leads", icon: List, page: "Leads" },
    { name: "Buyers", icon: Users, page: "Buyers" },
    { name: "Settings", icon: SettingsIcon, page: "Settings" },
  ];

  const isActive = (page) => {
    const url = createPageUrl(page);
    return currentPath === url || currentPath === url + "/";
  };

  // Determine if we're on a detail/add page
  const hideNav = currentPath.includes("LeadDetail") || currentPath.includes("AddLead");
  const isTabPage = TAB_PAGES.includes(currentPageName);

  // Save scroll position when leaving a tab page
  useEffect(() => {
    return () => {
      if (isTabPage && scrollContainerRef.current) {
        scrollCache.set(currentPageName, scrollContainerRef.current.scrollTop);
      }
    };
  }, [currentPageName, isTabPage]);

  // Restore scroll position when entering a tab page
  useEffect(() => {
    if (isTabPage && scrollContainerRef.current) {
      const savedScroll = scrollCache.get(currentPageName);
      if (savedScroll !== undefined) {
        scrollContainerRef.current.scrollTop = savedScroll;
      }
    }
  }, [currentPageName, isTabPage]);

  const handleNavClick = (e, targetPage) => {
    const currentIndex = TAB_PAGES.indexOf(currentPageName);
    const targetIndex = TAB_PAGES.indexOf(targetPage);
    
    if (currentIndex !== -1 && targetIndex !== -1) {
      setNavigationDirection(targetIndex > currentIndex ? 1 : -1);
    } else {
      setNavigationDirection(1);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div 
          ref={scrollContainerRef}
          className="h-screen overflow-y-auto"
          style={{ 
            paddingBottom: hideNav ? 0 : "calc(env(safe-area-inset-bottom, 0px) + 4rem)"
          }}
        >
          <PageTransition direction={navigationDirection}>
            {children}
          </PageTransition>
        </div>
        
        {!hideNav && (
          <nav 
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50"
            style={{ 
              paddingBottom: "env(safe-area-inset-bottom, 0px)"
            }}
          >
            <div className="max-w-lg mx-auto px-4">
              <div className="flex items-center justify-around py-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      onClick={(e) => handleNavClick(e, item.page)}
                      className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
                        active
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
    </ThemeProvider>
  );
}