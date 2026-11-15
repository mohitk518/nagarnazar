import { createFileRoute } from "@tanstack/react-router";
import WhatsAppSetup from "@/components/pages/WhatsAppSetup";

export const Route = createFileRoute("/admin/whatsapp")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "WhatsApp setup — NagarNazar" },
      { name: "description", content: "Configure WhatsApp complaint intake." },
      { property: "og:title", content: "WhatsApp setup — NagarNazar" },
      { property: "og:description", content: "Configure WhatsApp complaint intake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsAppSetup,
});
