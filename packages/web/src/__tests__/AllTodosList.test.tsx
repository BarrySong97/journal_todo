// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import type { TodoItem, Workspace } from "@/lib/types/journal"

const journalMocks = vi.hoisted(() => ({
  setAllTodosScope: vi.fn(),
  updateTodoTextById: vi.fn(),
  toggleTodoById: vi.fn(),
  toggleImportant: vi.fn(),
}))

const scopeState = vi.hoisted(() => ({ current: "all" as "all" | "workspace" }))

const now = new Date("2026-07-15T00:00:00Z")
const todo = (id: string, text: string, order: string): TodoItem => ({
  id,
  text,
  status: "todo",
  tags: [],
  order,
  level: 0,
  createdAt: now,
  updatedAt: now,
})

const workspace = (id: string, name: string, dateKey: string, todos: TodoItem[]): Workspace => ({
  id,
  name,
  currentDateKey: dateKey,
  pages: {
    [dateKey]: { date: dateKey, todos, createdAt: now, updatedAt: now },
  },
  createdAt: now,
  updatedAt: now,
})

const workspaces = {
  work: workspace("work", "Work", "2026-07-14", [todo("w1", "Ship release", "a0")]),
  life: workspace("life", "Life", "2026-07-15", [
    todo("l1", "Book flight", "a0"),
    todo("l2", "Renew passport", "a1"),
  ]),
}

vi.mock("@/hooks/useJournal", () => ({
  useJournal: () => ({
    workspaces,
    importantItems: {},
    workspaceOrder: ["work", "life"],
    currentWorkspaceId: "work",
    allTodosSortDirection: "date-asc",
    allTodosScope: scopeState.current,
    ...journalMocks,
  }),
}))

import { AllTodosList } from "@/components/journal/AllTodosList"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  scopeState.current = "all"
})

describe("AllTodosList workspace scope", () => {
  it("shows every workspace with its name label when scope is all", () => {
    const { queryByDisplayValue, container } = render(<AllTodosList />)

    expect(queryByDisplayValue("Ship release")).not.toBeNull()
    expect(queryByDisplayValue("Book flight")).not.toBeNull()
    expect(container.textContent).toContain("· Work")
    expect(container.textContent).toContain("· Life")
    expect(container.textContent).not.toContain("more in other workspaces")
  })

  it("keeps only the current workspace and drops the now-redundant name label when scoped", () => {
    scopeState.current = "workspace"
    const { queryByDisplayValue, container } = render(<AllTodosList />)

    expect(queryByDisplayValue("Ship release")).not.toBeNull()
    expect(queryByDisplayValue("Book flight")).toBeNull()
    expect(container.textContent).not.toContain("· Work")
  })

  it("surfaces the hidden count and restores the full list when it is clicked", () => {
    scopeState.current = "workspace"
    const { getByText } = render(<AllTodosList />)

    const notice = getByText("2 more in other workspaces")
    fireEvent.click(notice)

    expect(journalMocks.setAllTodosScope).toHaveBeenCalledWith("all")
  })
})
