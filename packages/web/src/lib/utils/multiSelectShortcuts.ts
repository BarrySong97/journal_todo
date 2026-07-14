import { isMac } from "@journal-todo/shared"

export type TodoShortcutPlatform = "mac" | "windows"

type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "defaultPrevented" | "key" | "metaKey"
> & { isComposing?: boolean }

export const getTodoShortcutPlatform = (): TodoShortcutPlatform => (
  isMac() ? "mac" : "windows"
)

export const getTodoModifierLabel = (platform: TodoShortcutPlatform): string => (
  platform === "mac" ? "⌘" : "Ctrl"
)

export const getTodoDeleteKeyLabel = (platform: TodoShortcutPlatform): string => (
  platform === "mac" ? "⌫" : "Del"
)

const hasPlatformModifier = (event: ShortcutKeyEvent, platform: TodoShortcutPlatform): boolean => (
  platform === "mac" ? event.metaKey : event.ctrlKey
)

const isPlatformShortcut = (
  event: ShortcutKeyEvent,
  platform: TodoShortcutPlatform,
  key: string
): boolean => {
  if (event.defaultPrevented || event.isComposing) return false
  if (event.altKey) return false
  if (!hasPlatformModifier(event, platform)) return false
  return event.key.toLowerCase() === key
}

export const isSelectedTodoCopyShortcut = (
  event: ShortcutKeyEvent,
  platform: TodoShortcutPlatform
): boolean => isPlatformShortcut(event, platform, "c")

export const isSelectedTodoCutShortcut = (
  event: ShortcutKeyEvent,
  platform: TodoShortcutPlatform
): boolean => isPlatformShortcut(event, platform, "x")

export const isSelectedTodoDeleteShortcut = (
  event: ShortcutKeyEvent,
  platform: TodoShortcutPlatform
): boolean => {
  if (event.defaultPrevented || event.isComposing) return false
  if (event.altKey || event.ctrlKey || event.metaKey) return false
  if (platform === "mac") {
    return event.key === "Backspace" || event.key === "Delete"
  }
  return event.key === "Delete"
}

export const hasNativeTextSelection = (eventTarget: EventTarget | null): boolean => {
  if (
    eventTarget instanceof HTMLTextAreaElement ||
    eventTarget instanceof HTMLInputElement
  ) {
    const selectionStart = eventTarget.selectionStart
    const selectionEnd = eventTarget.selectionEnd
    if (selectionStart === null || selectionEnd === null) return false
    return selectionStart !== selectionEnd
  }

  return false
}

export const isTextEntryTarget = (eventTarget: EventTarget | null): boolean => (
  eventTarget instanceof HTMLTextAreaElement ||
  eventTarget instanceof HTMLInputElement ||
  (eventTarget instanceof HTMLElement &&
    (eventTarget.isContentEditable === true ||
      eventTarget.getAttribute("contenteditable") === "true"))
)

export const getNextTodoIdAfterBulkDelete = <T extends { id: string }>(
  todos: T[],
  selectedTodoIds: ReadonlySet<string>
): string | null => {
  if (todos.length === 0 || selectedTodoIds.size === 0) return null

  let firstSelectedIndex = -1
  const remainingTodoIds: string[] = []

  todos.forEach((todo, index) => {
    if (selectedTodoIds.has(todo.id)) {
      if (firstSelectedIndex === -1) {
        firstSelectedIndex = index
      }
      return
    }

    remainingTodoIds.push(todo.id)
  })

  if (remainingTodoIds.length === 0) return null

  const targetIndex = firstSelectedIndex === -1
    ? remainingTodoIds.length - 1
    : Math.min(firstSelectedIndex, remainingTodoIds.length - 1)

  return remainingTodoIds[targetIndex] ?? null
}
