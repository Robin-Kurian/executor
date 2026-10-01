"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { localToday } from "@executor/domain/dates";
import { formatQuantityWithUnit, isQuantityItem } from "@executor/domain/quantity";
import type { PlanItem } from "@executor/domain/types";
import { Select } from "@/components/ui/Select";
import { lifeApi } from "./api";
import { DateField } from "./DateField";
import { LifeSheet } from "./LifeSheet";
import { QuantityFields, quantityPayload } from "./QuantityFields";
import { LifeArea, LifeButton, LifeField, WEEKDAYS, lifeChoiceClass, lifeDayChipClass } from "./ui";

const ITEM_STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom weekdays" },
];

function toLocalDateTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ItemEditor({
  item,
  onClose,
  onSaved,
}: {
  item: PlanItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [startDate, setStartDate] = useState(item.start_date ?? "");
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [reminderAt, setReminderAt] = useState(toLocalDateTime(item.reminder_at));
  const [priority, setPriority] = useState(item.priority);
  const [status, setStatus] = useState(item.status);
  const [waitingOn, setWaitingOn] = useState(item.waiting_on);
  const [recurrence, setRecurrence] = useState(item.recurrence);
  const [weekdays, setWeekdays] = useState(item.recurrence_weekdays);
  const [trackQty, setTrackQty] = useState(isQuantityItem(item));
  const [targetValue, setTargetValue] = useState(
    item.target_value != null ? String(item.target_value) : "",
  );
  const [unit, setUnit] = useState(item.unit);
  const [steps, setSteps] = useState(item.step_values.join(", "));
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ date: string; completed: boolean; value: number | null }[]>([]);

  useEffect(() => {
    lifeApi
      .history(item.id)
      .then((res) => setHistory(res.history))
      .catch(() => setHistory([]));
  }, [item.id]);

  async function save() {
    setSaving(true);
    try {
      await lifeApi.updateItem(item.id, {
        title,
        description,
        start_date: startDate || null,
        due_date: dueDate || null,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
        priority,
        status,
        waiting_on: waitingOn,
        recurrence,
        recurrence_weekdays: weekdays,
        ...quantityPayload(
          item.type === "habit" || item.type === "metric" ? trackQty : false,
          targetValue,
          unit,
          steps,
        ),
      });
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this item?")) return;
    try {
      await lifeApi.deleteItem(item.id);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <LifeSheet onClose={onClose} labelledBy="life-edit-title">
      <h2 id="life-edit-title" className="text-lg font-semibold">
        Edit item
      </h2>
      <div className="mt-4 space-y-4">
        <LifeField value={title} onChange={(e) => setTitle(e.target.value)} />
        <LifeArea className="min-h-20 lg:min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-[var(--color-text-muted)]">
              {recurrence !== "none" ? "Start date" : "Due date"}
            </p>
            {recurrence !== "none" ? (
              <DateField
                value={startDate || null}
                onChange={(next) => setStartDate(next ?? "")}
                placeholder="Starts today"
                ariaLabel="Start date"
              />
            ) : (
              <DateField
                value={dueDate || null}
                onChange={(next) => setDueDate(next ?? "")}
                placeholder="No due date"
                ariaLabel="Due date"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-[--color-text-muted]" htmlFor="item-reminder-at">Reminder time</label>
            <LifeField id="item-reminder-at" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
            <p className="mt-1 text-xs text-[--color-text-muted]">Local time. Clear to disable.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-1 text-sm text-[var(--color-text-muted)]">Priority</p>
            <div className="flex flex-wrap gap-1">
              {(["low", "medium", "high"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`${lifeChoiceClass(priority === value)} capitalize`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm text-[var(--color-text-muted)]">Status</p>
            <Select
              variant="surface"
              options={ITEM_STATUS_OPTIONS}
              value={status}
              onChange={(val) => {
                if (val) setStatus(val as PlanItem["status"]);
              }}
              ariaLabel="Item status"
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-[var(--color-text-muted)]">Repeats</p>
            <Select
              variant="surface"
              options={RECURRENCE_OPTIONS}
              value={recurrence}
              onChange={(val) => {
                if (val) setRecurrence(val as PlanItem["recurrence"]);
              }}
              ariaLabel="Repeats"
            />
          </div>
        </div>
        {status === "waiting" ? (
          <LifeField
            value={waitingOn}
            onChange={(e) => setWaitingOn(e.target.value)}
            placeholder="Waiting on"
          />
        ) : null}
        {recurrence === "custom" ? (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() =>
                    setWeekdays((current) =>
                      on ? current.filter((d) => d !== day.value) : [...current, day.value],
                    )
                  }
                  className={lifeDayChipClass(on)}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {item.type === "habit" || item.type === "metric" ? (
          <QuantityFields
            enabled={trackQty}
            onEnabledChange={setTrackQty}
            target={targetValue}
            onTargetChange={setTargetValue}
            unit={unit}
            onUnitChange={setUnit}
            steps={steps}
            onStepsChange={setSteps}
          />
        ) : null}
      </div>
      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[--color-text-muted]">History</p>
        <p className="mt-2 text-sm text-[--color-text-secondary]">
          {history.filter((row) => row.completed).length} completed day
          {history.filter((row) => row.completed).length === 1 ? "" : "s"} recorded
          {history[0]
            ? ` · last ${history[0].date}${
                history[0].value != null
                  ? ` · ${formatQuantityWithUnit(history[0].value, item.unit)}`
                  : ""
              }`
            : ""}
        </p>
      </div>
      <div className="mt-5 flex gap-2">
        <LifeButton onClick={save} disabled={saving} className="flex-1">
          Save
        </LifeButton>
        <LifeButton variant="ghost" onClick={onClose}>
          Close
        </LifeButton>
        <LifeButton variant="danger" onClick={remove}>
          Delete
        </LifeButton>
      </div>
      <p className="mt-3 text-xs text-[--color-text-muted]">Today is {localToday()}.</p>
    </LifeSheet>
  );
}
