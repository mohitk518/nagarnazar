import { Home, Map, ListChecks, User, Plus } from "lucide-react";
import { Link, useLocation } from "@/lib/router-compat";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

/** Fixed mobile bottom bar: Home · Map · [ + Report ] · My complaints · Profile */
export default function BottomNav() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const hi = language === "hi";
  const mineActive = location.pathname === "/complaints" && location.search.includes("mine=1");

  const items = [
    { to: "/", label: hi ? "होम" : "Home", icon: Home, active: location.pathname === "/" },
    { to: "/map", label: hi ? "नक्शा" : "Map", icon: Map, active: location.pathname === "/map" },
    null,
    {
      to: user ? "/complaints?mine=1" : "/auth",
      label: hi ? "मेरी शिकायतें" : "My complaints",
      icon: ListChecks,
      active: mineActive,
    },
    {
      to: user ? "/profile" : "/auth",
      label: hi ? "प्रोफ़ाइल" : "Profile",
      icon: User,
      active: location.pathname === "/profile",
    },
  ];

  return (
    <nav
      aria-label={hi ? "नीचे का मेन्यू" : "Bottom navigation"}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid h-[4.25rem] max-w-md grid-cols-5 items-center px-1">
        {items.map((it, i) =>
          it === null ? (
            <li key="report" className="flex justify-center">
              <Link
                to="/report"
                aria-label={hi ? "समस्या बताएं" : "Report a problem"}
                className="-mt-7 grid h-16 w-16 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-elevated ring-4 ring-background transition active:scale-95"
              >
                <Plus className="h-8 w-8" strokeWidth={2.75} aria-hidden="true" />
              </Link>
            </li>
          ) : (
            <li key={i}>
              <Link
                to={it.to}
                aria-current={it.active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold leading-tight ${
                  it.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <it.icon
                  className={`h-5 w-5 ${it.active ? "stroke-[2.5]" : ""}`}
                  aria-hidden="true"
                />
                <span className="text-center">{it.label}</span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
