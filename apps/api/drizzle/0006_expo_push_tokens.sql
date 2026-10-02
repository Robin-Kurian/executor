CREATE TABLE "expo_push_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "expo_push_tokens_token_unique" ON "expo_push_tokens" USING btree ("token");
CREATE INDEX "expo_push_tokens_user_id_idx" ON "expo_push_tokens" USING btree ("user_id");
