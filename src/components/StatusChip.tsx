import { CircleDot, Clock3, CheckCircle2, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export type ChipStatus = "pending" | "in-progress" | "resolved" | "escalated" | "overdue";

/** A complaint is overdue when its deadline has passed and it is not resolved yet. */
export function effectiveStatus(
  status: string | null | undefined,
  dueAt?: string | null,
): ChipStatus {
  const s = (status ?? "pending") as ChipStatus;
  if (s !== "resolved" && dueAt && new Date(dueAt).getTime() < Date.now()) return "overdue";
  if (s === "pending" || s === "in-progress" || s === "resolved" || s === "escalated") return s;
  return "pending";
}

const STYLES: Record<ChipStatus, { cls: string; icon: React.ElementType; en: string; hi: string }> =
  {
    pending: {
      cls: "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/30",
      icon: Clock3,
      en: "Pending",
      hi: "लंबित",
    },
    "in-progress": {
      cls: "bg-indigo-100 text-indigo-900 ring-indigo-300 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-400/30",
      icon: CircleDot,
      en: "In progress",
      hi: "काम जारी",
    },
    resolved: {
      cls: "bg-green-100 text-green-900 ring-green-300 dark:bg-green-400/15 dark:text-green-200 dark:ring-green-400/30",
      icon: CheckCircle2,
      en: "Resolved",
      hi: "हल हुई",
    },
    escalated: {
      cls: "bg-red-100 text-red-900 ring-red-300 dark:bg-red-400/15 dark:text-red-200 dark:ring-red-400/30",
      icon: ArrowUpCircle,
      en: "Escalated",
      hi: "आगे भेजी गई",
    },
    overdue: {
      cls: "bg-red-600 text-white ring-red-700 dark:bg-red-500 dark:text-white",
      icon: AlertTriangle,
      en: "Overdue",
      hi: "समय सीमा पार",
    },
  };

interface Props {
  status: string | null | undefined;
  dueAt?: string | null;
  className?: string;
}

/** Colour-coded status chip used on cards, lists and the complaint page. Text + icon, never colour alone. */
export default function StatusChip({ status, dueAt, className }: Props) {
  const { language } = useLanguage();
  const key = effectiveStatus(status, dueAt);
  const st = STYLES[key];
  const Icon = st.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        st.cls,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {language === "hi" ? st.hi : st.en}
    </span>
  );
}
