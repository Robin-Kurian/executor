CREATE TABLE "schedule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"original_date" date NOT NULL,
	"scheduled_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_item_id_plan_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_overrides_item_original_unique" ON "schedule_overrides" USING btree ("item_id","original_date");--> statement-breakpoint
CREATE INDEX "idx_schedule_overrides_original_date" ON "schedule_overrides" USING btree ("original_date");--> statement-breakpoint
CREATE INDEX "idx_schedule_overrides_scheduled_date" ON "schedule_overrides" USING btree ("scheduled_date");
