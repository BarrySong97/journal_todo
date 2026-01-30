// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, fireEvent, createEvent } from "@testing-library/react"
import { TodoItem } from "../components/journal/TodoItem"
import type { FlattenedTodo } from "../components/journal/todoTreeUtils"

const makeTodo = (overrides?: Partial<FlattenedTodo>): FlattenedTodo => ({
  id: "todo-1",
  text: "hello",
  status: "todo",
  tags: [],
  order: "a0",
  level: 0,
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  depth: 0,
  ...overrides,
})

describe("TodoItem UI", () => {
  it("calls onTextChange when textarea changes", () => {
    const onTextChange = vi.fn()
    const onPasteTodo = vi.fn().mockReturnValue(false)

    const { getByPlaceholderText } = render(
      <TodoItem
        todo={makeTodo()}
        depth={0}
        isActive={false}
        isSelected={false}
        isParent={false}
        isCollapsed={false}
        onTextChange={onTextChange}
        onToggle={vi.fn()}
        onKeyDown={vi.fn()}
        onPasteTodo={onPasteTodo}
        onFocus={vi.fn()}
        inputRef={vi.fn()}
      />
    )

    const textarea = getByPlaceholderText("Type your todo here...") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "updated" } })

    expect(onTextChange).toHaveBeenCalledWith("todo-1", "updated")
  })

  it("calls onPasteTodo and prevents default when handled", () => {
    const onTextChange = vi.fn()
    const onPasteTodo = vi.fn().mockReturnValue(true)

    const { getByPlaceholderText } = render(
      <TodoItem
        todo={makeTodo({ text: "hello world" })}
        depth={0}
        isActive={false}
        isSelected={false}
        isParent={false}
        isCollapsed={false}
        onTextChange={onTextChange}
        onToggle={vi.fn()}
        onKeyDown={vi.fn()}
        onPasteTodo={onPasteTodo}
        onFocus={vi.fn()}
        inputRef={vi.fn()}
      />
    )

    const textarea = getByPlaceholderText("Type your todo here...") as HTMLTextAreaElement
    textarea.selectionStart = 6
    textarea.selectionEnd = 11

    const pasteEvent = createEvent.paste(textarea, {
      clipboardData: {
        getData: () => "line1\nline2",
      },
    })

    fireEvent(textarea, pasteEvent)

    expect(onPasteTodo).toHaveBeenCalledWith("todo-1", "line1\nline2", 6, 11)
    expect(pasteEvent.defaultPrevented).toBe(true)
  })
})
