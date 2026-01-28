import { drizzle } from "drizzle-orm/sqlite-proxy"
import { invoke } from "@tauri-apps/api/core"
import { eq, and } from "drizzle-orm"
import * as schema from "../schema"
import type {
  StorageAdapter,
  Result,
  Workspace,
  JournalPage,
  TodoItem,
} from "./types"

// Rust command request/response types
interface SqlRequest {
  sql: string
  params: unknown[]
  method: string
}

// Row format from Rust - columns and values in order
interface SqlRow {
  columns: string[]
  rows: unknown[]
}

interface SqlResponse {
  rows: SqlRow[]
}

interface BatchSqlRequest {
  queries: SqlRequest[]
}

interface BatchSqlResponse {
  results: SqlResponse[]
}

/**
 * SQLite storage adapter using Drizzle ORM with sqlite-proxy
 * Communicates with Tauri backend via invoke commands
 */
export class SqliteStorageAdapter implements StorageAdapter {
  private db: ReturnType<typeof drizzle<typeof schema>>

  constructor() {
    // Initialize Drizzle with sqlite-proxy callbacks
    this.db = drizzle<typeof schema>(
      // Single query callback
      async (sql: string, params: unknown[], method: string) => {
        try {
          const response = await invoke<SqlResponse>("execute_single_sql", {
            request: { sql, params, method } satisfies SqlRequest,
          })

          // Convert rows from objects to arrays for Drizzle
          const rows = this.convertRowsToArrays(response.rows, method)
          return { rows }
        } catch (e) {
          console.error("SQL Error:", e)
          return { rows: [] }
        }
      },
      // Batch query callback
      async (
        queries: { sql: string; params: unknown[]; method: string }[]
      ) => {
        try {
          const batchRequest: BatchSqlRequest = {
            queries: queries.map((q) => ({
              sql: q.sql,
              params: q.params,
              method: q.method,
            })),
          }

          const response = await invoke<BatchSqlResponse>(
            "execute_batch_sql",
            { request: batchRequest }
          )

          // Convert each result's rows from objects to arrays
          return response.results.map((result: SqlResponse, index: number) => ({
            rows: this.convertRowsToArrays(result.rows, queries[index].method),
          }))
        } catch (e) {
          console.error("Batch SQL Error:", e)
          throw e
        }
      },
      { schema }
    )
  }

  /**
   * Convert rows from Rust format to Drizzle format
   * Rust returns: { columns: string[], rows: unknown[] }[]
   * Drizzle expects:
   * - For 'get': single row as array of values
   * - For 'all'/'values': array of rows (each row = array of values)
   * - For 'run': empty array
   */
  private convertRowsToArrays(
    rows: SqlRow[],
    method: string
  ): unknown[] | unknown[][] {
    if (method === "run") {
      return []
    }

    if (method === "get") {
      // Return single row as array of values
      if (rows.length === 0) return []
      return rows[0].rows
    }

    // For 'all' and 'values': return array of rows (each row's values)
    return rows.map((row) => row.rows)
  }

