import { describe, expect, it } from "vitest"
import {
  expandSelectionToSubtrees,
  extendSelectionByRow,
  getRowRange,
  getSubtreeIds,
  getSweepSelection,
  serializeSelectedTodos,
} from "@/lib/utils/todoSelection"

const row = (id: string, level = 0, text = id) => ({ id, level, text })

const rows = [
  row("a"),
  row("b"),
  row("c"),
  row("d"),
]

// a > a1 > a1x, b, c > c1 — level-based tree
const tree = [
  row("a", 0),
  row("a1", 1),
  row("a1x", 2),
  row("b", 0),
  row("c", 0),
  row("c1", 1),
]

describe("getRowRange", () => {
  it("returns forward and backward inclusive ranges", () => {
    expect(getRowRange(rows, "a", "c")).toEqual(["a", "b", "c"])
    expect(getRowRange(rows, "c", "a")).toEqual(["a", "b", "c"])
  })

  it("returns a single row when anchor equals focus", () => {
    expect(getRowRange(rows, "b", "b")).toEqual(["b"])
  })

  it("falls back when anchor or focus is missing", () => {
    expect(getRowRange(rows, "missing", "b")).toEqual(["b"])
    expect(getRowRange(rows, "a", "missing")).toEqual([])
  })
})

describe("getSubtreeIds", () => {
  it("returns the contiguous level-based block", () => {
    expect(getSubtreeIds(tree, "a")).toEqual(["a", "a1", "a1x"])
    expect(getSubtreeIds(tree, "a1")).toEqual(["a1", "a1x"])
    expect(getSubtreeIds(tree, "b")).toEqual(["b"])
  })

  it("returns empty for unknown ids", () => {
    expect(getSubtreeIds(tree, "missing")).toEqual([])
  })
})

describe("expandSelectionToSubtrees", () => {
  it("pulls in all descendants of a selected parent", () => {
    expect([...expandSelectionToSubtrees(tree, new Set(["a"]))]).toEqual(["a", "a1", "a1x"])
  })

  it("does not pull in the parent when only a child is selected", () => {
    expect([...expandSelectionToSubtrees(tree, new Set(["a1"]))]).toEqual(["a1", "a1x"])
  })

  it("stops at the next same-level sibling", () => {
    expect([...expandSelectionToSubtrees(tree, new Set(["c"]))]).toEqual(["c", "c1"])
  })

  it("deduplicates nested selections inside a selected block", () => {
    expect([...expandSelectionToSubtrees(tree, new Set(["a", "a1x", "b"]))]).toEqual([
      "a",
      "a1",
      "a1x",
      "b",
    ])
  })
})

describe("getSweepSelection", () => {
  it("stays inactive over the origin row or no row", () => {
    expect(getSweepSelection(rows, "b", null)).toBeNull()
    expect(getSweepSelection(rows, "b", "b")).toBeNull()
  })

  it("activates once the pointer enters a different row", () => {
    expect(getSweepSelection(rows, "b", "d")).toEqual(["b", "c", "d"])
    expect(getSweepSelection(rows, "c", "a")).toEqual(["a", "b", "c"])
  })

  it("returns null for unknown rows", () => {
    expect(getSweepSelection(rows, "b", "missing")).toBeNull()
  })
})

describe("extendSelectionByRow", () => {
  it("extends the focus end one visible row at a time", () => {
    expect(extendSelectionByRow(rows, "b", "b", "down")).toEqual({
      focusId: "c",
      selectedIds: ["b", "c"],
    })
    expect(extendSelectionByRow(rows, "b", "c", "down")).toEqual({
      focusId: "d",
      selectedIds: ["b", "c", "d"],
    })
  })

  it("shrinks when reversing toward the anchor and flips past it", () => {
    expect(extendSelectionByRow(rows, "b", "d", "up")).toEqual({
      focusId: "c",
      selectedIds: ["b", "c"],
    })
    expect(extendSelectionByRow(rows, "b", "b", "up")).toEqual({
      focusId: "a",
      selectedIds: ["a", "b"],
    })
  })

  it("no-ops at the first and last row", () => {
    expect(extendSelectionByRow(rows, "b", "a", "up")).toBeNull()
    expect(extendSelectionByRow(rows, "b", "d", "down")).toBeNull()
  })
})

describe("serializeSelectedTodos", () => {
  it("includes hidden descendants with absolute indentation", () => {
    const effective = expandSelectionToSubtrees(tree, new Set(["a"]))
    expect(serializeSelectedTodos(tree, effective)).toBe("a\n  a1\n    a1x")
  })

  it("skips whitespace-only rows and returns null when empty", () => {
    const blankRows = [row("x", 0, "  "), row("y", 1, "")]
    expect(serializeSelectedTodos(blankRows, new Set(["x", "y"]))).toBeNull()
  })
})
