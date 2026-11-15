/**
 * Single server-side entry point for every Gemini call (through the Lovable AI Gateway).
 * Adds a timeout so a slow model can never hang a request: on timeout it returns HTTP 504,
 * which the browser wrapper (src/lib/invoke-function.ts) treats as retryable.
 * The timeout covers the wait for the first response bytes, so streamed chat replies are
 * not cut off once they have started.
 */
export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
/** Kept below the browser's 15 s per-attempt timeout so the server answers first. */
export const AI_SERVER_TIMEOUT_MS = 13_000;

export async function callAiGateway(
  init: RequestInit,
  timeoutMs: number = AI_SERVER_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetchImpl(AI_GATEWAY_URL, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) {
      console.error(`AI gateway timed out after ${timeoutMs} ms`);
      return new Response(JSON.stringify({ error: "The AI service took too long to respond" }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Voice notes have no length limit, so speech-to-text gets a longer budget. */
export const AI_VOICE_SERVER_TIMEOUT_MS = 25_000;
export const callAiGatewayVoice = (init: RequestInit) =>
  callAiGateway(init, AI_VOICE_SERVER_TIMEOUT_MS);
