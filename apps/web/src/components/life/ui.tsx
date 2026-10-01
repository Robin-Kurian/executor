import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const lifeFieldClass =
  "w-full cursor-text rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)]";

export function lifeChoiceClass(active: boolean) {
  return cn(
    "cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50",
    active
      ? "bg-[var(--color-surface)] font-medium text-[var(--color-text-primary)] shadow-sm"
      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-text-primary)]",
  );
}

export function lifeAccentChipClass(active: boolean) {
  return cn(
    "cursor-pointer rounded-full px-3 py-1.5 text-sm capitalize transition-colors",
    active
      ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
      : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
  );
}

export function lifeDayChipClass(active: boolean) {
  return cn(
    "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors",
    active
      ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
      : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  );
}

export function LifeField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(lifeFieldClass, props.className)} />;
}

export function LifeArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(lifeFieldClass, "min-h-24", props.className)} />;
}

export function LifeButton({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/60",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--color-accent)] text-[var(--color-bg)] hover:bg-[var(--color-accent-hover)]",
        variant === "ghost" &&
          "border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]",
        variant === "danger" &&
          "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        className,
      )}
    />
  );
}

export function ItemCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/60",
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]"
          : "border-[var(--color-text-muted)] bg-transparent hover:border-[var(--color-accent)]",
      )}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

export function LifeToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-3 text-left text-sm text-[--color-text-secondary]"
    >
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function ProgressIndicator({
  completed,
  total,
  className,
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[--color-border]", className)}>
      <div
        className="h-full rounded-full bg-[--color-accent] transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[--color-border] px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-[--color-text-primary]">{title}</h2>
      <p className="mt-2 text-sm text-[--color-text-muted]">{body}</p>
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;
