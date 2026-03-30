"use client"

import { useCallback, useState } from "react"

const ROLLOVER_MODE_KEY = "journal-rollover-mode"

export function useRolloverMode() {
  const [isMove, setIsMoveState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(ROLLOVER_MODE_KEY) === "move"
  })

  const setIsMove = useCallback((value: boolean) => {
    setIsMoveState(value)
    localStorage.setItem(ROLLOVER_MODE_KEY, value ? "move" : "copy")
  }, [])

  return { isMove, setIsMove }
}
