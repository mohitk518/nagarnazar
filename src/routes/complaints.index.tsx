import { createFileRoute } from "@tanstack/react-router";
import Complaints from "@/components/pages/Complaints";

export const Route = createFileRoute("/complaints/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complaints — NagarNazar" },
      { name: "description", content: "Browse every civic complaint reported in your city and follow its progress." },
      { property: "og:title", content: "Complaints — NagarNazar" },
      { property: "og:description", content: "Browse every civic complaint reported in your city and follow its progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Complaints,
});
