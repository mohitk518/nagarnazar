import { supabase } from "@/integrations/supabase/client";

/**
 * The one browser-side wrapper for every AI (Gemini) server function.
 * Each attempt has a ~15 s timeout; network errors, timeouts, 408, 429 and 5xx are retried
 * twice with exponential backoff. Never throws: returns { data, error } so AI problems can
 * never block complaint reporting.
 */
export const AI_TIMEOUT_MS = 15_000;
/** Speech-to-text of an unlimited-length voice note gets a longer budget. */
export const AI_VOICE_TIMEOUT_MS = 27_000;
export const AI_MAX_RETRIES = 2;

export function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

/** Exponential backoff: 1 s, 2 s, 4 s … capped at 4 s. */
export function backoffMs(attempt: number) {
  return Math.min(4000, 1000 * 2 ** attempt);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function invokeFunction<T = any>(
  name: string,
  options?: { body?: unknown; timeoutMs?: number; retries?: number },
): Promise<{ data: T | null; error: Error | null }> {
  const timeoutMs = options?.timeoutMs ?? AI_TIMEOUT_MS;
  const retries = options?.retries ?? AI_MAX_RETRIES;
  let lastError: Error = new Error("Request failed");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/public/fn/${name}`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(options?.body ?? {}),
      });
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      if (res.ok) return { data: parsed as T, error: null };
      lastError = Object.assign(
        new Error(
          parsed && typeof parsed === "object" && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : `Request failed with status ${res.status}`,
        ),
        { status: res.status },
      );
      if (!isRetryableStatus(res.status)) break;
    } catch (e) {
      lastError =
        e instanceof DOMException && e.name === "AbortError"
          ? new Error("The AI service took too long to respond")
          : e instanceof Error
            ? e
            : new Error(String(e));
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, backoffMs(attempt)));
  }
  return { data: null, error: lastError };
}

/**
 * Same timeout + retry rules for streamed AI responses (the chat assistant). The timeout only
 * covers the wait for the first response; once streaming starts it is never cut off.
 * Returns the last Response (callers handle 4xx), or throws after the last failed attempt.
 */
export async function fetchAiStream(
  name: string,
  init: RequestInit,
  options?: { timeoutMs?: number; retries?: number; fetchImpl?: typeof fetch },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? AI_TIMEOUT_MS;
  const retries = options?.retries ?? AI_MAX_RETRIES;
  const doFetch = options?.fetchImpl ?? fetch;
  let lastError: Error = new Error("Request failed");
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(`/api/public/fn/${name}`, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok || !isRetryableStatus(res.status) || attempt === retries) return res;
    } catch (e) {
      clearTimeout(timer);
      lastError = ctrl.signal.aborted
        ? new Error("The AI service took too long to respond")
        : e instanceof Error
          ? e
          : new Error(String(e));
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, backoffMs(attempt)));
  }
  throw lastError;
}
