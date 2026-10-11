"use client";

import { Activity, CheckCheck, CircleX, Flame, Gauge, ListTodo, Medal, Target } from "lucide-react";
import { formatDayMonth } from "@executor/domain/dates";
import { lifeApi } from "./api";
import { lifeCacheKey, useLifeQuery } from "./cache";
import { useLife } from "./LifeProvider";
import { ListSkeleton } from "./LoadingSkeleton";

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail: string;
  danger?: boolean;
}) {
  return (
    <article className="apple-glass min-w-0 rounded-2xl border p-3 sm:rounded-3xl sm:p-4 xl:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-[var(--color-text-secondary)] sm:text-sm">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${danger ? "text-status-danger" : "text-[var(--color-accent)]"}`} aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-3xl">{value}</p>
      <p className="mt-1 hidden text-xs leading-4 text-[var(--color-text-muted)] sm:block">{detail}</p>
    </article>
  );
}

function UsageCard({ usage }: { usage: Awaited<ReturnType<typeof lifeApi.analytics>>["neon"] }) {
  const used = usage.used_cu_hours ?? 0;
  const percent = usage.used_cu_hours === null ? 0 : Math.min(100, (used / usage.limit_cu_hours) * 100);
  return (
    <section className="apple-glass rounded-3xl border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
            <h2 className="text-lg font-semibold">Neon compute usage</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Fetched only when this analytics screen is opened.</p>
        </div>
        {usage.status === "available" ? (
          <p className="text-right tabular-nums">
            <span className="text-2xl font-semibold">{used.toFixed(2)}</span>
            <span className="text-sm text-[var(--color-text-muted)]"> / {usage.limit_cu_hours} CU-hours</span>
          </p>
        ) : null}
      </div>
      {usage.status === "available" ? (
        <>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
            <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{percent.toFixed(1)}% used</span>
            <span>{Math.max(0, usage.limit_cu_hours - used).toFixed(2)} remaining</span>
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          {usage.message}
        </p>
      )}
    </section>
  );
}

export function AnalyticsView() {
  const { refreshToken } = useLife();
  const { data, error } = useLifeQuery(lifeCacheKey("analytics"), lifeApi.analytics, refreshToken);

  if (!data && !error) return <div><h1 className="text-3xl font-semibold tracking-tight">Analytics</h1><ListSkeleton cards={4} /></div>;
  if (error || !data) return <div><h1 className="text-3xl font-semibold tracking-tight">Analytics</h1><p className="mt-6 text-sm text-status-danger">{error ?? "Analytics could not be loaded."}</p></div>;

  const max = Math.max(1, ...data.daily.map((day) => day.completions));
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Your last 30 days, through {formatDayMonth(data.period_end)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6">
        <StatCard icon={CheckCheck} label="Completions" value={data.completed} detail={`${data.task_completions} tasks · ${data.habit_completions} habits`} />
        <StatCard icon={CircleX} label="Failures" value={data.failures} detail="Missed scheduled items" danger />
        <StatCard icon={Activity} label="Active days" value={`${data.active_days}/30`} detail={`${Math.round((data.active_days / 30) * 100)}% consistency`} />
        <StatCard icon={Flame} label="Current streak" value={`${data.current_streak}d`} detail="Active-day streak" />
        <StatCard icon={Medal} label="Best streak" value={`${data.best_streak}d`} detail="Best in this period" />
        <StatCard icon={ListTodo} label="Open items" value={data.open_items} detail={`${data.completed_one_time_tasks} one-time tasks finished`} />
      </div>

      <section className="apple-glass mt-4 rounded-3xl border p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
          <h2 className="text-lg font-semibold">Daily completions</h2>
        </div>
        <div className="mt-6 flex h-44 items-end gap-1" aria-label="Daily completions over the last 30 days">
          {data.daily.map((day, index) => (
            <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div
                className="w-full min-h-1 rounded-t bg-[var(--color-accent)]/75 transition-colors group-hover:bg-[var(--color-accent)]"
                style={{ height: `${Math.max(3, (day.completions / max) * 100)}%` }}
                title={`${formatDayMonth(day.date)}: ${day.completions} completion${day.completions === 1 ? "" : "s"}`}
              />
              {(index === 0 || index === 14 || index === data.daily.length - 1) ? (
                <span className="absolute top-full mt-2 whitespace-nowrap text-[10px] text-[var(--color-text-muted)] first:left-0">{formatDayMonth(day.date)}</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-4 text-xs text-[var(--color-text-muted)]">
          <span>{data.task_completions} task completions</span>
          <span>{data.habit_completions} habit or metric check-ins</span>
        </div>
      </section>

      <div className="mt-4"><UsageCard usage={data.neon} /></div>
    </div>
  );
}
