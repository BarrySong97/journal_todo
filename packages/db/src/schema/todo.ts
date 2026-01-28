import { sqliteTable, text, integer, foreignKey } from "drizzle-orm/sqlite-core"
import { pages } from "./page"

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  pageDate: text("page_date").notNull(),
  text: text("text").notNull(),
  status: text("status", { enum: ["todo", "done"] }).notNull(),
  tags: text("tags", { mode: "json" }).notNull().$type<string[]>(),
  order: text("order").notNull(), // Fractional index for efficient reordering (e.g., "a0", "a0V", "a1")
  level: integer("level").notNull(), // 0 = top level, 1+ = nested levels
  parentId: text("parent_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  pageFk: foreignKey({
    columns: [table.workspaceId, table.pageDate],
    foreignColumns: [pages.workspaceId, pages.date],
  }),
}))
