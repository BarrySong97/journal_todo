// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTodoKeyboard, splitTodoTextForEnter } from "../hooks/useTodoKeyboard"
import type { TodoItem } from "../lib/types/journal"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"

const makeTodo = (id: string, text: string, level = 0): TodoItem => ({
  id,
  text,
  status: "todo",
  tags: [],
  order: "a0",
  level,
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe("splitTodoTextForEnter", () => {
  it("returns null when cursor is at end", () => {
    expect(splitTodoTextForEnter("hello", 5, 5)).toBeNull()
  })

  it("splits at start and middle", () => {
    expect(splitTodoTextForEnter("hello", 0, 0)).toEqual({ before: "", after: "hello" })
    expect(splitTodoTextForEnter("hello", 2, 2)).toEqual({ before: "he", after: "llo" })
  })
})

describe("useTodoKeyboard Enter behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("splits when Enter at start", () => {
    const updateTodoText = vi.fn()
    const addTodo = vi.fn().mockReturnValue("new-id")
    const setActiveTodoId = vi.fn()
    const focusTodo = vi.fn()

    const todos = [makeTodo("t1", "hello")]
    const { result } = renderHook(() =>
      useTodoKeyboard({
        todos,
        activeTodoId: "t1",
        focusTodo,
        addTodo,
        updateTodoText,
        deleteTodo: vi.fn(),
        moveTodo: vi.fn(),
        updateTodoLevel: vi.fn(),
        setActiveTodoId,
        selectedTodoIds: [],
        copySelectedTodos: vi.fn(),
      })
    )

    const textarea = document.createElement("textarea")
    textarea.value = "hello"
    textarea.selectionStart = 0
    textarea.selectionEnd = 0

    act(() => {
      result.current.handleKeyDown(
        {
          key: "Enter",
          preventDefault: vi.fn(),
          target: textarea,
        } as unknown as ReactKeyboardEvent<HTMLTextAreaElement>,
        "t1"
      )
    })

    expect(updateTodoText).toHaveBeenCalledWith("t1", "")
    expect(addTodo).toHaveBeenCalledWith("hello", "t1", undefined, 0)
    expect(setActiveTodoId).toHaveBeenCalledWith("new-id")
  })

  it("splits when Enter in middle", () => {
    const updateTodoText = vi.fn()
    const addTodo = vi.fn().mockReturnValue("new-id")
    const setActiveTodoId = vi.fn()
    const focusTodo = vi.fn()

    const todos = [makeTodo("t1", "hello world")]
    const { result } = renderHook(() =>
      useTodoKeyboard({
        todos,
        activeTodoId: "t1",
        focusTodo,
        addTodo,
        updateTodoText,
        deleteTodo: vi.fn(),
        moveTodo: vi.fn(),
        updateTodoLevel: vi.fn(),
        setActiveTodoId,
        selectedTodoIds: [],
        copySelectedTodos: vi.fn(),
      })
    )

    const textarea = document.createElement("textarea")
    textarea.value = "hello world"
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    act(() => {
      result.current.handleKeyDown(
        {
          key: "Enter",
          preventDefault: vi.fn(),
          target: textarea,
        } as unknown as ReactKeyboardEvent<HTMLTextAreaElement>,
        "t1"
      )
    })

    expect(updateTodoText).toHaveBeenCalledWith("t1", "hello")
    expect(addTodo).toHaveBeenCalledWith(" world", "t1", undefined, 0)
  })

  it("does not split when Enter at end", () => {
    const updateTodoText = vi.fn()
    const addTodo = vi.fn().mockReturnValue("new-id")
    const setActiveTodoId = vi.fn()
    const focusTodo = vi.fn()

    const todos = [makeTodo("t1", "hello")]
    const { result } = renderHook(() =>
      useTodoKeyboard({
        todos,
        activeTodoId: "t1",
        focusTodo,
        addTodo,
        updateTodoText,
        deleteTodo: vi.fn(),
        moveTodo: vi.fn(),
        updateTodoLevel: vi.fn(),
        setActiveTodoId,
        selectedTodoIds: [],
        copySelectedTodos: vi.fn(),
      })
    )

    const textarea = document.createElement("textarea")
    textarea.value = "hello"
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    act(() => {
      result.current.handleKeyDown(
        {
          key: "Enter",
          preventDefault: vi.fn(),
          target: textarea,
        } as unknown as ReactKeyboardEvent<HTMLTextAreaElement>,
        "t1"
      )
    })

    expect(updateTodoText).not.toHaveBeenCalled()
    expect(addTodo).toHaveBeenCalledWith("", "t1", undefined, 0)
  })
})
