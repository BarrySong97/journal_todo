// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import type { ImportantItemState, TodoItem, Workspace } from "@/lib/types/journal"

const journalMocks = vi.hoisted(() => ({
  reorderImportant: vi.fn(),
  moveImportant: vi.fn(),
  updateTodoTextById: vi.fn(),
  toggleTodoById: vi.fn(),
  removeFromImportant: vi.fn(),
  restoreImportantItem: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

const now = new Date("2026-07-15T00:00:00Z")
const todo = (id: string, text: string, order: string, level: number): TodoItem => ({
  id,
  text,
  status: "todo",
  tags: [],
  order,
  level,
  createdAt: now,
  updatedAt: now,
})
const important = (todoId: string): ImportantItemState => ({
  todoId,
  isPinned: true,
  isExcluded: false,
  sortOrder: null,
  sortParentId: null,
  createdAt: now,
  updatedAt: now,
})

const todos = [
  todo("parent", "Parent", "a0", 0),
  todo("child", "Child", "a1", 1),
  todo("sibling", "Sibling", "a2", 0),
]
const workspace: Workspace = {
  id: "workspace",
  name: "Workspace",
  currentDateKey: "2026-07-15",
  pages: {
    "2026-07-15": {
      date: "2026-07-15",
      todos,
      createdAt: now,
      updatedAt: now,
    },
  },
  createdAt: now,
  updatedAt: now,
}

vi.mock("@/hooks/useJournal", () => ({
  useJournal: () => ({
    workspaces: { workspace },
    importantItems: {
      parent: important("parent"),
      sibling: important("sibling"),
    },
    ...journalMocks,
  }),
}))

vi.mock("@/hooks/useTodoFocus", () => ({
  useTodoFocus: () => ({
    setTodoRef: vi.fn(),
    focusTodo: vi.fn(),
  }),
}))

vi.mock("sonner", () => toastMocks)

import { ImportantTodoList } from "@/components/journal/ImportantTodoList"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("ImportantTodoList multi-select copy", () => {
  it("copies a shift-selected row range with tree indentation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    const { container, getByDisplayValue } = render(<ImportantTodoList />)
    fireEvent.focus(getByDisplayValue("Parent"))

    const siblingRow = container.querySelector('[data-todo-id="sibling"]') as HTMLDivElement
    fireEvent.mouseDown(siblingRow, { shiftKey: true })
    fireEvent.keyDown(window, { key: "c", ctrlKey: true })

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Parent\n  Child\nSibling")
    })
    expect(toastMocks.toast.success).toHaveBeenCalledWith("Copied 3 items")
  })
})
