import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const importantItems = sqliteTable("important_items", {
  todoId: text("todo_id")
    .primaryKey(),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  isExcluded: integer("is_excluded", { mode: "boolean" }).notNull().default(false),
  sortOrder: text("sort_order"),
  sortParentId: text("sort_parent_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
