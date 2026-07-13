import { describe, expect, it } from "vitest"
import { buildImportantTree } from "@/lib/utils/importantTree"
import type { ImportantItemState, TodoItem, Workspace } from "@/lib/types/journal"

const now = new Date("2026-07-13T00:00:00Z")

const todo = (id: string, order: string, level: number): TodoItem => ({
  id,
  text: id,
  status: "todo",
  tags: [],
  order,
  level,
  createdAt: now,
  updatedAt: now,
})

const workspace = (todos: TodoItem[]): Record<string, Workspace> => ({
  workspace: {
    id: "workspace",
    name: "Workspace",
    currentDateKey: "2026-07-13",
    pages: {
      "2026-07-13": {
        date: "2026-07-13",
        todos,
        createdAt: now,
        updatedAt: now,
      },
    },
    createdAt: now,
    updatedAt: now,
  },
})

const metadata = (
  todoId: string,
  overrides: Partial<ImportantItemState> = {}
): ImportantItemState => ({
  todoId,
  isPinned: true,
  isExcluded: false,
  sortOrder: null,
  sortParentId: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

describe("buildImportantTree", () => {
  it("includes a pinned live subtree and normalizes its root depth", () => {
    const workspaces = workspace([
      todo("outside", "a0", 0),
      todo("parent", "a1", 1),
      todo("child", "a2", 2),
    ])
    const result = buildImportantTree(workspaces, { parent: metadata("parent") })

    expect(result.todos.map(({ id, depth }) => [id, depth])).toEqual([
      ["parent", 0],
      ["child", 1],
    ])
    expect(result.states.parent).toBe("explicit")
    expect(result.states.child).toBe("inherited")
  })

  it("deduplicates a nested pin and promotes it when the ancestor is unpinned", () => {
    const workspaces = workspace([
      todo("parent", "a0", 0),
      todo("child", "a1", 1),
      todo("grandchild", "a2", 2),
    ])
    const nested = buildImportantTree(workspaces, {
      parent: metadata("parent"),
      child: metadata("child"),
    })
    expect(nested.todos.map((item) => item.id)).toEqual(["parent", "child", "grandchild"])
    expect(nested.states.child).toBe("explicit")

    const promoted = buildImportantTree(workspaces, { child: metadata("child") })
    expect(promoted.todos.map(({ id, depth }) => [id, depth])).toEqual([
      ["child", 0],
      ["grandchild", 1],
    ])
  })

  it("excludes an inherited subtree but preserves explicitly pinned descendants", () => {
    const workspaces = workspace([
      todo("parent", "a0", 0),
      todo("excluded", "a1", 1),
      todo("pinned-descendant", "a2", 2),
    ])
    const result = buildImportantTree(workspaces, {
      parent: metadata("parent"),
      excluded: metadata("excluded", { isPinned: false, isExcluded: true }),
      "pinned-descendant": metadata("pinned-descendant"),
    })

    expect(result.todos.map(({ id, depth }) => [id, depth])).toEqual([
      ["parent", 0],
      ["pinned-descendant", 0],
    ])
  })

  it("uses Important sibling order without changing hierarchy", () => {
    const workspaces = workspace([
      todo("parent", "a0", 0),
      todo("first", "a1", 1),
      todo("second", "a2", 1),
    ])
    const result = buildImportantTree(workspaces, {
      parent: metadata("parent"),
      first: metadata("first", { isPinned: false, sortOrder: "a2", sortParentId: "parent" }),
      second: metadata("second", { isPinned: false, sortOrder: "a1", sortParentId: "parent" }),
    })

    expect(result.todos.map((item) => item.id)).toEqual(["parent", "second", "first"])
    expect(result.todos.slice(1).every((item) => item.parentId === "parent")).toBe(true)
  })
})
