"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Clock } from "lucide-react";
import { addDays, localToday } from "@executor/domain/dates";
import { executorPaths } from "@/lib/paths";
import { itemIsWaiting } from "@executor/domain/recurrence";
import type { TodayItem } from "@executor/domain/types";
import { cn } from "@/lib/cn";
import { lifeApi } from "./api";
import { lifeCacheKey, useLifeQuery } from "./cache";
import { ItemEditor } from "./ItemEditor";
import { useLife } from "./LifeProvider";
import { EmptyState, LifeButton } from "./ui";
import { ListSkeleton } from "./LoadingSkeleton";

function InboxChip({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-full border border-[var(--color-border)]",
        "bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]",
        "transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60",
      )}
    >
      {children}
    </button>
  );
}

export function InboxView() {
  const { openAdd, bump, refreshToken, plans } = useLife();
  const { data, loading, error } = useLifeQuery(lifeCacheKey("inbox"), () => lifeApi.inbox(), refreshToken);
  const items = data ?? [];
  const [editing, setEditing] = useState<TodayItem | null>(null);

  async function schedule(item: TodayItem, dueDate: string | null) {
    try {
      await lifeApi.updateItem(item.id, { due_date: dueDate, start_date: dueDate });
      bump();
      toast.success(dueDate ? "Scheduled" : "Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule");
    }
  }

  async function markWaiting(item: TodayItem) {
    try {
      await lifeApi.updateItem(item.id, { status: "waiting" });
      bump();
      toast.success("Marked waiting");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  const planName = (id: string) => plans.find((plan) => plan.id === id)?.name ?? "Plan";

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        Ideas and tasks without a date. They stay out of Today until you schedule them.
      </p>
      <div className="mt-4">
        <LifeButton onClick={() => openAdd({ type: "task", date: null })}>Add undated task</LifeButton>
      </div>
      {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}
      {loading && !data ? <ListSkeleton /> : null}
      {!loading && items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Inbox is clear"
            body="Unscheduled work will land here instead of crowding Today."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const waiting = itemIsWaiting(item);
            return (
              <li
                key={item.id}
                className="apple-glass rounded-2xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="w-full cursor-pointer text-left"
                      onClick={() => setEditing(item)}
                    >
                      <p className="text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                        {item.title}
                      </p>
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Link
                        href={executorPaths.plan(item.plan_id)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        {planName(item.plan_id)}
                      </Link>
                      {waiting ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pub-status-warning-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--pub-status-warning)]">
                          <Clock className="h-3 w-3" aria-hidden />
                          {item.waiting_on ? `Waiting on ${item.waiting_on}` : "Waiting"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <InboxChip onClick={() => setEditing(item)}>Edit</InboxChip>
                    <InboxChip onClick={() => schedule(item, localToday())}>Today</InboxChip>
                    <InboxChip onClick={() => schedule(item, addDays(localToday(), 1))}>
                      Tomorrow
                    </InboxChip>
                    {!waiting ? (
                      <InboxChip onClick={() => markWaiting(item)}>Waiting</InboxChip>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
