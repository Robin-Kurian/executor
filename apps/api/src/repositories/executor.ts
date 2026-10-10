import { and, asc, desc, eq, gte, inArray, lte, ne, notInArray, or, sql } from "drizzle-orm";
import type {
  ItemCompletion, ItemPriority, ItemStatus, ItemType, Plan, PlanItem, PlanNote, PlanStatus, RecurrenceKind, ScheduleOverride,
} from "@executor/domain";
import { isQuantityItem, nextQuantityState } from "@executor/domain";
import type { CreateItemInput, CreatePlanInput, UpdateItemInput, UpdatePlanInput } from "@executor/contracts";
import type { Database } from "../db/client";
import { itemCompletions, planItems, planNotes, plans, scheduleOverrides } from "../db/schema";

type PlanRow = typeof plans.$inferSelect;
type ItemRow = typeof planItems.$inferSelect;
type CompletionRow = typeof itemCompletions.$inferSelect;
type NoteRow = typeof planNotes.$inferSelect;
type ScheduleOverrideRow = typeof scheduleOverrides.$inferSelect;

const iso = (value: string | Date) => value instanceof Date ? value.toISOString() : new Date(`${value}Z`).toISOString();
const mapPlan = (row: PlanRow): Plan => ({
  ...row, status: row.status as PlanStatus, created_at: iso(row.created_at), updated_at: iso(row.updated_at),
});
const mapItem = (row: ItemRow): PlanItem => ({
  ...row, type: row.type as ItemType, priority: row.priority as ItemPriority, status: row.status as ItemStatus,
  recurrence: row.recurrence as RecurrenceKind, target_value: row.target_value == null ? null : Number(row.target_value),
  reminder_at: row.reminder_at ? new Date(row.reminder_at).toISOString() : null,
  step_values: row.step_values.map(Number), created_at: iso(row.created_at), updated_at: iso(row.updated_at),
});
const mapCompletion = (row: CompletionRow): ItemCompletion => ({
  ...row, value: row.value == null ? null : Number(row.value), created_at: iso(row.created_at), updated_at: iso(row.updated_at),
});
const mapNote = (row: NoteRow): PlanNote => ({ ...row, created_at: iso(row.created_at), updated_at: iso(row.updated_at) });
const mapScheduleOverride = (row: ScheduleOverrideRow): ScheduleOverride => ({
  ...row, created_at: iso(row.created_at), updated_at: iso(row.updated_at),
});

function defaultStatus(type: ItemType, status?: ItemStatus): ItemStatus {
  if (status) return status;
  if (type === "habit" || type === "metric") return "active";
  if (type === "waiting") return "waiting";
  return "todo";
}
function defaultRecurrence(type: ItemType, recurrence?: RecurrenceKind): RecurrenceKind {
  if (recurrence) return recurrence;
  return type === "habit" || type === "metric" ? "daily" : "none";
}
function validateItemDates(startDate: string | null, endDate: string | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw Object.assign(new Error("End date must be on or after start date"), { status: 400 });
  }
}

export class ExecutorRepository {
  constructor(private readonly db: Database) {}

  async ping(): Promise<void> { await this.db.execute(sql`select 1`); }

