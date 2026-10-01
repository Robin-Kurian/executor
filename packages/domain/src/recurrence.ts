import { compareDates, weekdayOf } from "./dates";
import type { Plan, PlanItem } from "./types";

export function itemIsOpen(item: PlanItem): boolean {
  return item.status !== "cancelled" && item.status !== "done";
}

export function itemIsWaiting(item: PlanItem): boolean {
  return item.status === "waiting" || item.type === "waiting";
}

export function recurrenceAppliesOnDate(item: PlanItem, date: string): boolean {
  if (item.recurrence === "none") return false;

  const start = item.start_date;
  if (start && compareDates(date, start) < 0) return false;

  switch (item.recurrence) {
    case "daily":
      return true;
    case "weekdays": {
      const day = weekdayOf(date);
      return day >= 1 && day <= 5;
    }
    case "weekly": {
      const anchor = item.start_date ?? item.created_at.slice(0, 10);
      return weekdayOf(date) === weekdayOf(anchor);
    }
    case "custom":
      return item.recurrence_weekdays.includes(weekdayOf(date));
    default:
      return false;
  }
}

export function itemScheduledOnDate(item: PlanItem, date: string): boolean {
  if (itemIsWaiting(item) || item.status === "cancelled") return false;
  if (item.recurrence !== "none") {
    if (item.status === "done") return false;
    return recurrenceAppliesOnDate(item, date);
  }
  if (item.due_date) return item.due_date === date;
  if (item.start_date) return item.start_date === date;
  return false;
}

export function itemIsOverdueOnDate(item: PlanItem, date: string): boolean {
  if (item.recurrence !== "none") return false;
  if (!item.due_date) return false;
  if (!itemIsOpen(item) || itemIsWaiting(item)) return false;
  return compareDates(item.due_date, date) < 0;
}

export function itemIsUnscheduled(item: PlanItem): boolean {
  if (item.recurrence !== "none") return false;
  if (item.due_date || item.start_date) return false;
  return itemIsOpen(item);
}

export function itemIsWaitingOnDate(item: PlanItem, date: string): boolean {
  if (!itemIsWaiting(item) || item.status === "cancelled") return false;
  if (item.due_date === date || item.start_date === date || item.next_follow_up === date) {
    return true;
  }
  return Boolean(item.due_date && compareDates(item.due_date, date) < 0);
}

export function planVisibleOnToday(plan: Plan, date: string): boolean {
  if (plan.status !== "active") return false;
  if (plan.start_date && compareDates(date, plan.start_date) < 0) return false;
  if (plan.end_date && compareDates(date, plan.end_date) > 0) return false;
  return true;
}

/** Start date for a new repeating item so it shows on every day the plan already covers. */
export function resolveRepeatingStartDate(opts: {
  planStart?: string | null;
  selectedDate?: string | null;
  today: string;
}): string {
  const planStart = opts.planStart;
  if (planStart && compareDates(planStart, opts.today) <= 0) return planStart;
  const selected = opts.selectedDate;
  if (selected && compareDates(selected, opts.today) <= 0) return selected;
  return opts.today;
}
