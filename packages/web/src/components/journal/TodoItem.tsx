"use client"

import { useEffect, useRef } from "react"
import type { KeyboardEvent, ChangeEvent } from "react"
import type { TodoItem as TodoItemType } from "@/lib/types/journal"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface TodoItemProps {
  todo: TodoItemType
  isActive: boolean
  isSelected: boolean
  onTextChange: (todoId: string, text: string) => void
  onToggle: (todoId: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, todoId: string) => void
  onFocus: (todoId: string) => void
  inputRef: (todoId: string, element: HTMLTextAreaElement | null) => void
}

export function TodoItem({
  todo,
  isActive,
  isSelected,
  onTextChange,
  onToggle,
  onKeyDown,
  onFocus,
  inputRef,
}: TodoItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    resizeTextarea(e.target)
    onTextChange(todo.id, e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown(e, todo.id)
  }

  const handleFocus = () => {
    onFocus(todo.id)
  }

  const handleToggle = () => {
    onToggle(todo.id)
  }

  const handleRef = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element
    inputRef(todo.id, element)
    resizeTextarea(element)
  }

  useEffect(() => {
    resizeTextarea(textareaRef.current)
  }, [todo.text])

  return (
    <div
      data-todo-id={todo.id}
      className={cn(
        "flex items-start gap-3 group py-2 px-3 rounded-md transition-colors",
        isSelected
          ? "bg-accent/60"
          : isActive
            ? "bg-accent/50"
            : "hover:bg-accent/30"
      )}
      style={{
        paddingLeft: `${12 + todo.level * 24}px`,
      }}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={todo.status === "done"}
          onCheckedChange={handleToggle}
          className="cursor-pointer"
        />
      </div>

      <textarea
        ref={handleRef}
        value={todo.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        rows={1}
        placeholder="Type your todo here..."
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground resize-none overflow-hidden whitespace-pre-wrap wrap-break-word",
          todo.status === "done" && "line-through"
        )}
      />
    </div>
  )
}
