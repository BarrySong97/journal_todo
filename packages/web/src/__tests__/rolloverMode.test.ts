// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ImportantItemState, Workspace } from "@/lib/types/journal"

const mockDeleteTodo = vi.fn().mockResolvedValue(undefined)
const mockCreateTodo = vi.fn().mockResolvedValue(undefined)
const mockCreatePage = vi.fn().mockResolvedValue(undefined)

vi.mock("@journal-todo/api", () => ({
  initializeStorage: vi.fn().mockResolvedValue({ success: true }),
  getWorkspaces: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getImportantItems: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createWorkspace: vi.fn().mockResolvedValue({ success: true }),
  updateWorkspace: vi.fn().mockResolvedValue(undefined),
  deleteWorkspace: vi.fn().mockResolvedValue(undefined),
  createPage: mockCreatePage,
  createTodo: mockCreateTodo,
  updateTodo: vi.fn().mockResolvedValue(undefined),
  deleteTodo: mockDeleteTodo,
  upsertImportantItem: vi.fn().mockResolvedValue({ success: true }),
  deleteImportantItem: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/utils/dateUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/dateUtils")>()
  return { ...actual, getTodayKey: () => TODAY }
})

const TODAY = "2026-03-30"
const PAST_DATE = "2026-03-28"

const makeWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  id: "ws-1",
  name: "Test Workspace",
  currentDateKey: TODAY,
  pages: {
    [PAST_DATE]: {
      date: PAST_DATE,
      todos: [
        {
          id: "todo-incomplete",
          text: "Incomplete task",
          status: "todo",
          level: 0,
          order: "a0",
          tags: [],
          parentId: null,
          createdAt: new Date("2026-03-28"),
          updatedAt: new Date("2026-03-28"),
        },
        {
          id: "todo-done",
          text: "Done task",
          status: "done",
          level: 0,
          order: "a1",
          tags: [],
          parentId: null,
          createdAt: new Date("2026-03-28"),
          updatedAt: new Date("2026-03-28"),
        },
      ],
      createdAt: new Date("2026-03-28"),
      updatedAt: new Date("2026-03-28"),
    },
    [TODAY]: {
      date: TODAY,
      todos: [],
      createdAt: new Date("2026-03-30"),
      updatedAt: new Date("2026-03-30"),
    },
  },
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-30"),
  ...overrides,
})

