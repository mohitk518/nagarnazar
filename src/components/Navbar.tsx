import { useUiText } from "@/hooks/useUiText";
import { useState } from "react";
import { Link, useLocation } from "@/lib/router-compat";
import { Menu, X, LogOut, User, Shield, Globe, Plus, BarChart3, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import NotificationBell from "@/components/NotificationBell";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import type { TranslationKey } from "@/lib/translations";

const PRIMARY_LINKS: { to: string; labelKey: TranslationKey }[] = [
  { to: "/", labelKey: "nav.home" },
  { to: "/complaints", labelKey: "nav.complaints" },
  { to: "/map", labelKey: "nav.map" },
  { to: "/dashboard", labelKey: "nav.dashboard" },
  { to: "/leaderboard", labelKey: "nav.leaderboard" },
];

const MORE_LINKS: { to: string; labelKey: TranslationKey }[] = [
  { to: "/how-it-works", labelKey: "nav.howItWorks" },
  { to: "/faq", labelKey: "nav.faq" },
  { to: "/contact", labelKey: "nav.contact" },
  { to: "/ai-chat", labelKey: "nav.aiChat" },
  { to: "/install", labelKey: "nav.install" },
  { to: "/rewards", labelKey: "nav.rewards" },
  { to: "/predictions", labelKey: "nav.predictions" },
  { to: "/polls", labelKey: "nav.polls" },
  { to: "/heatmap", labelKey: "nav.heatmap" as TranslationKey },
  { to: "/departments", labelKey: "nav.departments" as TranslationKey },
  { to: "/worker", labelKey: "nav.worker" as TranslationKey },
];

const pill = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors ${
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  }`;

const menuItem = (active: boolean) =>
  `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${
    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
  }`;

const Navbar = () => {
  const tx = useUiText();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isAdmin } = useUserRole();
  const hi = language === "hi";
  const toggleLanguage = () => setLanguage(hi ? "en" : "hi");
  const close = () => setMenuOpen(false);

  const LangButton = (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-primary/20 px-3 text-xs font-bold text-primary hover:border-primary hover:bg-accent"
      aria-label={hi ? "Switch to English" : "हिन्दी में बदलें"}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      {hi ? "EN" : "हिन्दी"}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-lg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-secondary focus:px-4 focus:py-2 focus:text-secondary-foreground"
      >
        {hi ? "मुख्य सामग्री पर जाएं" : "Skip to content"}
      </a>
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="shrink-0 rounded-xl" title={hi ? "होम" : "Home"}>
          <Logo />
        </Link>

        <nav
          aria-label={hi ? "मुख्य" : "Main"}
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
        >
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={pill(location.pathname === link.to)}>
              {t(link.labelKey)}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Link to="/admin" className={pill(location.pathname === "/admin")}>
                <Shield className="h-4 w-4" aria-hidden="true" /> {t("nav.admin")}
              </Link>
              <Link to="/reports" className={pill(location.pathname === "/reports")}>
                <BarChart3 className="h-4 w-4" aria-hidden="true" /> {tx("Reports")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/report"
            className="hidden min-h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-bold text-secondary-foreground shadow-sm transition hover:brightness-105 active:scale-[0.97] md:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />{" "}
            {hi ? "समस्या बताएं" : "Report a problem"}
          </Link>
          <div className="hidden sm:block">{LangButton}</div>
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="nn-menu"
            aria-label={
              menuOpen ? (hi ? "मेन्यू बंद करें" : "Close menu") : hi ? "और विकल्प" : "More options"
            }
            className="grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-accent"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="nn-menu"
            aria-label={hi ? "सभी पेज" : "All pages"}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border bg-card"
          >
            <div className="container grid max-h-[calc(100dvh-4rem)] gap-1 overflow-y-auto overscroll-contain py-3 pb-24 sm:grid-cols-2 md:pb-3 lg:grid-cols-4">
              <div className="mb-1 sm:hidden">{LangButton}</div>
              {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={close}
                  className={menuItem(location.pathname === link.to)}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
              <Link
                to="/privacy"
                onClick={close}
                className={menuItem(location.pathname === "/privacy")}
              >
                <Lock className="h-4 w-4" aria-hidden="true" /> {hi ? "गोपनीयता" : "Privacy"}
              </Link>
              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    onClick={close}
                    className={menuItem(location.pathname === "/admin")}
                  >
                    <Shield className="h-4 w-4" aria-hidden="true" /> {t("nav.admin")}
                  </Link>
                  <Link
                    to="/reports"
                    onClick={close}
                    className={menuItem(location.pathname === "/reports")}
                  >
                    <BarChart3 className="h-4 w-4" aria-hidden="true" /> {tx("Reports")}
                  </Link>
                </>
              ) : (
                <Link
                  to="/request-admin"
                  onClick={close}
                  className={menuItem(location.pathname === "/request-admin")}
                >
                  <Shield className="h-4 w-4" aria-hidden="true" /> {t("nav.requestAdmin")}
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={close}
                    className={menuItem(location.pathname === "/profile")}
                  >
                    <User className="h-4 w-4" aria-hidden="true" /> {tx("My Profile")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      close();
                    }}
                    className={menuItem(false) + " text-left"}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> {t("nav.signOut")}
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-full bg-secondary px-4 text-sm font-bold text-secondary-foreground"
                >
                  {t("nav.signIn")}
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
