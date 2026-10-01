# Executor migration report

Generated: 2026-09-30T20:04:29.951Z

Source: `ep-dry-surf-azvfp4c0-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb` (credentials intentionally omitted)

## Pre-migration audit

```json
{
  "identity": "ep-dry-surf-azvfp4c0-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb",
  "generated_at": "2026-09-30T20:04:29.951Z",
  "counts": {
    "plans": 5,
    "plan_items": 16,
    "item_completions": 12,
    "plan_notes": 1
  },
  "plans_by_status": [
    {
      "status": "active",
      "count": 5
    }
  ],
  "items_by_type_status_recurrence": [
    {
      "type": "habit",
      "status": "active",
      "recurrence": "daily",
      "count": 7
    },
    {
      "type": "task",
      "status": "done",
      "recurrence": "none",
      "count": 4
    },
    {
      "type": "task",
      "status": "todo",
      "recurrence": "custom",
      "count": 4
    },
    {
      "type": "task",
      "status": "waiting",
      "recurrence": "none",
      "count": 1
    }
  ],
  "completions": {
    "earliest": "2026-09-18",
    "latest": "2026-09-30",
    "completed": 10,
    "incomplete": 2
  },
  "notes_by_association": {
    "plan_notes": 1,
    "item_notes": 0,
    "dated_notes": 1
  },
  "orphans": {
    "items": 0,
    "completions": 0,
    "plan_notes": 0,
    "item_notes": 0
  },
  "duplicate_completion_keys": 0,
  "invalid_plan_ranges": 0,
  "empty_custom_weekdays": 0,
  "invalid_quantities": 0,
  "schema": [
    {
      "table_name": "item_completions",
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "table_name": "item_completions",
      "column_name": "item_id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "item_completions",
      "column_name": "date",
      "data_type": "date",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "item_completions",
      "column_name": "completed",
      "data_type": "boolean",
      "is_nullable": "NO",
      "column_default": "true"
    },
    {
      "table_name": "item_completions",
      "column_name": "value",
      "data_type": "numeric",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "item_completions",
      "column_name": "note",
      "data_type": "text",
      "is_nullable": "NO",
      "column_default": "''::text"
    },
    {
      "table_name": "item_completions",
      "column_name": "created_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "item_completions",
      "column_name": "updated_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plan_items",
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "table_name": "plan_items",
      "column_name": "plan_id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "title",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "description",
      "data_type": "text",
      "is_nullable": "NO",
      "column_default": "''::text"
    },
    {
      "table_name": "plan_items",
      "column_name": "type",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "'task'::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "priority",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "'medium'::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "status",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "'todo'::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "start_date",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "due_date",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "recurrence",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "'none'::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "recurrence_weekdays",
      "data_type": "ARRAY",
      "is_nullable": "NO",
      "column_default": "'{}'::smallint[]"
    },
    {
      "table_name": "plan_items",
      "column_name": "waiting_on",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "''::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "last_follow_up",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "next_follow_up",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "sort_order",
      "data_type": "integer",
      "is_nullable": "NO",
      "column_default": "0"
    },
    {
      "table_name": "plan_items",
      "column_name": "created_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plan_items",
      "column_name": "updated_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plan_items",
      "column_name": "target_value",
      "data_type": "numeric",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_items",
      "column_name": "unit",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "''::character varying"
    },
    {
      "table_name": "plan_items",
      "column_name": "step_values",
      "data_type": "ARRAY",
      "is_nullable": "NO",
      "column_default": "'{}'::numeric[]"
    },
    {
      "table_name": "plan_notes",
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "table_name": "plan_notes",
      "column_name": "plan_id",
      "data_type": "uuid",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_notes",
      "column_name": "item_id",
      "data_type": "uuid",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_notes",
      "column_name": "date",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plan_notes",
      "column_name": "content",
      "data_type": "text",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "plan_notes",
      "column_name": "created_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plan_notes",
      "column_name": "updated_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plans",
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "table_name": "plans",
      "column_name": "name",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": null
    },
    {
      "table_name": "plans",
      "column_name": "description",
      "data_type": "text",
      "is_nullable": "NO",
      "column_default": "''::text"
    },
    {
      "table_name": "plans",
      "column_name": "icon",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "''::character varying"
    },
    {
      "table_name": "plans",
      "column_name": "color",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "''::character varying"
    },
    {
      "table_name": "plans",
      "column_name": "status",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": "'active'::character varying"
    },
    {
      "table_name": "plans",
      "column_name": "start_date",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plans",
      "column_name": "end_date",
      "data_type": "date",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "table_name": "plans",
      "column_name": "sort_order",
      "data_type": "integer",
      "is_nullable": "NO",
      "column_default": "0"
    },
    {
      "table_name": "plans",
      "column_name": "created_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    },
    {
      "table_name": "plans",
      "column_name": "updated_at",
      "data_type": "timestamp without time zone",
      "is_nullable": "NO",
      "column_default": "now()"
    }
  ],
  "constraints": [
    {
      "table_name": "item_completions",
      "conname": "item_completions_completed_not_null",
      "definition": "NOT NULL completed"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_created_at_not_null",
      "definition": "NOT NULL created_at"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_date_not_null",
      "definition": "NOT NULL date"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_id_not_null",
      "definition": "NOT NULL id"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_item_id_date_key",
      "definition": "UNIQUE (item_id, date)"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_item_id_fkey",
      "definition": "FOREIGN KEY (item_id) REFERENCES plan_items(id) ON DELETE CASCADE"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_item_id_not_null",
      "definition": "NOT NULL item_id"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_note_not_null",
      "definition": "NOT NULL note"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_pkey",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "table_name": "item_completions",
      "conname": "item_completions_updated_at_not_null",
      "definition": "NOT NULL updated_at"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_created_at_not_null",
      "definition": "NOT NULL created_at"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_description_not_null",
      "definition": "NOT NULL description"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_id_not_null",
      "definition": "NOT NULL id"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_pkey",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_plan_id_fkey",
      "definition": "FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_plan_id_not_null",
      "definition": "NOT NULL plan_id"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_priority_check",
      "definition": "CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text])))"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_priority_not_null",
      "definition": "NOT NULL priority"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_recurrence_check",
      "definition": "CHECK (((recurrence)::text = ANY (ARRAY[('none'::character varying)::text, ('daily'::character varying)::text, ('weekdays'::character varying)::text, ('weekly'::character varying)::text, ('custom'::character varying)::text])))"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_recurrence_not_null",
      "definition": "NOT NULL recurrence"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_recurrence_weekdays_not_null",
      "definition": "NOT NULL recurrence_weekdays"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_sort_order_not_null",
      "definition": "NOT NULL sort_order"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_status_check",
      "definition": "CHECK (((status)::text = ANY (ARRAY[('todo'::character varying)::text, ('in_progress'::character varying)::text, ('done'::character varying)::text, ('cancelled'::character varying)::text, ('waiting'::character varying)::text, ('active'::character varying)::text])))"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_status_not_null",
      "definition": "NOT NULL status"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_step_values_not_null",
      "definition": "NOT NULL step_values"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_title_not_null",
      "definition": "NOT NULL title"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_type_check",
      "definition": "CHECK (((type)::text = ANY (ARRAY[('habit'::character varying)::text, ('task'::character varying)::text, ('metric'::character varying)::text, ('note'::character varying)::text, ('waiting'::character varying)::text])))"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_type_not_null",
      "definition": "NOT NULL type"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_unit_not_null",
      "definition": "NOT NULL unit"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_updated_at_not_null",
      "definition": "NOT NULL updated_at"
    },
    {
      "table_name": "plan_items",
      "conname": "plan_items_waiting_on_not_null",
      "definition": "NOT NULL waiting_on"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_content_not_null",
      "definition": "NOT NULL content"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_created_at_not_null",
      "definition": "NOT NULL created_at"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_id_not_null",
      "definition": "NOT NULL id"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_item_id_fkey",
      "definition": "FOREIGN KEY (item_id) REFERENCES plan_items(id) ON DELETE CASCADE"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_pkey",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_plan_id_fkey",
      "definition": "FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE"
    },
    {
      "table_name": "plan_notes",
      "conname": "plan_notes_updated_at_not_null",
      "definition": "NOT NULL updated_at"
    },
    {
      "table_name": "plans",
      "conname": "plans_color_not_null",
      "definition": "NOT NULL color"
    },
    {
      "table_name": "plans",
      "conname": "plans_created_at_not_null",
      "definition": "NOT NULL created_at"
    },
    {
      "table_name": "plans",
      "conname": "plans_description_not_null",
      "definition": "NOT NULL description"
    },
    {
      "table_name": "plans",
      "conname": "plans_icon_not_null",
      "definition": "NOT NULL icon"
    },
    {
      "table_name": "plans",
      "conname": "plans_id_not_null",
      "definition": "NOT NULL id"
    },
    {
      "table_name": "plans",
      "conname": "plans_name_not_null",
      "definition": "NOT NULL name"
    },
    {
      "table_name": "plans",
      "conname": "plans_pkey",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "table_name": "plans",
      "conname": "plans_sort_order_not_null",
      "definition": "NOT NULL sort_order"
    },
    {
      "table_name": "plans",
      "conname": "plans_status_check",
      "definition": "CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('paused'::character varying)::text, ('completed'::character varying)::text, ('archived'::character varying)::text])))"
    },
    {
      "table_name": "plans",
      "conname": "plans_status_not_null",
      "definition": "NOT NULL status"
    },
    {
      "table_name": "plans",
      "conname": "plans_updated_at_not_null",
      "definition": "NOT NULL updated_at"
    }
  ],
  "indexes": [
    {
      "tablename": "item_completions",
      "indexname": "idx_item_completions_date",
      "indexdef": "CREATE INDEX idx_item_completions_date ON public.item_completions USING btree (date)"
    },
    {
      "tablename": "item_completions",
      "indexname": "idx_item_completions_item_id",
      "indexdef": "CREATE INDEX idx_item_completions_item_id ON public.item_completions USING btree (item_id)"
    },
    {
      "tablename": "item_completions",
      "indexname": "item_completions_item_id_date_key",
      "indexdef": "CREATE UNIQUE INDEX item_completions_item_id_date_key ON public.item_completions USING btree (item_id, date)"
    },
    {
      "tablename": "item_completions",
      "indexname": "item_completions_pkey",
      "indexdef": "CREATE UNIQUE INDEX item_completions_pkey ON public.item_completions USING btree (id)"
    },
    {
      "tablename": "plan_items",
      "indexname": "idx_plan_items_due_date",
      "indexdef": "CREATE INDEX idx_plan_items_due_date ON public.plan_items USING btree (due_date)"
    },
    {
      "tablename": "plan_items",
      "indexname": "idx_plan_items_plan_id",
      "indexdef": "CREATE INDEX idx_plan_items_plan_id ON public.plan_items USING btree (plan_id)"
    },
    {
      "tablename": "plan_items",
      "indexname": "idx_plan_items_status",
      "indexdef": "CREATE INDEX idx_plan_items_status ON public.plan_items USING btree (status)"
    },
    {
      "tablename": "plan_items",
      "indexname": "idx_plan_items_type",
      "indexdef": "CREATE INDEX idx_plan_items_type ON public.plan_items USING btree (type)"
    },
    {
      "tablename": "plan_items",
      "indexname": "plan_items_pkey",
      "indexdef": "CREATE UNIQUE INDEX plan_items_pkey ON public.plan_items USING btree (id)"
    },
    {
      "tablename": "plan_notes",
      "indexname": "idx_plan_notes_date",
      "indexdef": "CREATE INDEX idx_plan_notes_date ON public.plan_notes USING btree (date)"
    },
    {
      "tablename": "plan_notes",
      "indexname": "idx_plan_notes_item_id",
      "indexdef": "CREATE INDEX idx_plan_notes_item_id ON public.plan_notes USING btree (item_id)"
    },
    {
      "tablename": "plan_notes",
      "indexname": "idx_plan_notes_plan_id",
      "indexdef": "CREATE INDEX idx_plan_notes_plan_id ON public.plan_notes USING btree (plan_id)"
    },
    {
      "tablename": "plan_notes",
      "indexname": "plan_notes_pkey",
      "indexdef": "CREATE UNIQUE INDEX plan_notes_pkey ON public.plan_notes USING btree (id)"
    },
    {
      "tablename": "plans",
      "indexname": "idx_plans_sort",
      "indexdef": "CREATE INDEX idx_plans_sort ON public.plans USING btree (sort_order, created_at)"
    },
    {
      "tablename": "plans",
      "indexname": "idx_plans_status",
      "indexdef": "CREATE INDEX idx_plans_status ON public.plans USING btree (status)"
    },
    {
      "tablename": "plans",
      "indexname": "plans_pkey",
      "indexdef": "CREATE UNIQUE INDEX plans_pkey ON public.plans USING btree (id)"
    }
  ]
}
```

## Backup and restore

The ignored `apps/api/migration-data/executor-export.json` is an explicit-column logical backup of all four Executor tables. Restore by applying migrations to an empty PostgreSQL database and running `npm run migration:import` with explicit source/target URLs. This restore path was exercised against the initially empty target, then verified with matching counts and full deterministic checksums for all four tables.

## Migration execution

- Source audit/export completed without source writes.
- Target schema migrations completed successfully.
- Transactional import loaded 34 Executor rows in dependency order.
- Source/target verification result: **PASS**.
- Source embedded Executor remains intact and recoverable; no source code or table was removed.
