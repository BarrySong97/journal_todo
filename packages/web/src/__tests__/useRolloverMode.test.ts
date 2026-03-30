// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRolloverMode } from "@/hooks/useRolloverMode"

const ROLLOVER_MODE_KEY = "journal-rollover-mode"

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe("useRolloverMode", () => {
  it("defaults to false (copy mode) when localStorage is empty", () => {
    const { result } = renderHook(() => useRolloverMode())
    expect(result.current.isMove).toBe(false)
  })

  it("reads move mode from localStorage on init", () => {
    localStorage.setItem(ROLLOVER_MODE_KEY, "move")
    const { result } = renderHook(() => useRolloverMode())
    expect(result.current.isMove).toBe(true)
  })

  it("reads copy mode from localStorage on init", () => {
    localStorage.setItem(ROLLOVER_MODE_KEY, "copy")
    const { result } = renderHook(() => useRolloverMode())
    expect(result.current.isMove).toBe(false)
  })

  it("defaults to false for unrecognized localStorage value", () => {
    localStorage.setItem(ROLLOVER_MODE_KEY, "something-else")
    const { result } = renderHook(() => useRolloverMode())
    expect(result.current.isMove).toBe(false)
  })

  it("setIsMove(true) updates state and persists 'move' to localStorage", () => {
    const { result } = renderHook(() => useRolloverMode())
    act(() => {
      result.current.setIsMove(true)
    })
    expect(result.current.isMove).toBe(true)
    expect(localStorage.getItem(ROLLOVER_MODE_KEY)).toBe("move")
  })

  it("setIsMove(false) updates state and persists 'copy' to localStorage", () => {
    localStorage.setItem(ROLLOVER_MODE_KEY, "move")
    const { result } = renderHook(() => useRolloverMode())
    act(() => {
      result.current.setIsMove(false)
    })
    expect(result.current.isMove).toBe(false)
    expect(localStorage.getItem(ROLLOVER_MODE_KEY)).toBe("copy")
  })
})
