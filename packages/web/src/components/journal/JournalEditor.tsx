"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { TodoList } from "./TodoList"

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("textarea, input, button, a"))
}

const getSelectionRect = (start: { x: number; y: number }, current: { x: number; y: number }) => {
  const left = Math.min(start.x, current.x)
  const top = Math.min(start.y, current.y)
  const right = Math.max(start.x, current.x)
  const bottom = Math.max(start.y, current.y)
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

export function JournalEditor() {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragMovedRef = useRef(false)
  const todoListRef = useRef<HTMLDivElement | null>(null)
  const [selectionRect, setSelectionRect] = useState<{
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  } | null>(null)

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (isInteractiveTarget(event.target)) return

    dragMovedRef.current = false
    setDragStart({ x: event.clientX, y: event.clientY })
    setDragCurrent({ x: event.clientX, y: event.clientY })
    setIsDragging(true)
    setSelectionRect(null)
    event.preventDefault()
  }

  useEffect(() => {
    if (!isDragging || !dragStart) return

    document.body.style.userSelect = "none"

    const handleMove = (event: MouseEvent) => {
      const nextPoint = { x: event.clientX, y: event.clientY }
      const distance =
        Math.abs(nextPoint.x - dragStart.x) + Math.abs(nextPoint.y - dragStart.y)
      if (distance > 3) {
        dragMovedRef.current = true
      }

      setDragCurrent(nextPoint)

      if (dragMovedRef.current) {
        const rect = getSelectionRect(dragStart, nextPoint)
        setSelectionRect(rect)
      }
    }

    const handleUp = () => {
      setIsDragging(false)
      setDragStart(null)
      setDragCurrent(null)
      document.body.style.userSelect = ""

      if (!dragMovedRef.current) {
        setSelectionRect(null)
      }
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
      document.body.style.userSelect = ""
    }
  }, [isDragging, dragStart])

  // Clear selection rect when drag ends
  useEffect(() => {
    if (!isDragging) {
      // Keep rect visible briefly after drag ends, then clear
      const timer = setTimeout(() => {
        if (!isDragging) {
          setSelectionRect(null)
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isDragging])

  const displayRect = useMemo(() => {
    if (!dragStart || !dragCurrent || !isDragging) return null
    if (!dragMovedRef.current) return null
    return getSelectionRect(dragStart, dragCurrent)
  }, [dragStart, dragCurrent, isDragging])

  return (
    <div
      className="w-full min-h-[calc(100vh-12rem)] relative"
      onMouseDown={handleMouseDown}
    >
      {displayRect && (
        <div
          className="fixed z-50 pointer-events-none rounded-sm border border-primary/60 bg-primary/15"
          style={{
            left: displayRect.left,
            top: displayRect.top,
            width: displayRect.width,
            height: displayRect.height,
          }}
        />
      )}
      <TodoList
        ref={todoListRef}
        selectionRect={selectionRect}
        onClearSelection={() => setSelectionRect(null)}
      />
    </div>
  )
}
