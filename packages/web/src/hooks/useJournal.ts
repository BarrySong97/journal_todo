import { useJournalStore } from "@/lib/stores/journalStore"
import type { JournalPage, Workspace } from "@/lib/types/journal"
import { getTodayKey } from "@/lib/utils/dateUtils"

export function useJournal() {
  const currentWorkspaceId = useJournalStore((state) => state.currentWorkspaceId)
  const workspaceOrder = useJournalStore((state) => state.workspaceOrder)
  const workspaceRecentOrder = useJournalStore((state) => state.workspaceRecentOrder)
  const workspaces = useJournalStore((state) => state.workspaces)
  const setCurrentWorkspace = useJournalStore((state) => state.setCurrentWorkspace)
  const createWorkspace = useJournalStore((state) => state.createWorkspace)
  const renameWorkspace = useJournalStore((state) => state.renameWorkspace)
  const deleteWorkspace = useJournalStore((state) => state.deleteWorkspace)
  const setCurrentDate = useJournalStore((state) => state.setCurrentDate)
  const goToToday = useJournalStore((state) => state.goToToday)
  const goToNextDay = useJournalStore((state) => state.goToNextDay)
  const goToPreviousDay = useJournalStore((state) => state.goToPreviousDay)
  const getCurrentPage = useJournalStore((state) => state.getCurrentPage)
  const getOrCreatePage = useJournalStore((state) => state.getOrCreatePage)
  // Todo operations
  const addTodo = useJournalStore((state) => state.addTodo)
  const updateTodoText = useJournalStore((state) => state.updateTodoText)
  const updateTodoLevel = useJournalStore((state) => state.updateTodoLevel)
  const toggleTodo = useJournalStore((state) => state.toggleTodo)
  const deleteTodo = useJournalStore((state) => state.deleteTodo)
  const moveTodo = useJournalStore((state) => state.moveTodo)
  const reorderTodos = useJournalStore((state) => state.reorderTodos)
  const getTodo = useJournalStore((state) => state.getTodo)
  const rollOverTodosToToday = useJournalStore((state) => state.rollOverTodosToToday)

  const currentWorkspace: Workspace | undefined = workspaces[currentWorkspaceId]
  const currentDateKey = currentWorkspace?.currentDateKey ?? getTodayKey()
  const currentPage: JournalPage = getCurrentPage()

  return {
    currentWorkspaceId,
    workspaceOrder,
    workspaceRecentOrder,
    workspaces,
    currentWorkspace,
    currentDateKey,
    currentPage,
    setCurrentWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    setCurrentDate,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    getOrCreatePage,
    // Todo operations
    addTodo,
    updateTodoText,
    updateTodoLevel,
    toggleTodo,
    deleteTodo,
    moveTodo,
    reorderTodos,
    getTodo,
    rollOverTodosToToday,
  }
}
