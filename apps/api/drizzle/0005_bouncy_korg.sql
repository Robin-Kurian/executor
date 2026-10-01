ALTER TABLE "user" ADD COLUMN "role" varchar(20) DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" in ('member', 'admin'));
