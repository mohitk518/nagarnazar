import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteAccountData, type DeletionClient } from "@/lib/account-deletion";

/**
 * Self-service account deletion (server side only; the service-role key stays on the server).
 * Personal data is removed; complaints stay public for civic accountability but are anonymised
 * and unlinked from the account. See src/lib/account-deletion.ts for the exact steps.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { data: isRoot } = await context.supabase.rpc("is_main_admin");
    if (isRoot) throw new Error("The Platform Super Admin account cannot be deleted.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const report = await deleteAccountData(supabaseAdmin as unknown as DeletionClient, uid);
    return { deleted: report.deleted };
  });
