import { describe, it, expect } from "vitest";
import { averageResolutionHours, formatDuration } from "@/lib/stats";
import { effectiveStatus } from "@/components/StatusChip";

describe("home page live stats", () => {
  it("averages real resolution times and ignores bad rows", () => {
    const rows = [
      { created_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-01T10:00:00Z" },
      { created_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-02T06:00:00Z" },
      { created_at: "2026-11-01T00:00:00Z", resolved_at: null },
      { created_at: "2026-11-02T00:00:00Z", resolved_at: "2026-11-01T00:00:00Z" },
    ];
    expect(averageResolutionHours(rows)).toBe(20);
  });
  it("returns null when nothing is resolved yet (never a made-up number)", () => {
    expect(averageResolutionHours([])).toBeNull();
  });
  it("formats durations in English and Hindi", () => {
    expect(formatDuration(5, "en")).toBe("5 hrs");
    expect(formatDuration(72, "en")).toBe("3 days");
    expect(formatDuration(5, "hi")).toBe("5 घंटे");
    expect(formatDuration(0.5, "en")).toBe("30 min");
  });
});

describe("status chip", () => {
  const past = new Date(Date.now() - 3600_000).toISOString();
  const future = new Date(Date.now() + 3600_000).toISOString();
  it("marks unresolved complaints past their deadline as overdue", () => {
    expect(effectiveStatus("pending", past)).toBe("overdue");
    expect(effectiveStatus("in-progress", past)).toBe("overdue");
  });
  it("never marks resolved complaints overdue", () => {
    expect(effectiveStatus("resolved", past)).toBe("resolved");
  });
  it("keeps the stored status before the deadline", () => {
    expect(effectiveStatus("pending", future)).toBe("pending");
    expect(effectiveStatus(null, null)).toBe("pending");
  });
});
