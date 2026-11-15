import { useUiText } from "@/hooks/useUiText";
import { Link } from "@/lib/router-compat";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const tx = useUiText();
  const { t } = useLanguage();

  return (
    <footer className="mt-auto rounded-t-[2rem] bg-[#1E1B4B] text-white dark:bg-[#15123a]">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white">
                <LogoMark className="h-9 w-9" />
              </span>
              <span className="font-display font-bold text-lg">{t("nav.appName")}</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">{t("footer.desc")}</p>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold mb-3">{t("footer.quickLinks")}</h2>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link to="/" className="hover:opacity-100 transition-opacity">
                {t("nav.home")}
              </Link>
              <Link to="/complaints" className="hover:opacity-100 transition-opacity">
                {t("nav.complaints")}
              </Link>
              <Link to="/dashboard" className="hover:opacity-100 transition-opacity">
                {t("nav.dashboard")}
              </Link>
            </div>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold mb-3">{t("footer.getInTouch")}</h2>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link to="/contact" className="hover:opacity-100 transition-opacity">
                {t("nav.contact")}
              </Link>
              <Link to="/faq" className="hover:opacity-100 transition-opacity">
                {t("nav.faq")}
              </Link>
              <Link to="/privacy" className="hover:opacity-100 transition-opacity">
                {tx("Privacy / गोपनीयता")}
              </Link>
              <Link to="/install" className="hover:opacity-100 transition-opacity">
                {t("nav.install")}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-sm opacity-80">
          <h2 className="font-display text-base font-semibold mb-2 text-center">
            {t("footer.problemStatement")}
          </h2>
          <p className="leading-relaxed max-w-3xl mx-auto text-center">{t("footer.problemDesc")}</p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 text-xs opacity-80 text-center">
          <p>{t("brand.tagline")}</p>
          <p>
            {t("footer.builtFor")} · Team SANT ·{" "}
            <a
              href="https://github.com/mohitk518/nagarnazar"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
