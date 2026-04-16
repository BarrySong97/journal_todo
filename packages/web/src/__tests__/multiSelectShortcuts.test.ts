// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"

vi.mock("@journal-todo/shared", () => ({
  isMac: vi.fn(),
}))

import { isMac } from "@journal-todo/shared"
import {
  getNextTodoIdAfterBulkDelete,
  getTodoDeleteKeyLabel,
  getTodoModifierLabel,
  getTodoShortcutPlatform,
  hasNativeTextSelection,
  isSelectedTodoCopyShortcut,
  isSelectedTodoCutShortcut,
  isSelectedTodoDeleteShortcut,
} from "@/lib/utils/multiSelectShortcuts"

const mockedIsMac = vi.mocked(isMac)

describe("multiSelectShortcuts", () => {
  it("maps platform labels correctly", () => {
    expect(getTodoModifierLabel("mac")).toBe("⌘")
    expect(getTodoModifierLabel("windows")).toBe("Ctrl")
    expect(getTodoDeleteKeyLabel("mac")).toBe("⌫")
    expect(getTodoDeleteKeyLabel("windows")).toBe("Del")
  })

  it("detects runtime platform from shared isMac", () => {
    mockedIsMac.mockReturnValueOnce(true)
    expect(getTodoShortcutPlatform()).toBe("mac")

    mockedIsMac.mockReturnValueOnce(false)
    expect(getTodoShortcutPlatform()).toBe("windows")
  })

  it("matches copy and cut shortcuts per platform", () => {
    expect(
      isSelectedTodoCopyShortcut(
        { altKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, key: "c", metaKey: true } as KeyboardEvent,
        "mac"
      )
    ).toBe(true)

    expect(
      isSelectedTodoCopyShortcut(
        { altKey: false, ctrlKey: true, defaultPrevented: false, isComposing: false, key: "c", metaKey: false } as KeyboardEvent,
        "mac"
      )
    ).toBe(false)

    expect(
      isSelectedTodoCutShortcut(
        { altKey: false, ctrlKey: true, defaultPrevented: false, isComposing: false, key: "x", metaKey: false } as KeyboardEvent,
        "windows"
      )
    ).toBe(true)

    expect(
      isSelectedTodoCutShortcut(
        { altKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, key: "x", metaKey: true } as KeyboardEvent,
        "windows"
      )
    ).toBe(false)
  })

  it("matches delete keys per platform", () => {
    expect(
      isSelectedTodoDeleteShortcut(
        { altKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, key: "Backspace", metaKey: false } as KeyboardEvent,
        "mac"
      )
    ).toBe(true)

    expect(
      isSelectedTodoDeleteShortcut(
        { altKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, key: "Delete", metaKey: false } as KeyboardEvent,
        "windows"
      )
    ).toBe(true)

    expect(
      isSelectedTodoDeleteShortcut(
        { altKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, key: "Backspace", metaKey: false } as KeyboardEvent,
        "windows"
      )
    ).toBe(false)
  })

  it("detects native text selection in text inputs", () => {
    const textarea = document.createElement("textarea")
    textarea.value = "hello"
    textarea.selectionStart = 1
    textarea.selectionEnd = 3
    expect(hasNativeTextSelection(textarea)).toBe(true)

    textarea.selectionStart = 2
    textarea.selectionEnd = 2
    expect(hasNativeTextSelection(textarea)).toBe(false)
  })

  it("chooses the next focus target after bulk delete", () => {
    const todos = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]

    expect(getNextTodoIdAfterBulkDelete(todos, new Set(["b", "c"]))).toBe("d")
    expect(getNextTodoIdAfterBulkDelete(todos, new Set(["d"]))).toBe("c")
    expect(getNextTodoIdAfterBulkDelete(todos, new Set(["a", "b", "c", "d"]))).toBeNull()
  })
})
