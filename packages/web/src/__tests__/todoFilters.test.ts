import { describe, expect, it } from "vitest"
import {
  countIncompleteMeaningfulTodos,
  hasMeaningfulTodoText,
  isIncompleteMeaningfulTodo,
  isMeaningfulTodo,
} from "@/lib/utils/todoFilters"

describe("todoFilters", () => {
  it("treats blank text as non-meaningful", () => {
    expect(hasMeaningfulTodoText("")).toBe(false)
    expect(hasMeaningfulTodoText("   ")).toBe(false)
    expect(hasMeaningfulTodoText("task")).toBe(true)
  })

  it("identifies meaningful and incomplete todos", () => {
    expect(isMeaningfulTodo({ text: " " })).toBe(false)
    expect(isMeaningfulTodo({ text: "todo" })).toBe(true)
    expect(isIncompleteMeaningfulTodo({ status: "done", text: "todo" })).toBe(false)
    expect(isIncompleteMeaningfulTodo({ status: "todo", text: " " })).toBe(false)
    expect(isIncompleteMeaningfulTodo({ status: "todo", text: "todo" })).toBe(true)
  })

  it("counts only incomplete meaningful todos", () => {
    const todos = [
      { status: "todo", text: "a" },
      { status: "todo", text: "   " },
      { status: "done", text: "b" },
      { status: "todo", text: "c" },
      { status: "done", text: "   " },
    ]

    expect(countIncompleteMeaningfulTodos(todos)).toBe(2)
    expect(countIncompleteMeaningfulTodos([])).toBe(0)
    expect(countIncompleteMeaningfulTodos(undefined)).toBe(0)
  })
})
