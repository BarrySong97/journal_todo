"use client"

/**
 * TodoItem - Display component for a single todo
 * Adapted from dnd-kit TreeItem
 */

import { forwardRef, useEffect, useRef, type CSSProperties, type KeyboardEvent, type ChangeEvent, type HTMLAttributes } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FlattenedTodo } from "./todoTreeUtils"
import { INDENTATION_WIDTH } from "./todoTreeUtils"

export interface TodoItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "onFocus" | "onKeyDown" | "onToggle"> {
  todo: FlattenedTodo
  depth: number
  ghost?: boolean
  clone?: boolean
  childCount?: number
  indicator?: boolean
  isActive: boolean
  isSelected: boolean
  isParent: boolean
  isCollapsed: boolean
  disableInteraction?: boolean
  handleProps?: Record<string, unknown>
  onTextChange: (todoId: string, text: string) => void
  onToggle: (todoId: string) => void
  onToggleCollapse?: (todoId: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, todoId: string) => void
  onFocus: (todoId: string) => void
  inputRef: (todoId: string, element: HTMLTextAreaElement | null) => void
}

export const TodoItem = forwardRef<HTMLDivElement, TodoItemProps>(
  (
    {
      todo,
      depth,
      ghost = false,
      clone = false,
      childCount,
      indicator = true,
      isActive,
      isSelected,
      isParent,
      isCollapsed,
      disableInteraction = false,
      handleProps,
      style,
      onTextChange,
      onToggle,
      onToggleCollapse,
      onKeyDown,
      onFocus,
      inputRef,
      ...props
    },
    ref
  ) => {
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

    const handleCollapseClick = () => {
      onToggleCollapse?.(todo.id)
    }

    const handleRef = (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element
      inputRef(todo.id, element)
      resizeTextarea(element)
    }

    useEffect(() => {
      resizeTextarea(textareaRef.current)
    }, [todo.text])

    // Determine if this is a ghost indicator (dragging item becomes a line)
    const isGhostIndicator = ghost && indicator

    return (
      // Wrapper - like official TreeItem's <li> wrapper
      <div
        ref={ref}
        style={{
          ...style,
          paddingLeft: `${depth * INDENTATION_WIDTH}px`,
          marginBottom: -1,
        } as CSSProperties}
        data-todo-id={todo.id}
        className={cn(
          "box-border list-none",
          // Clone styling (for DragOverlay)
          clone && "inline-block pointer-events-none p-0 pl-2.5 pt-1",
          // Ghost + Indicator: show as line
          isGhostIndicator && "relative z-10 opacity-100 mb-[-1px]",
          // Ghost without indicator: semi-transparent
          ghost && !indicator && "opacity-50",
          // Disable interaction during sorting
          disableInteraction && "pointer-events-none",
        )}
        {...props}
      >
        {/* Inner content container - like official TreeItem's inner div */}
        <div
          className={cn(
            "relative flex items-start",
            // Ghost + Indicator: become a thin line
            isGhostIndicator && "p-0 h-[3px] items-center bg-primary/80 rounded-full",
            // Clone styling
            clone && "py-1 px-3 pr-6 rounded bg-background shadow-lg",
            // Normal state
            !isGhostIndicator && !clone && [
              "py-2 px-3 rounded-md transition-colors",
              isSelected
                ? "bg-accent/60"
                : isActive
                  ? "bg-accent/50"
                  : "hover:bg-accent/30",
            ],
          )}
        >
          {isGhostIndicator ? (
            // Indicator mode: small hollow circle at the left
            <div 
              className="absolute w-2 h-2 rounded-full border border-primary bg-background"
              style={{ left: -6, top: "50%", transform: "translateY(-50%)" }}
            />
          ) : (
            // Normal mode: show full todo content
            <>
              {/* Drag handle - single dot */}
              <button
                type="button"
                className={cn(
                  "pt-1.5 cursor-grab active:cursor-grabbing touch-none flex-shrink-0",
                  clone && "cursor-grabbing"
                )}
                {...handleProps}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              </button>

              <div className="flex items-start gap-2 flex-1 ml-2">
                <div className="pt-0.5 flex-shrink-0">
                  <Checkbox
                    checked={todo.status === "done"}
                    onCheckedChange={handleToggle}
                    className="cursor-pointer"
                    disabled={clone}
                  />
                </div>

                {clone ? (
                  // Clone mode: just show text
                  <span className={cn(
                    "flex-1 text-sm select-none",
                    todo.status === "done" && "line-through"
                  )}>
                    {todo.text || "Empty todo"}
                    {childCount && childCount > 1 && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {childCount}
                      </span>
                    )}
                  </span>
                ) : (
                  // Normal mode: editable textarea
                  <textarea
                    ref={handleRef}
                    value={todo.text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    rows={1}
                    placeholder="Type your todo here..."
                    className={cn(
                      "flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground resize-none overflow-hidden whitespace-pre-wrap break-words",
                      todo.status === "done" && "line-through"
                    )}
                  />
                )}

                {/* Collapse/Expand button for parents */}
                {isParent && !clone && (
                  <button
                    type="button"
                    onClick={handleCollapseClick}
                    className="p-0.5 rounded hover:bg-accent/50 transition-colors flex-shrink-0 self-center"
                    tabIndex={-1}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
)

TodoItem.displayName = "TodoItem"
