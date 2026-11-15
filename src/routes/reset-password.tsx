import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/components/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — NagarNazar" },
      { name: "description", content: "Set a new password for your NagarNazar account." },
      { property: "og:title", content: "Reset password — NagarNazar" },
      { property: "og:description", content: "Set a new password for your NagarNazar account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});
