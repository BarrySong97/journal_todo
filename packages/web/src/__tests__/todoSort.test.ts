import { describe, expect, it } from "vitest"
import { partitionByStatus, sortTodoTreeOrder } from "@/lib/utils/todoSort"
import type { TodoItem } from "@/lib/types/journal"

const todo = (
  id: string,
  order: string,
  level: number,
  parentId: string | null,
  status: TodoItem["status"] = "todo"
): TodoItem => ({
  id,
  text: id,
  status,
  tags: [],
  order,
  level,
  parentId,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
})

describe("partitionByStatus", () => {
  it("groups incomplete first while preserving relative order within each group", () => {
    const items = [
      { id: "a", status: "done" as const },
      { id: "b", status: "todo" as const },
      { id: "c", status: "done" as const },
      { id: "d", status: "todo" as const },
    ]
    expect(partitionByStatus(items, "incomplete-first").map((i) => i.id)).toEqual(["b", "d", "a", "c"])
    expect(partitionByStatus(items, "incomplete-last").map((i) => i.id)).toEqual(["a", "c", "b", "d"])
  })
})

describe("sortTodoTreeOrder", () => {
  it("keeps a child nested directly under its reordered parent", () => {
    const todos = [
      todo("p1", "a0", 0, null),
      { ...todo("p2", "a1", 0, null), status: "done" as const },
      todo("c1", "a1V", 1, "p2"),
      todo("p3", "a2", 0, null),
    ]
    expect(sortTodoTreeOrder(todos, "incomplete-first").map((t) => t.id)).toEqual(["p1", "p3", "p2", "c1"])
  })
})
