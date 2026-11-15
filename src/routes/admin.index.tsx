import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/components/pages/Admin";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — NagarNazar" },
      { name: "description", content: "Administration console for managing civic complaints." },
      { property: "og:title", content: "Admin — NagarNazar" },
      { property: "og:description", content: "Administration console for managing civic complaints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});
