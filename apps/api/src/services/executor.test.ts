import { describe, expect, it } from "vitest";
import type { ItemCompletion, Plan, PlanItem, ScheduleOverride } from "@executor/domain";
import { getCalendar, getToday, rescheduleOccurrence } from "./executor";

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
    end_date: null,
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

function completion(itemId: string, completed: boolean, date = "2026-10-05"): ItemCompletion {
  return {
    id: `completion-${itemId}`,
    item_id: itemId,
    date,
    completed,
    value: null,
    note: "",
    created_at: `${date}T00:00:00.000Z`,
    updated_at: `${date}T00:00:00.000Z`,
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

function repository(completions: ItemCompletion[] = [], overrides: ScheduleOverride[] = []) {
  return {
    listPlans: async () => [plan],
    listActivePlanItems: async () => [
      habit("chest", "Chest + Triceps", 1),
      habit("back", "Back + Biceps", 2),
    ],
    listCompletionsInRange: async () => completions,
    listLatestCompletedCompletionsThrough: async () => completions.filter((row) => row.completed),
    listScheduleOverridesInRange: async () => overrides,
  };
}

function scheduleOverride(itemId: string, originalDate: string, scheduledDate: string): ScheduleOverride {
  return {
    id: `override-${itemId}-${originalDate}`,
    item_id: itemId,
    original_date: originalDate,
    scheduled_date: scheduledDate,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
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

  it("never manufactures missed habits while browsing a future date", async () => {
    const result = await getToday(repository(), "2026-10-09", "2026-10-06");

    expect(result.plans.flatMap((group) => group.missed)).toEqual([]);
  });

  it("stops showing missed occurrences after a habit's end date", async () => {
    const repo = repository();
    repo.listActivePlanItems = async () => [
      { ...habit("chest", "Chest + Triceps", 1), end_date: "2026-10-05" },
    ];

    const result = await getToday(repo, "2026-10-06");

    expect(result.plans).toEqual([]);
  });

  it("shows a single lapse for six days and ages it out on the seventh", async () => {
    const sixthDay = await getToday(repository(), "2026-10-11", "2026-10-11");
    const seventhDay = await getToday(repository(), "2026-10-12", "2026-10-12");

    expect(sixthDay.plans.flatMap((group) => group.missed).map((item) => item.id)).toContain("chest");
    expect(seventhDay.plans.flatMap((group) => group.missed).map((item) => item.id)).not.toContain("chest");
  });

  it("shows the last completion after three consecutive missed occurrences", async () => {
    const lastCompletion = completion("chest", true, "2026-10-19");
    const result = await getToday(repository([lastCompletion]), "2026-11-10", "2026-11-10");

    expect(result.plans[0]?.missed).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "chest",
        missed_date: "2026-11-09",
        last_completed_date: "2026-10-19",
        consecutive_misses: 3,
        is_stale: true,
      }),
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
      listLatestCompletedCompletionsThrough: async () => [checkedToday],
      listScheduleOverridesInRange: async () => [],
    }, "2026-10-06");

    expect(result.overdue).toEqual([]);
    expect(result.plans[0]?.tasks).toMatchObject([
      { id: "overdue-task", completed: true, completion_date: "2026-10-06" },
    ]);
  });

  it("does not mark the original due date complete from task status alone", async () => {
    const result = await getToday({
      listPlans: async () => [plan],
      listActivePlanItems: async () => [task()],
      listCompletionsInRange: async () => [],
      listLatestCompletedCompletionsThrough: async () => [],
      listScheduleOverridesInRange: async () => [],
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
      listScheduleOverridesInRange: async () => [],
    }, "2026-10");

    expect(result.days.find((day) => day.date === "2026-10-05")).toMatchObject({ total: 1, completed: 0 });
    expect(result.days.find((day) => day.date === "2026-10-06")).toMatchObject({ total: 1, completed: 1 });
  });
});

describe("one-time occurrence exchanges", () => {
  it("shows exchanged habits on each other's dates without changing recurrence", async () => {
    const legs = habit("legs", "Legs + Core", 3);
    const rest = habit("rest", "Rest day", 4);
    const overrides = [
      scheduleOverride("legs", "2026-10-07", "2026-10-08"),
      scheduleOverride("rest", "2026-10-08", "2026-10-07"),
    ];
    const repo = {
      ...repository([], overrides),
      listActivePlanItems: async () => [legs, rest],
    };

    const wednesday = await getToday(repo, "2026-10-07", "2026-10-06");
    const thursday = await getToday(repo, "2026-10-08", "2026-10-06");

    expect(wednesday.plans[0]?.habits.map((item) => item.title)).toEqual(["Rest day"]);
    expect(thursday.plans[0]?.habits.map((item) => item.title)).toEqual(["Legs + Core"]);
    expect(legs.recurrence_weekdays).toEqual([3]);
    expect(rest.recurrence_weekdays).toEqual([4]);
  });

  it("persists both sides of an exchange in one save", async () => {
    const legs = habit("legs", "Legs + Core", 3);
    const rest = habit("rest", "Rest day", 4);
    let saved: { item_id: string; original_date: string; scheduled_date: string }[] = [];
    const result = await rescheduleOccurrence({
      getItem: async (id) => id === legs.id ? legs : id === rest.id ? rest : null,
      listScheduleOverridesInRange: async () => [],
      listCompletionsForDate: async () => [],
      saveScheduleOverrides: async (rows) => {
        saved = rows;
        return rows.map((row) => scheduleOverride(row.item_id, row.original_date, row.scheduled_date));
      },
    }, legs.id, { source_date: "2026-10-07", target_date: "2026-10-08", swap_item_id: rest.id });

    expect(result).toEqual({ ok: true, moved_item_id: "legs", swapped_item_id: "rest" });
    expect(saved).toEqual([
      { item_id: "legs", original_date: "2026-10-07", scheduled_date: "2026-10-08" },
      { item_id: "rest", original_date: "2026-10-08", scheduled_date: "2026-10-07" },
    ]);
  });
});
