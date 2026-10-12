CREATE TABLE "item_occurrence_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_occurrence_archives" ADD CONSTRAINT "item_occurrence_archives_item_id_plan_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_occurrence_archives_item_id_date_unique" ON "item_occurrence_archives" USING btree ("item_id","date");--> statement-breakpoint
CREATE INDEX "idx_item_occurrence_archives_date" ON "item_occurrence_archives" USING btree ("date");