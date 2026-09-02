import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const printers = pgTable(
  "printers",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    windowsPrinterName: text("windows_printer_name").notNull(),
    connectionType: text("connection_type").notNull().default("USB"),
    status: text("status").notNull().default("Ready"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("printers_active_idx").on(table.isActive)],
);

export const printerPairings = pgTable(
  "printer_pairings",
  {
    id: text("id").primaryKey(),
    printerId: text("printer_id")
      .notNull()
      .references(() => printers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("printer_pairings_token_hash_uidx").on(table.tokenHash),
    index("printer_pairings_printer_idx").on(table.printerId),
  ],
);

export const printJobs = pgTable(
  "print_jobs",
  {
    id: text("id").primaryKey(),
    printerId: text("printer_id")
      .notNull()
      .references(() => printers.id, { onDelete: "restrict" }),
    pairingId: text("pairing_id")
      .notNull()
      .references(() => printerPairings.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    fileKind: text("file_kind").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    tempResourceId: text("temp_resource_id").notNull(),
    tempExtension: text("temp_extension").notNull(),
    failureReason: text("failure_reason"),
    completionSignal: text("completion_signal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    tempDeletedAt: timestamp("temp_deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("print_jobs_printer_idempotency_uidx").on(table.printerId, table.idempotencyKey),
    index("print_jobs_printer_status_idx").on(table.printerId, table.status),
    index("print_jobs_created_at_idx").on(table.createdAt),
  ],
);
