"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { completedLateByDays, formatCompletedLate, formatLongDate, localToday, weekdayOf } from "@executor/domain/dates";
import { executorPaths } from "@/lib/paths";
import type { TodayItem, TodayPayload } from "@executor/domain/types";
import { isQuantityItem, nextQuantityState, nextToggleState } from "@executor/domain/quantity";
import { cn } from "@/lib/cn";
import { lifeApi } from "./api";
import { invalidateLifeCache, lifeCacheKey, useLifeQuery } from "./cache";
import { useLife } from "./LifeProvider";
import { QuantityTracker } from "./QuantityTracker";
import { EmptyState, ItemCheckbox } from "./ui";
import { CalendarSkeleton } from "./LoadingSkeleton";

function currentMonth(date: string) {
  return date.slice(0, 7);
}

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1, 12)),
  );
}

function applyItem(payload: TodayPayload, id: string, patch: Partial<TodayItem>): TodayPayload {
  const mapItems = (items: TodayItem[]) =>
    items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  return {
    ...payload,
    plans: payload.plans.map((plan) => {
      const habits = mapItems(plan.habits);
      const tasks = mapItems(plan.tasks);
      const items = [...habits, ...tasks];
      return {
        ...plan,
        habits,
        missed: plan.missed,
        tasks,
        progress: {
          completed: items.filter((item) => item.completed).length,
          total: items.length,
        },
      };
    }),
    overdue: mapItems(payload.overdue),
    waiting: mapItems(payload.waiting),
  };
}

function itemInDayPlans(payload: TodayPayload, itemId: string) {
  return payload.plans.some((plan) =>
    [...plan.habits, ...plan.tasks].some((item) => item.id === itemId),
  );
}

