import { z } from "@hono/zod-openapi";
import {
  ITEM_PRIORITIES,
  ITEM_STATUSES,
  ITEM_TYPES,
  PLAN_STATUSES,
  RECURRENCE_KINDS,
} from "@executor/domain/types";

export const UuidSchema = z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" });
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}, "Must be a real civil date in YYYY-MM-DD format").openapi({ example: "2026-10-01" });
export const YearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).openapi({ example: "2026-10" });
export const DateTimeSchema = z.string().datetime({ offset: true }).openapi({ example: "2026-10-01T10:30:00.000Z" });

export const ErrorSchema = z.object({
  error: z.string(),
  request_id: z.string().optional(),
}).openapi("Error");

export const PlanSchema = z.object({
  id: UuidSchema,
  name: z.string(), description: z.string(), icon: z.string(), color: z.string(),
  status: z.enum(PLAN_STATUSES), start_date: DateOnlySchema.nullable(), end_date: DateOnlySchema.nullable(),
  sort_order: z.number().int(), created_at: z.string(), updated_at: z.string(),
}).openapi("Plan");

export const PlanItemSchema = z.object({
  id: UuidSchema, plan_id: UuidSchema, title: z.string(), description: z.string(),
  type: z.enum(ITEM_TYPES), priority: z.enum(ITEM_PRIORITIES), status: z.enum(ITEM_STATUSES),
  start_date: DateOnlySchema.nullable(), end_date: DateOnlySchema.nullable(), due_date: DateOnlySchema.nullable(), reminder_at: DateTimeSchema.nullable(),
  recurrence: z.enum(RECURRENCE_KINDS), recurrence_weekdays: z.array(z.number().int().min(0).max(6)),
  waiting_on: z.string(), last_follow_up: DateOnlySchema.nullable(), next_follow_up: DateOnlySchema.nullable(),
  target_value: z.number().nullable(), unit: z.string(), step_values: z.array(z.number()), sort_order: z.number().int(),
  created_at: z.string(), updated_at: z.string(),
}).openapi("PlanItem");

export const CompletionSchema = z.object({
  id: UuidSchema, item_id: UuidSchema, date: DateOnlySchema, completed: z.boolean(), value: z.number().nullable(),
  note: z.string(), created_at: z.string(), updated_at: z.string(),
}).openapi("ItemCompletion");

export const NoteSchema = z.object({
  id: UuidSchema, plan_id: UuidSchema.nullable(), item_id: UuidSchema.nullable(), date: DateOnlySchema.nullable(),
  content: z.string(), created_at: z.string(), updated_at: z.string(),
}).openapi("PlanNote");

const nullableDate = DateOnlySchema.nullable().optional();
const nullableDateTime = DateTimeSchema.nullable().optional();
const itemFields = {
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().optional(),
  type: z.enum(ITEM_TYPES).optional(),
  priority: z.enum(ITEM_PRIORITIES).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  start_date: nullableDate,
  end_date: nullableDate,
  due_date: nullableDate,
  reminder_at: nullableDateTime,
  recurrence: z.enum(RECURRENCE_KINDS).optional(),
  recurrence_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  waiting_on: z.string().optional(),
  last_follow_up: nullableDate,
  next_follow_up: nullableDate,
  target_value: z.number().finite().nullable().optional(),
  unit: z.string().max(32).optional(),
  step_values: z.array(z.number().finite().positive()).optional(),
};

export const CreatePlanSchema = z.object({
  name: z.string().trim().min(1).max(255), description: z.string().optional(), icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(), status: z.enum(PLAN_STATUSES).optional(), start_date: nullableDate, end_date: nullableDate,
});
export const UpdatePlanSchema = CreatePlanSchema.partial().extend({ sort_order: z.number().int().optional() });
export const ReorderPlansSchema = z.object({ plan_ids: z.array(UuidSchema).min(1) }).refine(
  ({ plan_ids }) => new Set(plan_ids).size === plan_ids.length,
  { message: "Each plan can only appear once", path: ["plan_ids"] },
);
export const CreateItemSchema = z.object({ ...itemFields, title: z.string().trim().min(1).max(500) });
export const UpdateItemSchema = z.object({ ...itemFields, plan_id: UuidSchema.optional(), sort_order: z.number().int().optional() });
export const RescheduleOccurrenceSchema = z.object({
  source_date: DateOnlySchema,
  target_date: DateOnlySchema,
  swap_item_id: UuidSchema.optional(),
}).refine(({ source_date, target_date }) => source_date !== target_date, {
  message: "Target date must be different from source date",
  path: ["target_date"],
});
export const RescheduleOccurrenceResultSchema = z.object({
  ok: z.literal(true),
  moved_item_id: UuidSchema,
  swapped_item_id: UuidSchema.nullable(),
});
export const UpsertCompletionSchema = z.object({
  date: DateOnlySchema, completed: z.boolean().default(true), value: z.number().finite().nullable().optional(), note: z.string().optional(),
});
export const UpdateCompletionSchema = z.object({
  completed: z.boolean().optional(), value: z.number().finite().nullable().optional(), note: z.string().optional(),
}).refine((body) => Object.keys(body).length > 0, "At least one field is required");
export const CreateNoteSchema = z.object({
  plan_id: UuidSchema.nullable().optional(), item_id: UuidSchema.nullable().optional(), date: nullableDate,
  content: z.string().trim().min(1),
});
export const UpdateNoteSchema = CreateNoteSchema.partial().refine((body) => Object.keys(body).length > 0, "At least one field is required");

export const IdParamsSchema = z.object({ id: UuidSchema.openapi({ param: { name: "id", in: "path" } }) });
export const TodayQuerySchema = z.object({ date: DateOnlySchema.optional() });
export const CalendarQuerySchema = z.object({ month: YearMonthSchema });
export const PlansQuerySchema = z.object({ include_archived: z.enum(["true", "false"]).optional() });
export const PlanDetailQuerySchema = z.object({ date: DateOnlySchema.optional() });
export const HistoryQuerySchema = z.object({ from: DateOnlySchema.optional(), to: DateOnlySchema.optional() }).refine(
  (value) => (!value.from && !value.to) || Boolean(value.from && value.to), "from and to must be supplied together",
);
export const NotesQuerySchema = z.object({ plan_id: UuidSchema.optional(), item_id: UuidSchema.optional(), date: DateOnlySchema.optional() });

const PushKeySchema = z.string().min(16).max(512).regex(/^[A-Za-z0-9_-]+$/, "Must be base64url encoded");
export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().url().max(4096).refine((value) => value.startsWith("https://"), "Push endpoint must use HTTPS"),
  expirationTime: z.number().nonnegative().nullable().optional(),
  keys: z.object({ p256dh: PushKeySchema, auth: PushKeySchema }),
});
export const CreatePushSubscriptionSchema = z.object({ subscription: PushSubscriptionInputSchema });
export const DeletePushSubscriptionSchema = z.object({ endpoint: z.string().url().max(4096) });
export const PushSubscriptionResultSchema = z.object({ ok: z.boolean(), subscription_id: UuidSchema.optional() });
export const PushTestResultSchema = z.object({ delivered: z.number().int().nonnegative(), removed: z.number().int().nonnegative(), failed: z.number().int().nonnegative() });
export const ExpoPushTokenSchema = z.string().regex(/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/, "Must be an Expo push token");
export const CreateExpoPushTokenSchema = z.object({ token: ExpoPushTokenSchema });
export const DeleteExpoPushTokenSchema = z.object({ token: ExpoPushTokenSchema });

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;
