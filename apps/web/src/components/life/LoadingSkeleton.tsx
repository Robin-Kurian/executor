import { cn } from "@/lib/cn";

function Bar({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-[var(--color-surface-raised)]", className)} />;
}

export function ListSkeleton({ cards = 3 }: { cards?: number }) {
  return <div className="mt-6 space-y-3" role="status" aria-label="Loading content">
    {Array.from({ length: cards }).map((_, index) => <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><Bar className="h-5 w-2/5" /><Bar className="mt-3 h-3 w-3/5" /><Bar className="mt-5 h-2 w-full" /></div>)}
    <span className="sr-only">Loading…</span>
  </div>;
}

export function CalendarSkeleton() {
  return <div className="mt-4" role="status" aria-label="Loading calendar">
    <Bar className="mb-5 h-4 w-32" />
    <div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, index) => <div key={index} className="flex h-14 flex-col items-center justify-center gap-2 rounded-xl"><Bar className="h-4 w-5" /><Bar className="h-1.5 w-7" /></div>)}</div>
    <div className="mt-6 rounded-2xl border border-[var(--color-border)] p-4"><Bar className="h-5 w-48" /><Bar className="mt-4 h-4 w-2/3" /></div>
    <span className="sr-only">Loading calendar…</span>
  </div>;
}

export function PlanSkeleton() {
  return <div className="mt-3" role="status" aria-label="Loading plan">
    <Bar className="h-4 w-16" /><Bar className="mt-5 h-9 w-64" /><Bar className="mt-2 h-4 w-20" />
    <div className="mt-8 grid gap-3 sm:grid-cols-2"><Bar className="h-11" /><Bar className="h-11" /><Bar className="h-24 sm:col-span-2" /></div>
    <ListSkeleton cards={2} />
    <span className="sr-only">Loading plan…</span>
  </div>;
}