  /**
   * Safely convert a value to a Date object
   * Handles: Date objects, numbers (timestamps), strings, null/undefined
   */
  private toDate(value: unknown): Date {
    if (value instanceof Date) {
      return value
    }
    if (typeof value === "number") {
      return new Date(value)
    }
    if (typeof value === "string") {
      const parsed = new Date(value)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    // Fallback to current date
    return new Date()
  }

  async initialize(): Promise<Result<void>> {
    // Tables are created by Rust migrations on app startup
    // This method is kept for interface compatibility
    return { success: true, data: undefined }
  }

  async getWorkspaces(): Promise<Result<Workspace[]>> {
    try {
      const workspaceRows = await this.db
        .select()
        .from(schema.workspaces)
        .all()

      const workspaces: Workspace[] = []

      for (const ws of workspaceRows) {
        // Get all pages for this workspace
        const pageRows = await this.db
          .select()
          .from(schema.pages)
          .where(eq(schema.pages.workspaceId, ws.id))
          .all()

        const pages: Record<string, JournalPage> = {}

        for (const page of pageRows) {
          // Get todos for this page
          const todoRows = await this.db
            .select()
            .from(schema.todos)
            .where(
              and(
                eq(schema.todos.workspaceId, ws.id),
                eq(schema.todos.pageDate, page.date)
              )
            )
            .all()

          const todos: TodoItem[] = todoRows.map((todo) => ({
            id: todo.id,
            text: todo.text,
            status: todo.status as "todo" | "done",
            tags: todo.tags as string[],
            order: todo.order,
            level: todo.level,
            parentId: todo.parentId ?? null,
            createdAt: this.toDate(todo.createdAt),
            updatedAt: this.toDate(todo.updatedAt),
          }))

          pages[page.date] = {
            date: page.date,
            todos,
            notes: page.notes ?? undefined,
            createdAt: this.toDate(page.createdAt),
            updatedAt: this.toDate(page.updatedAt),
          }
        }

        workspaces.push({
          id: ws.id,
          name: ws.name,
          pages,
          currentDateKey: ws.currentDateKey,
          createdAt: this.toDate(ws.createdAt),
          updatedAt: this.toDate(ws.updatedAt),
        })
      }

      return { success: true, data: workspaces }
    } catch (error) {
      return { success: false, error: `Failed to get workspaces: ${error}` }
    }
  }

  async getWorkspace(id: string): Promise<Result<Workspace | null>> {
    try {
      const workspaceRows = await this.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, id))
        .all()

      if (workspaceRows.length === 0) {
        return { success: true, data: null }
      }

      const ws = workspaceRows[0]

      // Get all pages for this workspace
      const pageRows = await this.db
        .select()
        .from(schema.pages)
        .where(eq(schema.pages.workspaceId, ws.id))
        .all()

      const pages: Record<string, JournalPage> = {}

      for (const page of pageRows) {
        // Get todos for this page
        const todoRows = await this.db
          .select()
          .from(schema.todos)
          .where(
            and(
              eq(schema.todos.workspaceId, ws.id),
              eq(schema.todos.pageDate, page.date)
            )
          )
          .all()

        const todos: TodoItem[] = todoRows.map((todo) => ({
          id: todo.id,
          text: todo.text,
          status: todo.status as "todo" | "done",
          tags: todo.tags as string[],
          order: todo.order,
          level: todo.level,
          parentId: todo.parentId ?? null,
          createdAt: this.toDate(todo.createdAt),
          updatedAt: this.toDate(todo.updatedAt),
        }))

        pages[page.date] = {
          date: page.date,
          todos,
          notes: page.notes ?? undefined,
          createdAt: this.toDate(page.createdAt),
          updatedAt: this.toDate(page.updatedAt),
        }
      }

      const workspace: Workspace = {
        id: ws.id,
        name: ws.name,
        pages,
        currentDateKey: ws.currentDateKey,
        createdAt: this.toDate(ws.createdAt),
        updatedAt: this.toDate(ws.updatedAt),
      }

      return { success: true, data: workspace }
    } catch (error) {
      return { success: false, error: `Failed to get workspace: ${error}` }
    }
  }

  async createWorkspace(workspace: Workspace): Promise<Result<Workspace>> {
    try {
      await this.db.insert(schema.workspaces).values({
        id: workspace.id,
        name: workspace.name,
        currentDateKey: workspace.currentDateKey,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      })

      return { success: true, data: workspace }
    } catch (error) {
      return { success: false, error: `Failed to create workspace: ${error}` }
    }
  }

  async updateWorkspace(
    id: string,
    data: Partial<Workspace>
  ): Promise<Result<Workspace>> {
    try {
      const updates: Partial<typeof schema.workspaces.$inferInsert> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.currentDateKey !== undefined)
        updates.currentDateKey = data.currentDateKey
      if (data.updatedAt !== undefined) updates.updatedAt = data.updatedAt

      await this.db
        .update(schema.workspaces)
        .set(updates)
        .where(eq(schema.workspaces.id, id))

      const result = await this.getWorkspace(id)
      if (!result.success || !result.data) {
        return { success: false, error: "Workspace not found after update" }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: `Failed to update workspace: ${error}` }
    }
  }

  async deleteWorkspace(id: string): Promise<Result<void>> {
    try {
      // Delete todos first (foreign key constraint)
      await this.db
        .delete(schema.todos)
        .where(eq(schema.todos.workspaceId, id))

      // Delete pages
      await this.db
        .delete(schema.pages)
        .where(eq(schema.pages.workspaceId, id))

      // Delete workspace
      await this.db
        .delete(schema.workspaces)
        .where(eq(schema.workspaces.id, id))

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: `Failed to delete workspace: ${error}` }
    }
  }

  async getPage(
    workspaceId: string,
    date: string
  ): Promise<Result<JournalPage | null>> {
    try {
      const pageRows = await this.db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.workspaceId, workspaceId),
            eq(schema.pages.date, date)
          )
        )
        .all()

      if (pageRows.length === 0) {
        return { success: true, data: null }
      }

      const page = pageRows[0]

      // Get todos for this page
      const todoRows = await this.db
        .select()
        .from(schema.todos)
        .where(
          and(
            eq(schema.todos.workspaceId, workspaceId),
            eq(schema.todos.pageDate, date)
          )
        )
        .all()

      const todos: TodoItem[] = todoRows.map((todo) => ({
        id: todo.id,
        text: todo.text,
        status: todo.status as "todo" | "done",
        tags: todo.tags as string[],
        order: todo.order,
        level: todo.level,
        parentId: todo.parentId ?? null,
        createdAt: this.toDate(todo.createdAt),
        updatedAt: this.toDate(todo.updatedAt),
      }))

      const journalPage: JournalPage = {
        date: page.date,
        todos,
        notes: page.notes ?? undefined,
        createdAt: this.toDate(page.createdAt),
        updatedAt: this.toDate(page.updatedAt),
      }

      return { success: true, data: journalPage }
    } catch (error) {
      return { success: false, error: `Failed to get page: ${error}` }
    }
  }

  async createPage(
    workspaceId: string,
    page: JournalPage
  ): Promise<Result<JournalPage>> {
    try {
      await this.db.insert(schema.pages).values({
        workspaceId,
        date: page.date,
        notes: page.notes ?? null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })

      return { success: true, data: page }
    } catch (error) {
      return { success: false, error: `Failed to create page: ${error}` }
    }
  }

  async updatePage(
    workspaceId: string,
    date: string,
    data: Partial<JournalPage>
  ): Promise<Result<JournalPage>> {
    try {
      const updates: Partial<typeof schema.pages.$inferInsert> = {}

      if (data.notes !== undefined) updates.notes = data.notes ?? null
      if (data.updatedAt !== undefined) updates.updatedAt = data.updatedAt

      await this.db
        .update(schema.pages)
        .set(updates)
        .where(
          and(
            eq(schema.pages.workspaceId, workspaceId),
            eq(schema.pages.date, date)
          )
        )

      const result = await this.getPage(workspaceId, date)
      if (!result.success || !result.data) {
        return { success: false, error: "Page not found after update" }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: `Failed to update page: ${error}` }
    }
  }

  async getTodos(
    workspaceId: string,
    date: string
  ): Promise<Result<TodoItem[]>> {
    try {
      const todoRows = await this.db
        .select()
        .from(schema.todos)
        .where(
          and(
            eq(schema.todos.workspaceId, workspaceId),
            eq(schema.todos.pageDate, date)
          )
        )
        .all()

      const todos: TodoItem[] = todoRows.map((todo) => ({
        id: todo.id,
        text: todo.text,
        status: todo.status as "todo" | "done",
        tags: todo.tags as string[],
        order: todo.order,
        level: todo.level,
        createdAt: this.toDate(todo.createdAt),
        updatedAt: this.toDate(todo.updatedAt),
      }))

      return { success: true, data: todos }
    } catch (error) {
      return { success: false, error: `Failed to get todos: ${error}` }
    }
  }

  async createTodo(
    workspaceId: string,
    date: string,
    todo: TodoItem
  ): Promise<Result<TodoItem>> {
    try {
      await this.db.insert(schema.todos).values({
        id: todo.id,
        workspaceId,
        pageDate: date,
        text: todo.text,
        status: todo.status,
        tags: todo.tags,
        order: todo.order,
        level: todo.level,
        parentId: todo.parentId ?? null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      })

      return { success: true, data: todo }
    } catch (error) {
      return { success: false, error: `Failed to create todo: ${error}` }
    }
  }

  async updateTodo(
    id: string,
    data: Partial<TodoItem>
  ): Promise<Result<TodoItem>> {
    try {
      const updates: Partial<typeof schema.todos.$inferInsert> = {}

      if (data.text !== undefined) updates.text = data.text
      if (data.status !== undefined) updates.status = data.status
      if (data.tags !== undefined) updates.tags = data.tags
      if (data.order !== undefined) updates.order = data.order
      if (data.level !== undefined) updates.level = data.level
      if (data.parentId !== undefined) updates.parentId = data.parentId
      if (data.updatedAt !== undefined) updates.updatedAt = data.updatedAt

      await this.db
        .update(schema.todos)
        .set(updates)
        .where(eq(schema.todos.id, id))

      // Get the updated todo
      const todoRows = await this.db
        .select()
        .from(schema.todos)
        .where(eq(schema.todos.id, id))
        .all()

      if (todoRows.length === 0) {
        return { success: false, error: "Todo not found after update" }
      }

      const todo = todoRows[0]
      const updatedTodo: TodoItem = {
        id: todo.id,
        text: todo.text,
        status: todo.status as "todo" | "done",
        tags: todo.tags as string[],
        order: todo.order,
        level: todo.level,
        parentId: todo.parentId ?? null,
        createdAt: this.toDate(todo.createdAt),
        updatedAt: this.toDate(todo.updatedAt),
      }

      return { success: true, data: updatedTodo }
    } catch (error) {
      return { success: false, error: `Failed to update todo: ${error}` }
    }
  }

  async deleteTodo(id: string): Promise<Result<void>> {
    try {
      await this.db.delete(schema.todos).where(eq(schema.todos.id, id))
      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: `Failed to delete todo: ${error}` }
    }
  }

  async savePage(
    workspaceId: string,
    page: JournalPage
  ): Promise<Result<void>> {
    try {
      // First, verify the workspace exists (FK constraint)
      const workspaceExists = await this.db
        .select({ id: schema.workspaces.id })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .all()

      if (workspaceExists.length === 0) {
        // Workspace doesn't exist yet - skip saving
        // This can happen during initialization race conditions
        console.warn(`[sqlite] Workspace ${workspaceId} not found, skipping page save`)
        return { success: true, data: undefined }
      }

      // Upsert page (INSERT OR REPLACE)
      await this.db
        .insert(schema.pages)
        .values({
          workspaceId,
          date: page.date,
          notes: page.notes ?? null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        })
        .onConflictDoUpdate({
          target: [schema.pages.workspaceId, schema.pages.date],
          set: {
            notes: page.notes ?? null,
            updatedAt: page.updatedAt,
          },
        })

      // Get current todo IDs in the page
      const currentTodoIds = new Set(page.todos.map(t => t.id))

      // Delete todos that are no longer in the page
      const existingTodos = await this.db
        .select({ id: schema.todos.id })
        .from(schema.todos)
        .where(
          and(
            eq(schema.todos.workspaceId, workspaceId),
            eq(schema.todos.pageDate, page.date)
          )
        )
        .all()

      const todosToDelete = existingTodos
        .filter(t => !currentTodoIds.has(t.id))
        .map(t => t.id)

      if (todosToDelete.length > 0) {
        for (const todoId of todosToDelete) {
          await this.db.delete(schema.todos).where(eq(schema.todos.id, todoId))
        }
      }

      // Upsert all todos (INSERT OR REPLACE)
      for (const todo of page.todos) {
        await this.db
          .insert(schema.todos)
          .values({
            id: todo.id,
            workspaceId,
            pageDate: page.date,
            text: todo.text,
            status: todo.status,
            tags: todo.tags,
            order: todo.order,
            level: todo.level,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt,
          })
          .onConflictDoUpdate({
            target: schema.todos.id,
            set: {
              text: todo.text,
              status: todo.status,
              tags: todo.tags,
              order: todo.order,
              level: todo.level,
              updatedAt: todo.updatedAt,
            },
          })
      }

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: `Failed to save page: ${error}` }
    }
  }
}
