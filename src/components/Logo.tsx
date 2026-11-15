import { cn } from "@/lib/utils";

/**
 * NagarNazar mark: a location pin (jagah) with an eye (nazar) inside it.
 * Original artwork drawn for this project.
 */
export function LogoMark({
  className,
  title = "NagarNazar",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-10 w-10", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M32 3C19.3 3 9 13.1 9 25.6c0 16.3 19.4 32.6 21.6 34.4a2.2 2.2 0 0 0 2.8 0C35.6 58.2 55 41.9 55 25.6 55 13.1 44.7 3 32 3Z"
        fill="currentColor"
        className="text-[#1E1B4B] dark:text-indigo-300"
      />
      <path
        d="M14.5 25.5C19 18.2 25.2 14.6 32 14.6s13 3.6 17.5 10.9C45 32.8 38.8 36.4 32 36.4s-13-3.6-17.5-10.9Z"
        fill="#FFFFFF"
      />
      <circle cx="32" cy="25.5" r="7.4" fill="#F59E0B" />
      <circle cx="32" cy="25.5" r="3.3" fill="#1E1B4B" />
      <circle cx="34.4" cy="23.2" r="1.3" fill="#FFFFFF" />
    </svg>
  );
}

export default function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-10 w-10 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
            Nagar<span className="text-[#B45309] dark:text-secondary">Nazar</span>
          </span>
          <span lang="hi" className="text-[12px] font-semibold text-muted-foreground">
            नगर नज़र
          </span>
        </span>
      )}
    </span>
  );
}
