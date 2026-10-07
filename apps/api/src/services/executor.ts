import {
  addDays, daysInclusive, itemIsOverdueOnDate, itemIsUnscheduled, itemIsWaiting, itemIsWaitingOnDate,
  itemScheduledOnDateWithOverrides, monthBounds, originalOccurrenceDate, planDayProgress, planVisibleOnToday,
} from "@executor/domain";
import type { CalendarDay, ItemCompletion, Plan, PlanItem, ScheduleOverride, TodayItem, TodayPayload, TodayPlanGroup } from "@executor/domain";
import type { ExecutorRepository } from "../repositories/executor";

type TodayRepository = Pick<
  ExecutorRepository,
  "listPlans" | "listActivePlanItems" | "listCompletionsInRange" | "listLatestCompletedCompletionsThrough" | "listScheduleOverridesInRange"
>;
type CalendarRepository = Pick<
  ExecutorRepository,
  "listPlans" | "listTrackableItems" | "listCompletionsInRange" | "listScheduleOverridesInRange"
>;
type RescheduleRepository = Pick<
  ExecutorRepository,
  "getItem" | "listScheduleOverridesInRange" | "listCompletionsForDate" | "saveScheduleOverrides"
>;

export const toTodayItem = (item: PlanItem, completion?: ItemCompletion, occurrenceDate?: string): TodayItem => ({
  ...item,
  completed: completion?.completed ?? (!occurrenceDate && item.recurrence === "none" && item.status === "done"),
  value: completion?.value ?? null, completion_id: completion?.id ?? null,
  completion_date: completion?.date ?? null, completion_note: completion?.note ?? "",
});

const MISSED_HISTORY_DAYS = 28;
const RECENT_MISS_VISIBILITY_DAYS = 6;
const STALE_CONSECUTIVE_MISSES = 3;

export async function getToday(repo: TodayRepository, date: string, actualDate = date): Promise<TodayPayload> {
  const includeMissed = date === actualDate;
  const missedLookbackStart = includeMissed ? addDays(date, -MISSED_HISTORY_DAYS) : date;
  const [allPlans, items, completions, latestCompleted, scheduleOverrides] = await Promise.all([
    repo.listPlans(false),
    repo.listActivePlanItems(),
    repo.listCompletionsInRange(missedLookbackStart, date),
    includeMissed ? repo.listLatestCompletedCompletionsThrough(date) : Promise.resolve([]),
    repo.listScheduleOverridesInRange(missedLookbackStart, date),
  ]);
  const completionByDateAndItem = new Map(completions.map((row) => [`${row.date}:${row.item_id}`, row]));
  const latestCompletionByItem = new Map(latestCompleted.map((row) => [row.item_id, row]));
  const completionFor = (itemId: string, completionDate: string) =>
    completionByDateAndItem.get(`${completionDate}:${itemId}`);
  const plansById = new Map(allPlans.filter((plan) => planVisibleOnToday(plan, date)).map((plan) => [plan.id, plan]));
  const groups = new Map<string, TodayPlanGroup>();
  for (const plan of plansById.values()) groups.set(plan.id, {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    icon: plan.icon,
    color: plan.color,
    status: plan.status,
    start_date: plan.start_date,
    end_date: plan.end_date,
    day_progress: planDayProgress(plan.start_date, plan.end_date, date),
    progress: { completed: 0, total: 0 },
    habits: [],
    missed: [],
    tasks: [],
  });
  const overdue: TodayItem[] = []; const waiting: TodayItem[] = [];
  for (const item of items) {
    const plan = plansById.get(item.plan_id); if (!plan) continue;
    const group = groups.get(plan.id); if (!group) continue;
    const currentCompletion = completionFor(item.id, date);
    let missedDate: string | null = null;
    let consecutiveMisses = 0;
    if (includeMissed && item.recurrence !== "none" && !currentCompletion?.completed) {
      for (let daysAgo = 1; daysAgo <= MISSED_HISTORY_DAYS; daysAgo++) {
        const candidate = addDays(date, -daysAgo);
        if (planVisibleOnToday(plan, candidate) && itemScheduledOnDateWithOverrides(item, candidate, scheduleOverrides)) {
          if (completionFor(item.id, candidate)?.completed) break;
          missedDate ??= candidate;
          consecutiveMisses += 1;
        }
      }
    }
    const missedIsRecent = missedDate && missedDate >= addDays(date, -RECENT_MISS_VISIBILITY_DAYS);
    const habitIsStale = consecutiveMisses >= STALE_CONSECUTIVE_MISSES;
    if (missedDate && (missedIsRecent || habitIsStale)) {
      group.missed.push({
        ...toTodayItem(item, undefined, missedDate),
        missed_date: missedDate,
        last_completed_date: latestCompletionByItem.get(item.id)?.date ?? null,
        consecutive_misses: consecutiveMisses,
        is_stale: habitIsStale,
      });
    }
    const next = toTodayItem(item, currentCompletion, date);
    if (itemIsWaiting(item)) { if (itemIsWaitingOnDate(item, date)) waiting.push(next); continue; }
    if (itemIsOverdueOnDate(item, date)) { overdue.push(next); continue; }
    if (!itemScheduledOnDateWithOverrides(item, date, scheduleOverrides) && !currentCompletion?.completed) continue;
    if (item.type === "habit" || item.type === "metric" || item.recurrence !== "none") group.habits.push(next); else group.tasks.push(next);
  }
  const visible: TodayPlanGroup[] = [];
  for (const group of groups.values()) {
    const actionable = [...group.habits, ...group.tasks]; if (!actionable.length && !group.missed.length) continue;
    group.progress = { completed: actionable.filter((item) => item.completed).length, total: actionable.length }; visible.push(group);
  }
  const rank = { high: 0, medium: 1, low: 2 };
  overdue.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)); waiting.sort((a, b) => a.title.localeCompare(b.title));
  return { date, plans: visible, overdue, waiting };
}

