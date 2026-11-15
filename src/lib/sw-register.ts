/**
 * Registers the offline service worker on the published site only.
 * Skipped in development and inside Lovable's editor preview, where a cached app shell
 * would hide fresh code. Set localStorage "nn-sw-off" = "1" to switch it off on a device.
 */
const PREVIEW_HOST =
  /(^localhost$)|(^127\.)|lovableproject|id-preview|lovable\.dev$|gpt-eng|gptengineer/i;

export function shouldRegisterServiceWorker(
  hostname: string,
  isProd: boolean,
  optOut: boolean,
): boolean {
  return isProd && !optOut && !PREVIEW_HOST.test(hostname);
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let optOut = false;
  try {
    optOut = localStorage.getItem("nn-sw-off") === "1";
  } catch {
    /* ignore */
  }
  if (optOut) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }
  if (!shouldRegisterServiceWorker(window.location.hostname, import.meta.env.PROD, optOut)) return;
  const start = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
