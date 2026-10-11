import { describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../env";
import { getAnalytics } from "./analytics";

const plan = {
  id: "plan-1", name: "Health", description: "", icon: "", color: "", status: "active" as const,
  start_date: "2026-10-09", end_date: null, sort_order: 0,
  created_at: "2026-10-09T00:00:00.000Z", updated_at: "2026-10-09T00:00:00.000Z",
};
const habit = {
  id: "habit-1", plan_id: plan.id, title: "Walk", description: "", type: "habit" as const,
  priority: "medium" as const, status: "active" as const, start_date: "2026-10-09", end_date: null,
  due_date: null, reminder_at: null, recurrence: "daily" as const, recurrence_weekdays: [], waiting_on: "",
  last_follow_up: null, next_follow_up: null, target_value: null, unit: "", step_values: [], sort_order: 0,
  created_at: "2026-10-09T00:00:00.000Z", updated_at: "2026-10-09T00:00:00.000Z",
};

const env = {
  DATABASE_URL: "postgresql://user:password@example.invalid/database?sslmode=require",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters",
  BETTER_AUTH_URL: "http://localhost:8787",
  WEB_ORIGIN: "http://localhost:3000",
  ALLOWED_ADMIN_EMAIL: "admin@example.com",
  ADMIN_BOOTSTRAP_TOKEN: "test-bootstrap-token-that-is-at-least-thirty-two-characters",
  APP_ENV: "local",
  VAPID_PUBLIC_KEY: "test-public-vapid-key-that-is-long-enough",
  VAPID_PRIVATE_KEY: "test-private-vapid-key-that-is-long-enough",
  VAPID_SUBJECT: "mailto:test@example.com",
  NEON_CU_LIMIT_CU_HOURS: 100,
} satisfies RuntimeEnv;

function repository() {
  return {
    getAnalytics: async (from: string, to: string) => ({
      daily: [
        { date: from, completions: 0, tasks: 0, habits: 0 },
        { date: "2026-10-09", completions: 2, tasks: 1, habits: 1 },
        { date: "2026-10-10", completions: 1, tasks: 0, habits: 1 },
        { date: to, completions: 0, tasks: 0, habits: 0 },
      ],
      completedOneTimeTasks: 7,
      openItems: 4,
    }),
    listPlans: async () => [plan],
    listTrackableItems: async () => [habit],
    listCompletionsInRange: async () => [{
      id: "completion-1", item_id: habit.id, date: "2026-10-09", completed: true, value: null, note: "",
      created_at: "2026-10-09T00:00:00.000Z", updated_at: "2026-10-09T00:00:00.000Z",
    }],
    listScheduleOverridesInRange: async () => [],
  };
}

describe("analytics", () => {
  it("summarizes completion activity and keeps yesterday's active streak", async () => {
    const result = await getAnalytics(repository(), env, "2026-10-11");

    expect(result).toMatchObject({
      period_start: "2026-09-12",
      period_end: "2026-10-11",
      completed: 3,
      failures: 1,
      task_completions: 1,
      habit_completions: 2,
      active_days: 2,
      current_streak: 2,
      best_streak: 2,
      completed_one_time_tasks: 7,
      open_items: 4,
      neon: { status: "not_configured", used_cu_hours: null, limit_cu_hours: 100 },
    });
  });

  it("converts Neon's CU-seconds to CU-hours", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      projects: [{ periods: [{ consumption: [{ metrics: [{ metric_name: "compute_unit_seconds", value: 5400 }] }] }] }],
    }), { status: 200 })));

    const result = await getAnalytics(repository(), {
      ...env,
      NEON_API_KEY: "secret",
      NEON_ORG_ID: "org-example",
      NEON_PROJECT_ID: "project-example",
    }, "2026-10-11");

    expect(result.neon).toMatchObject({ status: "available", used_cu_hours: 1.5 });
    expect(fetch).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
