"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { addDays, formatDayMonth, formatRelativeDate, formatWeekday, localToday } from "@executor/domain/dates";
import type { TodayItem, TodayPayload } from "@executor/domain/types";
import { isQuantityItem, nextQuantityState, nextToggleState } from "@executor/domain/quantity";
import { lifeApi } from "./api";
import { invalidateLifeCache, lifeCacheKey, useLifeQuery } from "./cache";
import { ItemEditor } from "./ItemEditor";
import { useLife } from "./LifeProvider";
import { QuantityTracker } from "./QuantityTracker";
import { EmptyState, ItemCheckbox, LifeButton, ProgressIndicator } from "./ui";
import { executorPaths } from "@/lib/paths";

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

function ItemRow({
  item,
  date,
  onToggle,
  onProgress,
  onMoved,
}: {
  item: TodayItem;
  date: string;
  onToggle: (item: TodayItem) => void;
  onProgress: (item: TodayItem, value: number) => void;
  onMoved: () => void;
}) {
  const [editing, setEditing] = useState(false);

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
      <ItemCheckbox
        checked={item.completed}
        onToggle={() => onToggle(item)}
        label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
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
        </div>
        {isQuantityItem(item) ? (
          <QuantityTracker item={item} value={item.value} onChange={(value) => onProgress(item, value)} collapsible />
        ) : (
          <p className="mt-0.5 text-xs text-[--color-text-muted]">
            {item.type === "habit" || item.type === "metric"
              ? item.type
              : item.priority === "high"
                ? "High"
                : null}
            {item.waiting_on ? ` · Waiting on ${item.waiting_on}` : ""}
          </p>
        )}
      </div>
      {editing ? (
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
  const { data, loading, error, setData } = useLifeQuery(todayKey, () => lifeApi.today(date), refreshToken);

  async function saveProgress(item: TodayItem, patch: { completed: boolean; value: number | null }) {
    setData((current) => (current ? applyItem(current, item.id, patch) : current));
    invalidateLifeCache({
      keep: [todayKey, lifeCacheKey("plans", 0), lifeCacheKey("plans", 1), lifeCacheKey("inbox")],
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

      {loading && !data ? (
        <p className="text-sm text-[--color-text-muted]">Loading today…</p>
      ) : null}
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
            className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-4"
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
                  {plan.progress.completed} / {plan.progress.total}
                </span>
              )}
            </div>
            <ProgressIndicator completed={plan.progress.completed} total={plan.progress.total} />
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
          <section className="rounded-2xl border border-[--color-border] p-4">
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
