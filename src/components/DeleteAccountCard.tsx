import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { clearDraft } from "@/lib/draft";

/** The word the user types in the second confirmation. */
export const CONFIRM_WORD = { en: "DELETE", hi: "हटाएं" } as const;

export function isConfirmWord(value: string): boolean {
  const v = value.trim();
  return v.toUpperCase() === CONFIRM_WORD.en || v === CONFIRM_WORD.hi;
}

/**
 * "Delete my account" with two confirmations:
 * 1) a dialog that explains exactly what happens, 2) typing DELETE / हटाएं.
 * The deletion runs on the server (service role never in the browser).
 */
export default function DeleteAccountCard({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const hi = language === "hi";
  const del = useServerFn(deleteMyAccount);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setStage(0);
    setWord("");
  };

  const onDelete = async () => {
    if (!isConfirmWord(word)) return;
    setBusy(true);
    try {
      await del();
      await clearDraft();
      await supabase.auth.signOut();
      toast.success(hi ? "आपका खाता हटा दिया गया है।" : "Your account has been deleted.");
      window.location.href = "/";
    } catch (e) {
      toast.error(
        (e as Error).message ||
          (hi ? "खाता नहीं हट सका। फिर कोशिश करें।" : "Could not delete account."),
      );
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="nn-delete-title"
      className={`rounded-2xl border-2 border-destructive/30 bg-card p-5 shadow-card ${className}`}
    >
      <h2
        id="nn-delete-title"
        className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground"
      >
        <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
        {hi ? "मेरा खाता हटाएं" : "Delete my account"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hi
          ? "आपका नाम, फ़ोन, कमेंट, वोट और सूचनाएं हट जाएंगी। आपकी शिकायतें गुमनाम सार्वजनिक रिकॉर्ड बनकर रहेंगी ताकि मरम्मत का हिसाब बना रहे।"
          : "Your name, phone, comments, votes and notifications are removed. Your complaints stay as anonymous public records so repairs remain accountable."}{" "}
        <Link to="/privacy" className="font-semibold text-primary underline">
          {hi ? "गोपनीयता नीति" : "Privacy notice"}
        </Link>
      </p>

      {!user ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary underline">
            {hi ? "साइन इन करें" : "Sign in"}
          </Link>{" "}
          {hi ? "खाता हटाने के लिए।" : "to delete your account."}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setStage(1)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-destructive px-5 text-sm font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {hi ? "खाता हटाएं…" : "Delete my account…"}
        </button>
      )}

      <AlertDialog open={stage > 0} onOpenChange={(o) => (o ? null : close())}>
        <AlertDialogContent className="rounded-2xl">
          {stage === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{hi ? "पक्का? (1/2)" : "Are you sure? (1/2)"}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      {hi
                        ? "यह स्थायी है और वापस नहीं होगा:"
                        : "This is permanent and cannot be undone:"}
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        {hi
                          ? "लॉगिन, नाम, फ़ोन नंबर और प्रोफ़ाइल हट जाएगी।"
                          : "Your login, name, phone number and profile are deleted."}
                      </li>
                      <li>
                        {hi
                          ? "कमेंट, वोट, पॉइंट, बैज और सूचनाएं हट जाएंगी।"
                          : "Comments, votes, points, badges and notifications are deleted."}
                      </li>
                      <li>
                        {hi
                          ? "शिकायतें “Deleted user” नाम से गुमनाम रहेंगी।"
                          : "Complaints stay public, shown as “Deleted user”."}
                      </li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="min-h-11 rounded-full">
                  {hi ? "रद्द करें" : "Cancel"}
                </AlertDialogCancel>
                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-destructive px-5 text-sm font-bold text-destructive-foreground"
                >
                  {hi ? "हाँ, आगे बढ़ें" : "Yes, continue"}
                </button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {hi ? "आख़िरी पुष्टि (2/2)" : "Final confirmation (2/2)"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {hi ? (
                    <>
                      पुष्टि के लिए <b>{CONFIRM_WORD.hi}</b> या <b>{CONFIRM_WORD.en}</b> लिखें।
                    </>
                  ) : (
                    <>
                      Type <b>{CONFIRM_WORD.en}</b> to confirm.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <label htmlFor="nn-delete-word" className="sr-only">
                {hi ? "पुष्टि शब्द" : "Confirmation word"}
              </label>
              <input
                id="nn-delete-word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={hi ? CONFIRM_WORD.hi : CONFIRM_WORD.en}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/40"
              />
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={busy} className="min-h-11 rounded-full">
                  {hi ? "रद्द करें" : "Cancel"}
                </AlertDialogCancel>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={!isConfirmWord(word) || busy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-destructive px-5 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {busy ? "…" : hi ? "हमेशा के लिए हटाएं" : "Delete permanently"}
                </button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
