import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/** Light/dark switch. Saved per device; light is the default. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const hi = language === "hi";
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("nn-theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  };

  const label = dark ? (hi ? "लाइट मोड" : "Light mode") : hi ? "डार्क मोड" : "Dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={label}
      title={label}
      className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-accent ${className}`}
    >
      {dark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
