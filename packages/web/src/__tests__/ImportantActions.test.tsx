// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ImportantItemState, TodoItem, Workspace } from "@/lib/types/journal"

const journalMocks = vi.hoisted(() => ({
  clearImportantItems: vi.fn(),
  restoreImportantItems: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  toast: vi.fn(),
}))

const now = new Date("2026-07-22T00:00:00Z")
const makeTodo = (id: string, status: TodoItem["status"], order: string): TodoItem => ({
  id,
  text: id,
  status,
  tags: [],
  order,
  level: 0,
  createdAt: now,
  updatedAt: now,
})
const workspace: Workspace = {
  id: "workspace",
  name: "Workspace",
  currentDateKey: "2026-07-22",
  pages: {
    "2026-07-22": {
      date: "2026-07-22",
      todos: [makeTodo("open", "todo", "a0"), makeTodo("done", "done", "a1")],
      createdAt: now,
      updatedAt: now,
    },
  },
  createdAt: now,
  updatedAt: now,
}
const important = (todoId: string): ImportantItemState => ({
  todoId,
  isPinned: true,
  isExcluded: false,
  sortOrder: null,
  sortParentId: null,
  createdAt: now,
  updatedAt: now,
})

vi.mock("@/hooks/useJournal", () => ({
  useJournal: () => ({
    workspaces: { workspace },
    importantItems: { open: important("open"), done: important("done") },
    ...journalMocks,
  }),
}))

vi.mock("sonner", () => toastMocks)

import { ImportantActions } from "@/components/journal/ImportantActions"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ImportantActions", () => {
  it("offers tooltips for all three bulk actions and wires Undo", async () => {
    const previous = { open: important("open") }
    journalMocks.clearImportantItems.mockReturnValue({ count: 1, previous })
    render(<ImportantActions />)

    expect(screen.getByRole("button", { name: "Clear incomplete" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Clear completed" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Clear all" })).toBeTruthy()

    fireEvent.focus(screen.getByRole("button", { name: "Clear incomplete" }))
    await waitFor(() => expect(screen.getByText("Clear incomplete")).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Clear incomplete" }))
    expect(journalMocks.clearImportantItems).toHaveBeenCalledWith("incomplete")
    const toastOptions = toastMocks.toast.mock.calls[0][1]
    toastOptions.action.onClick()
    expect(journalMocks.restoreImportantItems).toHaveBeenCalledWith(previous)
  })
})
