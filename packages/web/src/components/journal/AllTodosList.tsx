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
    currentWorkspaceId,
    updateTodoTextById,
    toggleTodoById,
    toggleImportant,
    allTodosSortDirection,
    allTodosScope,
    setAllTodosScope,
  } = useJournal()

  const allGroups = useMemo(
    () => buildAllTodosGroups(workspaces, allTodosSortDirection),
    [workspaces, allTodosSortDirection]
  )
  const isScoped = allTodosScope === "workspace" && workspaceOrder.length > 1
  const groups = useMemo(
    () => (isScoped ? allGroups.filter((group) => group.workspaceId === currentWorkspaceId) : allGroups),
    [allGroups, isScoped, currentWorkspaceId]
  )
  const hiddenCount = useMemo(
    () =>
      isScoped
        ? allGroups.reduce(
            (sum, group) => (group.workspaceId === currentWorkspaceId ? sum : sum + group.todos.length),
            0
          )
        : 0,
    [allGroups, isScoped, currentWorkspaceId]
  )
  const importanceStates = useMemo(
    () => buildImportantTree(workspaces, importantItems).states,
    [workspaces, importantItems]
  )
  const showWorkspaceLabel = !isScoped && workspaceOrder.length > 1

  const hiddenNotice = hiddenCount > 0 && (
    <button
      type="button"
      onClick={() => setAllTodosScope("all")}
      className="w-full px-3 py-2 text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
    >
      {hiddenCount} more in other workspaces
    </button>
  )

  if (groups.length === 0) {
    return (
      <div data-pane="all-todos" className="px-2 pb-8">
        <div className="px-3 py-12 text-center text-sm text-muted-foreground">Nothing left to do.</div>
        {hiddenNotice}
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
      {hiddenNotice}
    </div>
  )
}
