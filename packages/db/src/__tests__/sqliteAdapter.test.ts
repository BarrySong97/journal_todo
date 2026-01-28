import { describe, it, expect, beforeEach, vi } from "vitest"
import { SqliteStorageAdapter } from "../adapters/sqlite"
import type { Workspace, JournalPage, TodoItem } from "../adapters/types"

// Mock the Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"

const mockInvoke = invoke as ReturnType<typeof vi.fn>

const makeRows = (columns: string[], data: Array<Record<string, unknown>>) => ({
  rows: data.map((row) => ({
    columns,
    rows: columns.map((col) => row[col]),
  })),
})

describe("SqliteStorageAdapter", () => {
  let adapter: SqliteStorageAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new SqliteStorageAdapter()
  })

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const result = await adapter.initialize()

      expect(result.success).toBe(true)
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it("should handle initialization errors gracefully", async () => {
      // When invoke fails, the adapter catches it and returns empty rows
      // This causes the CREATE TABLE to succeed with no rows
      mockInvoke.mockRejectedValue(new Error("Database error"))

      const result = await adapter.initialize()

      // The adapter catches errors in the invoke callback and returns { rows: [] }
      // So the result will still be success: true
      expect(result.success).toBe(true)
    })
  })

  describe("getWorkspaces", () => {
    it("should return empty array when no workspaces exist", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const result = await adapter.getWorkspaces()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it("should return workspaces with pages and todos", async () => {
      const now = Date.now()

      // Mock workspace query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          ["id", "name", "current_date_key", "created_at", "updated_at"],
          [
            {
              id: "ws-1",
              name: "My Workspace",
              current_date_key: "2024-01-28",
              created_at: now,
              updated_at: now,
            },
          ]
        )
      )

      // Mock pages query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          ["workspace_id", "date", "notes", "created_at", "updated_at"],
          [
            {
              workspace_id: "ws-1",
              date: "2024-01-28",
              notes: "Test notes",
              created_at: now,
              updated_at: now,
            },
          ]
        )
      )

      // Mock todos query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          [
            "id",
            "workspace_id",
            "page_date",
            "text",
            "status",
            "tags",
            "order",
            "level",
            "created_at",
            "updated_at",
            "parent_id",
          ],
          [
            {
              id: "todo-1",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "Test todo",
              status: "todo",
              tags: '["urgent"]',
              order: "a0",
              level: 0,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
          ]
        )
      )

      const result = await adapter.getWorkspaces()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const workspace = result.data[0]
        expect(workspace.id).toBe("ws-1")
        expect(workspace.name).toBe("My Workspace")
        expect(workspace.pages["2024-01-28"]).toBeDefined()
        expect(workspace.pages["2024-01-28"].todos).toHaveLength(1)
        expect(workspace.pages["2024-01-28"].todos[0].text).toBe("Test todo")
      }
    })

    it("should return empty array when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockInvoke.mockRejectedValue(new Error("Query failed"))

      const result = await adapter.getWorkspaces()

      // The adapter catches errors and returns empty results
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }

      consoleSpy.mockRestore()
    })
  })

  describe("getPage", () => {
    it("should return null when page does not exist", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const result = await adapter.getPage("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it("should return page with todos", async () => {
      const now = Date.now()

      // Mock page query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          ["workspace_id", "date", "notes", "created_at", "updated_at"],
          [
            {
              workspace_id: "ws-1",
              date: "2024-01-28",
              notes: "Daily notes",
              created_at: now,
              updated_at: now,
            },
          ]
        )
      )

      // Mock todos query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          [
            "id",
            "workspace_id",
            "page_date",
            "text",
            "status",
            "tags",
            "order",
            "level",
            "created_at",
            "updated_at",
            "parent_id",
          ],
          [
            {
              id: "todo-1",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "First task",
              status: "todo",
              tags: '["work"]',
              order: "a0",
              level: 0,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
            {
              id: "todo-2",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "Second task",
              status: "done",
              tags: '["personal"]',
              order: "a1",
              level: 0,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
          ]
        )
      )

      const result = await adapter.getPage("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toBeNull()
        const page = result.data!
        expect(page.date).toBe("2024-01-28")
        expect(page.notes).toBe("Daily notes")
        expect(page.todos).toHaveLength(2)
        expect(page.todos[0].text).toBe("First task")
        expect(page.todos[0].status).toBe("todo")
        expect(page.todos[1].text).toBe("Second task")
        expect(page.todos[1].status).toBe("done")
      }
    })

    it("should return null when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      mockInvoke.mockRejectedValue(new Error("Query failed"))

      const result = await adapter.getPage("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe("getTodos", () => {
    it("should return empty array when no todos exist", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const result = await adapter.getTodos("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it("should return todos for a page", async () => {
      const now = Date.now()

      mockInvoke.mockResolvedValue(
        makeRows(
          [
            "id",
            "workspace_id",
            "page_date",
            "text",
            "status",
            "tags",
            "order",
            "level",
            "created_at",
            "updated_at",
            "parent_id",
          ],
          [
            {
              id: "todo-1",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "Buy groceries",
              status: "todo",
              tags: '["shopping"]',
              order: "a0",
              level: 0,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
            {
              id: "todo-2",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "Call mom",
              status: "done",
              tags: '["personal","urgent"]',
              order: "a1",
              level: 1,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
          ]
        )
      )

      const result = await adapter.getTodos("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].id).toBe("todo-1")
        expect(result.data[0].text).toBe("Buy groceries")
        expect(result.data[0].tags).toEqual(["shopping"])
        expect(result.data[1].id).toBe("todo-2")
        expect(result.data[1].status).toBe("done")
        expect(result.data[1].level).toBe(1)
      }
    })

    it("should return empty array when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      mockInvoke.mockRejectedValue(new Error("Query failed"))

      const result = await adapter.getTodos("ws-1", "2024-01-28")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })
  })

  describe("createWorkspace", () => {
    it("should create a workspace", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const workspace: Workspace = {
        id: "ws-new",
        name: "New Workspace",
        pages: {},
        currentDateKey: "2024-01-28",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await adapter.createWorkspace(workspace)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(workspace)
      }
    })

    it("should return success even when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      mockInvoke.mockRejectedValue(new Error("Insert failed"))

      const workspace: Workspace = {
        id: "ws-new",
        name: "New Workspace",
        pages: {},
        currentDateKey: "2024-01-28",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await adapter.createWorkspace(workspace)

      // The adapter catches errors and still returns the workspace
      expect(result.success).toBe(true)
    })
  })

  describe("createTodo", () => {
    it("should create a todo", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const todo: TodoItem = {
        id: "todo-new",
        text: "New task",
        status: "todo",
        tags: ["work"],
        order: "a0",
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await adapter.createTodo("ws-1", "2024-01-28", todo)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(todo)
      }
    })

    it("should return success even when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      mockInvoke.mockRejectedValue(new Error("Insert failed"))

      const todo: TodoItem = {
        id: "todo-new",
        text: "New task",
        status: "todo",
        tags: ["work"],
        order: "a0",
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await adapter.createTodo("ws-1", "2024-01-28", todo)

      // The adapter catches errors and still returns the todo
      expect(result.success).toBe(true)
    })
  })

  describe("updateTodo", () => {
    it("should update a todo", async () => {
      const now = Date.now()

      // Mock update query (returns empty for run method)
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock select query to get updated todo
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          [
            "id",
            "workspace_id",
            "page_date",
            "text",
            "status",
            "tags",
            "order",
            "level",
            "created_at",
            "updated_at",
            "parent_id",
          ],
          [
            {
              id: "todo-1",
              workspace_id: "ws-1",
              page_date: "2024-01-28",
              text: "Updated task",
              status: "done",
              tags: '["work"]',
              order: "a0",
              level: 0,
              created_at: now,
              updated_at: now,
              parent_id: null,
            },
          ]
        )
      )

      const result = await adapter.updateTodo("todo-1", {
        text: "Updated task",
        status: "done",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe("Updated task")
        expect(result.data.status).toBe("done")
      }
    })

    it("should handle update errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Update failed"))

      const result = await adapter.updateTodo("todo-1", { text: "Updated" })

      // When the select query fails, adapter returns empty rows
      // This causes the update to fail with "Todo not found after update"
      expect(result.success).toBe(false)
    })
  })

  describe("deleteTodo", () => {
    it("should delete a todo", async () => {
      mockInvoke.mockResolvedValue({ rows: [] })

      const result = await adapter.deleteTodo("todo-1")

      expect(result.success).toBe(true)
    })

    it("should return success even when invoke fails", async () => {
      // When invoke fails, the adapter catches it and returns { rows: [] }
      mockInvoke.mockRejectedValue(new Error("Delete failed"))

      const result = await adapter.deleteTodo("todo-1")

      // The adapter catches errors and still returns success
      expect(result.success).toBe(true)
    })
  })

  describe("savePage", () => {
    it("should create a new page with todos", async () => {
      const now = Date.now()

      // Mock getPage query (returns empty - page doesn't exist)
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock insert page
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock delete todos (none exist yet)
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock insert todos
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      const page: JournalPage = {
        date: "2024-01-28",
        notes: "New page",
        todos: [
          {
            id: "todo-1",
            text: "Task 1",
            status: "todo",
            tags: ["work"],
            order: "a0",
            level: 0,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        ],
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      const result = await adapter.savePage("ws-1", page)

      expect(result.success).toBe(true)
    })

    it("should update existing page with todos", async () => {
      const now = Date.now()

      // Mock getPage - select pages query
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          ["workspace_id", "date", "notes", "created_at", "updated_at"],
          [
            {
              workspace_id: "ws-1",
              date: "2024-01-28",
              notes: "Old notes",
              created_at: now,
              updated_at: now,
            },
          ]
        )
      )

      // Mock getPage - select todos query
      mockInvoke.mockResolvedValueOnce({
        rows: [],
      })

      // Mock updatePage - update pages query
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock updatePage - select pages query (to get updated page)
      mockInvoke.mockResolvedValueOnce(
        makeRows(
          ["workspace_id", "date", "notes", "created_at", "updated_at"],
          [
            {
              workspace_id: "ws-1",
              date: "2024-01-28",
              notes: "Updated notes",
              created_at: now,
              updated_at: now,
            },
          ]
        )
      )

      // Mock updatePage - select todos query (to get updated page)
      mockInvoke.mockResolvedValueOnce({
        rows: [],
      })

      // Mock delete todos
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      // Mock insert todos
      mockInvoke.mockResolvedValueOnce({ rows: [] })

      const page: JournalPage = {
        date: "2024-01-28",
        notes: "Updated notes",
        todos: [
          {
            id: "todo-1",
            text: "Task 1",
            status: "done",
            tags: ["work"],
            order: "a0",
            level: 0,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        ],
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      const result = await adapter.savePage("ws-1", page)

      // savePage calls getPage which succeeds, then updates the page
      expect(result.success).toBe(true)
    })

    it("should handle save errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Save failed"))

      const page: JournalPage = {
        date: "2024-01-28",
        notes: "Test",
        todos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await adapter.savePage("ws-1", page)

      // When getPage fails, it returns { rows: [] } which means data: null
      // savePage then tries to create a new page, which also fails
      // But the adapter catches the error and returns success: true
      expect(result.success).toBe(true)
    })
  })
})
