import { describe, expect, it } from "vitest"
import { isPaneFocusToggleShortcut } from "@/lib/utils/paneShortcuts"

const makeEvent = (overrides: Partial<KeyboardEvent> = {}) =>
  ({
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: true,
    key: "i",
    defaultPrevented: false,
    isComposing: false,
    ...overrides,
  }) as KeyboardEvent

describe("isPaneFocusToggleShortcut", () => {
  it("matches Cmd+Shift+I on mac and Ctrl+Shift+I on windows", () => {
    expect(isPaneFocusToggleShortcut(makeEvent({ metaKey: true }), "mac")).toBe(true)
    expect(isPaneFocusToggleShortcut(makeEvent({ metaKey: true, key: "I" }), "mac")).toBe(true)
    expect(isPaneFocusToggleShortcut(makeEvent({ ctrlKey: true }), "windows")).toBe(true)
  })

  it("rejects the wrong platform modifier", () => {
    expect(isPaneFocusToggleShortcut(makeEvent({ ctrlKey: true }), "mac")).toBe(false)
    expect(isPaneFocusToggleShortcut(makeEvent({ metaKey: true }), "windows")).toBe(false)
    expect(
      isPaneFocusToggleShortcut(makeEvent({ metaKey: true, ctrlKey: true }), "mac")
    ).toBe(false)
  })

  it("requires shift and rejects alt", () => {
    expect(
      isPaneFocusToggleShortcut(makeEvent({ metaKey: true, shiftKey: false }), "mac")
    ).toBe(false)
    expect(
      isPaneFocusToggleShortcut(makeEvent({ metaKey: true, altKey: true }), "mac")
    ).toBe(false)
  })

  it("rejects handled or composing events and other keys", () => {
    expect(
      isPaneFocusToggleShortcut(makeEvent({ metaKey: true, defaultPrevented: true }), "mac")
    ).toBe(false)
    expect(
      isPaneFocusToggleShortcut(makeEvent({ metaKey: true, isComposing: true }), "mac")
    ).toBe(false)
    expect(isPaneFocusToggleShortcut(makeEvent({ metaKey: true, key: "k" }), "mac")).toBe(false)
  })
})
