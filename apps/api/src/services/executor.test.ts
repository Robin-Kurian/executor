import { describe, expect, it } from "vitest";
import type { ItemCompletion, Plan, PlanItem } from "@executor/domain";
import { getCalendar, getToday } from "./executor";

const plan: Plan = {
  id: "plan-1",
  name: "Gym Plan",
  description: "",
  icon: "",
  color: "",
  status: "active",
  start_date: "2026-10-01",
  end_date: null,
  sort_order: 0,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

function habit(id: string, title: string, weekday: number): PlanItem {
  return {
    id,
    plan_id: plan.id,
    title,
    description: "",
    type: "habit",
    priority: "medium",
    status: "active",
    start_date: "2026-10-01",
    due_date: null,
    reminder_at: null,
    recurrence: "custom",
    recurrence_weekdays: [weekday],
    waiting_on: "",
    last_follow_up: null,
    next_follow_up: null,
    target_value: null,
    unit: "",
    step_values: [],
    sort_order: 0,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };
}

function completion(itemId: string, completed: boolean): ItemCompletion {
  return {
    id: `completion-${itemId}`,
    item_id: itemId,
    date: "2026-10-05",
    completed,
    value: null,
    note: "",
    created_at: "2026-10-05T00:00:00.000Z",
    updated_at: "2026-10-05T00:00:00.000Z",
  };
}

function task(): PlanItem {
  return {
    ...habit("overdue-task", "Send invoice", 1),
    type: "task",
    status: "done",
    due_date: "2026-10-05",
    recurrence: "none",
    recurrence_weekdays: [],
  };
}

function repository(completions: ItemCompletion[] = []) {
  return {
    listPlans: async () => [plan],
    listActivePlanItems: async () => [
      habit("chest", "Chest + Triceps", 1),
      habit("back", "Back + Biceps", 2),
    ],
    listCompletionsInRange: async () => completions,
  };
}

describe("getToday missed habits", () => {
  it("keeps an unchecked habit from yesterday inside its plan", async () => {
    const result = await getToday(repository(), "2026-10-06");

    expect(result.overdue).toEqual([]);
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.habits.map((item) => item.title)).toEqual(["Back + Biceps"]);
    expect(result.plans[0]?.missed).toMatchObject([
      { id: "chest", title: "Chest + Triceps", missed_date: "2026-10-05", completed: false },
    ]);
    expect(result.plans[0]?.progress).toEqual({ completed: 0, total: 1 });
  });

  it("does not report yesterday's habit when that occurrence was completed", async () => {
    const result = await getToday(repository([completion("chest", true)]), "2026-10-06");

    expect(result.plans[0]?.missed).toEqual([]);
  });

  it("keeps the most recent weekly occurrence visible later in the week", async () => {
    const result = await getToday(repository(), "2026-10-07");

    expect(result.plans[0]?.missed).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "chest", missed_date: "2026-10-05" }),
    ]));
  });
});

describe("getToday completed overdue tasks", () => {
  it("places a completed overdue task on the date it was checked", async () => {
    const checkedToday = { ...completion("overdue-task", true), date: "2026-10-06" };
    const result = await getToday({
      listPlans: async () => [plan],
      listActivePlanItems: async () => [task()],
      listCompletionsInRange: async () => [checkedToday],
    }, "2026-10-06");

    expect(result.overdue).toEqual([]);
    expect(result.plans[0]?.tasks).toMatchObject([
      { id: "overdue-task", completed: true },
    ]);
  });

  it("does not mark the original due date complete from task status alone", async () => {
    const result = await getToday({
      listPlans: async () => [plan],
      listActivePlanItems: async () => [task()],
      listCompletionsInRange: async () => [],
    }, "2026-10-05");

    expect(result.plans[0]?.tasks).toMatchObject([
      { id: "overdue-task", completed: false },
    ]);
  });
});

describe("getCalendar completed overdue tasks", () => {
  it("counts the original due date as missed and the actual completion date as complete", async () => {
    const checkedOnOctoberSixth = { ...completion("overdue-task", true), date: "2026-10-06" };
    const result = await getCalendar({
      listPlans: async () => [plan],
      listTrackableItems: async () => [task()],
      listCompletionsInRange: async () => [checkedOnOctoberSixth],
    }, "2026-10");

    expect(result.days.find((day) => day.date === "2026-10-05")).toMatchObject({ total: 1, completed: 0 });
    expect(result.days.find((day) => day.date === "2026-10-06")).toMatchObject({ total: 1, completed: 1 });
  });
});
