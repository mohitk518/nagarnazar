import { invokeFunction } from "@/lib/invoke-function";

/**
 * "AI analysis will happen later": when the AI summary for a new complaint fails (AI busy,
 * timeout, no network), the complaint is already saved with the citizen's own category.
 * The request is kept here on the device and retried in the background (on app start,
 * when the network returns, and every few minutes) for up to 24 hours.
 */
const KEY = "nn-ai-retry";
export const AI_RETRY_MAX_ATTEMPTS = 6;
export const AI_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;

export interface AiRetryItem {
  complaintId: string;
  body: Record<string, unknown>;
  attempts: number;
  firstFailedAt: number;
  lastTriedAt: number;
}

export function readAiRetryQueue(): AiRetryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as AiRetryItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: AiRetryItem[]) {
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function queueAiSummaryRetry(
  complaintId: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  const list = readAiRetryQueue().filter((i) => i.complaintId !== complaintId);
  list.push({ complaintId, body, attempts: 1, firstFailedAt: now, lastTriedAt: now });
  write(list);
}

type Invoke = typeof invokeFunction;

/** Retries waiting AI summaries. Returns how many succeeded and how many are still waiting. */
export async function processAiRetryQueue(invoke: Invoke = invokeFunction, now = Date.now()) {
  const list = readAiRetryQueue();
  const keep: AiRetryItem[] = [];
  let done = 0;
  for (const item of list) {
    if (now - item.firstFailedAt > AI_RETRY_WINDOW_MS || item.attempts >= AI_RETRY_MAX_ATTEMPTS)
      continue; // give up
    if (now - item.lastTriedAt < MIN_GAP_MS) {
      keep.push(item);
      continue;
    }
    const { error } = await invoke("generate-summary", { body: item.body });
    if (!error) {
      done++;
      continue;
    }
    const status = (error as Error & { status?: number }).status;
    if (status === 400 || status === 403 || status === 404) continue; // will never succeed
    keep.push({ ...item, attempts: item.attempts + 1, lastTriedAt: now });
  }
  // Items queued while we were working are kept too.
  const latest = readAiRetryQueue().filter(
    (i) => !list.some((o) => o.complaintId === i.complaintId),
  );
  write([...keep, ...latest]);
  return { done, remaining: keep.length + latest.length };
}

/** Starts the background retries; returns a cleanup function. */
export function startAiRetryLoop(intervalMs = 5 * 60 * 1000): () => void {
  if (typeof window === "undefined") return () => undefined;
  let running = false;
  const run = async () => {
    if (running || !navigator.onLine || readAiRetryQueue().length === 0) return;
    running = true;
    try {
      await processAiRetryQueue();
    } finally {
      running = false;
    }
  };
  const first = window.setTimeout(run, 8000);
  const timer = window.setInterval(run, intervalMs);
  window.addEventListener("online", run);
  return () => {
    window.clearTimeout(first);
    window.clearInterval(timer);
    window.removeEventListener("online", run);
  };
}
