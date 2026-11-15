/**
 * Server-only account deletion steps (run with the service-role client inside a server
 * function — the service key never reaches the browser).
 *
 * Order matters:
 *  1. Anonymise the user's complaints (name → "Deleted user", anonymous, WhatsApp number removed,
 *     unlinked from the account). If this fails we stop, so no personal name stays public.
 *  2. Delete personal rows (profile incl. phone, comments, votes, subscriptions, notifications, …),
 *     best effort; a profile that cannot be deleted gets its name and phone blanked.
 *  3. Delete the auth user.
 * Complaints themselves stay as anonymous public records, so repairs remain accountable.
 * Audit logs are kept (tamper-proof accountability trail; they hold IDs, not profile data).
 */

export const PERSONAL_TABLES = [
  "complaint_comments",
  "complaint_upvotes",
  "complaint_verifications",
  "complaint_ratings",
  "poll_votes",
  "push_subscriptions",
  "user_notifications",
  "reward_redemptions",
  "user_achievements",
  "point_reward_events",
  "admin_requests",
  "worker_role_requests",
  "sms_log",
  "user_roles",
  "profiles",
] as const;

export const ANONYMISED_COMPLAINT = {
  submitted_by: "Deleted user",
  anonymous: true,
  whatsapp_number: null,
} as const;

type DbError = { message?: string; code?: string } | null;
type Result = { error: DbError };

/** The small part of the Supabase admin client this needs (easy to fake in tests). */
export interface DeletionClient {
  from(table: string): {
    update(values: Record<string, unknown>): { eq(col: string, val: string): PromiseLike<Result> };
    delete(): { eq(col: string, val: string): PromiseLike<Result> };
  };
  auth: { admin: { deleteUser(id: string): PromiseLike<Result> } };
}

export interface DeletionReport {
  deleted: boolean;
  complaintsUnlinked: boolean;
  skipped: string[];
}

const missingTable = (e: DbError) =>
  !!e &&
  (e.code === "42P01" ||
    e.code === "PGRST205" ||
    /does not exist|could not find the table/i.test(e.message ?? ""));

export async function deleteAccountData(
  admin: DeletionClient,
  uid: string,
): Promise<DeletionReport> {
  if (!uid) throw new Error("No user");

  // 1) Anonymise complaints. Prefer unlinking too; if a guard blocks changing user_id, anonymise only.
  let complaintsUnlinked = true;
  let r = await admin
    .from("complaints")
    .update({ ...ANONYMISED_COMPLAINT, user_id: null })
    .eq("user_id", uid);
  if (r.error) {
    complaintsUnlinked = false;
    r = await admin
      .from("complaints")
      .update({ ...ANONYMISED_COMPLAINT })
      .eq("user_id", uid);
    if (r.error)
      throw new Error(
        "Could not anonymise your complaints, so nothing was deleted. Please try again.",
      );
  }

  // 2) Personal data — best effort, so an unexpected guard on one table never blocks deletion.
  //    If the profile row cannot be deleted, its name and phone number are blanked instead.
  const skipped: string[] = [];
  const workers = await admin.from("workers").update({ user_id: null }).eq("user_id", uid);
  if (workers.error && !missingTable(workers.error)) skipped.push("workers");
  for (const table of PERSONAL_TABLES) {
    const res = await admin.from(table).delete().eq("user_id", uid);
    if (!res.error) continue;
    skipped.push(table);
    if (table === "profiles" && !missingTable(res.error)) {
      await admin
        .from("profiles")
        .update({
          full_name: "Deleted user",
          phone_number: null,
          sms_opt_in: false,
          avatar_url: null,
          home_city: null,
        })
        .eq("user_id", uid);
    }
  }

  // 3) The login itself.
  const del = await admin.auth.admin.deleteUser(uid);
  if (del.error) throw new Error("Could not delete account. Please try again.");
  return { deleted: true, complaintsUnlinked, skipped };
}
