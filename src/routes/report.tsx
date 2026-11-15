import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import ReportFlow from "@/components/ReportFlow";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/report")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Report a problem — NagarNazar" },
      {
        name: "description",
        content: "Report a civic problem in four quick steps: photo, location, details, review.",
      },
      { property: "og:title", content: "Report a problem — NagarNazar" },
      {
        property: "og:description",
        content:
          "Photo → location & ward → details → review. Every complaint tracked, every fix proven.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { language } = useLanguage();
  const hi = language === "hi";
  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <div className="mx-auto mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-secondary-foreground/80">
            <span className="rounded-full bg-secondary px-3 py-1">
              {hi ? "नई शिकायत" : "New complaint"}
            </span>
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground md:text-4xl">
            {hi ? "समस्या बताएं" : "Report a problem"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {hi
              ? "4 आसान चरण — फ़ोटो, जगह, विवरण, जाँच।"
              : "4 quick steps — photo, location, details, review."}
          </p>
        </div>
        <ReportFlow />
      </section>
    </Layout>
  );
}
