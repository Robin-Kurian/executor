"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { addDays, localToday } from "@executor/domain/dates";
import { resolveRepeatingStartDate } from "@executor/domain/recurrence";
import type { ItemType, RecurrenceKind } from "@executor/domain/types";
import { Select } from "@/components/ui/Select";
import { lifeApi } from "./api";
import { DateField } from "./DateField";
import { LifeSheet } from "./LifeSheet";
import { useLife } from "./LifeProvider";
import { QuantityFields, quantityPayload } from "./QuantityFields";
import {
  LifeArea,
  LifeButton,
  LifeField,
  LifeToggle,
  WEEKDAYS,
  lifeAccentChipClass,
  lifeChoiceClass,
  lifeDayChipClass,
} from "./ui";

type DatePreset = "today" | "tomorrow" | "none" | "specific";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom weekdays" },
];

export function QuickAdd() {
  const { addOpen, closeAdd, addDefaults, plans, refreshPlans, date, bump } = useLife();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("task");
  const [planId, setPlanId] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [specific, setSpecific] = useState(date);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("none");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [description, setDescription] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [waitingOn, setWaitingOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [trackQty, setTrackQty] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [steps, setSteps] = useState("");
  const plansRef = useRef(plans);
  plansRef.current = plans;

  useEffect(() => {
    if (!addOpen) return;
    const currentPlans = plansRef.current;
    setTitle("");
    setType(addDefaults.type ?? "task");
    setPlanId(addDefaults.planId ?? currentPlans[0]?.id ?? "");
    setNewPlanName("");
    setCreatingPlan(!addDefaults.planId && currentPlans.length === 0);
    setDescription("");
    setReminderAt("");
    setWaiting(false);
    setWaitingOn("");
    setPriority("medium");
    setTrackQty(addDefaults.type === "metric");
    setTargetValue("");
    setUnit("");
    setSteps("");
    const initialDate = addDefaults.date;
    if (initialDate === null) setPreset("none");
    else if (initialDate && initialDate !== localToday()) {
      if (initialDate === addDays(localToday(), 1)) setPreset("tomorrow");
      else {
        setPreset("specific");
        setSpecific(initialDate);
      }
    } else setPreset("today");
    setRecurrence(addDefaults.type === "habit" || addDefaults.type === "metric" ? "daily" : "none");
  }, [addOpen, addDefaults]);

  useEffect(() => {
    if (type === "habit" || type === "metric") {
      setRecurrence((current) => (current === "none" ? "daily" : current));
    }
    if (type === "metric") setTrackQty(true);
  }, [type]);

  if (!addOpen) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      let targetPlan = creatingPlan ? "" : planId;
      if (!targetPlan) {
        const name = newPlanName.trim();
        if (!name) {
          toast.error("Create or choose a plan");
          setSaving(false);
          return;
        }
        const plan = await lifeApi.createPlan({ name });
        targetPlan = plan.id;
        await refreshPlans();
      }
      const due =
        preset === "today"
          ? localToday()
          : preset === "tomorrow"
            ? addDays(localToday(), 1)
            : preset === "specific"
              ? specific
              : null;
      const repeating = recurrence !== "none";
      const planStart = plansRef.current.find((plan) => plan.id === targetPlan)?.start_date;
      const startDate = repeating
        ? preset === "tomorrow" || preset === "specific"
          ? due ?? localToday()
          : resolveRepeatingStartDate({
              planStart,
              selectedDate: due,
              today: localToday(),
            })
        : type !== "task"
          ? due ?? localToday()
          : null;
      const quantity =
        type === "habit" || type === "metric"
          ? quantityPayload(trackQty, targetValue, unit, steps)
          : { target_value: null, unit: "", step_values: [] };
      const payload = {
        title: title.trim(),
        description,
        type: waiting ? "task" : type,
        priority,
        status: waiting ? "waiting" : undefined,
        waiting_on: waiting ? waitingOn : "",
        due_date: type === "task" && !repeating ? ((due ?? reminderAt.slice(0, 10)) || null) : null,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
        start_date: startDate,
        recurrence,
        recurrence_weekdays: recurrence === "custom" ? weekdays : [],
        ...quantity,
      };
      await lifeApi.createItem(targetPlan, payload);
      toast.success("Added");
      bump();
      closeAdd();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSaving(false);
    }
  }

  const planOptions = plans.map((plan) => ({ value: plan.id, label: plan.name }));

  return (
    <LifeSheet onClose={closeAdd} labelledBy="life-add-title">
      <form onSubmit={onSubmit}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="life-add-title" className="text-lg font-semibold">
            Add
          </h2>
          <button
            type="button"
            className="cursor-pointer text-sm text-[var(--color-text-muted)]"
            onClick={closeAdd}
          >
            Close
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          {(["task", "habit", "metric"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={lifeAccentChipClass(type === value)}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm text-[--color-text-muted]">Title</label>
        <LifeField
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "metric"
              ? "Drink 3.78 Ltr of water"
              : type === "habit"
                ? "Gym"
                : "Finish the homepage"
          }
        />

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]">Plan</label>
        {creatingPlan || plans.length === 0 ? (
          <div>
            <LifeField
              autoFocus={creatingPlan && plans.length > 0}
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="New plan name"
            />
            {plans.length > 0 ? (
              <button
                type="button"
                className="mt-2 cursor-pointer text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                onClick={() => {
                  setCreatingPlan(false);
                  setNewPlanName("");
                  setPlanId(addDefaults.planId ?? plans[0]?.id ?? "");
                }}
              >
                Choose existing plan
              </button>
            ) : null}
          </div>
        ) : (
          <Select
            variant="surface"
            options={planOptions}
            value={planId || null}
            onChange={(val) => {
              setPlanId(val ?? "");
              setCreatingPlan(false);
            }}
            placeholder="Choose a plan"
            ariaLabel="Plan"
            action={{
              label: "New plan",
              onSelect: () => {
                setPlanId("");
                setCreatingPlan(true);
              },
            }}
          />
        )}

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]">Date</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["tomorrow", "Tomorrow"],
              ["specific", "Pick date"],
              ["none", "No date"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreset(value)}
              className={lifeChoiceClass(preset === value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "specific" ? (
          <div className="mt-2">
            <DateField
              value={specific}
              onChange={(next) => setSpecific(next ?? localToday())}
              allowClear={false}
              ariaLabel="Specific date"
            />
          </div>
        ) : null}

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]" htmlFor="quick-add-reminder-at">Reminder time</label>
        <LifeField id="quick-add-reminder-at" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
        <p className="mt-1 text-xs text-[--color-text-muted]">Uses this device’s local time. Leave empty for no timed reminder.</p>

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]">Priority</label>
        <div className="flex gap-2">
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

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]">Repeats</label>
        <Select
          variant="surface"
          options={
            type === "task"
              ? RECURRENCE_OPTIONS
              : RECURRENCE_OPTIONS.filter((option) => option.value !== "none")
          }
          value={recurrence === "none" && type !== "task" ? "daily" : recurrence}
          onChange={(val) =>
            setRecurrence((val as RecurrenceKind) ?? (type === "task" ? "none" : "daily"))
          }
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
                      on
                        ? current.filter((d) => d !== day.value)
                        : [...current, day.value].sort(),
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

        {type === "task" ? (
          <div className="mt-4">
            <LifeToggle
              checked={waiting}
              onChange={setWaiting}
              label="Waiting on someone else"
            />
          </div>
        ) : null}
        {waiting ? (
          <LifeField
            className="mt-2"
            value={waitingOn}
            onChange={(e) => setWaitingOn(e.target.value)}
            placeholder="Waiting on"
          />
        ) : null}

        {type === "habit" || type === "metric" ? (
          <QuantityFields
            className="mt-4"
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

        <label className="mb-1 mt-4 block text-sm text-[--color-text-muted]">
          Note (optional)
        </label>
        <LifeArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

        <div className="mt-5 flex gap-2">
          <LifeButton type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save"}
          </LifeButton>
          <LifeButton variant="ghost" onClick={closeAdd}>
            Cancel
          </LifeButton>
        </div>
      </form>
    </LifeSheet>
  );
}
