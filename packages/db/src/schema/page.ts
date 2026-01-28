import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core"
import { workspaces } from "./workspace"

export const pages = sqliteTable("pages", {
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.workspaceId, table.date] }),
}))