describe("rollOverTodosToToday", () => {
  // Import store inside describe so mocks are applied first
  let useJournalStore: typeof import("@/lib/stores/journalStore").useJournalStore

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import("@/lib/stores/journalStore")
    useJournalStore = mod.useJournalStore
    mockDeleteTodo.mockClear()
    mockCreateTodo.mockClear()
    mockCreatePage.mockClear()
    useJournalStore.setState({
      currentWorkspaceId: "ws-1",
      workspaceOrder: ["ws-1"],
      workspaceRecentOrder: ["ws-1"],
      workspaces: { "ws-1": makeWorkspace() },
      importantItems: {},
    })
  })

  it("copy mode: copies incomplete todos to today without removing from source", () => {
    const count = useJournalStore.getState().rollOverTodosToToday("copy")

    expect(count).toBe(1)

    const state = useJournalStore.getState()
    const todayTodos = state.workspaces["ws-1"].pages[TODAY].todos
    const pastTodos = state.workspaces["ws-1"].pages[PAST_DATE].todos

    expect(todayTodos).toHaveLength(1)
    expect(todayTodos[0].text).toBe("Incomplete task")
    expect(todayTodos[0].id).toMatch(/^rollover:2026-03-30:/)

    // Source page unchanged
    expect(pastTodos).toHaveLength(2)

    // deleteTodo should NOT be called
    expect(mockDeleteTodo).not.toHaveBeenCalled()
  })

  it("copy mode keeps importance on the source identity only", () => {
    const important: ImportantItemState = {
      todoId: "todo-incomplete",
      isPinned: true,
      isExcluded: false,
      sortOrder: "a0",
      sortParentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    useJournalStore.setState({ importantItems: { "todo-incomplete": important } })

    useJournalStore.getState().rollOverTodosToToday("copy")

    const items = useJournalStore.getState().importantItems
    expect(items["todo-incomplete"]?.isPinned).toBe(true)
    expect(items[`rollover:${TODAY}:todo-incomplete`]).toBeUndefined()
  })

  it("move mode transfers importance to the moved identity", () => {
    const important: ImportantItemState = {
      todoId: "todo-incomplete",
      isPinned: true,
      isExcluded: false,
      sortOrder: "a0",
      sortParentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    useJournalStore.setState({ importantItems: { "todo-incomplete": important } })

    useJournalStore.getState().rollOverTodosToToday("move")

    const items = useJournalStore.getState().importantItems
    expect(items["todo-incomplete"]).toBeUndefined()
    expect(items[`rollover:${TODAY}:todo-incomplete`]?.isPinned).toBe(true)
  })

  it("move mode: copies incomplete todos to today and removes them from source", () => {
    const count = useJournalStore.getState().rollOverTodosToToday("move")

    expect(count).toBe(1)

    const state = useJournalStore.getState()
    const todayTodos = state.workspaces["ws-1"].pages[TODAY].todos
    const pastTodos = state.workspaces["ws-1"].pages[PAST_DATE].todos

    expect(todayTodos).toHaveLength(1)
    expect(todayTodos[0].text).toBe("Incomplete task")

    // Only the done todo remains in source
    expect(pastTodos).toHaveLength(1)
    expect(pastTodos[0].id).toBe("todo-done")

    // deleteTodo called for the incomplete todo
    expect(mockDeleteTodo).toHaveBeenCalledWith("todo-incomplete")
    expect(mockDeleteTodo).not.toHaveBeenCalledWith("todo-done")
  })

  it("move mode: deletes completed descendants in the same block as a moved todo", () => {
    // todo-done is a sibling at level 0, not a child of todo-incomplete, so it stays
    useJournalStore.getState().rollOverTodosToToday("move")

    const pastTodos = useJournalStore.getState().workspaces["ws-1"].pages[PAST_DATE].todos
    // todo-done is NOT in the moved block (it's a separate root), so it stays
    expect(pastTodos.some((t) => t.id === "todo-done")).toBe(true)
    expect(mockDeleteTodo).not.toHaveBeenCalledWith("todo-done")
  })

  it("default (no arg) is copy mode — does not delete source todos", () => {
    useJournalStore.getState().rollOverTodosToToday()
    expect(mockDeleteTodo).not.toHaveBeenCalled()
  })

  it("does not duplicate already rolled-over todos on second run", () => {
    useJournalStore.getState().rollOverTodosToToday("copy")
    const countSecond = useJournalStore.getState().rollOverTodosToToday("copy")

    expect(countSecond).toBe(0)
    const todayTodos = useJournalStore.getState().workspaces["ws-1"].pages[TODAY].todos
    expect(todayTodos).toHaveLength(1)
  })

  it("P2a: move mode deletes source todos even when all were already copied", () => {
    // First run: copy mode — todos are rolled over
    useJournalStore.getState().rollOverTodosToToday("copy")
    expect(mockDeleteTodo).not.toHaveBeenCalled()

    // Second run: move mode — nothing new to copy, but source should still be cleaned up
    mockDeleteTodo.mockClear()
    const count = useJournalStore.getState().rollOverTodosToToday("move")

    expect(count).toBe(0) // nothing new copied
    expect(mockDeleteTodo).toHaveBeenCalledWith("todo-incomplete")

    const pastTodos = useJournalStore.getState().workspaces["ws-1"].pages[PAST_DATE].todos
    expect(pastTodos.some((t) => t.id === "todo-incomplete")).toBe(false)
  })

  it("P2b: move mode deletes completed child todos in the same block as moved parent", async () => {
    // Set up: incomplete parent with a completed child
    useJournalStore.setState({
      currentWorkspaceId: "ws-1",
      workspaceOrder: ["ws-1"],
      workspaceRecentOrder: ["ws-1"],
      workspaces: {
        "ws-1": makeWorkspace({
          pages: {
            [PAST_DATE]: {
              date: PAST_DATE,
              todos: [
                {
                  id: "parent-incomplete",
                  text: "Parent task",
                  status: "todo",
                  level: 0,
                  order: "a0",
                  tags: [],
                  parentId: null,
                  createdAt: new Date("2026-03-28"),
                  updatedAt: new Date("2026-03-28"),
                },
                {
                  id: "child-done",
                  text: "Done subtask",
                  status: "done",
                  level: 1,
                  order: "a1",
                  tags: [],
                  parentId: "parent-incomplete",
                  createdAt: new Date("2026-03-28"),
                  updatedAt: new Date("2026-03-28"),
                },
                {
                  id: "sibling-done",
                  text: "Separate done task",
                  status: "done",
                  level: 0,
                  order: "a2",
                  tags: [],
                  parentId: null,
                  createdAt: new Date("2026-03-28"),
                  updatedAt: new Date("2026-03-28"),
                },
              ],
              createdAt: new Date("2026-03-28"),
              updatedAt: new Date("2026-03-28"),
            },
            [TODAY]: {
              date: TODAY,
              todos: [],
              createdAt: new Date("2026-03-30"),
              updatedAt: new Date("2026-03-30"),
            },
          },
        }),
      },
    })

    useJournalStore.getState().rollOverTodosToToday("move")

    const pastTodos = useJournalStore.getState().workspaces["ws-1"].pages[PAST_DATE].todos

    // parent-incomplete and its child-done are in the same block — both deleted
    expect(pastTodos.some((t) => t.id === "parent-incomplete")).toBe(false)
    expect(pastTodos.some((t) => t.id === "child-done")).toBe(false)
    // sibling-done is a separate top-level root — NOT in any moved block, so stays
    expect(pastTodos.some((t) => t.id === "sibling-done")).toBe(true)

    expect(mockDeleteTodo).toHaveBeenCalledWith("parent-incomplete")
    expect(mockDeleteTodo).toHaveBeenCalledWith("child-done")
    expect(mockDeleteTodo).not.toHaveBeenCalledWith("sibling-done")
  })

  it("returns 0 and does nothing when no incomplete todos exist", () => {
    useJournalStore.setState({
      currentWorkspaceId: "ws-1",
      workspaceOrder: ["ws-1"],
      workspaceRecentOrder: ["ws-1"],
      workspaces: {
        "ws-1": makeWorkspace({
          pages: {
            [PAST_DATE]: {
              date: PAST_DATE,
              todos: [
                {
                  id: "todo-done",
                  text: "Done task",
                  status: "done",
                  level: 0,
                  order: "a0",
                  tags: [],
                  parentId: null,
                  createdAt: new Date("2026-03-28"),
                  updatedAt: new Date("2026-03-28"),
                },
              ],
              createdAt: new Date("2026-03-28"),
              updatedAt: new Date("2026-03-28"),
            },
            [TODAY]: {
              date: TODAY,
              todos: [],
              createdAt: new Date("2026-03-30"),
              updatedAt: new Date("2026-03-30"),
            },
          },
        }),
      },
    })

    const count = useJournalStore.getState().rollOverTodosToToday("move")
    expect(count).toBe(0)
    expect(mockDeleteTodo).not.toHaveBeenCalled()
  })
})
