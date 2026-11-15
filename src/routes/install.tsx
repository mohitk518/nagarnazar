import { createFileRoute } from "@tanstack/react-router";
import Install from "@/components/pages/Install";

export const Route = createFileRoute("/install")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Install the app — NagarNazar" },
      { name: "description", content: "Install NagarNazar on your phone for quick reporting." },
      { property: "og:title", content: "Install the app — NagarNazar" },
      { property: "og:description", content: "Install NagarNazar on your phone for quick reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Install,
});
