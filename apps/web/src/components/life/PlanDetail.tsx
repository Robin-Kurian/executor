"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { ChevronLeft } from "lucide-react";
import { planDayProgress } from "@executor/domain/dates";
import { executorPaths } from "@/lib/paths";
import { isQuantityItem, nextQuantityState, nextToggleState } from "@executor/domain/quantity";
import type { Plan, PlanDetailPayload, PlanStatus, TodayItem } from "@executor/domain/types";
import { Select } from "@/components/ui/Select";
import { lifeApi } from "./api";
import { invalidateLifeCache, lifeCacheKey, loadLifeCache, useLifeQuery } from "./cache";
import { DateField } from "./DateField";
import { ItemEditor } from "./ItemEditor";
import { useLife } from "./LifeProvider";
import { QuantityTracker } from "./QuantityTracker";
import {
  EmptyState,
  ItemCheckbox,
  LifeArea,
  LifeButton,
  LifeField,
} from "./ui";
import { PlanSkeleton } from "./LoadingSkeleton";

const PLAN_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function PlanDetail({ planId }: { planId: string }) {
  const { date, openAdd, bump, refreshToken } = useLife();
  const planKey = lifeCacheKey("plan", `${planId}:${date}`);
  const notesKey = lifeCacheKey("notes", planId);
  const planQuery = useLifeQuery(planKey, () => lifeApi.plan(planId, date), refreshToken);
  const notesQuery = useLifeQuery(
    notesKey,
    () => lifeApi.notes(`?plan_id=${planId}`),
    refreshToken,
  );
  const [plan, setPlan] = useState(planQuery.data ?? null);
  const [notes, setNotes] = useState(notesQuery.data ?? []);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<TodayItem | null>(null);
  const [planDirty, setPlanDirty] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    setPlan(planQuery.data ?? null);
    setPlanDirty(false);
  }, [planQuery.data, planId]);

  useEffect(() => {
    setNotes(notesQuery.data ?? []);
  }, [notesQuery.data, planId]);

  function updatePlan(patch: Partial<Plan>) {
    setPlan((current) => (current ? { ...current, ...patch } : current));
    setPlanDirty(true);
  }

  async function savePlan() {
    if (!plan || !planDirty) return;
    setSavingPlan(true);
    try {
      const updated = await lifeApi.updatePlan(planId, {
        name: plan.name,
        description: plan.description,
        status: plan.status,
        start_date: plan.start_date,
        end_date: plan.end_date,
      });
      setPlan((current) => (current ? { ...current, ...updated } : current));
      planQuery.setData((current) => (current ? { ...current, ...updated } : current));
      setPlanDirty(false);
      toast.success("Plan saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setSavingPlan(false);
    }
  }

  function applyItem(current: PlanDetailPayload, id: string, patch: Partial<TodayItem>): PlanDetailPayload {
    const items = current.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    return {
      ...current,
      items,
      completed_item_ids: items.filter((item) => item.completed).map((item) => item.id),
    };
  }

  async function saveProgress(item: TodayItem, patch: { completed: boolean; value: number | null }) {
    planQuery.setData((current) => (current ? applyItem(current, item.id, patch) : current));
    invalidateLifeCache({
      keep: [planKey, lifeCacheKey("today", date), lifeCacheKey("plans", 0), lifeCacheKey("plans", 1), lifeCacheKey("inbox")],
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

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await lifeApi.createNote({ content: note, plan_id: planId, date });
      setNote("");
      setNotes(await loadLifeCache(notesKey, () => lifeApi.notes(`?plan_id=${planId}`), { force: true }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    }
  }

  if (planQuery.error) return <p className="text-sm text-red-400">{planQuery.error}</p>;
  if (!plan) return <PlanSkeleton />;

  const habits = plan.items.filter((item) => item.type === "habit" || item.type === "metric");
  const tasks = plan.items.filter((item) => item.type === "task" || item.type === "note");
  const waiting = plan.items.filter((item) => item.status === "waiting" || item.type === "waiting");
  const day = planDayProgress(plan.start_date, plan.end_date, date);

  return (
    <div>
      <Link
        href={executorPaths.plans}
        className="-ml-7 inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-base text-[--color-text-muted] transition-colors hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/50"
      >
        <ChevronLeft className="h-[1em] w-[1em]" strokeWidth={2} aria-hidden />
        Plans
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{plan.name}</h1>
          {day ? (
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Day {day.current} / {day.total}
            </p>
          ) : null}
        </div>
        <LifeButton onClick={() => openAdd({ planId, type: "task", date })}>Add item</LifeButton>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <LifeField
          value={plan.name}
          onChange={(e) => updatePlan({ name: e.target.value })}
        />
        <Select
          variant="surface"
          options={PLAN_STATUS_OPTIONS}
          value={plan.status}
          onChange={(val) => {
            if (val) updatePlan({ status: val as PlanStatus });
          }}
          ariaLabel="Plan status"
        />
        <LifeArea
          className="sm:col-span-2"
          value={plan.description}
          placeholder="Description"
          onChange={(e) => updatePlan({ description: e.target.value })}
        />
        <label className="text-sm text-[--color-text-muted]">
          Start
          <div className="mt-1">
            <DateField
              value={plan.start_date}
              onChange={(next) => updatePlan({ start_date: next })}
              placeholder="No start date"
              ariaLabel="Start date"
            />
          </div>
        </label>
        <label className="text-sm text-[--color-text-muted]">
          End
          <div className="mt-1">
            <DateField
              value={plan.end_date}
              onChange={(next) => updatePlan({ end_date: next })}
              placeholder="No end date"
              ariaLabel="End date"
            />
          </div>
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {planDirty ? <p className="text-sm text-[var(--color-text-muted)]">Unsaved changes</p> : null}
        <LifeButton onClick={savePlan} disabled={!planDirty || savingPlan}>
          {savingPlan ? "Saving…" : "Save changes"}
        </LifeButton>
      </div>

      <ItemGroup
        title="Habits"
        items={habits}
        onToggle={toggle}
        onProgress={setProgress}
        onEdit={setEditing}
      />
      <ItemGroup
        title="Tasks"
        items={tasks.filter((item) => item.status !== "waiting")}
        onToggle={toggle}
        onProgress={setProgress}
        onEdit={setEditing}
      />
      <ItemGroup
        title="Waiting"
        items={waiting}
        onToggle={toggle}
        onProgress={setProgress}
        onEdit={setEditing}
      />

      {plan.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No items in this plan"
            body="Add a habit or a task to start tracking."
            actions={
              <LifeButton onClick={() => openAdd({ planId, type: "habit" })}>
                Add habit
              </LifeButton>
            }
          />
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Notes</h2>
        <form onSubmit={addNote} className="mt-3 flex gap-2">
          <LifeField
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Note for ${date}`}
          />
          <LifeButton type="submit">Add</LifeButton>
        </form>
        <ul className="mt-4 space-y-3">
          {notes.map((row) => (
            <li key={row.id} className="apple-glass rounded-xl border px-3 py-3 text-sm">
              <p className="text-xs text-[--color-text-muted]">{row.date ?? "No date"}</p>
              <p className="mt-1 whitespace-pre-wrap">{row.content}</p>
              <button
                type="button"
                className="mt-2 text-xs text-red-400"
                onClick={async () => {
                  await lifeApi.deleteNote(row.id);
                  setNotes(
                    await loadLifeCache(notesKey, () => lifeApi.notes(`?plan_id=${planId}`), {
                      force: true,
                    }),
                  );
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {editing ? (
        <ItemEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            bump();
          }}
        />
      ) : null}
    </div>
  );
}

function ItemGroup({
  title,
  items,
  onToggle,
  onProgress,
  onEdit,
}: {
  title: string;
  items: TodayItem[];
  onToggle: (item: TodayItem) => void;
  onProgress: (item: TodayItem, value: number) => void;
  onEdit: (item: TodayItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-[--color-text-muted]">
        {title}
      </h2>
      <ul className="apple-glass mt-2 divide-y divide-[--color-border] rounded-2xl border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-3 py-3">
            <ItemCheckbox
              checked={item.completed}
              onToggle={() => onToggle(item)}
              label={item.title}
            />
            <div className="min-w-0 flex-1">
              <button type="button" className="w-full text-left" onClick={() => onEdit(item)}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-[--color-text-muted]">
                  {item.recurrence !== "none" ? item.recurrence : item.due_date || "No date"}
                  {item.reminder_at ? ` · reminder ${new Date(item.reminder_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  {item.priority !== "medium" ? ` · ${item.priority}` : ""}
                </p>
              </button>
              {isQuantityItem(item) ? (
                <QuantityTracker item={item} value={item.value} onChange={(value) => onProgress(item, value)} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
