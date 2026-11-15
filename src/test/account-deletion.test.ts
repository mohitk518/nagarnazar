import { describe, it, expect } from "vitest";
import { deleteAccountData, PERSONAL_TABLES, type DeletionClient } from "@/lib/account-deletion";

type Call = {
  table: string;
  op: "update" | "delete" | "deleteUser";
  values?: Record<string, unknown>;
};

function fakeClient(
  fail: Partial<Record<string, { message: string; code?: string }>> = {},
  failFirstComplaintUpdate = false,
) {
  const calls: Call[] = [];
  let complaintUpdates = 0;
  const client: DeletionClient = {
    from(table) {
      return {
        update(values) {
          return {
            eq: async () => {
              calls.push({ table, op: "update", values });
              if (table === "complaints") {
                complaintUpdates++;
                if (failFirstComplaintUpdate && complaintUpdates === 1)
                  return { error: { message: "guard" } };
              }
              return { error: fail[`update:${table}`] ?? null };
            },
          };
        },
        delete() {
          return {
            eq: async () => {
              calls.push({ table, op: "delete" });
              return { error: fail[`delete:${table}`] ?? null };
            },
          };
        },
      };
    },
    auth: {
      admin: {
        deleteUser: async () => {
          calls.push({ table: "auth.users", op: "deleteUser" });
          return { error: fail["deleteUser"] ?? null };
        },
      },
    },
  };
  return { client, calls };
}

describe("delete my account (server)", () => {
  it("anonymises complaints first, removes personal data, then deletes the login", async () => {
    const { client, calls } = fakeClient();
    const r = await deleteAccountData(client, "u1");
    expect(r).toMatchObject({ deleted: true, complaintsUnlinked: true });
    expect(calls[0]).toMatchObject({
      table: "complaints",
      op: "update",
      values: {
        submitted_by: "Deleted user",
        anonymous: true,
        whatsapp_number: null,
        user_id: null,
      },
    });
    const deleted = calls.filter((c) => c.op === "delete").map((c) => c.table);
    expect(deleted).toEqual([...PERSONAL_TABLES]);
    expect(deleted).toContain("profiles");
    expect(calls.at(-1)).toMatchObject({ op: "deleteUser" });
  });

  it("still anonymises if a guard blocks unlinking user_id", async () => {
    const { client, calls } = fakeClient({}, true);
    const r = await deleteAccountData(client, "u1");
    expect(r.complaintsUnlinked).toBe(false);
    const second = calls.filter((c) => c.table === "complaints")[1];
    expect(second.values).toEqual({
      submitted_by: "Deleted user",
      anonymous: true,
      whatsapp_number: null,
    });
  });

  it("stops before deleting anything if complaints cannot be anonymised", async () => {
    const { client, calls } = fakeClient({ "update:complaints": { message: "denied" } });
    await expect(deleteAccountData(client, "u1")).rejects.toThrow(/anonymise/);
    expect(calls.some((c) => c.op === "delete" || c.op === "deleteUser")).toBe(false);
  });

  it("blanks name and phone if the profile row cannot be deleted", async () => {
    const { client, calls } = fakeClient({ "delete:profiles": { message: "blocked by trigger" } });
    const r = await deleteAccountData(client, "u1");
    expect(r.skipped).toContain("profiles");
    const blank = calls.find((c) => c.table === "profiles" && c.op === "update");
    expect(blank?.values).toMatchObject({ full_name: "Deleted user", phone_number: null });
    expect(calls.at(-1)?.op).toBe("deleteUser");
  });

  it("reports a failed login deletion", async () => {
    const { client } = fakeClient({ deleteUser: { message: "x" } });
    await expect(deleteAccountData(client, "u1")).rejects.toThrow(/Could not delete account/);
  });
});

describe("second confirmation word", async () => {
  const { isConfirmWord } = await import("@/components/DeleteAccountCard");
  it("accepts DELETE (any case) or हटाएं, nothing else", () => {
    expect(isConfirmWord("DELETE")).toBe(true);
    expect(isConfirmWord(" delete ")).toBe(true);
    expect(isConfirmWord("हटाएं")).toBe(true);
    expect(isConfirmWord("DEL")).toBe(false);
    expect(isConfirmWord("")).toBe(false);
  });
});
