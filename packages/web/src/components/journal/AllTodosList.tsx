"use client"

import { useMemo } from "react"
import { useJournal } from "@/hooks/useJournal"
import { buildAllTodosGroups } from "@/lib/utils/allTodosTree"
import { buildImportantTree } from "@/lib/utils/importantTree"
import { formatDateShort } from "@/lib/utils/dateUtils"
import { TodoItem } from "./TodoItem"

const noop = () => {}

export function AllTodosList() {
  const {
    workspaces,
    importantItems,
    workspaceOrder,
    updateTodoTextById,
    toggleTodoById,
    toggleImportant,
    allTodosSortDirection,
  } = useJournal()

  const groups = useMemo(
    () => buildAllTodosGroups(workspaces, allTodosSortDirection),
    [workspaces, allTodosSortDirection]
  )
  const importanceStates = useMemo(
    () => buildImportantTree(workspaces, importantItems).states,
    [workspaces, importantItems]
  )
  const showWorkspaceLabel = workspaceOrder.length > 1

  if (groups.length === 0) {
    return (
      <div data-pane="all-todos" className="px-5 py-12 text-center text-sm text-muted-foreground">
        Nothing left to do.
      </div>
    )
  }

  return (
    <div data-pane="all-todos" className="space-y-4 px-2 pb-8">
      {groups.map((group) => (
        <div key={`${group.workspaceId}::${group.dateKey}`}>
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
            {formatDateShort(group.dateKey)}
            {showWorkspaceLabel && ` · ${group.workspaceName}`}
          </div>
          <div>
            {group.todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                depth={todo.depth}
                isActive={false}
                isSelected={false}
                isParent={false}
                isCollapsed={false}
                onTextChange={updateTodoTextById}
                onToggle={toggleTodoById}
                onKeyDown={noop}
                onPasteTodo={() => false}
                onFocus={noop}
                inputRef={noop}
                importanceState={importanceStates[todo.id] ?? "none"}
                onToggleImportant={toggleImportant}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
