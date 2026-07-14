import type { TodoShortcutPlatform } from "@/lib/utils/multiSelectShortcuts"

export const FOCUS_IMPORTANT_LIST_EVENT = "journal:focus-important-list"
export const FOCUS_MAIN_LIST_EVENT = "journal:focus-main-list"

type PaneShortcutKeyEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "defaultPrevented" | "key" | "metaKey" | "shiftKey"
> & { isComposing?: boolean }

/**
 * Cmd/Ctrl+Shift+I toggles keyboard focus between the main todo list and the
 * Important list.
 */
export const isPaneFocusToggleShortcut = (
  event: PaneShortcutKeyEvent,
  platform: TodoShortcutPlatform
): boolean => {
  if (event.defaultPrevented || event.isComposing) return false
  if (event.altKey || !event.shiftKey) return false
  const hasModifier = platform === "mac"
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey
  if (!hasModifier) return false
  return event.key.toLowerCase() === "i"
}
