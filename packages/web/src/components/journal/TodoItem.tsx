"use client"

import type { KeyboardEvent, ChangeEvent } from "react"
import type { TodoItem as TodoItemType } from "@/lib/types/journal"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface TodoItemProps {
  todo: TodoItemType
  isActive: boolean
  onTextChange: (todoId: string, text: string) => void
  onToggle: (todoId: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, todoId: string) => void
  onFocus: (todoId: string) => void
  inputRef: (todoId: string, element: HTMLInputElement | null) => void
}

export function TodoItem({
  todo,
  isActive,
  onTextChange,
  onToggle,
  onKeyDown,
  onFocus,
  inputRef,
}: TodoItemProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTextChange(todo.id, e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown(e, todo.id)
  }

  const handleFocus = () => {
    onFocus(todo.id)
  }

  const handleToggle = () => {
    onToggle(todo.id)
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 group py-2 px-3 rounded-md transition-colors",
        isActive ? "bg-accent/50" : "hover:bg-accent/30"
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

      {todo.status === "doing" && (
        <span className="mt-0.5 text-xs font-medium text-muted-foreground">
          Doing
        </span>
      )}

      <input
        ref={(el) => inputRef(todo.id, el)}
        type="text"
        value={todo.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder="Type your todo here..."
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground",
          todo.status === "done" && "line-through"
        )}
      />
    </div>
  )
}
