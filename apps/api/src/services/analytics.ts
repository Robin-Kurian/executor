import { addDays } from "@executor/domain";
import type { AnalyticsPayload } from "@executor/contracts";
import type { RuntimeEnv } from "../env";

type AnalyticsRepository = {
  getAnalytics(from: string, to: string): Promise<{
    daily: AnalyticsPayload["daily"];
    completedOneTimeTasks: number;
    openItems: number;
  }>;
};

type NeonConsumptionResponse = {
  projects?: Array<{
    periods?: Array<{
      consumption?: Array<{
        metrics?: Array<{ metric_name?: string; value?: number }>;
      }>;
    }>;
  }>;
};

type NeonProjectResponse = {
  project?: {
    compute_time_seconds?: number;
    consumption_period_start?: string;
    consumption_period_end?: string;
  };
};

function streaks(daily: AnalyticsPayload["daily"]) {
  let best = 0;
  let running = 0;
  for (const day of daily) {
    running = day.completions > 0 ? running + 1 : 0;
    best = Math.max(best, running);
  }
  let current = 0;
  let index = daily.length - 1;
  // Today may still be in progress. Preserve a streak that was alive yesterday.
  if (index >= 0 && daily[index]!.completions === 0) index -= 1;
  for (; index >= 0 && daily[index]!.completions > 0; index -= 1) current += 1;
  return { current, best };
}

async function getNeonUsage(env: RuntimeEnv, today: string): Promise<AnalyticsPayload["neon"]> {
  const now = new Date();
  const utcToday = now.toISOString().slice(0, 10);
  const periodStart = `${utcToday.slice(0, 7)}-01`;
  const base = {
    limit_cu_hours: env.NEON_CU_LIMIT_CU_HOURS,
    period_start: periodStart,
    period_end: utcToday,
  };
  if (!env.NEON_API_KEY || !env.NEON_ORG_ID || !env.NEON_PROJECT_ID) {
    return { ...base, status: "not_configured", used_cu_hours: null, message: "Add the three NEON_* settings to show current usage." };
  }

  const query = new URLSearchParams({
    from: `${periodStart}T00:00:00Z`,
    to: now.toISOString(),
    granularity: "daily",
    org_id: env.NEON_ORG_ID,
    project_ids: env.NEON_PROJECT_ID,
    metrics: "compute_unit_seconds",
  });
  try {
    const response = await fetch(`https://console.neon.tech/api/v2/consumption_history/v2/projects?${query}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${env.NEON_API_KEY}` },
    });
    if (!response.ok) {
      if (response.status === 403) {
        // Free/legacy accounts may expose current-period usage on project metadata
        // even when consumption history is unavailable.
        const projectResponse = await fetch(`https://console.neon.tech/api/v2/projects/${env.NEON_PROJECT_ID}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${env.NEON_API_KEY}` },
        });
        if (projectResponse.ok) {
          const projectPayload = await projectResponse.json() as NeonProjectResponse;
          const seconds = projectPayload.project?.compute_time_seconds;
          if (typeof seconds === "number" && Number.isFinite(seconds)) {
            return {
              ...base,
              status: "available",
              used_cu_hours: seconds / 3600,
              period_start: projectPayload.project?.consumption_period_start?.slice(0, 10) ?? base.period_start,
              period_end: projectPayload.project?.consumption_period_end?.slice(0, 10) ?? base.period_end,
              message: null,
            };
          }
        }
      }
      return { ...base, status: "unavailable", used_cu_hours: null, message: `Neon usage request failed (${response.status}).` };
    }
    const payload = await response.json() as NeonConsumptionResponse;
    const seconds = payload.projects?.flatMap((project) => project.periods ?? [])
      .flatMap((period) => period.consumption ?? [])
      .flatMap((consumption) => consumption.metrics ?? [])
      .filter((metric) => metric.metric_name === "compute_unit_seconds")
      .reduce((total, metric) => total + Number(metric.value ?? 0), 0) ?? 0;
    return { ...base, status: "available", used_cu_hours: seconds / 3600, message: null };
  } catch {
    return { ...base, status: "unavailable", used_cu_hours: null, message: "Neon usage could not be reached right now." };
  }
}

export async function getAnalytics(
  repository: AnalyticsRepository,
  env: RuntimeEnv,
  today: string,
): Promise<AnalyticsPayload> {
  const periodStart = addDays(today, -29);
  const [activity, neon] = await Promise.all([
    repository.getAnalytics(periodStart, today),
    getNeonUsage(env, today),
  ]);
  const completed = activity.daily.reduce((total, day) => total + day.completions, 0);
  const { current, best } = streaks(activity.daily);
  return {
    period_days: 30,
    period_start: periodStart,
    period_end: today,
    completed,
    task_completions: activity.daily.reduce((total, day) => total + day.tasks, 0),
    habit_completions: activity.daily.reduce((total, day) => total + day.habits, 0),
    active_days: activity.daily.filter((day) => day.completions > 0).length,
    current_streak: current,
    best_streak: best,
    completed_one_time_tasks: activity.completedOneTimeTasks,
    open_items: activity.openItems,
    daily: activity.daily,
    neon,
  };
}
