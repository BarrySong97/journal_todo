import { describe, it, expect, beforeEach, vi } from "vitest"
import { useJournalStore } from "../lib/stores/journalStore"
import { getTodayKey } from "../lib/utils/dateUtils"
import type { JournalPage, TodoItem, Workspace } from "../lib/types/journal"

const apiMocks = vi.hoisted(() => ({
  initializeStorage: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  getWorkspaces: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createWorkspace: vi.fn().mockImplementation(async (workspace: Workspace) => ({
    success: true,
    data: workspace,
  })),
  updateWorkspace: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  deleteWorkspace: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  createPage: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  createTodo: vi.fn().mockImplementation(async (_wsId: string, _date: string, todo: TodoItem) => ({
    success: true,
    data: todo,
  })),
  updateTodo: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  deleteTodo: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock("@journal-todo/api", () => apiMocks)

const makeTodo = (
  id: string,
  order: string,
  level: number,
  parentId: string | null = null
): TodoItem => ({
  id,
  text: id,
  status: "todo",
  tags: [],
  order,
  level,
  parentId,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const setStoreState = (todos: TodoItem[]) => {
  const dateKey = getTodayKey()
  const workspaceId = "ws-test"
  const page: JournalPage = {
    date: dateKey,
    todos,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const workspace: Workspace = {
    id: workspaceId,
    name: "Test",
    pages: { [dateKey]: page },
    currentDateKey: dateKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  useJournalStore.setState({
    currentWorkspaceId: workspaceId,
    workspaceOrder: [workspaceId],
    workspaceRecentOrder: [workspaceId],
    workspaces: { [workspaceId]: workspace },
  })

  return { workspaceId, dateKey }
}

const sortByOrder = (todos: TodoItem[]) =>
  [...todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))

describe("journalStore reorder and hierarchy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("moves a todo to the top with beforeId null", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("t1", "a0", 0),
      makeTodo("t2", "a1", 0),
      makeTodo("t3", "a2", 0),
    ])

    const { reorderTodos } = useJournalStore.getState()
    reorderTodos("t3", null, "t1", 0, dateKey)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const sorted = sortByOrder(todos)
    expect(sorted[0].id).toBe("t3")
  })

  it("moves parent with children as a block and keeps parentId", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    const { reorderTodos } = useJournalStore.getState()
    reorderTodos("p1", "p2", null, 0, dateKey)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const sorted = sortByOrder(todos)
    expect(sorted.map((t) => t.id)).toEqual(["p2", "p1", "c1"])

    const child = todos.find((t) => t.id === "c1")
    expect(child?.parentId).toBe("p1")
    expect(child?.level).toBe(1)
  })

  it("clamps depth when parent chain is missing", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    const { reorderTodos } = useJournalStore.getState()
    reorderTodos("c1", null, "p1", 3, dateKey)

    const todo = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos.find((t) => t.id === "c1")
    expect(todo?.level).toBeLessThanOrEqual(1)
  })

  it("moveTodo moves a subtree block together", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    const { moveTodo } = useJournalStore.getState()
    moveTodo("p1", "down", dateKey)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const sorted = sortByOrder(todos)
    expect(sorted.map((t) => t.id)).toEqual(["p2", "p1", "c1"])
  })

  it("updateTodoLevel only allows indent relative to previous item", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("p2", "a1", 0, null),
    ])

    const { updateTodoLevel } = useJournalStore.getState()
    updateTodoLevel("p1", "indent", dateKey)

    const todo = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos.find((t) => t.id === "p1")
    expect(todo?.level).toBe(0)
  })

  it("persists reorder changes for each moved item", () => {
    const { dateKey } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    const { reorderTodos } = useJournalStore.getState()
    reorderTodos("p1", "p2", null, 0, dateKey)

    expect(apiMocks.updateTodo).toHaveBeenCalled()
  })
})
