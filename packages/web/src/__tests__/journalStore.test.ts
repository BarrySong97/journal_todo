import { describe, it, expect, beforeEach, vi } from "vitest"
import { useJournalStore, splitTodoParagraphs } from "../lib/stores/journalStore"
import { getTodayKey, formatDateKey } from "../lib/utils/dateUtils"
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

const setStoreStateWithDate = (dateKey: string, todos: TodoItem[], workspaceId = "ws-test") => {
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
    currentDateKey: getTodayKey(),
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

  it("updateTodoLevel indents a parent with its children", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    const { updateTodoLevel } = useJournalStore.getState()
    updateTodoLevel("p2", "indent", dateKey)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const parent = todos.find((t) => t.id === "p2")
    expect(parent?.level).toBe(1)
  })

  it("updateTodoLevel outdents a parent with its children", () => {
    const { dateKey, workspaceId } = setStoreState([
      makeTodo("p1", "a0", 0, null),
      makeTodo("p2", "a1", 1, "p1"),
      makeTodo("c1", "a1V", 2, "p2"),
    ])

    const { updateTodoLevel } = useJournalStore.getState()
    updateTodoLevel("p2", "outdent", dateKey)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const parent = todos.find((t) => t.id === "p2")
    const child = todos.find((t) => t.id === "c1")

    expect(parent?.level).toBe(0)
    expect(child?.level).toBe(1)
  })

  it("rollOverTodosToToday moves yesterday todos and preserves structure", () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterday)
    const todayKey = getTodayKey()

    const { workspaceId } = setStoreStateWithDate(yesterdayKey, [
      makeTodo("p1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "p1"),
      makeTodo("p2", "a1", 0, null),
    ])

    // Ensure today page exists
    useJournalStore.setState((state) => {
      const ws = state.workspaces[workspaceId]
      if (!ws) return
      ws.pages[todayKey] = {
        date: todayKey,
        todos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    const { rollOverTodosToToday } = useJournalStore.getState()
    const movedCount = rollOverTodosToToday()

    const ws = useJournalStore.getState().workspaces[workspaceId]
    const todayPage = ws.pages[todayKey]
    const yesterdayPage = ws.pages[yesterdayKey]

    expect(movedCount).toBe(3)
    expect(todayPage.todos.map((t) => t.id)).toEqual(["p1", "c1", "p2"])
    expect(todayPage.todos.find((t) => t.id === "p1")?.level).toBe(0)
    expect(todayPage.todos.find((t) => t.id === "c1")?.level).toBe(1)
    expect(yesterdayPage.todos).toHaveLength(0)
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

describe("journalStore paste handling", () => {
  it("splitTodoParagraphs handles blank lines and line breaks", () => {
    expect(splitTodoParagraphs("one\ntwo")).toEqual(["one", "two"])
    expect(splitTodoParagraphs("one\r\ntwo\r\n")).toEqual(["one", "two"])
    expect(splitTodoParagraphs("one line\ncontinues\n\nsecond\n\n\nthird")).toEqual([
      "one line continues",
      "second",
      "third",
    ])
  })

  it("pasteTodoText splits multi-paragraph paste into new todos", () => {
    const { workspaceId, dateKey } = setStoreState([
      makeTodo("t1", "a0", 0, null),
      makeTodo("c1", "a0V", 1, "t1"),
      makeTodo("t2", "a1", 0, null),
    ])

    const { updateTodoText, pasteTodoText } = useJournalStore.getState()
    updateTodoText("t1", "Hello ", dateKey)

    const handled = pasteTodoText("t1", "A\nB\nC", 6, 6, dateKey)
    expect(handled).toBe(true)

    const todos = useJournalStore.getState().workspaces[workspaceId].pages[dateKey].todos
    const sorted = sortByOrder(todos)

    expect(sorted).toHaveLength(5)
    expect(sorted[0].id).toBe("t1")
    expect(sorted[1].id).toBe("c1")
    expect(sorted[4].id).toBe("t2")
    expect(sorted[0].text).toBe("Hello A")

    const inserted = sorted.filter((todo) => todo.text === "B" || todo.text === "C")
    expect(inserted).toHaveLength(2)
    expect(inserted.every((todo) => todo.level === 0)).toBe(true)
  })
})
