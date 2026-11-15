/** Average hours between created_at and resolved_at; null when nothing has been resolved yet. */
export function averageResolutionHours(
  rows: { created_at: string | null; resolved_at: string | null }[],
): number | null {
  const durations = rows
    .map((r) => {
      if (!r.created_at || !r.resolved_at) return null;
      const ms = new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
      return Number.isFinite(ms) && ms >= 0 ? ms / 3_600_000 : null;
    })
    .filter((h): h is number => h !== null);
  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

/** "5 hrs", "2.5 days" (or Hindi) — short, human readable. */
export function formatDuration(hours: number, language: "en" | "hi" | string = "en"): string {
  const hi = language === "hi";
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return hi ? `${m} मिनट` : `${m} min`;
  }
  if (hours < 48) {
    const h = Math.round(hours);
    return hi ? `${h} घंटे` : `${h} ${h === 1 ? "hr" : "hrs"}`;
  }
  const d = Math.round((hours / 24) * 10) / 10;
  return hi ? `${d} दिन` : `${d} days`;
}
