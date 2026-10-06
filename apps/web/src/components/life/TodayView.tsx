"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CalendarX2, Clock3, History } from "lucide-react";
import { addDays, completedLateByDays, formatCompletedLate, formatDayMonth, formatRelativeDate, formatWeekday, localToday } from "@executor/domain/dates";
import type { MissedTodayItem, TodayItem, TodayPayload } from "@executor/domain/types";
import { isQuantityItem, nextQuantityState, nextToggleState } from "@executor/domain/quantity";
import { lifeApi } from "./api";
import { invalidateLifeCache, lifeCacheKey, useLifeQuery } from "./cache";
import { ItemEditor } from "./ItemEditor";
import { useLife } from "./LifeProvider";
import { QuantityTracker } from "./QuantityTracker";
import { EmptyState, ItemCheckbox, LifeButton, MissedIndicator, ProgressIndicator } from "./ui";
import { ListSkeleton } from "./LoadingSkeleton";
import { executorPaths } from "@/lib/paths";

function applyItem(payload: TodayPayload, id: string, occurrenceDate: string, patch: Partial<TodayItem>): TodayPayload {
  const mapItems = (items: TodayItem[]) =>
    items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  const currentDatePatch = occurrenceDate === payload.date;
  return {
    ...payload,
    plans: payload.plans.map((plan) => {
      const habits = currentDatePatch ? mapItems(plan.habits) : plan.habits;
      const tasks = currentDatePatch ? mapItems(plan.tasks) : plan.tasks;
      const missed = plan.missed.map((item) =>
        item.id === id && item.missed_date === occurrenceDate ? { ...item, ...patch } : item,
      );
      const items = [...habits, ...tasks];
      return {
        ...plan,
        habits,
        missed,
        tasks,
        progress: {
          completed: items.filter((item) => item.completed).length,
          total: items.length,
        },
      };
    }),
    overdue: currentDatePatch ? mapItems(payload.overdue) : payload.overdue,
    waiting: currentDatePatch ? mapItems(payload.waiting) : payload.waiting,
  };
}

