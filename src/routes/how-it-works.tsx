import { createFileRoute } from "@tanstack/react-router";
import HowItWorks from "@/components/pages/HowItWorks";

export const Route = createFileRoute("/how-it-works")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "How it works — NagarNazar" },
      { name: "description", content: "From report to resolution: how a civic complaint moves through the system." },
      { property: "og:title", content: "How it works — NagarNazar" },
      { property: "og:description", content: "From report to resolution: how a civic complaint moves through the system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});
