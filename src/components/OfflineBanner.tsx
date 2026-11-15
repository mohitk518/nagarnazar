import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { loadDraft, hasContent } from "@/lib/draft";

/**
 * App-wide offline banner ("Aap offline hain") and, when the network returns while a
 * complaint is waiting on this device, a "Send draft?" prompt from any page.
 */
export default function OfflineBanner() {
  const { language } = useLanguage();
  const hi = language === "hi";
  const [online, setOnline] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    setOnline(navigator.onLine);
    const askToSend = async () => {
      if (pathRef.current === "/report") return; // the report page shows its own prompt
      const d = await loadDraft();
      if (!d || !hasContent(d) || !d.queued) return;
      toast(hi ? "नेट वापस आ गया — ड्राफ़्ट भेजें?" : "Back online — send your draft?", {
        id: "nn-send-draft",
        description: d.title ? `“${d.title}”` : undefined,
        duration: 20000,
        action: {
          label: hi ? "भेजें" : "Send",
          onClick: () => navigate("/report"),
        },
      });
    };
    const on = () => {
      setOnline(true);
      void askToSend();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (navigator.onLine) void askToSend();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-16 z-40 flex items-center justify-center gap-2 bg-[#1E1B4B] px-4 py-2 text-center text-sm font-semibold text-white"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
      <span>
        {hi
          ? "आप ऑफ़लाइन हैं। शिकायत लिखते रहें — यह इस फ़ोन पर सेव रहेगी।"
          : "You're offline. Keep writing — your complaint is saved on this phone."}
      </span>
    </div>
  );
}
