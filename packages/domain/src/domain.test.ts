import { describe, expect, it } from "vitest";
import { addDays, completedLateByDays, dateInTimeZone, formatCompletedLate, isDateOnly, toDateOnly, weekdayOf } from "./dates";
import { nextQuantityState, nextToggleState } from "./quantity";
import { itemScheduledOnDate, planVisibleOnToday, recurrenceAppliesOnDate } from "./recurrence";
import type { Plan, PlanItem } from "./types";

const plan: Plan = {
  id: "00000000-0000-4000-8000-000000000001", name: "Plan", description: "", icon: "", color: "",
  status: "active", start_date: "2026-09-01", end_date: "2026-09-30", sort_order: 0,
  created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z",
};
const item: PlanItem = {
  id: "00000000-0000-4000-8000-000000000002", plan_id: plan.id, title: "Item", description: "",
  type: "habit", priority: "medium", status: "active", start_date: "2026-09-01", end_date: null, due_date: null,
  reminder_at: null,
  recurrence: "daily", recurrence_weekdays: [], waiting_on: "", last_follow_up: null, next_follow_up: null,
  target_value: null, unit: "", step_values: [], sort_order: 0,
  created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z",
};

describe("civil dates", () => {
  it("validates and advances dates across month boundaries", () => {
    expect(isDateOnly("2026-02-29")).toBe(false);
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(weekdayOf("2026-10-01")).toBe(4);
  });
  it("normalizes either UTC or IST-style Date encodings", () => {
    expect(toDateOnly(new Date("2026-10-01T00:00:00.000Z"))).toBe("2026-10-01");
    expect(toDateOnly(new Date("2026-09-30T18:30:00.000Z"))).toBe("2026-10-01");
  });
  it("resolves the civil date in an explicit time zone", () => {
    expect(dateInTimeZone(Date.parse("2026-09-30T20:00:00Z"), "Asia/Kolkata")).toBe("2026-10-01");
  });
  it("describes completion after a task's civil due date", () => {
    expect(completedLateByDays("2026-10-05", "2026-10-06")).toBe(1);
    expect(completedLateByDays("2026-10-05", "2026-10-09")).toBe(4);
    expect(completedLateByDays("2026-10-05", "2026-10-05")).toBe(0);
    expect(formatCompletedLate(1)).toBe("Completed 1 day late");
    expect(formatCompletedLate(4)).toBe("Completed 4 days late");
  });
});

describe("scheduling", () => {
  it("keeps plan bounds inclusive", () => {
    expect(planVisibleOnToday(plan, "2026-09-01")).toBe(true);
    expect(planVisibleOnToday(plan, "2026-09-30")).toBe(true);
    expect(planVisibleOnToday(plan, "2026-10-01")).toBe(false);
  });
  it("preserves every recurrence kind", () => {
    expect(recurrenceAppliesOnDate(item, "2026-09-06")).toBe(true);
    expect(recurrenceAppliesOnDate({ ...item, recurrence: "weekdays" }, "2026-09-06")).toBe(false);
    expect(recurrenceAppliesOnDate({ ...item, recurrence: "weekly" }, "2026-09-08")).toBe(true);
    expect(recurrenceAppliesOnDate({ ...item, recurrence: "custom", recurrence_weekdays: [4] }, "2026-10-01")).toBe(true);
    expect(itemScheduledOnDate({ ...item, recurrence: "none", start_date: null, due_date: "2026-10-01" }, "2026-10-01")).toBe(true);
  });
  it("keeps a repeating item's end date inclusive", () => {
    const endingItem = { ...item, end_date: "2026-09-03" };
    expect(recurrenceAppliesOnDate(endingItem, "2026-09-03")).toBe(true);
    expect(recurrenceAppliesOnDate(endingItem, "2026-09-04")).toBe(false);
  });
});

describe("quantity semantics", () => {
  const quantity = { target_value: 8, unit: "glasses", step_values: [1, 2, 3] };
  it("allows over-target values and derives completion", () => {
    expect(nextQuantityState(quantity, 9)).toEqual({ value: 9, completed: true });
  });
  it("resets completed quantity items to zero", () => {
    expect(nextToggleState({ ...quantity, completed: true, value: 9 })).toEqual({ completed: false, value: 0 });
  });
});
