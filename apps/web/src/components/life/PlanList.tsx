"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import toast from "react-hot-toast";
import type { Plan } from "@executor/domain/types";
import { executorPaths } from "@/lib/paths";
import { lifeApi } from "./api";
import { lifeCacheKey, useLifeQuery } from "./cache";
import { useLife } from "./LifeProvider";
import { EmptyState, LifeButton, LifeField, LifeToggle } from "./ui";
import { ListSkeleton } from "./LoadingSkeleton";

type DragState = {
  id: string;
  activeIndex: number;
  overIndex: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

const statusChipClass: Record<Plan["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-300",
  paused: "bg-amber-500/20 text-amber-300",
  completed: "bg-sky-500/20 text-sky-300",
  archived: "bg-slate-500/20 text-slate-300",
};

function PlanCard({ plan, interactive = true }: { plan: Plan; interactive?: boolean }) {
  const content = <>
    <div className="flex min-w-0 items-center gap-3">
      <h2 className="min-w-0 truncate text-lg font-semibold">{plan.name}</h2>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusChipClass[plan.status]}`}>
        {plan.status}
      </span>
    </div>
    {plan.description ? <p className="mt-1 line-clamp-2 text-sm text-[--color-text-muted]">{plan.description}</p> : null}
  </>;
  return interactive ? (
    <Link href={executorPaths.plan(plan.id)} className="block rounded-2xl px-4 py-4 pr-14">{content}</Link>
  ) : <div className="rounded-2xl px-4 py-4 pr-14">{content}</div>;
}

export function PlanList() {
  const { openAdd, refreshToken, bump } = useLife();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [draftPlans, setDraftPlans] = useState<typeof data>(undefined);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const { data, loading, error } = useLifeQuery(
    lifeCacheKey("plans", showArchived ? 1 : 0),
    () => lifeApi.plans(showArchived),
    refreshToken,
  );
  const plans = draftPlans ?? data ?? [];
  const hasUnsavedOrder = Boolean(
    data && draftPlans && data.some((plan, index) => plan.id !== draftPlans[index]?.id),
  );

  useEffect(() => {
    setDraftPlans(undefined);
  }, [data, showArchived]);

  function startDrag(e: PointerEvent<HTMLButtonElement>, planId: string) {
    e.preventDefault();
    const card = e.currentTarget.closest<HTMLElement>("[data-plan-card]");
    const activeIndex = plans.findIndex((plan) => plan.id === planId);
    if (!card || activeIndex < 0) return;
    const rect = card.getBoundingClientRect();
    const next: DragState = {
      id: planId, activeIndex, overIndex: activeIndex,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      width: rect.width, height: rect.height, x: rect.left, y: rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = next;
    setDragging(next);
  }

  function dragPlan(e: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-plan-id]");
    const targetIndex = target?.dataset.planId
      ? plans.findIndex((plan) => plan.id === target.dataset.planId)
      : current.overIndex;
    const next = {
      ...current,
      overIndex: targetIndex < 0 ? current.overIndex : targetIndex,
      x: e.clientX - current.offsetX,
      y: e.clientY - current.offsetY,
    };
    dragRef.current = next;
    setDragging(next);
  }

  function finishDrag(e: PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const current = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    if (!current || current.activeIndex === current.overIndex) return;
    setDraftPlans((previous) => {
      const next = [...(previous ?? data ?? [])];
      const [moved] = next.splice(current.activeIndex, 1);
      if (!moved) return previous;
      next.splice(current.overIndex, 0, moved);
      return next;
    });
  }

  function cancelDrag(e: PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDragging(null);
  }

  async function saveOrder() {
    if (!hasUnsavedOrder) return;
    setSaving(true);
    try {
      await lifeApi.reorderPlans(plans.map((plan) => plan.id));
      setDraftPlans(undefined);
      bump();
      toast.success("Plan order saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan order");
    } finally {
      setSaving(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await lifeApi.createPlan({ name: name.trim() });
      setName("");
      bump();
      toast.success("Plan created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        Containers for habits, work, and everything in between.
      </p>

      <form onSubmit={create} className="mt-6 flex gap-2">
        <LifeField
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New plan name"
        />
        <LifeButton type="submit" variant="glass" disabled={saving}>
          Create
        </LifeButton>
      </form>

      <div className="mt-4">
        <LifeToggle
          checked={showArchived}
          onChange={setShowArchived}
          label="Include archived"
        />
      </div>

      {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}
      {loading && !data ? <ListSkeleton /> : null}
      {!loading && plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No plans yet"
            body="Create a plan, then add habits and tasks to it."
            actions={
              <LifeButton onClick={() => openAdd({ type: "habit" })}>Add a habit</LifeButton>
            }
          />
        </div>
      ) : null}
      {plans.length > 0 ? (
        <>
          {hasUnsavedOrder ? (
            <div className="mt-6 flex justify-end">
              <LifeButton onClick={saveOrder} disabled={saving}>Save</LifeButton>
            </div>
          ) : null}
        <ul className="mt-6 space-y-3">
          {plans.map((plan, index) => {
            const displacement = (dragging?.height ?? 0) + 12;
            const shiftsUp = dragging && dragging.activeIndex < dragging.overIndex && index > dragging.activeIndex && index <= dragging.overIndex;
            const shiftsDown = dragging && dragging.overIndex < dragging.activeIndex && index >= dragging.overIndex && index < dragging.activeIndex;
            const isDragged = dragging?.id === plan.id;
            return (
            <li
              key={plan.id}
              data-plan-id={plan.id}
              className="relative transition-transform duration-200 ease-out"
              style={{ transform: shiftsUp ? `translateY(-${displacement}px)` : shiftsDown ? `translateY(${displacement}px)` : undefined, opacity: isDragged ? 0 : 1 }}
            >
              <div data-plan-card className="apple-glass relative rounded-2xl border">
              <PlanCard plan={plan} />
              <button
                type="button"
                aria-label={`Drag ${plan.name} to change its order`}
                className="absolute right-3 top-1/2 -translate-y-1/2 touch-none rounded-lg p-2 text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]"
                onPointerDown={(e) => startDrag(e, plan.id)}
                onPointerMove={dragPlan}
                onPointerUp={finishDrag}
                onPointerCancel={cancelDrag}
              >
                <GripVertical className="size-5" aria-hidden="true" />
              </button>
              </div>
            </li>
            );
          })}
        </ul>
        {dragging ? (
          <div
            aria-hidden="true"
            className="apple-glass pointer-events-none fixed left-0 top-0 z-50 rounded-2xl border opacity-95 shadow-2xl"
            style={{ width: dragging.width, transform: `translate3d(${dragging.x}px, ${dragging.y}px, 0)` }}
          >
            <PlanCard plan={plans.find((plan) => plan.id === dragging.id)!} interactive={false} />
          </div>
        ) : null}
        </>
      ) : null}
    </div>
  );
}
