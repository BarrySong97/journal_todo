import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  initializeStorage,
  createWorkspace,
  getWorkspaces,
  savePage,
  getPage,
  getTodos,
} from "@journal-todo/api"
import type { Workspace, JournalPage, TodoItem } from "@journal-todo/db"

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Setup global localStorage mock
if (typeof window === "undefined") {
  // @ts-ignore - Node environment
  global.window = {
    localStorage: localStorageMock,
  }
  // @ts-ignore - Node environment
  global.localStorage = localStorageMock
} else {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  })
}

describe("Web/localStorage Data Flow Integration Tests", () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear()
    // Initialize storage for each test
    const result = await initializeStorage()
    expect(result.success).toBe(true)
  })

  afterEach(() => {
    // Clean up after each test
    localStorage.clear()
  })

  describe("Workspace Operations", () => {
    it("should create a workspace and persist to localStorage", async () => {
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      const result = await createWorkspace(workspace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(workspace)
      }

      // Verify data persisted to localStorage
      const stored = localStorage.getItem("journal-storage")
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.workspaces["ws-1"]).toBeDefined()
    })

    it("should retrieve all workspaces from localStorage", async () => {
      const workspace1: Workspace = {
        id: "ws-1",
        name: "Workspace 1",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      const workspace2: Workspace = {
        id: "ws-2",
        name: "Workspace 2",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T11:00:00Z"),
        updatedAt: new Date("2026-01-28T11:00:00Z"),
      }

      await createWorkspace(workspace1)
      await createWorkspace(workspace2)

      const result = await getWorkspaces()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data).toContainEqual(workspace1)
        expect(result.data).toContainEqual(workspace2)
      }
    })
  })

  describe("Page Operations", () => {
    it("should save a page with todos and persist to localStorage", async () => {
      // Create workspace first
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      // Create page with todos
      const page: JournalPage = {
        date: "2026-01-28",
        notes: "Test notes",
        todos: [
          {
            id: "todo-1",
            text: "First task",
            status: "todo",
            tags: ["work"],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:00:00Z"),
          },
          {
            id: "todo-2",
            text: "Second task",
            status: "done",
            tags: ["personal"],
            order: "a1",
            level: 0,
            createdAt: new Date("2026-01-28T10:05:00Z"),
            updatedAt: new Date("2026-01-28T10:10:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      const result = await savePage("ws-1", page)
      expect(result.success).toBe(true)

      // Verify data persisted to localStorage
      const stored = localStorage.getItem("journal-storage")
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.workspaces["ws-1"].pages["2026-01-28"]).toBeDefined()
      expect(parsed.state.workspaces["ws-1"].pages["2026-01-28"].todos).toHaveLength(2)
    })

    it("should retrieve a page from localStorage", async () => {
      // Setup: create workspace and save page
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      const page: JournalPage = {
        date: "2026-01-28",
        notes: "Test notes",
        todos: [
          {
            id: "todo-1",
            text: "Task 1",
            status: "todo",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:00:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await savePage("ws-1", page)

      // Test: retrieve page
      const result = await getPage("ws-1", "2026-01-28")
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.date).toBe("2026-01-28")
        expect(result.data.notes).toBe("Test notes")
        expect(result.data.todos).toHaveLength(1)
      }
    })

    it("should return null for non-existent page", async () => {
      // Create workspace
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      // Try to get non-existent page
      const result = await getPage("ws-1", "2026-01-29")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe("Todo Operations", () => {
    it("should retrieve todos from a page", async () => {
      // Setup: create workspace and save page with todos
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      const todos: TodoItem[] = [
        {
          id: "todo-1",
          text: "First task",
          status: "todo",
          tags: ["work"],
          order: "a0",
          level: 0,
          createdAt: new Date("2026-01-28T10:00:00Z"),
          updatedAt: new Date("2026-01-28T10:00:00Z"),
        },
        {
          id: "todo-2",
          text: "Second task",
          status: "done",
          tags: ["personal"],
          order: "a1",
          level: 1,
          createdAt: new Date("2026-01-28T10:05:00Z"),
          updatedAt: new Date("2026-01-28T10:10:00Z"),
        },
        {
          id: "todo-3",
          text: "Third task",
          status: "todo",
          tags: [],
          order: "a2",
          level: 0,
          createdAt: new Date("2026-01-28T10:15:00Z"),
          updatedAt: new Date("2026-01-28T10:15:00Z"),
        },
      ]

      const page: JournalPage = {
        date: "2026-01-28",
        notes: "Test notes",
        todos,
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await savePage("ws-1", page)

      // Test: retrieve todos
      const result = await getTodos("ws-1", "2026-01-28")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data).toEqual(todos)
      }
    })

    it("should return empty array for page with no todos", async () => {
      // Setup: create workspace and save page without todos
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      const page: JournalPage = {
        date: "2026-01-28",
        notes: "Empty page",
        todos: [],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await savePage("ws-1", page)

      // Test: retrieve todos
      const result = await getTodos("ws-1", "2026-01-28")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it("should return empty array for non-existent page", async () => {
      // Create workspace
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      // Try to get todos from non-existent page
      const result = await getTodos("ws-1", "2026-01-29")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })

  describe("Date Field Handling", () => {
    it("should preserve Date objects through round-trip persistence", async () => {
      // Create workspace with specific timestamps
      const createdAt = new Date("2026-01-28T10:00:00Z")
      const updatedAt = new Date("2026-01-28T10:30:00Z")

      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt,
        updatedAt,
      }
      await createWorkspace(workspace)

      // Create page with specific timestamps
      const pageCreatedAt = new Date("2026-01-28T10:00:00Z")
      const pageUpdatedAt = new Date("2026-01-28T10:15:00Z")

      const page: JournalPage = {
        date: "2026-01-28",
        notes: "Test",
        todos: [
          {
            id: "todo-1",
            text: "Task",
            status: "todo",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:05:00Z"),
          },
        ],
        createdAt: pageCreatedAt,
        updatedAt: pageUpdatedAt,
      }
      await savePage("ws-1", page)

      // Retrieve and verify dates are Date objects
      const retrievedPage = await getPage("ws-1", "2026-01-28")
      expect(retrievedPage.success).toBe(true)
      if (retrievedPage.success && retrievedPage.data) {
        expect(retrievedPage.data.createdAt).toBeInstanceOf(Date)
        expect(retrievedPage.data.updatedAt).toBeInstanceOf(Date)
        expect(retrievedPage.data.createdAt.getTime()).toBe(pageCreatedAt.getTime())
        expect(retrievedPage.data.updatedAt.getTime()).toBe(pageUpdatedAt.getTime())

        // Verify todo dates
        const todos = retrievedPage.data.todos || []
        expect(todos[0].createdAt).toBeInstanceOf(Date)
        expect(todos[0].updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe("Multiple Workspaces", () => {
    it("should handle multiple workspaces with same date pages independently", async () => {
      // Create two workspaces
      const ws1: Workspace = {
        id: "ws-1",
        name: "Workspace 1",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      const ws2: Workspace = {
        id: "ws-2",
        name: "Workspace 2",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      await createWorkspace(ws1)
      await createWorkspace(ws2)

      // Save pages with same date but different content
      const page1: JournalPage = {
        date: "2026-01-28",
        notes: "Workspace 1 notes",
        todos: [
          {
            id: "todo-1",
            text: "WS1 Task",
            status: "todo",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:00:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      const page2: JournalPage = {
        date: "2026-01-28",
        notes: "Workspace 2 notes",
        todos: [
          {
            id: "todo-2",
            text: "WS2 Task",
            status: "done",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:00:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }

      await savePage("ws-1", page1)
      await savePage("ws-2", page2)

      // Verify pages are independent
      const retrieved1 = await getPage("ws-1", "2026-01-28")
      const retrieved2 = await getPage("ws-2", "2026-01-28")

      expect(retrieved1.success).toBe(true)
      expect(retrieved2.success).toBe(true)
      if (retrieved1.success && retrieved1.data && retrieved2.success && retrieved2.data) {
        expect(retrieved1.data.notes).toBe("Workspace 1 notes")
        expect(retrieved2.data.notes).toBe("Workspace 2 notes")
        expect(retrieved1.data.todos[0].text).toBe("WS1 Task")
        expect(retrieved2.data.todos[0].text).toBe("WS2 Task")
      }
    })
  })

  describe("Data Persistence Across Calls", () => {
    it("should persist data across multiple save and retrieve cycles", async () => {
      // Create workspace
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        pages: {},
        currentDateKey: "2026-01-28",
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await createWorkspace(workspace)

      // First save
      const page1: JournalPage = {
        date: "2026-01-28",
        notes: "First version",
        todos: [
          {
            id: "todo-1",
            text: "Task 1",
            status: "todo",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:00:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:00:00Z"),
      }
      await savePage("ws-1", page1)

      // Verify first save
      let retrieved = await getPage("ws-1", "2026-01-28")
      expect(retrieved.success).toBe(true)
      if (retrieved.success && retrieved.data) {
        expect(retrieved.data.notes).toBe("First version")
        expect(retrieved.data.todos).toHaveLength(1)
      }

      // Second save (update)
      const page2: JournalPage = {
        date: "2026-01-28",
        notes: "Second version",
        todos: [
          {
            id: "todo-1",
            text: "Task 1 updated",
            status: "done",
            tags: [],
            order: "a0",
            level: 0,
            createdAt: new Date("2026-01-28T10:00:00Z"),
            updatedAt: new Date("2026-01-28T10:05:00Z"),
          },
          {
            id: "todo-2",
            text: "Task 2",
            status: "todo",
            tags: [],
            order: "a1",
            level: 0,
            createdAt: new Date("2026-01-28T10:05:00Z"),
            updatedAt: new Date("2026-01-28T10:05:00Z"),
          },
        ],
        createdAt: new Date("2026-01-28T10:00:00Z"),
        updatedAt: new Date("2026-01-28T10:05:00Z"),
      }
      await savePage("ws-1", page2)

      // Verify second save
      retrieved = await getPage("ws-1", "2026-01-28")
      expect(retrieved.success).toBe(true)
      if (retrieved.success && retrieved.data) {
        expect(retrieved.data.notes).toBe("Second version")
        expect(retrieved.data.todos).toHaveLength(2)
        expect(retrieved.data.todos[0].text).toBe("Task 1 updated")
        expect(retrieved.data.todos[0].status).toBe("done")
      }
    })
  })
})