function ItemRow({
  item,
  date,
  onToggle,
  onProgress,
  onMoved,
  occurrenceLabel,
  showActions = true,
  readOnlyMissed = false,
}: {
  item: TodayItem | MissedTodayItem;
  date: string;
  onToggle: (item: TodayItem, occurrenceDate: string) => void;
  onProgress: (item: TodayItem, value: number, occurrenceDate: string) => void;
  onMoved: () => void;
  occurrenceLabel?: string;
  showActions?: boolean;
  readOnlyMissed?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const missedItem = occurrenceLabel && "is_stale" in item ? item : null;
  const completedLate = item.type === "task" && item.recurrence === "none" && item.completed
    ? completedLateByDays(item.due_date, item.completion_date)
    : 0;

  async function move(dueDate: string | null) {
    try {
      await lifeApi.updateItem(item.id, { due_date: dueDate, start_date: dueDate });
      toast.success(dueDate ? "Date updated" : "Moved to inbox");
      onMoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function markWaiting() {
    try {
      await lifeApi.updateItem(item.id, { status: "waiting" });
      toast.success("Marked waiting");
      onMoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  return (
    <div className="flex items-start gap-3 py-2.5">
      {readOnlyMissed ? (
        <MissedIndicator label={`${item.title} was missed`} />
      ) : (
        <ItemCheckbox
          checked={item.completed}
          onToggle={() => onToggle(item, date)}
          label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {readOnlyMissed ? (
            <p
              className="min-w-0 flex-1 text-[15px] leading-snug text-[--color-text-primary]"
            >
              {item.title}
            </p>
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer text-left"
              onClick={() => setEditing(true)}
            >
              <p
                className={`text-[15px] leading-snug ${
                  item.completed
                    ? "text-[--color-text-muted] line-through"
                    : "text-[--color-text-primary]"
                }`}
              >
                {item.title}
              </p>
            </button>
          )}
          {showActions && !readOnlyMissed && !item.completed ? (
            <div className="flex shrink-0 gap-1 text-xs text-[--color-text-muted]">
              <button type="button" onClick={() => move(addDays(date, 1))} className="rounded-md px-1.5 py-1 hover:bg-[--color-surface]">
                Tomorrow
              </button>
              {item.status !== "waiting" ? (
                <button type="button" onClick={markWaiting} className="rounded-md px-1.5 py-1 hover:bg-[--color-surface]">
                  Wait
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {!readOnlyMissed && isQuantityItem(item) ? (
          <QuantityTracker item={item} value={item.value} onChange={(value) => onProgress(item, value, date)} collapsible />
        ) : null}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[--color-text-muted]">
          <span>
            {item.type === "habit" || item.type === "metric"
              ? item.type
              : item.priority === "high"
                ? "High"
                : null}
            {item.waiting_on ? ` · Waiting on ${item.waiting_on}` : ""}
          </span>
          {occurrenceLabel ? missedItem?.is_stale ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
              <History className="h-3 w-3" aria-hidden />
              {missedItem.last_completed_date
                ? `Last done ${formatDayMonth(missedItem.last_completed_date)}`
                : "No completion yet"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/25 bg-rose-400/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
              <CalendarX2 className="h-3 w-3" aria-hidden />
              Missed {occurrenceLabel}
            </span>
          ) : null}
          {completedLate > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              <Clock3 className="h-3 w-3" aria-hidden />
              {formatCompletedLate(completedLate)}
            </span>
          ) : null}
        </div>
      </div>
      {!readOnlyMissed && editing ? (
        <ItemEditor
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onMoved();
          }}
        />
      ) : null}
    </div>
  );
}

export function TodayView() {
  const { date, setDate, openAdd, refreshToken, bump } = useLife();
  const todayKey = lifeCacheKey("today", date);
  const { data, loading, error, setData } = useLifeQuery(
    todayKey,
    () => lifeApi.today(date),
    refreshToken,
    { debounceMs: 150 },
  );

  async function saveProgress(item: TodayItem, occurrenceDate: string, patch: { completed: boolean; value: number | null }) {
    const optimisticPatch = { ...patch, completion_date: patch.completed ? occurrenceDate : null };
    setData((current) => (current ? applyItem(current, item.id, occurrenceDate, optimisticPatch) : current));
    invalidateLifeCache({
      keep: [todayKey, lifeCacheKey("plans", 0), lifeCacheKey("plans", 1), lifeCacheKey("inbox")],
    });
    try {
      await lifeApi.complete(item.id, { date: occurrenceDate, ...patch });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      bump();
    }
  }

  async function toggle(item: TodayItem, occurrenceDate: string) {
    await saveProgress(item, occurrenceDate, nextToggleState(item));
  }

  async function setProgress(item: TodayItem, value: number, occurrenceDate: string) {
    await saveProgress(item, occurrenceDate, nextQuantityState(item, value));
  }

  const empty =
    data &&
    data.plans.length === 0 &&
    data.overdue.length === 0 &&
    data.waiting.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[--color-text-muted]">
            {formatRelativeDate(date)}
          </p>
          <h1 className="mt-1 tracking-tight">
            <span className="block text-3xl font-semibold text-[--color-text-primary] sm:text-4xl">
              {formatDayMonth(date)}
            </span>
            <span className="mt-0.5 block text-base font-medium text-[--color-text-muted] sm:text-lg">
              {formatWeekday(date)}
            </span>
          </h1>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-full px-2 py-1 text-sm text-[--color-text-muted]"
            onClick={() => setDate(addDays(date, -1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-sm text-[--color-text-muted]"
            onClick={() => setDate(localToday())}
          >
            Now
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-sm text-[--color-text-muted]"
            onClick={() => setDate(addDays(date, 1))}
          >
            Next
          </button>
        </div>
      </div>

      {loading && !data ? <ListSkeleton /> : null}
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      {empty ? (
        <EmptyState
          title="Nothing scheduled today"
          body="Enjoy the empty day or add something."
          actions={
            <>
              <LifeButton onClick={() => openAdd({ type: "task", date })}>+ Add task</LifeButton>
              <Link
                href={executorPaths.plans}
                className="inline-flex items-center rounded-xl border border-[--color-border] px-4 py-2.5 text-sm"
              >
                View plans
              </Link>
            </>
          }
        />
      ) : null}

      <div className="space-y-4">
        {data?.overdue.length ? (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <h2 className="mb-1 text-sm font-medium text-red-300">Overdue</h2>
            {data.overdue.map((item) => (
              <ItemRow key={item.id} item={item} date={date} onToggle={toggle} onProgress={setProgress} onMoved={bump} />
            ))}
          </section>
        ) : null}

        {data?.plans.map((plan) => (
          <section
            key={plan.id}
            className="apple-glass rounded-2xl border p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <Link href={executorPaths.plan(plan.id)} className="text-lg font-semibold">
                  {plan.name}
                </Link>
                {plan.day_progress ? (
                  <p className="text-xs text-[--color-text-muted]">
                    Day {plan.day_progress.current} / {plan.day_progress.total}
                  </p>
                ) : null}
              </div>
              {plan.progress.total === plan.progress.completed && plan.progress.total > 0 ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md dark:border-emerald-400/40 dark:bg-emerald-950/70 dark:text-emerald-400 dark:shadow-[0_0_14px_rgba(52,211,153,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]">
                  Completed
                </span>
              ) : (
                <span className="text-sm tabular-nums text-[--color-text-muted]">
                  {plan.progress.total > 0
                    ? `${plan.progress.completed} / ${plan.progress.total}`
                    : "No items today"}
                </span>
              )}
            </div>
            {plan.progress.total > 0 ? (
              <ProgressIndicator completed={plan.progress.completed} total={plan.progress.total} />
            ) : null}
            {plan.habits.length ? (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[--color-text-muted]">
                  Habits
                </p>
                {plan.habits.map((item) => (
                  <ItemRow key={item.id} item={item} date={date} onToggle={toggle} onProgress={setProgress} onMoved={bump} />
                ))}
              </div>
            ) : null}
            {plan.missed.some((missed) => !plan.habits.some((habit) => habit.id === missed.id && habit.completed)) ? (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-red-400">
                  Missed
                </p>
                {plan.missed.filter((missed) => !plan.habits.some((habit) => habit.id === missed.id && habit.completed)).map((item) => (
                  <ItemRow
                    key={`${item.id}-${item.missed_date}`}
                    item={item}
                    date={item.missed_date}
                    onToggle={toggle}
                    onProgress={setProgress}
                    onMoved={bump}
                    occurrenceLabel={formatRelativeDate(item.missed_date, date)}
                    showActions={false}
                    readOnlyMissed
                  />
                ))}
              </div>
            ) : null}
            {plan.tasks.length ? (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[--color-text-muted]">
                  Tasks
                </p>
                {plan.tasks.map((item) => (
                  <ItemRow key={item.id} item={item} date={date} onToggle={toggle} onProgress={setProgress} onMoved={bump} />
                ))}
              </div>
            ) : null}
          </section>
        ))}

        {data?.waiting.length ? (
          <section className="apple-glass rounded-2xl border p-4">
            <h2 className="mb-1 text-sm font-medium text-[--color-text-muted]">Waiting</h2>
            {data.waiting.map((item) => (
              <ItemRow key={item.id} item={item} date={date} onToggle={toggle} onProgress={setProgress} onMoved={bump} />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
