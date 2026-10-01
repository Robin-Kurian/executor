ALTER TABLE "plan_items" ADD COLUMN "reminder_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_plan_items_reminder_at" ON "plan_items" USING btree ("reminder_at");