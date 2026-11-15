import { useUiText } from "@/hooks/useUiText";
import { Link } from "@/lib/router-compat";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const tx = useUiText();
  const { t } = useLanguage();

  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <MapPin className="w-4 h-4 text-secondary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">{t("nav.appName")}</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">{t("footer.quickLinks")}</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link to="/" className="hover:opacity-100 transition-opacity">{t("nav.home")}</Link>
              <Link to="/complaints" className="hover:opacity-100 transition-opacity">{t("nav.complaints")}</Link>
              <Link to="/dashboard" className="hover:opacity-100 transition-opacity">{t("nav.dashboard")}</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">{t("footer.getInTouch")}</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link to="/contact" className="hover:opacity-100 transition-opacity">{t("nav.contact")}</Link>
              <Link to="/faq" className="hover:opacity-100 transition-opacity">{t("nav.faq")}</Link>
              <Link to="/privacy" className="hover:opacity-100 transition-opacity">{tx("Privacy / गोपनीयता")}</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-sm opacity-80">
          <h4 className="font-display font-semibold mb-2 text-center">{t("footer.problemStatement")}</h4>
          <p className="leading-relaxed max-w-3xl mx-auto text-center">{t("footer.problemDesc")}</p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 text-xs opacity-80 text-center">
          <p>{t("brand.tagline")}</p>
          <p>
            {t("footer.builtFor")} · Team SANT ·{" "}
            <a href="https://github.com/mohitk518/nagarnazar" target="_blank" rel="noopener noreferrer" className="underline">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
