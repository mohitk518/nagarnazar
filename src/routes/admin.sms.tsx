import { createFileRoute } from "@tanstack/react-router";
import AdminSMS from "@/components/pages/AdminSMS";

export const Route = createFileRoute("/admin/sms")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SMS centre — NagarNazar" },
      { name: "description", content: "Send and review SMS updates to citizens." },
      { property: "og:title", content: "SMS centre — NagarNazar" },
      { property: "og:description", content: "Send and review SMS updates to citizens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSMS,
});
