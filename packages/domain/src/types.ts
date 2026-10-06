export const PLAN_STATUSES = [
  "active",
  "paused",
  "completed",
  "archived",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ITEM_TYPES = [
  "habit",
  "task",
  "metric",
  "note",
  "waiting",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_PRIORITIES = ["low", "medium", "high"] as const;
export type ItemPriority = (typeof ITEM_PRIORITIES)[number];

export const ITEM_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
  "waiting",
  "active",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const RECURRENCE_KINDS = [
  "none",
  "daily",
  "weekdays",
  "weekly",
  "custom",
] as const;
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

export type Plan = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: PlanStatus;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlanItem = {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  type: ItemType;
  priority: ItemPriority;
  status: ItemStatus;
  start_date: string | null;
  due_date: string | null;
  reminder_at: string | null;
  recurrence: RecurrenceKind;
  recurrence_weekdays: number[];
  waiting_on: string;
  last_follow_up: string | null;
  next_follow_up: string | null;
  target_value: number | null;
  unit: string;
  step_values: number[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ItemCompletion = {
  id: string;
  item_id: string;
  date: string;
  completed: boolean;
  value: number | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type PlanNote = {
  id: string;
  plan_id: string | null;
  item_id: string | null;
  date: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type PlanDayProgress = {
  current: number;
  total: number;
};

export type TodayItem = PlanItem & {
  completed: boolean;
  value: number | null;
  completion_id: string | null;
  completion_date: string | null;
  completion_note: string;
};

export type MissedTodayItem = TodayItem & {
  missed_date: string;
  last_completed_date: string | null;
  consecutive_misses: number;
  is_stale: boolean;
};

export type PlanDetailPayload = Plan & {
  items: TodayItem[];
  completed_item_ids: string[];
};

export type TodayPlanGroup = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: PlanStatus;
  start_date: string | null;
  end_date: string | null;
  day_progress: PlanDayProgress | null;
  progress: { completed: number; total: number };
  habits: TodayItem[];
  missed: MissedTodayItem[];
  tasks: TodayItem[];
};

export type TodayPayload = {
  date: string;
  plans: TodayPlanGroup[];
  overdue: TodayItem[];
  waiting: TodayItem[];
};

export type CalendarDay = {
  date: string;
  completed: number;
  total: number;
};

export type CreatePlanInput = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: PlanStatus;
  start_date?: string | null;
  end_date?: string | null;
};

export type UpdatePlanInput = Partial<CreatePlanInput> & {
  sort_order?: number;
};

export type CreateItemInput = {
  title: string;
  description?: string;
  type?: ItemType;
  priority?: ItemPriority;
  status?: ItemStatus;
  start_date?: string | null;
  due_date?: string | null;
  reminder_at?: string | null;
  recurrence?: RecurrenceKind;
  recurrence_weekdays?: number[];
  waiting_on?: string;
  last_follow_up?: string | null;
  next_follow_up?: string | null;
  target_value?: number | null;
  unit?: string;
  step_values?: number[];
};

export type UpdateItemInput = Partial<CreateItemInput> & {
  plan_id?: string;
  sort_order?: number;
};
