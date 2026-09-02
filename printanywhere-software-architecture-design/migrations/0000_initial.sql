CREATE TABLE IF NOT EXISTS "printers" (
  "id" text PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "windows_printer_name" text NOT NULL,
  "connection_type" text DEFAULT 'USB' NOT NULL,
  "status" text DEFAULT 'Ready' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "printers_active_idx" ON "printers" USING btree ("is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "printer_pairings" (
  "id" text PRIMARY KEY NOT NULL,
  "printer_id" text NOT NULL REFERENCES "printers"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_used_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "printer_pairings_token_hash_uidx" ON "printer_pairings" USING btree ("token_hash");
CREATE INDEX IF NOT EXISTS "printer_pairings_printer_idx" ON "printer_pairings" USING btree ("printer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "print_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "printer_id" text NOT NULL REFERENCES "printers"("id") ON DELETE RESTRICT,
  "pairing_id" text NOT NULL REFERENCES "printer_pairings"("id") ON DELETE RESTRICT,
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL,
  "file_kind" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "temp_resource_id" text NOT NULL,
  "temp_extension" text NOT NULL,
  "failure_reason" text,
  "completion_signal" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  "temp_deleted_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "print_jobs_printer_idempotency_uidx" ON "print_jobs" USING btree ("printer_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "print_jobs_printer_status_idx" ON "print_jobs" USING btree ("printer_id", "status");
CREATE INDEX IF NOT EXISTS "print_jobs_created_at_idx" ON "print_jobs" USING btree ("created_at");