  async listPlans(includeArchived = false): Promise<Plan[]> {
    const rows = includeArchived
      ? await this.db.select().from(plans).orderBy(asc(plans.sort_order), asc(plans.created_at))
      : await this.db.select().from(plans).where(ne(plans.status, "archived")).orderBy(asc(plans.sort_order), asc(plans.created_at));
    return rows.map(mapPlan);
  }
  async getPlan(id: string): Promise<Plan | null> {
    const [row] = await this.db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return row ? mapPlan(row) : null;
  }
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    const [row] = await this.db.insert(plans).values({
      name: input.name.trim(), description: input.description?.trim() ?? "", icon: input.icon?.trim() ?? "",
      color: input.color?.trim() ?? "", status: input.status ?? "active", start_date: input.start_date ?? null, end_date: input.end_date ?? null,
    }).returning();
    if (!row) throw new Error("Plan insert failed");
    return mapPlan(row);
  }
  async updatePlan(id: string, input: UpdatePlanInput): Promise<Plan | null> {
    const current = await this.getPlan(id); if (!current) return null;
    const [row] = await this.db.update(plans).set({
      name: input.name?.trim() ?? current.name, description: input.description?.trim() ?? current.description,
      icon: input.icon?.trim() ?? current.icon, color: input.color?.trim() ?? current.color, status: input.status ?? current.status,
      start_date: input.start_date === undefined ? current.start_date : input.start_date,
      end_date: input.end_date === undefined ? current.end_date : input.end_date,
      sort_order: input.sort_order ?? current.sort_order, updated_at: sql`now()`,
    }).where(eq(plans.id, id)).returning();
    return row ? mapPlan(row) : null;
  }
  async reorderPlans(planIds: string[]): Promise<void> {
    const existing = await this.db.select({ id: plans.id }).from(plans).orderBy(asc(plans.sort_order), asc(plans.created_at));
    const knownIds = new Set(existing.map(({ id }) => id));
    if (!planIds.every((id) => knownIds.has(id))) {
      throw Object.assign(new Error("Plan order contains an unknown plan"), { status: 400 });
    }
    const order = [...planIds, ...existing.map(({ id }) => id).filter((id) => !planIds.includes(id))];
    const updates = order.map((id, sort_order) =>
      this.db.update(plans).set({ sort_order, updated_at: sql`now()` }).where(eq(plans.id, id)),
    );
    await this.db.batch(updates as [typeof updates[number], ...typeof updates]);
  }
  async deletePlan(id: string): Promise<boolean> {
    return (await this.db.delete(plans).where(eq(plans.id, id)).returning({ id: plans.id })).length > 0;
  }

  async listItems(planId?: string): Promise<PlanItem[]> {
    const rows = planId
      ? await this.db.select().from(planItems).where(eq(planItems.plan_id, planId)).orderBy(asc(planItems.sort_order), asc(planItems.created_at))
      : await this.db.select().from(planItems).orderBy(asc(planItems.sort_order), asc(planItems.created_at));
    return rows.map(mapItem);
  }
  async listActivePlanItems(): Promise<PlanItem[]> {
    const rows = await this.db.select({ item: planItems }).from(planItems).innerJoin(plans, eq(planItems.plan_id, plans.id))
      .where(eq(plans.status, "active")).orderBy(asc(plans.sort_order), asc(planItems.sort_order), asc(planItems.created_at));
    return rows.map(({ item }) => mapItem(item));
  }
  async listTrackableItems(): Promise<PlanItem[]> {
    const rows = await this.db.select({ item: planItems }).from(planItems).innerJoin(plans, eq(planItems.plan_id, plans.id))
      .where(ne(plans.status, "archived")).orderBy(asc(plans.sort_order), asc(planItems.sort_order), asc(planItems.created_at));
    return rows.map(({ item }) => mapItem(item));
  }
  async getItem(id: string): Promise<PlanItem | null> {
    const [row] = await this.db.select().from(planItems).where(eq(planItems.id, id)).limit(1);
    return row ? mapItem(row) : null;
  }
  async createItem(planId: string, input: CreateItemInput): Promise<PlanItem> {
    if (!await this.getPlan(planId)) throw Object.assign(new Error("Plan not found"), { status: 404 });
    const type = input.type ?? "task";
    validateItemDates(input.start_date ?? null, input.end_date ?? null);
    const [row] = await this.db.insert(planItems).values({
      plan_id: planId, title: input.title.trim(), description: input.description?.trim() ?? "", type,
      priority: input.priority ?? "medium", status: defaultStatus(type, input.status), start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      due_date: input.due_date ?? null, reminder_at: input.reminder_at ?? null, recurrence: defaultRecurrence(type, input.recurrence),
      recurrence_weekdays: input.recurrence_weekdays ?? [], waiting_on: input.waiting_on?.trim() ?? "",
      last_follow_up: input.last_follow_up ?? null, next_follow_up: input.next_follow_up ?? null,
      target_value: input.target_value ?? null, unit: input.unit?.trim() ?? "", step_values: input.step_values ?? [],
    }).returning();
    if (!row) throw new Error("Item insert failed"); return mapItem(row);
  }
  async updateItem(id: string, input: UpdateItemInput): Promise<PlanItem | null> {
    const current = await this.getItem(id); if (!current) return null;
    if (input.plan_id && input.plan_id !== current.plan_id && !await this.getPlan(input.plan_id)) {
      throw Object.assign(new Error("Plan not found"), { status: 404 });
    }
    validateItemDates(
      input.start_date === undefined ? current.start_date : input.start_date,
      input.end_date === undefined ? current.end_date : input.end_date,
    );
    const [row] = await this.db.update(planItems).set({
      plan_id: input.plan_id ?? current.plan_id, title: input.title?.trim() ?? current.title,
      description: input.description?.trim() ?? current.description, type: input.type ?? current.type,
      priority: input.priority ?? current.priority, status: input.status ?? current.status,
      start_date: input.start_date === undefined ? current.start_date : input.start_date,
      end_date: input.end_date === undefined ? current.end_date : input.end_date,
      due_date: input.due_date === undefined ? current.due_date : input.due_date,
      reminder_at: input.reminder_at === undefined ? current.reminder_at : input.reminder_at,
      recurrence: input.recurrence ?? current.recurrence, recurrence_weekdays: input.recurrence_weekdays ?? current.recurrence_weekdays,
      waiting_on: input.waiting_on?.trim() ?? current.waiting_on,
      last_follow_up: input.last_follow_up === undefined ? current.last_follow_up : input.last_follow_up,
      next_follow_up: input.next_follow_up === undefined ? current.next_follow_up : input.next_follow_up,
      target_value: input.target_value === undefined ? current.target_value : input.target_value,
      unit: input.unit?.trim() ?? current.unit, step_values: input.step_values ?? current.step_values,
      sort_order: input.sort_order ?? current.sort_order, updated_at: sql`now()`,
    }).where(eq(planItems.id, id)).returning();
    return row ? mapItem(row) : null;
  }
  async deleteItem(id: string): Promise<boolean> {
    return (await this.db.delete(planItems).where(eq(planItems.id, id)).returning({ id: planItems.id })).length > 0;
  }

  async listScheduleOverridesInRange(from: string, to: string): Promise<ScheduleOverride[]> {
    const rows = await this.db.select().from(scheduleOverrides).where(or(
      and(gte(scheduleOverrides.original_date, from), lte(scheduleOverrides.original_date, to)),
      and(gte(scheduleOverrides.scheduled_date, from), lte(scheduleOverrides.scheduled_date, to)),
    )).limit(4000);
    return rows.map(mapScheduleOverride);
  }

  async saveScheduleOverrides(
    rows: { item_id: string; original_date: string; scheduled_date: string }[],
  ): Promise<ScheduleOverride[]> {
    if (!rows.length) return [];
    const saved = await this.db.insert(scheduleOverrides).values(rows).onConflictDoUpdate({
      target: [scheduleOverrides.item_id, scheduleOverrides.original_date],
      set: { scheduled_date: sql`excluded.scheduled_date`, updated_at: sql`now()` },
    }).returning();
    return saved.map(mapScheduleOverride);
  }

  async listDueReminderItems(from: string, through: string): Promise<PlanItem[]> {
    const rows = await this.db.select({ item: planItems }).from(planItems).innerJoin(plans, eq(planItems.plan_id, plans.id)).where(and(
      eq(plans.status, "active"),
      notInArray(planItems.status, ["done", "cancelled"]),
      gte(planItems.reminder_at, from),
      lte(planItems.reminder_at, through),
    )).orderBy(asc(planItems.reminder_at)).limit(100);
    return rows.map(({ item }) => mapItem(item));
  }

  async listCompletionsForDate(date: string, itemIds?: string[]): Promise<ItemCompletion[]> {
    const where = itemIds?.length ? and(eq(itemCompletions.date, date), inArray(itemCompletions.item_id, itemIds)) : eq(itemCompletions.date, date);
    return (await this.db.select().from(itemCompletions).where(where)).map(mapCompletion);
  }
  async listCompletionsInRange(from: string, to: string): Promise<ItemCompletion[]> {
    return (await this.db.select().from(itemCompletions).where(and(gte(itemCompletions.date, from), lte(itemCompletions.date, to))).limit(4000)).map(mapCompletion);
  }
  async listLatestCompletedCompletionsThrough(to: string): Promise<ItemCompletion[]> {
    const rows = await this.db.selectDistinctOn([itemCompletions.item_id]).from(itemCompletions)
      .where(and(eq(itemCompletions.completed, true), lte(itemCompletions.date, to)))
      .orderBy(itemCompletions.item_id, desc(itemCompletions.date));
    return rows.map(mapCompletion);
  }
  async listCompletionsForItem(itemId: string, from?: string, to?: string): Promise<ItemCompletion[]> {
    const base = and(eq(itemCompletions.item_id, itemId), from ? gte(itemCompletions.date, from) : undefined, to ? lte(itemCompletions.date, to) : undefined);
    return (await this.db.select().from(itemCompletions).where(base).orderBy(desc(itemCompletions.date)).limit(from && to ? 4000 : 180)).map(mapCompletion);
  }
  async getCompletion(id: string): Promise<ItemCompletion | null> {
    const [row] = await this.db.select().from(itemCompletions).where(eq(itemCompletions.id, id)).limit(1);
    return row ? mapCompletion(row) : null;
  }
  private resolvedCompletion(item: PlanItem, input: { completed: boolean; value?: number | null }) {
    if (!isQuantityItem(item)) return { completed: input.completed, value: input.value };
    if (typeof input.value === "number" && Number.isFinite(input.value)) return nextQuantityState(item, input.value);
    return input.completed ? nextQuantityState(item, item.target_value ?? 0) : { completed: false, value: 0 };
  }
  private async syncTaskStatus(item: PlanItem, completed: boolean): Promise<void> {
    if (item.recurrence !== "none" || item.type === "habit" || item.type === "metric" || item.status === "waiting" || item.status === "cancelled") return;
    if (completed && item.status !== "done") await this.updateItem(item.id, { status: "done" });
    else if (!completed && item.status === "done") await this.updateItem(item.id, { status: "todo" });
  }
  async upsertCompletion(input: { item_id: string; date: string; completed: boolean; value?: number | null; note?: string }): Promise<ItemCompletion> {
    const item = await this.getItem(input.item_id); if (!item) throw Object.assign(new Error("Item not found"), { status: 404 });
    const resolved = this.resolvedCompletion(item, input);
    const [row] = await this.db.insert(itemCompletions).values({
      item_id: input.item_id, date: input.date, completed: resolved.completed, value: resolved.value ?? null, note: input.note?.trim() ?? "",
    }).onConflictDoUpdate({ target: [itemCompletions.item_id, itemCompletions.date], set: {
      completed: resolved.completed,
      value: sql`coalesce(excluded.value, ${itemCompletions.value})`,
      note: sql`case when excluded.note = '' then ${itemCompletions.note} else excluded.note end`, updated_at: sql`now()`,
    }}).returning();
    if (!row) throw new Error("Completion upsert failed"); await this.syncTaskStatus(item, resolved.completed); return mapCompletion(row);
  }
  async updateCompletion(id: string, input: { completed?: boolean; value?: number | null; note?: string }): Promise<ItemCompletion | null> {
    const current = await this.getCompletion(id); if (!current) return null;
    const item = await this.getItem(current.item_id);
    const resolved = item ? this.resolvedCompletion(item, { completed: input.completed ?? current.completed, value: input.value === undefined ? current.value : input.value })
      : { completed: input.completed ?? current.completed, value: input.value === undefined ? current.value : input.value };
    const [row] = await this.db.update(itemCompletions).set({ completed: resolved.completed, value: resolved.value,
      note: input.note?.trim() ?? current.note, updated_at: sql`now()` }).where(eq(itemCompletions.id, id)).returning();
    if (item) await this.syncTaskStatus(item, resolved.completed); return row ? mapCompletion(row) : null;
  }
  async deleteCompletion(id: string): Promise<boolean> {
    const current = await this.getCompletion(id); if (!current) return false;
    await this.db.delete(itemCompletions).where(eq(itemCompletions.id, id));
    const item = await this.getItem(current.item_id); if (item) await this.syncTaskStatus(item, false); return true;
  }

  async listNotes(filters: { plan_id?: string; item_id?: string; date?: string }): Promise<PlanNote[]> {
    const rows = await this.db.select().from(planNotes).where(and(
      filters.plan_id ? eq(planNotes.plan_id, filters.plan_id) : undefined,
      filters.item_id ? eq(planNotes.item_id, filters.item_id) : undefined,
      filters.date ? eq(planNotes.date, filters.date) : undefined,
    )).orderBy(desc(planNotes.created_at)); return rows.map(mapNote);
  }
  async createNote(input: { plan_id?: string | null; item_id?: string | null; date?: string | null; content: string }): Promise<PlanNote> {
    const [row] = await this.db.insert(planNotes).values({ plan_id: input.plan_id ?? null, item_id: input.item_id ?? null,
      date: input.date ?? null, content: input.content.trim() }).returning();
    if (!row) throw new Error("Note insert failed"); return mapNote(row);
  }
  async updateNote(id: string, input: { plan_id?: string | null; item_id?: string | null; date?: string | null; content?: string }): Promise<PlanNote | null> {
    const [current] = await this.db.select().from(planNotes).where(eq(planNotes.id, id)).limit(1); if (!current) return null;
    const [row] = await this.db.update(planNotes).set({ plan_id: input.plan_id === undefined ? current.plan_id : input.plan_id,
      item_id: input.item_id === undefined ? current.item_id : input.item_id, date: input.date === undefined ? current.date : input.date,
      content: input.content?.trim() ?? current.content, updated_at: sql`now()` }).where(eq(planNotes.id, id)).returning();
    return row ? mapNote(row) : null;
  }
  async deleteNote(id: string): Promise<boolean> {
    return (await this.db.delete(planNotes).where(eq(planNotes.id, id)).returning({ id: planNotes.id })).length > 0;
  }
}
