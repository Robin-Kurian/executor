"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { addDays, formatLongDate } from "@executor/domain/dates";
import type { TodayItem, TodayPayload } from "@executor/domain/types";
import { DateField } from "./DateField";
import { LifeSheet } from "./LifeSheet";
import { lifeApi } from "./api";
import { LifeButton } from "./ui";

export function OccurrenceMover({
  item,
  sourceDate,
  onClose,
  onMoved,
}: {
  item: TodayItem;
  sourceDate: string;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [targetDate, setTargetDate] = useState(addDays(sourceDate, 1));
  const [target, setTarget] = useState<TodayPayload | null>(null);
  const [swapItemId, setSwapItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSwapItemId(null);
    lifeApi.today(targetDate)
      .then((payload) => {
        if (!cancelled) setTarget(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setTarget(null);
          setLoadError(error instanceof Error ? error.message : "Could not load that date");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [targetDate]);

  const candidates = target?.plans
    .find((plan) => plan.id === item.plan_id)
    ?.habits.filter((candidate) => candidate.id !== item.id && candidate.recurrence !== "none" && !candidate.completed) ?? [];

  async function save() {
    if (targetDate === sourceDate) return;
    setSaving(true);
    try {
      await lifeApi.rescheduleOccurrence(item.id, {
        source_date: sourceDate,
        target_date: targetDate,
        ...(swapItemId ? { swap_item_id: swapItemId } : {}),
      });
      toast.success(swapItemId ? "Days exchanged" : "Occurrence moved");
      onMoved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move occurrence");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LifeSheet onClose={onClose} labelledBy="occurrence-mover-title" centerOnMobile className="sm:max-w-lg lg:max-w-lg">
      <h2 id="occurrence-mover-title" className="text-xl font-semibold">Move or exchange</h2>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        This changes only this occurrence of <span className="text-[--color-text-primary]">{item.title}</span>.
        Its regular weekly schedule stays the same.
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] px-3 py-2.5 text-sm">
          <span className="text-[--color-text-muted]">From </span>{formatLongDate(sourceDate)}
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-[--color-text-muted]">Move to</label>
          <DateField
            value={targetDate}
            onChange={(date) => { if (date) setTargetDate(date); }}
            allowClear={false}
            ariaLabel="Choose destination date"
          />
          {targetDate === sourceDate ? <p className="mt-1.5 text-xs text-amber-300">Choose a different date.</p> : null}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">What should happen?</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--color-border] bg-[--color-surface] p-3">
              <input
                type="radio"
                name="exchange-item"
                checked={swapItemId === null}
                onChange={() => setSwapItemId(null)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <span><span className="block text-sm font-medium">Move only</span><span className="block text-xs text-[--color-text-muted]">Leave the original date empty.</span></span>
            </label>
            {loading ? <p className="px-1 text-sm text-[--color-text-muted]">Checking {formatLongDate(targetDate)}…</p> : null}
            {loadError ? <p className="px-1 text-sm text-red-400">{loadError}</p> : null}
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--color-border] bg-[--color-surface] p-3">
                <input
                  type="radio"
                  name="exchange-item"
                  checked={swapItemId === candidate.id}
                  onChange={() => setSwapItemId(candidate.id)}
                  className="mt-0.5 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-sm font-medium">Exchange with {candidate.title}</span>
                  <span className="block text-xs text-[--color-text-muted]">
                    {candidate.title} moves to {formatLongDate(sourceDate)}.
                  </span>
                </span>
              </label>
            ))}
            {!loading && !loadError && candidates.length === 0 ? (
              <p className="px-1 text-xs text-[--color-text-muted]">No other exchangeable habit is scheduled in this plan on that date.</p>
            ) : null}
          </div>
        </fieldset>
      </div>

      <div className="mt-7 flex justify-end gap-2">
        <LifeButton variant="ghost" onClick={onClose}>Cancel</LifeButton>
        <LifeButton onClick={save} disabled={saving || targetDate === sourceDate}>
          {saving ? "Saving…" : swapItemId ? "Exchange days" : "Move occurrence"}
        </LifeButton>
      </div>
    </LifeSheet>
  );
}
