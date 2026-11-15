import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callAiGateway, AI_SERVER_TIMEOUT_MS } from "@/lib/ai-gateway.server";
import { fetchAiStream, AI_TIMEOUT_MS } from "@/lib/invoke-function";
import {
  queueAiSummaryRetry,
  readAiRetryQueue,
  processAiRetryQueue,
  AI_RETRY_WINDOW_MS,
  AI_RETRY_MAX_ATTEMPTS,
} from "@/lib/ai-retry";

describe("server AI gateway wrapper", () => {
  it("answers 504 (retryable) when Gemini is too slow, instead of hanging", async () => {
    const neverFetch = ((_: unknown, init?: RequestInit) =>
      new Promise((_r, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      )) as typeof fetch;
    const res = await callAiGateway({ method: "POST" }, 20, neverFetch);
    expect(res.status).toBe(504);
  });
  it("passes a normal response through", async () => {
    const ok = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    expect((await callAiGateway({}, 1000, ok)).status).toBe(200);
  });
  it("server timeout is shorter than the browser timeout", () => {
    expect(AI_SERVER_TIMEOUT_MS).toBeLessThan(AI_TIMEOUT_MS);
  });
});

describe("streamed chat wrapper", () => {
  it("retries a 503 and returns the successful stream", async () => {
    vi.useFakeTimers();
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("data: ok", { status: 200 }));
    const p = fetchAiStream(
      "civic-chat",
      { method: "POST" },
      { fetchImpl: f as unknown as typeof fetch },
    );
    await vi.runAllTimersAsync();
    const res = await p;
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it("does not retry a 401", async () => {
    const f = vi.fn().mockResolvedValue(new Response("no", { status: 401 }));
    const res = await fetchAiStream("civic-chat", {}, { fetchImpl: f as unknown as typeof fetch });
    expect(res.status).toBe(401);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("'AI analysis later' retry queue", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  const t0 = 1_000_000_000_000;

  it("retries a failed summary later and removes it on success", async () => {
    queueAiSummaryRetry("c1", { complaint_id: "c1" }, t0);
    const invoke = vi.fn().mockResolvedValue({ data: { summary: "ok" }, error: null });
    const r = await processAiRetryQueue(invoke, t0 + 2 * 60_000);
    expect(invoke).toHaveBeenCalledWith("generate-summary", { body: { complaint_id: "c1" } });
    expect(r).toEqual({ done: 1, remaining: 0 });
    expect(readAiRetryQueue()).toHaveLength(0);
  });

  it("keeps it (attempts + 1) while the AI is still down", async () => {
    queueAiSummaryRetry("c2", { complaint_id: "c2" }, t0);
    const invoke = vi
      .fn()
      .mockResolvedValue({ data: null, error: Object.assign(new Error("busy"), { status: 503 }) });
    await processAiRetryQueue(invoke, t0 + 2 * 60_000);
    expect(readAiRetryQueue()[0].attempts).toBe(2);
  });

  it("waits at least a minute between tries", async () => {
    queueAiSummaryRetry("c3", { complaint_id: "c3" }, t0);
    const invoke = vi.fn();
    await processAiRetryQueue(invoke, t0 + 10_000);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("gives up after 24 h, after too many attempts, or on 403/404", async () => {
    queueAiSummaryRetry("old", { complaint_id: "old" }, t0);
    const invoke = vi
      .fn()
      .mockResolvedValue({ data: null, error: Object.assign(new Error("x"), { status: 404 }) });
    await processAiRetryQueue(invoke, t0 + AI_RETRY_WINDOW_MS + 1);
    expect(readAiRetryQueue()).toHaveLength(0);
    queueAiSummaryRetry("gone", { complaint_id: "gone" }, t0);
    await processAiRetryQueue(invoke, t0 + 2 * 60_000);
    expect(readAiRetryQueue()).toHaveLength(0);
    expect(AI_RETRY_MAX_ATTEMPTS).toBeGreaterThan(2);
  });
});
