import { useUiText } from "@/hooks/useUiText";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  MapPin,
  Trash2,
  Droplets,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Lightbulb,
  Building,
  Volume2,
  MoreHorizontal,
  Pipette,
  Clock,
  ArrowRight,
  Plus,
  Route as RouteIcon,
  BadgeCheck,
  ListChecks,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { Link, useNavigate } from "@/lib/router-compat";
import Layout from "@/components/Layout";
import { CATEGORY_CONFIG, CATEGORY_LABEL_HI, ComplaintCategory } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { COMPLAINT_COLS } from "@/lib/db-columns";
import { useQuery } from "@tanstack/react-query";
import UpvoteButton from "@/components/UpvoteButton";
import VerifyButton from "@/components/VerifyButton";
import SocialShare from "@/components/SocialShare";
import StatusChip from "@/components/StatusChip";
import { LogoMark } from "@/components/Logo";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { averageResolutionHours, formatDuration } from "@/lib/stats";

const ICON_MAP: Record<string, React.ElementType> = {
  Trash2,
  Droplets,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Lightbulb,
  Pipette,
  Building,
  Volume2,
  MoreHorizontal,
};

const Index = () => {
  const tx = useUiText();
  const { t, language } = useLanguage();
  const hi = language === "hi";
  const navigate = useNavigate();

  // Live-refresh recent complaints + stats when complaints change
  const invalidateIndex = useRealtimeInvalidate([["recent-complaints"], ["complaint-stats"]]);
  useEffect(() => {
    const channel = supabase
      .channel("index-complaints-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () =>
        invalidateIndex(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateIndex]);

  const { data: complaints = [] } = useQuery({
    queryKey: ["recent-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select(COMPLAINT_COLS)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Live stats from real data: total, resolved and average time to resolve
  const { data: stats } = useQuery({
    queryKey: ["complaint-stats"],
    queryFn: async () => {
      const [{ count: total }, { count: resolved }, { data: resolvedRows }] = await Promise.all([
        supabase.from("complaints").select("id", { count: "exact", head: true }),
        supabase
          .from("complaints")
          .select("id", { count: "exact", head: true })
          .eq("status", "resolved"),
        supabase
          .from("complaints")
          .select("created_at,resolved_at")
          .eq("status", "resolved")
          .not("resolved_at", "is", null)
          .order("resolved_at", { ascending: false })
          .limit(1000),
      ]);
      return {
        total: total || 0,
        resolved: resolved || 0,
        avgHours: averageResolutionHours(resolvedRows ?? []),
      };
    },
  });

  const timeAgo = (dateStr: string) => {
    const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (hours < 1) return t("common.justNow");
    if (hours < 24) return `${hours}${t("common.hAgo")}`;
    return `${Math.floor(hours / 24)}${t("common.dAgo")}`;
  };

  const statCards = [
    {
      label: hi ? "कुल शिकायतें" : "Total complaints",
      value: stats ? stats.total.toLocaleString("en-IN") : "—",
      icon: ListChecks,
    },
    {
      label: hi ? "हल हुईं" : "Resolved",
      value: stats ? stats.resolved.toLocaleString("en-IN") : "—",
      icon: CheckCircle2,
    },
    {
      label: hi ? "औसत समाधान समय" : "Avg. time to fix",
      value: stats?.avgHours != null ? formatDuration(stats.avgHours, language) : "—",
      icon: Timer,
    },
  ];

  const steps = [
    {
      icon: Camera,
      en: "Click",
      hi: "फ़ोटो लें",
      den: "Photo, GPS and ward in under a minute — or just speak.",
      dhi: "फ़ोटो, GPS और वार्ड एक मिनट में — या बोलकर बताएं।",
    },
    {
      icon: RouteIcon,
      en: "Route",
      hi: "सही विभाग",
      den: "Sent to the right department with a deadline. Overdue ones escalate.",
      dhi: "सही विभाग को समय सीमा के साथ। देर होने पर ऊपर भेजी जाती है।",
    },
    {
      icon: BadgeCheck,
      en: "Prove",
      hi: "सबूत",
      den: "Closed only with an after-repair photo anyone can see.",
      dhi: "काम पूरा होने की फ़ोटो के साथ ही बंद — सब देख सकते हैं।",
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden text-primary-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div className="container relative grid items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
              {hi
                ? "छोटे शहरों के लिए, हिंदी में सबसे पहले"
                : "Hindi-first, built for small Indian cities"}
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] md:text-7xl">
              <span lang="hi" className="block text-secondary">
                नगर नज़र
              </span>
              <span className="block">NagarNazar</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl">
              {t("brand.tagline")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-secondary px-7 text-lg font-extrabold text-secondary-foreground shadow-elevated transition hover:brightness-105 active:scale-[0.97]"
              >
                <Plus className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
                {hi ? "समस्या बताएं" : "Report a problem"}
              </Link>
              <Link
                to="/complaints"
                className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-white/30 px-6 text-base font-bold text-white transition hover:border-white hover:bg-white/10"
              >
                {hi ? "शिकायतें देखें" : "See complaints"}{" "}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden justify-center md:flex"
          >
            <div className="relative grid h-72 w-72 place-items-center rounded-[3rem] bg-white/95 shadow-elevated">
              <LogoMark className="h-48 w-48" title="" />
            </div>
          </motion.div>
        </div>

        {/* Live stats */}
        <div className="container relative pb-12">
          <h2 className="sr-only">{hi ? "लाइव आँकड़े" : "Live stats"}</h2>
          <ul className="grid grid-cols-3 gap-3 md:max-w-3xl">
            {statCards.map((s) => (
              <li
                key={s.label}
                className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
              >
                <s.icon className="mb-2 h-5 w-5 text-secondary" aria-hidden="true" />
                <div className="font-display text-2xl font-extrabold md:text-3xl">{s.value}</div>
                <div className="text-xs font-medium text-white/80 md:text-sm">{s.label}</div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/70">
            {hi ? "असली शिकायतों से, लाइव अपडेट।" : "From real complaints, updated live."}
          </p>
        </div>
      </section>

      {/* Click → Route → Prove */}
      <section className="container py-14">
        <h2 className="text-center font-display text-3xl font-extrabold text-foreground md:text-4xl">
          {hi ? "फ़ोटो → सही विभाग → सबूत" : "Click → Route → Prove"}
        </h2>
        <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.en} className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="font-display text-sm font-bold text-muted-foreground">
                  {i + 1} / 3
                </span>
              </div>
              <h3 className="font-display text-xl font-extrabold text-foreground">
                {hi ? s.hi : s.en}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{hi ? s.dhi : s.den}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Recent complaints */}
      <section id="feed" className="bg-muted py-14">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-extrabold text-foreground">
                {t("recent.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("recent.subtitle")}</p>
            </div>
            <Link
              to="/complaints"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-primary/25 px-4 text-sm font-bold text-primary hover:border-primary hover:bg-accent"
            >
              {hi ? "सभी देखें" : "View all"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center text-muted-foreground">
              <p className="text-lg font-semibold">{t("recent.noComplaints")}</p>
              <p className="text-sm">{t("recent.beFirst")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {complaints.map((c: any, i: number) => {
                const catConfig = CATEGORY_CONFIG[c.category as ComplaintCategory];
                const Icon = ICON_MAP[catConfig?.icon] || MoreHorizontal;
                const open = () => navigate(`/complaints/${c.complaint_id}`);
                return (
                  <motion.article
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    {c.photo_url && (
                      <button
                        type="button"
                        onClick={open}
                        className="block"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <img
                          src={c.photo_url}
                          alt=""
                          loading="lazy"
                          className="h-44 w-full object-cover"
                        />
                      </button>
                    )}
                    <div className="flex flex-1 flex-col p-4 md:p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusChip status={c.status} dueAt={c.due_at} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          <Icon
                            className="h-3.5 w-3.5"
                            style={{ color: catConfig?.color }}
                            aria-hidden="true"
                          />
                          {hi
                            ? CATEGORY_LABEL_HI[c.category as ComplaintCategory]
                            : catConfig?.label}
                        </span>
                        {c.priority === "emergency" && (
                          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            🚨 {t("common.emergency")}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          #{c.complaint_id}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground md:text-lg">
                        <Link
                          to={`/complaints/${c.complaint_id}`}
                          className="rounded hover:underline"
                        >
                          {c.title}
                        </Link>
                      </h3>
                      {c.ai_summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
                          <span className="mr-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {tx("AI")}
                          </span>
                          {c.ai_summary}
                        </p>
                      ) : (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{" "}
                          <span className="truncate">{c.location}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <UpvoteButton complaintId={c.id} upvotes={c.upvotes || 0} />
                        <VerifyButton
                          complaintId={c.id}
                          verificationCount={c.verification_count || 0}
                        />
                        <SocialShare title={c.title} complaintId={c.complaint_id} />
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-secondary p-8 text-secondary-foreground md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">
              {hi
                ? "कोई गड्ढा, कचरा या बंद बत्ती दिखी?"
                : "Seen a pothole, garbage or a dead streetlight?"}
            </h2>
            <p className="mt-1 font-medium">
              {hi
                ? "एक मिनट में बताइए। हर काम का सबूत मिलेगा।"
                : "Report it in a minute. Every fix gets proven."}
            </p>
          </div>
          <Link
            to="/report"
            className="inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-7 text-lg font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.97]"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />{" "}
            {hi ? "समस्या बताएं" : "Report a problem"}
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
