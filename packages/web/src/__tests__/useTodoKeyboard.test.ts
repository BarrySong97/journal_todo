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

describe("useTodoKeyboard arrow behavior", () => {
  const renderKeyboard = (overrides: Partial<Parameters<typeof useTodoKeyboard>[0]> = {}) => {
    const todos = [makeTodo("t1", "hello"), makeTodo("t2", "world")]
    const moveTodo = vi.fn()
    const onStartRowSelection = vi.fn()
    const focusTodo = vi.fn()
    const setActiveTodoId = vi.fn()
    const { result } = renderHook(() =>
      useTodoKeyboard({
        todos,
        activeTodoId: "t1",
        focusTodo,
        addTodo: vi.fn(),
        updateTodoText: vi.fn(),
        deleteTodo: vi.fn(),
        moveTodo,
        updateTodoLevel: vi.fn(),
        setActiveTodoId,
        selectedTodoIds: [],
        copySelectedTodos: vi.fn(),
        onStartRowSelection,
        parentIds: new Set(),
        collapsedIds: new Set(),
        allTodos: todos,
        ...overrides,
      })
    )
    return { result, moveTodo, onStartRowSelection, focusTodo, setActiveTodoId }
  }

  const makeArrowEvent = (
    key: "ArrowUp" | "ArrowDown",
    textarea: HTMLTextAreaElement,
    modifiers: Partial<ReactKeyboardEvent<HTMLTextAreaElement>> = {}
  ) => ({
    key,
    altKey: false,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    preventDefault: vi.fn(),
    target: textarea,
    ...modifiers,
  }) as unknown as ReactKeyboardEvent<HTMLTextAreaElement> & { preventDefault: ReturnType<typeof vi.fn> }

  const makeTextarea = (value: string, selectionStart: number, selectionEnd = selectionStart) => {
    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.selectionStart = selectionStart
    textarea.selectionEnd = selectionEnd
    return textarea
  }

  it("starts row selection on Shift+ArrowDown at end of text", () => {
    const { result, onStartRowSelection } = renderKeyboard()
    const event = makeArrowEvent("ArrowDown", makeTextarea("hello", 5), { shiftKey: true })

    act(() => result.current.handleKeyDown(event, "t1"))

    expect(event.preventDefault).toHaveBeenCalled()
    expect(onStartRowSelection).toHaveBeenCalledWith("t1")
  })

  it("keeps native text selection on Shift+ArrowDown mid-text", () => {
    const { result, onStartRowSelection } = renderKeyboard()
    const event = makeArrowEvent("ArrowDown", makeTextarea("hello", 2), { shiftKey: true })

    act(() => result.current.handleKeyDown(event, "t1"))

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(onStartRowSelection).not.toHaveBeenCalled()
  })

  it("starts row selection on Shift+ArrowUp at start of text", () => {
    const { result, onStartRowSelection } = renderKeyboard()
    const event = makeArrowEvent("ArrowUp", makeTextarea("hello", 0), { shiftKey: true })

    act(() => result.current.handleKeyDown(event, "t1"))

    expect(event.preventDefault).toHaveBeenCalled()
    expect(onStartRowSelection).toHaveBeenCalledWith("t1")
  })

  it("still moves the todo on Alt+Shift+Arrow", () => {
    const { result, moveTodo, onStartRowSelection } = renderKeyboard()
    const event = makeArrowEvent("ArrowDown", makeTextarea("hello", 5), {
      shiftKey: true,
      altKey: true,
    })

    act(() => result.current.handleKeyDown(event, "t1"))

    expect(moveTodo).toHaveBeenCalledWith("t1", "down")
    expect(onStartRowSelection).not.toHaveBeenCalled()
  })

  it("moves focus on plain arrows", () => {
    const { result, focusTodo, setActiveTodoId } = renderKeyboard()
    const event = makeArrowEvent("ArrowDown", makeTextarea("hello", 5))

    act(() => result.current.handleKeyDown(event, "t1"))

    expect(setActiveTodoId).toHaveBeenCalledWith("t2")
    expect(focusTodo).toHaveBeenCalledWith("t2")
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
        parentIds: new Set(),
        collapsedIds: new Set(),
        allTodos: todos,
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
        parentIds: new Set(),
        collapsedIds: new Set(),
        allTodos: todos,
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
        parentIds: new Set(),
        collapsedIds: new Set(),
        allTodos: todos,
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

  it("creates first child when Enter on expanded parent", () => {
    const updateTodoText = vi.fn()
    const addTodo = vi.fn().mockReturnValue("new-id")
    const setActiveTodoId = vi.fn()
    const focusTodo = vi.fn()

    const todos = [makeTodo("t1", "parent", 0), makeTodo("c1", "child", 1)]
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
        parentIds: new Set(["t1"]),
        collapsedIds: new Set(),
        allTodos: todos,
      })
    )

    const textarea = document.createElement("textarea")
    textarea.value = "parent"
    textarea.selectionStart = 6
    textarea.selectionEnd = 6

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
    expect(addTodo).toHaveBeenCalledWith("", "t1", undefined, 1)
    expect(setActiveTodoId).toHaveBeenCalledWith("new-id")
  })

  it("creates sibling when Enter on collapsed parent", () => {
    const updateTodoText = vi.fn()
    const addTodo = vi.fn().mockReturnValue("new-id")
    const setActiveTodoId = vi.fn()
    const focusTodo = vi.fn()

    // visibleTodos only has the parent (children hidden)
    const visibleTodos = [makeTodo("t1", "parent", 0)]
    // allTodos has the full tree
    const allTodos = [makeTodo("t1", "parent", 0), makeTodo("c1", "child", 1)]
    const { result } = renderHook(() =>
      useTodoKeyboard({
        todos: visibleTodos,
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
        parentIds: new Set(["t1"]),
        collapsedIds: new Set(["t1"]),
        allTodos,
      })
    )

    const textarea = document.createElement("textarea")
    textarea.value = "parent"
    textarea.selectionStart = 6
    textarea.selectionEnd = 6

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
    // Should insert after last descendant (c1) at parent's level (0)
    expect(addTodo).toHaveBeenCalledWith("", "c1", undefined, 0)
    expect(setActiveTodoId).toHaveBeenCalledWith("new-id")
  })
})
