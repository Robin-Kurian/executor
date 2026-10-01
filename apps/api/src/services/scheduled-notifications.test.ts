import { describe, expect, it } from "vitest";
import type { TodayPayload } from "@executor/domain";
import {
  EVENING_NOTIFICATION_CRON, MORNING_NOTIFICATION_CRON, dateInTimeZone, notificationKindForCron, scheduledNotificationPayload,
} from "./scheduled-notifications";

const today = (completed = false): TodayPayload => ({
  date: "2026-10-01",
  plans: [{
    id: "plan-1", name: "Launch", description: "", icon: "", color: "", status: "active",
    start_date: null, end_date: null, day_progress: null, progress: { completed: completed ? 1 : 0, total: 1 },
    habits: [],
    tasks: [{
      id: "item-1", plan_id: "plan-1", title: "Ship", description: "", type: "task", priority: "high", status: "todo",
      start_date: null, due_date: "2026-10-01", recurrence: "none", recurrence_weekdays: [], waiting_on: "",
      last_follow_up: null, next_follow_up: null, target_value: null, unit: "", step_values: [], sort_order: 0,
      created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-01T00:00:00.000Z", completed,
      value: null, completion_id: null, completion_note: "",
    }],
  }],
  overdue: [], waiting: [],
});

describe("scheduled notifications", () => {
  it("maps UTC cron schedules to their notification kind", () => {
    expect(notificationKindForCron(MORNING_NOTIFICATION_CRON)).toBe("morning");
    expect(notificationKindForCron(EVENING_NOTIFICATION_CRON)).toBe("evening");
    expect(notificationKindForCron("0 * * * *")).toBeNull();
  });

  it("uses the configured IST calendar date", () => {
    expect(dateInTimeZone(Date.parse("2026-09-30T20:00:00Z"))).toBe("2026-10-01");
  });

  it("summarizes morning work and sends a completion message at night", () => {
    expect(scheduledNotificationPayload("morning", "2026-10-01", today())).toMatchObject({
      title: "Today in Executor", body: "1 item planned", tag: "executor-morning-2026-10-01",
    });
    expect(scheduledNotificationPayload("evening", "2026-10-01", today(true))).toMatchObject({
      title: "Executor day complete", body: "Everything scheduled for today is complete.",
    });
  });
});
