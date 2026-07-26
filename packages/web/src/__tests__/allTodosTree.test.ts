import { describe, expect, it } from "vitest"
import { buildAllTodosGroups } from "@/lib/utils/allTodosTree"
import type { TodoItem, Workspace } from "@/lib/types/journal"

const now = new Date("2026-07-13T00:00:00Z")

const todo = (
  id: string,
  order: string,
  level: number,
  status: TodoItem["status"] = "todo",
  text: string = id
): TodoItem => ({
  id,
  text,
  status,
  tags: [],
  order,
  level,
  createdAt: now,
  updatedAt: now,
})

const workspace = (
  id: string,
  name: string,
  pages: Record<string, TodoItem[]>
): Workspace => ({
  id,
  name,
  currentDateKey: Object.keys(pages)[0],
  pages: Object.fromEntries(
    Object.entries(pages).map(([dateKey, todos]) => [
      dateKey,
      { date: dateKey, todos, createdAt: now, updatedAt: now },
    ])
  ),
  createdAt: now,
  updatedAt: now,
})

describe("buildAllTodosGroups", () => {
  it("includes only incomplete todos, dropping a done leaf entirely", () => {
    const workspaces = {
      ws: workspace("ws", "Workspace", {
        "2026-07-13": [todo("open", "a0", 0), todo("done", "a1", 0, "done")],
      }),
    }

    const groups = buildAllTodosGroups(workspaces)
    expect(groups).toHaveLength(1)
    expect(groups[0].todos.map((t) => t.id)).toEqual(["open"])
  })

  it("keeps a done parent as context when a descendant is incomplete", () => {
    const workspaces = {
      ws: workspace("ws", "Workspace", {
        "2026-07-13": [
          todo("parent", "a0", 0, "done"),
          todo("child", "a1", 1, "todo"),
        ],
      }),
    }

    const groups = buildAllTodosGroups(workspaces)
    expect(groups[0].todos.map((t) => [t.id, t.depth])).toEqual([
      ["parent", 0],
      ["child", 1],
    ])
  })

  it("skips blank incomplete todos", () => {
    const workspaces = {
      ws: workspace("ws", "Workspace", {
        "2026-07-13": [todo("blank", "a0", 0, "todo", "   "), todo("real", "a1", 0)],
      }),
    }

    const groups = buildAllTodosGroups(workspaces)
    expect(groups[0].todos.map((t) => t.id)).toEqual(["real"])
  })

  it("orders groups chronologically across dates and workspaces", () => {
    const workspaces = {
      wsB: workspace("wsB", "B", { "2026-07-14": [todo("later", "a0", 0)] }),
      wsA: workspace("wsA", "A", { "2026-07-12": [todo("earliest", "a0", 0)] }),
    }

    const groups = buildAllTodosGroups(workspaces)
    expect(groups.map((g) => [g.dateKey, g.todos[0].id])).toEqual([
      ["2026-07-12", "earliest"],
      ["2026-07-14", "later"],
    ])
  })

  it("returns no groups when nothing is incomplete", () => {
    const workspaces = {
      ws: workspace("ws", "Workspace", { "2026-07-13": [todo("done", "a0", 0, "done")] }),
    }

    expect(buildAllTodosGroups(workspaces)).toEqual([])
  })

  it("orders groups newest-first when direction is date-desc", () => {
    const workspaces = {
      wsB: workspace("wsB", "B", { "2026-07-14": [todo("later", "a0", 0)] }),
      wsA: workspace("wsA", "A", { "2026-07-12": [todo("earliest", "a0", 0)] }),
    }

    const groups = buildAllTodosGroups(workspaces, "date-desc")
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-07-14", "2026-07-12"])
  })
})
