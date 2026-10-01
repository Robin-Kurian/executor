import { relations, sql } from "drizzle-orm";
import {
  boolean, check, date, index, integer, numeric, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
};

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  icon: varchar("icon", { length: 64 }).notNull().default(""),
  color: varchar("color", { length: 32 }).notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  start_date: date("start_date", { mode: "string" }),
  end_date: date("end_date", { mode: "string" }),
  sort_order: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  check("plans_status_check", sql`${table.status} in ('active','paused','completed','archived')`),
  index("idx_plans_status").on(table.status), index("idx_plans_sort").on(table.sort_order, table.created_at),
]);

export const planItems = pgTable("plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  plan_id: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull().default(""),
  type: varchar("type", { length: 20 }).notNull().default("task"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  start_date: date("start_date", { mode: "string" }), due_date: date("due_date", { mode: "string" }),
  reminder_at: timestamp("reminder_at", { withTimezone: true, mode: "string" }),
  recurrence: varchar("recurrence", { length: 20 }).notNull().default("none"),
  recurrence_weekdays: smallint("recurrence_weekdays").array().notNull().default([]),
  waiting_on: varchar("waiting_on", { length: 255 }).notNull().default(""),
  last_follow_up: date("last_follow_up", { mode: "string" }), next_follow_up: date("next_follow_up", { mode: "string" }),
  target_value: numeric("target_value", { mode: "number" }), unit: varchar("unit", { length: 32 }).notNull().default(""),
  step_values: numeric("step_values", { mode: "number" }).array().notNull().default([]),
  sort_order: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  check("plan_items_type_check", sql`${table.type} in ('habit','task','metric','note','waiting')`),
  check("plan_items_priority_check", sql`${table.priority} in ('low','medium','high')`),
  check("plan_items_status_check", sql`${table.status} in ('todo','in_progress','done','cancelled','waiting','active')`),
  check("plan_items_recurrence_check", sql`${table.recurrence} in ('none','daily','weekdays','weekly','custom')`),
  index("idx_plan_items_plan_id").on(table.plan_id), index("idx_plan_items_due_date").on(table.due_date),
  index("idx_plan_items_reminder_at").on(table.reminder_at),
  index("idx_plan_items_status").on(table.status), index("idx_plan_items_type").on(table.type),
]);

export const itemCompletions = pgTable("item_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id").notNull().references(() => planItems.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(), completed: boolean("completed").notNull().default(true),
  value: numeric("value", { mode: "number" }), note: text("note").notNull().default(""), ...timestamps,
}, (table) => [
  uniqueIndex("item_completions_item_id_date_unique").on(table.item_id, table.date),
  index("idx_item_completions_date").on(table.date), index("idx_item_completions_item_id").on(table.item_id),
]);

export const planNotes = pgTable("plan_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  plan_id: uuid("plan_id").references(() => plans.id, { onDelete: "cascade" }),
  item_id: uuid("item_id").references(() => planItems.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }), content: text("content").notNull(), ...timestamps,
}, (table) => [index("idx_plan_notes_plan_id").on(table.plan_id), index("idx_plan_notes_item_id").on(table.item_id), index("idx_plan_notes_date").on(table.date)]);

export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false), image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("user_email_unique").on(table.email)]);
export const session = pgTable("session", {
  id: text("id").primaryKey(), expiresAt: timestamp("expires_at").notNull(), token: text("token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"), userAgent: text("user_agent"), userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("session_token_unique").on(table.token), index("session_user_id_idx").on(table.userId)]);
export const account = pgTable("account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(), providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }), accessToken: text("access_token"),
  refreshToken: text("refresh_token"), idToken: text("id_token"), accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"), scope: text("scope"), password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [index("account_user_id_idx").on(table.userId)]);
export const verification = pgTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(), expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  user_agent: text("user_agent"),
  expiration_time: timestamp("expiration_time", { withTimezone: true, mode: "string" }),
  last_seen_at: timestamp("last_seen_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
  index("push_subscriptions_user_id_idx").on(table.user_id),
]);

export const pushNotificationRuns = pgTable("push_notification_runs", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(),
  local_date: date("local_date", { mode: "string" }).notNull(),
  delivered: integer("delivered").notNull().default(0),
  removed: integer("removed").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  started_at: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("push_notification_runs_user_date_idx").on(table.user_id, table.local_date),
]);

export const planRelations = relations(plans, ({ many }) => ({ items: many(planItems), notes: many(planNotes) }));
export const itemRelations = relations(planItems, ({ one, many }) => ({
  plan: one(plans, { fields: [planItems.plan_id], references: [plans.id] }), completions: many(itemCompletions), notes: many(planNotes),
}));
export const userRelations = relations(user, ({ many }) => ({ pushSubscriptions: many(pushSubscriptions) }));
export const pushSubscriptionRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(user, { fields: [pushSubscriptions.user_id], references: [user.id] }),
}));
