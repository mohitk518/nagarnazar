import { describe, it, expect, vi } from "vitest";
import {
  insertComplaintWithWard,
  isMissingColumnError,
  summariseByWard,
  wardLabel,
} from "@/lib/wards";

describe("ward on new complaints", () => {
  it("saves the citizen's ward when the column exists", async () => {
    const insert = vi.fn(async (row: Record<string, unknown>) => ({
      data: { id: "1", row },
      error: null,
    }));
    const r = await insertComplaintWithWard(insert, { title: "Pothole" }, "Ward 12");
    expect(r.wardSaved).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({ title: "Pothole", reported_ward: "Ward 12" });
  });

  it("still submits the complaint if the reported_ward column is missing", async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'reported_ward' column of 'complaints' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: { id: "2" }, error: null });
    const r = await insertComplaintWithWard(insert, { title: "Garbage" }, "Ward 3");
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ id: "2" });
    expect(r.wardSaved).toBe(false);
    expect(insert.mock.calls[1][0]).not.toHaveProperty("reported_ward");
  });

  it("does not hide other errors", async () => {
    const insert = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });
    const r = await insertComplaintWithWard(insert, {}, "Ward 1");
    expect(r.error).toBeTruthy();
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("skips the ward field when the citizen did not choose one (old behaviour)", async () => {
    const insert = vi.fn(async (row: Record<string, unknown>) => ({ data: row, error: null }));
    await insertComplaintWithWard(insert, { title: "x" }, "  ");
    expect(insert.mock.calls[0][0]).not.toHaveProperty("reported_ward");
  });

  it("recognises missing-column errors only for that column", () => {
    expect(
      isMissingColumnError(
        { code: "42703", message: 'column "reported_ward" does not exist' },
        "reported_ward",
      ),
    ).toBe(true);
    expect(
      isMissingColumnError(
        { code: "42703", message: 'column "foo" does not exist' },
        "reported_ward",
      ),
    ).toBe(false);
    expect(isMissingColumnError(null, "reported_ward")).toBe(false);
  });
});

describe("ward-wise admin summary", () => {
  const wards = {
    w1: { ward_number: 1, name: "Station Road", zone: "A" },
    w2: { ward_number: 2, name: "Old Town", zone: "B" },
  };
  const now = Date.parse("2026-11-20T00:00:00Z");
  const rows = summariseByWard(
    [
      { ward_id: "w1", status: "pending", due_at: "2026-11-19T00:00:00Z" },
      { ward_id: "w1", status: "resolved", due_at: "2026-11-01T00:00:00Z" },
      { ward_id: "w1", status: "in-progress", due_at: null },
      { ward_id: "w2", status: "pending", due_at: "2026-11-25T00:00:00Z" },
      { ward_id: null, status: "pending" },
    ],
    wards,
    false,
    now,
  );
  it("counts per ward, busiest first, with 'Ward not set' last", () => {
    expect(rows.map((r) => r.key)).toEqual(["w1", "w2", "none"]);
    expect(rows[0]).toMatchObject({ total: 3, pending: 1, inProgress: 1, resolved: 1, overdue: 1 });
    expect(rows[2].label).toBe("Ward not set");
  });
  it("labels wards in English and Hindi", () => {
    expect(wardLabel(wards.w1)).toBe("Ward 1 · Station Road (A)");
    expect(wardLabel(wards.w1, true)).toBe("वार्ड 1 · Station Road (A)");
  });
});
