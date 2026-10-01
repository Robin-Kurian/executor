"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { localToday } from "@executor/domain/dates";
import { formatQuantityWithUnit, isQuantityItem } from "@executor/domain/quantity";
import type { ItemType, PlanItem } from "@executor/domain/types";
import { Select } from "@/components/ui/Select";
import { lifeApi } from "./api";
import { DateField } from "./DateField";
import { DateTimeField } from "./DateTimeField";
import { LifeSheet } from "./LifeSheet";
import { QuantityFields, quantityPayload } from "./QuantityFields";
import { useLife } from "./LifeProvider";
import { LifeArea, LifeButton, LifeField, LifeToggle, WEEKDAYS, lifeAccentChipClass, lifeDayChipClass, lifeSegmentedChoiceClass } from "./ui";

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
  const { plans } = useLife();
  const [planId, setPlanId] = useState(item.plan_id);
  const [type, setType] = useState<ItemType>(item.type);
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

  function changeType(nextType: ItemType) {
    setType(nextType);
    if ((nextType === "habit" || nextType === "metric") && recurrence === "none") {
      setRecurrence("daily");
    }
    if (nextType === "metric") setTrackQty(true);
    if ((nextType === "habit" || nextType === "metric") && status === "todo") {
      setStatus("active");
    }
    if (nextType === "task" && status === "active") setStatus("todo");
  }

  async function save() {
    setSaving(true);
    try {
      await lifeApi.updateItem(item.id, {
        plan_id: planId,
        type,
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
          type === "habit" || type === "metric" ? trackQty : false,
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
    <LifeSheet onClose={onClose} labelledBy="life-edit-title" centerOnMobile>
      <div className="flex items-center justify-between gap-3">
        <h2 id="life-edit-title" className="text-lg font-semibold">
          Edit item
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
          aria-label="Close edit item"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mb-3 mt-4 flex gap-2">
        {(["task", "habit", "metric"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => changeType(value)}
            className={lifeAccentChipClass(type === value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)_minmax(15rem,1fr)]">
          <div className="order-1 col-span-2 lg:col-span-1">
            <label className="mb-1 block text-sm text-[--color-text-muted]" htmlFor="item-title">
              Title
            </label>
            <LifeField
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="order-2 lg:order-2">
            <label className="mb-1 block text-sm text-[--color-text-muted]" htmlFor="item-plan">
              Plan
            </label>
            <Select
              id="item-plan"
              variant="surface"
              options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
              value={planId}
              onChange={(value) => {
                if (value) setPlanId(value);
              }}
              ariaLabel="Item plan"
            />
          </div>
          <LifeArea
            className="order-4 col-span-2 min-h-20 lg:col-span-3 lg:min-h-20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="order-3 lg:order-3">
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
          <div className="order-5 col-span-2 lg:order-5 lg:col-span-1">
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
            {recurrence === "custom" ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
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
          </div>
          <div className="order-6 lg:order-7">
            <p className="mb-1 text-sm text-[var(--color-text-muted)]">Priority</p>
            <div className="flex w-full isolate">
              {(["low", "medium", "high"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`${lifeSegmentedChoiceClass(priority === value)} ${
                    value === "medium" ? "flex-[1.25] sm:flex-1" : "flex-[0.875] sm:flex-1"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="order-6 lg:order-8">
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
        </div>
        {status === "waiting" ? (
          <LifeField
            value={waitingOn}
            onChange={(e) => setWaitingOn(e.target.value)}
            placeholder="Waiting on"
          />
        ) : null}
        <div className="lg:grid lg:grid-cols-[max-content_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div>
            <label className="mb-1 block text-sm text-[--color-text-muted]" htmlFor="item-reminder-at">Reminder time</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full min-w-0 sm:w-80 sm:shrink-0 lg:w-60">
                <DateTimeField id="item-reminder-at" value={reminderAt} onChange={setReminderAt} />
              </div>
              {type === "habit" || type === "metric" ? (
                <LifeToggle
                  checked={trackQty}
                  onChange={setTrackQty}
                  label="Quantifiable"
                />
              ) : null}
            </div>
            <div className="mt-5 hidden lg:block">
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
          </div>
          {type === "habit" || type === "metric" ? (
            <QuantityFields
              className="mt-2 lg:mt-0"
              enabled={trackQty}
              onEnabledChange={setTrackQty}
              target={targetValue}
              onTargetChange={setTargetValue}
              unit={unit}
              onUnitChange={setUnit}
              steps={steps}
              onStepsChange={setSteps}
              showToggle={false}
            />
          ) : null}
        </div>
        <div className="mt-5 lg:hidden">
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
