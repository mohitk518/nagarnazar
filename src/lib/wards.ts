import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WardRow {
  id: string;
  ward_number: number;
  name: string;
  zone: string;
  city: string;
}

export function wardLabel(
  w: Pick<WardRow, "ward_number" | "name"> & { zone?: string | null },
  hi = false,
): string {
  const base = `${hi ? "वार्ड" : "Ward"} ${w.ward_number} · ${w.name}`;
  return w.zone ? `${base} (${w.zone})` : base;
}

/** Wards configured for one city (empty list when the city has none). */
export function useCityWards(city: string | null | undefined) {
  return useQuery({
    queryKey: ["city-wards", city ?? ""],
    enabled: Boolean(city && city !== "all"),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<WardRow[]> => {
      const { data, error } = await supabase
        .from("wards")
        .select("id,ward_number,name,zone,city")
        .eq("city", city!)
        .order("ward_number");
      if (error) return [];
      return (data ?? []) as WardRow[];
    },
  });
}

/** All wards, keyed by id — to show the ward name on lists and the complaint page. */
export function useWardLookup() {
  return useQuery({
    queryKey: ["ward-lookup"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Record<string, WardRow>> => {
      const { data, error } = await supabase.from("wards").select("id,ward_number,name,zone,city");
      if (error || !data) return {};
      return Object.fromEntries((data as WardRow[]).map((w) => [w.id, w]));
    },
  });
}

/** True when the error says a column does not exist yet (migration not applied). */
export function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`;
  return (
    (e.code === "PGRST204" || e.code === "42703" || /column/i.test(text)) && text.includes(column)
  );
}

/**
 * Inserts a complaint with the citizen's ward. If the reported_ward column has not been
 * created yet, retries without it, so reporting never breaks because of this feature.
 */
export async function insertComplaintWithWard<T>(
  insert: (payload: Record<string, unknown>) => Promise<{ data: T | null; error: unknown }>,
  payload: Record<string, unknown>,
  reportedWard: string | null,
): Promise<{ data: T | null; error: unknown; wardSaved: boolean }> {
  const ward = reportedWard?.trim().slice(0, 120) || null;
  if (!ward) {
    const r = await insert(payload);
    return { ...r, wardSaved: false };
  }
  const first = await insert({ ...payload, reported_ward: ward });
  if (!first.error) return { ...first, wardSaved: true };
  if (isMissingColumnError(first.error, "reported_ward")) {
    const second = await insert(payload);
    return { ...second, wardSaved: false };
  }
  return { ...first, wardSaved: false };
}

/** Reads reported_ward for some complaints; returns {} if the column does not exist yet. */
export async function fetchReportedWards(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("complaints")
    .select("id,reported_ward" as "id")
    .in("id", ids);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data as unknown as { id: string; reported_ward: string | null }[]) {
    if (row.reported_ward) out[row.id] = row.reported_ward;
  }
  return out;
}

export type WardSummaryRow = {
  key: string;
  label: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  overdue: number;
};

/** Ward-wise counts for the admin dashboard. Complaints without a ward go to "Not set". */
export function summariseByWard(
  complaints: { ward_id: string | null; status: string; due_at?: string | null }[],
  wards: Record<string, Pick<WardRow, "ward_number" | "name" | "zone">>,
  hi = false,
  now = Date.now(),
): WardSummaryRow[] {
  const map = new Map<string, WardSummaryRow>();
  for (const c of complaints) {
    const key = c.ward_id ?? "none";
    const w = c.ward_id ? wards[c.ward_id] : undefined;
    const label = w ? wardLabel(w, hi) : hi ? "वार्ड तय नहीं" : "Ward not set";
    const row = map.get(key) ?? {
      key,
      label,
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      overdue: 0,
    };
    row.total++;
    if (c.status === "resolved") row.resolved++;
    else if (c.status === "in-progress") row.inProgress++;
    else row.pending++;
    if (c.status !== "resolved" && c.due_at && new Date(c.due_at).getTime() < now) row.overdue++;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.key === "none") return 1;
    if (b.key === "none") return -1;
    return b.total - a.total;
  });
}