export async function getInbox(repo: ExecutorRepository): Promise<TodayItem[]> {
  return (await repo.listActivePlanItems()).filter(itemIsUnscheduled).map((item) => toTodayItem(item));
}

function counted(plan: Plan, date: string) {
  if (plan.status === "archived" || plan.status === "paused") return false;
  if (plan.status === "completed") return (!plan.start_date || date >= plan.start_date) && (!plan.end_date || date <= plan.end_date);
  return planVisibleOnToday(plan, date);
}
export async function getCalendar(repo: CalendarRepository, month: string): Promise<{ month: string; days: CalendarDay[] }> {
  const { start, end } = monthBounds(month);
  const [allPlans, items, completions, scheduleOverrides] = await Promise.all([
    repo.listPlans(true), repo.listTrackableItems(), repo.listCompletionsInRange(start, end), repo.listScheduleOverridesInRange(start, end),
  ]);
  const completedByDate = new Map<string, Set<string>>();
  for (const row of completions) if (row.completed) { const set = completedByDate.get(row.date) ?? new Set<string>(); set.add(row.item_id); completedByDate.set(row.date, set); }
  const planById = new Map(allPlans.map((plan) => [plan.id, plan])); const days: CalendarDay[] = [];
  for (let offset = 0; offset < daysInclusive(start, end); offset++) {
    const date = addDays(start, offset); const completed = completedByDate.get(date) ?? new Set<string>();
    const applicable = items.filter((item) => { const plan = planById.get(item.plan_id); return Boolean(plan && counted(plan, date) && (itemScheduledOnDateWithOverrides(item, date, scheduleOverrides) || completed.has(item.id))); });
    days.push({ date, total: applicable.length, completed: applicable.filter((item) => completed.has(item.id)).length });
  }
  return { month, days };
}

function badRequest(message: string, status: 400 | 404 | 409 = 400): Error {
  return Object.assign(new Error(message), { status });
}

function ensureMovableOccurrence(
  item: PlanItem,
  date: string,
  overrides: ScheduleOverride[],
  label: string,
) {
  if (item.recurrence === "none") throw badRequest(`${label} must be a repeating item`);
  if (!itemScheduledOnDateWithOverrides(item, date, overrides)) {
    throw badRequest(`${label} is not scheduled on ${date}`, 409);
  }
}

export async function rescheduleOccurrence(
  repo: RescheduleRepository,
  itemId: string,
  input: { source_date: string; target_date: string; swap_item_id?: string },
): Promise<{ ok: true; moved_item_id: string; swapped_item_id: string | null }> {
  const from = input.source_date < input.target_date ? input.source_date : input.target_date;
  const to = input.source_date > input.target_date ? input.source_date : input.target_date;
  const [item, swapItem, overrides, sourceCompletions, targetCompletions] = await Promise.all([
    repo.getItem(itemId),
    input.swap_item_id ? repo.getItem(input.swap_item_id) : Promise.resolve(null),
    repo.listScheduleOverridesInRange(from, to),
    repo.listCompletionsForDate(input.source_date),
    repo.listCompletionsForDate(input.target_date),
  ]);
  if (!item) throw badRequest("Item not found", 404);
  ensureMovableOccurrence(item, input.source_date, overrides, "Item");
  if (sourceCompletions.some((completion) => completion.item_id === item.id && completion.completed)) {
    throw badRequest("A completed occurrence cannot be moved", 409);
  }
  if (itemScheduledOnDateWithOverrides(item, input.target_date, overrides)) {
    throw badRequest("This item already has an occurrence on the target date", 409);
  }

  const rows = [{
    item_id: item.id,
    original_date: originalOccurrenceDate(item, input.source_date, overrides),
    scheduled_date: input.target_date,
  }];

  if (input.swap_item_id) {
    if (!swapItem) throw badRequest("Exchange item not found", 404);
    if (swapItem.id === item.id) throw badRequest("An occurrence cannot be exchanged with itself");
    if (swapItem.plan_id !== item.plan_id) throw badRequest("Occurrences must belong to the same plan");
    ensureMovableOccurrence(swapItem, input.target_date, overrides, "Exchange item");
    if (targetCompletions.some((completion) => completion.item_id === swapItem.id && completion.completed)) {
      throw badRequest("A completed occurrence cannot be exchanged", 409);
    }
    if (itemScheduledOnDateWithOverrides(swapItem, input.source_date, overrides)) {
      throw badRequest("The exchange item already has an occurrence on the source date", 409);
    }
    rows.push({
      item_id: swapItem.id,
      original_date: originalOccurrenceDate(swapItem, input.target_date, overrides),
      scheduled_date: input.source_date,
    });
  }

  await repo.saveScheduleOverrides(rows);
  return { ok: true, moved_item_id: item.id, swapped_item_id: swapItem?.id ?? null };
}
