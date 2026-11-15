import { createFileRoute } from "@tanstack/react-router";
import RequestAdmin from "@/components/pages/RequestAdmin";

export const Route = createFileRoute("/request-admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Request admin access — NagarNazar" },
      { name: "description", content: "Request administrator access to NagarNazar." },
      { property: "og:title", content: "Request admin access — NagarNazar" },
      { property: "og:description", content: "Request administrator access to NagarNazar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestAdmin,
});
