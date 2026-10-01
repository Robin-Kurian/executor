"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { executorPaths } from "@/lib/paths";
import { lifeApi } from "./api";
import { lifeCacheKey, useLifeQuery } from "./cache";
import { useLife } from "./LifeProvider";
import { EmptyState, LifeButton, LifeField, LifeToggle } from "./ui";
import { ListSkeleton } from "./LoadingSkeleton";

export function PlanList() {
  const { openAdd, refreshToken, bump } = useLife();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data, loading, error } = useLifeQuery(
    lifeCacheKey("plans", showArchived ? 1 : 0),
    () => lifeApi.plans(showArchived),
    refreshToken,
  );
  const plans = data ?? [];

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
        <ul className="mt-6 space-y-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link
                href={executorPaths.plan(plan.id)}
                className="apple-glass block rounded-2xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <span className="text-xs uppercase tracking-wide text-[--color-text-muted]">
                    {plan.status}
                  </span>
                </div>
                {plan.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[--color-text-muted]">
                    {plan.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
