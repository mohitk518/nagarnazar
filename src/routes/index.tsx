import { createFileRoute } from "@tanstack/react-router";
import Index from "@/components/pages/Index";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NagarNazar" },
      { name: "description", content: "Your city, under watch. Every complaint tracked, every fix proven." },
      { property: "og:title", content: "NagarNazar" },
      { property: "og:description", content: "Your city, under watch. Every complaint tracked, every fix proven." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