function DayItemRow({
  item,
  onToggle,
  onProgress,
}: {
  item: TodayItem;
  onToggle: (item: TodayItem) => void;
  onProgress: (item: TodayItem, value: number) => void;
}) {
  const completedLate = item.type === "task" && item.recurrence === "none" && item.completed
    ? completedLateByDays(item.due_date, item.completion_date)
    : 0;
  return (
    <div className="flex items-start gap-3 py-2">
      <ItemCheckbox
        checked={item.completed}
        onToggle={() => onToggle(item)}
        label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[15px] leading-snug",
            item.completed
              ? "text-[var(--color-text-muted)] line-through"
              : "text-[var(--color-text-primary)]",
          )}
        >
          {item.title}
        </p>
        {isQuantityItem(item) ? (
          <QuantityTracker item={item} value={item.value} onChange={(value) => onProgress(item, value)} />
        ) : null}
        {completedLate > 0 ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            <Clock3 className="h-3 w-3" aria-hidden />
            {formatCompletedLate(completedLate)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarView() {
  const { date, setDate, refreshToken, bump } = useLife();
  const [month, setMonth] = useState(currentMonth(date));
  const [expanded, setExpanded] = useState(false);
  const today = localToday();
  const calendarKey = lifeCacheKey("calendar", month);
  const todayKey = lifeCacheKey("today", date);

  const { data: calendarData, setData: setCalendar } = useLifeQuery(
    calendarKey,
    () => lifeApi.calendar(month),
    refreshToken,
  );
  const { data: dayPayload, setData: setDayPayload } = useLifeQuery(
    todayKey,
    () => lifeApi.today(date),
    refreshToken,
  );

  const days = calendarData?.days ?? [];
  const leading = useMemo(() => weekdayOf(`${month}-01`), [month]);
  const selected = days.find((day) => day.date === date);
  const selectedPlans = dayPayload?.plans.filter((plan) => plan.progress.total > 0) ?? [];
  const hasItems = Boolean(selected && selected.total > 0);
  const extraCount = (dayPayload?.overdue.length ?? 0) + (dayPayload?.waiting.length ?? 0);

  async function saveProgress(item: TodayItem, patch: { completed: boolean; value: number | null }) {
    const wasCompleted = item.completed;
    const countsForDay = dayPayload ? itemInDayPlans(dayPayload, item.id) : false;
    const optimisticPatch = { ...patch, completion_date: patch.completed ? date : null };
    setDayPayload((current) => (current ? applyItem(current, item.id, optimisticPatch) : current));
    if (countsForDay && wasCompleted !== patch.completed) {
      const delta = patch.completed ? 1 : -1;
      setCalendar((current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) =>
                day.date === date
                  ? {
                      ...day,
                      completed: Math.min(day.total, Math.max(0, day.completed + delta)),
                    }
                  : day,
              ),
            }
          : current,
      );
    }
    invalidateLifeCache({
      keep: [todayKey, calendarKey, lifeCacheKey("plans", 0), lifeCacheKey("plans", 1), lifeCacheKey("inbox")],
    });
    try {
      await lifeApi.complete(item.id, { date, ...patch });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      bump();
    }
  }

  async function toggle(item: TodayItem) {
    await saveProgress(item, nextToggleState(item));
  }

  async function setProgress(item: TodayItem, value: number) {
    await saveProgress(item, nextQuantityState(item, value));
  }

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
    setMonth(next.toISOString().slice(0, 7));
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    if (nextDate !== date) setExpanded(false);
  }

  if (!calendarData) return <div><div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-semibold tracking-tight">Calendar</h1></div><CalendarSkeleton /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-sm text-[var(--color-text-muted)]"
            onClick={() => shiftMonth(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="text-sm text-[var(--color-text-muted)]"
            onClick={() => setMonth(currentMonth(localToday()))}
          >
            This month
          </button>
          <button
            type="button"
            className="text-sm text-[var(--color-text-muted)]"
            onClick={() => shiftMonth(1)}
          >
            Next
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">{monthLabel(month)}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-text-muted)]">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
          <div key={`${label}-${i}`} className="py-1">
            {label}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dayHasItems = day.total > 0;
          const allDone = dayHasItems && day.completed === day.total;
          const isSelected = day.date === date;
          const isToday = day.date === today;
          const pct = dayHasItems ? Math.round((day.completed / day.total) * 100) : 0;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => selectDate(day.date)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              aria-label={`${formatLongDate(day.date)}${
                dayHasItems ? `, ${day.completed} of ${day.total} completed` : ", no scheduled items"
              }`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-sm tabular-nums transition-colors",
                "hover:bg-[var(--color-surface)]",
                isSelected &&
                  "calendar-day-selected text-[var(--color-text-primary)]",
                !isSelected && allDone && "bg-[var(--color-accent)]/20 text-[var(--color-text-primary)]",
                !isSelected && dayHasItems && !allDone && "text-[var(--color-text-primary)]",
                !isSelected && !dayHasItems && "text-[var(--color-text-muted)]",
                isToday && !isSelected && "ring-1 ring-[var(--color-border)]",
              )}
            >
              <span className={cn(isToday && "font-semibold")}>{Number(day.date.slice(8))}</span>
              <span
                className={cn(
                  "calendar-progress-track h-2 w-6 overflow-hidden rounded-full",
                  dayHasItems
                    ? "bg-[var(--color-text-muted)]/55"
                    : "bg-transparent",
                )}
              >
                {dayHasItems ? (
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      "bg-[var(--color-accent)]",
                    )}
                    style={{ width: `${Math.max(pct, day.completed > 0 ? 12 : 0)}%` }}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-[var(--color-border)] p-4">
        {hasItems ? (
          <>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="calendar-day-items"
              onClick={() => setExpanded((open) => !open)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="font-semibold">{formatLongDate(date)}</h2>
              <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-[var(--color-text-muted)]">
                {selected ? `${selected.completed} / ${selected.total}` : null}
                {expanded ? (
                  <ChevronUp className="h-5 w-5" aria-hidden />
                ) : (
                  <ChevronDown className="h-5 w-5" aria-hidden />
                )}
              </span>
            </button>
            {!expanded ? (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {selectedPlans.map((plan) => plan.name).join(" · ") || "Scheduled items"}
              </p>
            ) : null}
            {expanded ? (
              <div id="calendar-day-items" className="mt-3 space-y-4">
                {selectedPlans.map((plan) => (
                  <section key={plan.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <Link
                        href={executorPaths.plan(plan.id)}
                        className="font-medium text-[var(--color-text-primary)]"
                      >
                        {plan.name}
                      </Link>
                      <span className="tabular-nums text-[var(--color-text-muted)]">
                        {plan.progress.completed} / {plan.progress.total}
                      </span>
                    </div>
                    {plan.habits.map((item) => (
                      <DayItemRow key={item.id} item={item} onToggle={toggle} onProgress={setProgress} />
                    ))}
                    {plan.tasks.map((item) => (
                      <DayItemRow key={item.id} item={item} onToggle={toggle} onProgress={setProgress} />
                    ))}
                  </section>
                ))}
                {dayPayload?.overdue.length ? (
                  <section>
                    <h3 className="mb-1 text-sm font-medium text-red-300">Overdue</h3>
                    {dayPayload.overdue.map((item) => (
                      <DayItemRow key={item.id} item={item} onToggle={toggle} onProgress={setProgress} />
                    ))}
                  </section>
                ) : null}
                {dayPayload?.waiting.length ? (
                  <section>
                    <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">Waiting</h3>
                    {dayPayload.waiting.map((item) => (
                      <DayItemRow key={item.id} item={item} onToggle={toggle} onProgress={setProgress} />
                    ))}
                  </section>
                ) : null}
                {extraCount === 0 && selectedPlans.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No items loaded for this date.</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="font-semibold">{formatLongDate(date)}</h2>
            <EmptyState title="No tracked items" body="Nothing was scheduled for this date." />
          </>
        )}
        <Link
          href={executorPaths.today}
          className="mt-3 inline-block text-sm text-[var(--color-accent)]"
        >
          Open in Today
        </Link>
      </div>
    </div>
  );
}
