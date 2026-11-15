import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, MapPinned } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { summariseByWard, type WardRow } from "@/lib/wards";

interface Props {
  complaints: { ward_id: string | null; status: string; due_at?: string | null }[];
  wards: Record<string, WardRow>;
  /** Clicking a ward row filters the admin list to that ward. */
  onPickWard?: (wardId: string | "none") => void;
}

const COLORS = {
  pending: "#B45309",
  inProgress: "#4F46E5",
  resolved: "#16A34A",
  overdue: "#DC2626",
};

/** Admin: ward-wise complaint counts as a stacked bar chart plus an accessible table. */
export default function WardSummary({ complaints, wards, onPickWard }: Props) {
  const { language } = useLanguage();
  const hi = language === "hi";
  const [open, setOpen] = useState(true);
  const rows = useMemo(() => summariseByWard(complaints, wards, hi), [complaints, wards, hi]);
  const chartRows = rows.slice(0, 12).map((r) => ({
    name: r.key === "none" ? (hi ? "तय नहीं" : "Not set") : r.label.split(" · ")[0],
    full: r.label,
    [hi ? "लंबित" : "Pending"]: r.pending,
    [hi ? "काम जारी" : "In progress"]: r.inProgress,
    [hi ? "हल" : "Resolved"]: r.resolved,
  }));
  const keys = hi ? ["लंबित", "काम जारी", "हल"] : ["Pending", "In progress", "Resolved"];
  const keyColors = [COLORS.pending, COLORS.inProgress, COLORS.resolved];

  return (
    <section
      aria-labelledby="ward-summary-title"
      className="mb-6 rounded-2xl border border-border/70 bg-card shadow-card"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
          <span id="ward-summary-title" className="font-display text-lg font-bold text-foreground">
            {hi ? "वार्ड-वार शिकायतें" : "Ward-wise complaints"}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {complaints.length}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-4 px-5 pb-5">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hi ? "अभी कोई शिकायत नहीं।" : "No complaints yet."}
            </p>
          ) : (
            <>
              <div className="h-64 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {keys.map((k, i) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        stackId="w"
                        fill={keyColors[i]}
                        radius={i === keys.length - 1 ? [6, 6, 0, 0] : 0}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <caption className="sr-only">
                    {hi ? "वार्ड-वार शिकायतें" : "Ward-wise complaints"}
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-2 pr-3">
                        {hi ? "वार्ड" : "Ward"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right">
                        {hi ? "कुल" : "Total"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right">
                        {hi ? "लंबित" : "Pending"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right">
                        {hi ? "जारी" : "In progress"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right">
                        {hi ? "हल" : "Resolved"}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right">
                        {hi ? "समय पार" : "Overdue"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-b border-border/60 last:border-0">
                        <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                          {onPickWard ? (
                            <button
                              type="button"
                              onClick={() => onPickWard(r.key === "none" ? "none" : r.key)}
                              className="min-h-11 rounded-lg text-left text-primary underline-offset-2 hover:underline"
                            >
                              {r.label}
                            </button>
                          ) : (
                            r.label
                          )}
                        </th>
                        <td className="px-2 py-2 text-right font-bold tabular-nums">{r.total}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.pending}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.inProgress}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-success">
                          {r.resolved}
                        </td>
                        <td
                          className={`px-2 py-2 text-right tabular-nums ${r.overdue > 0 ? "font-bold text-destructive" : ""}`}
                        >
                          {r.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                {hi
                  ? "वार्ड सर्वर GPS से तय करता है। ‘वार्ड तय नहीं’ वाली शिकायतों का वार्ड अधिकारी ठीक कर सकते हैं।"
                  : "Wards are set by the server from GPS. Complaints in “Ward not set” can be corrected by an officer."}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
