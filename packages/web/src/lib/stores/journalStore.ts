import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { v4 as uuidv4 } from "uuid"
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing"
import type { TodoItem, JournalPage, TodoStatus, Workspace } from "../types/journal"
import { getTodayKey, formatDateKey } from "../utils/dateUtils"
import {
  initializeStorage,
  getWorkspaces,
  createWorkspace as createWorkspaceRepo,
  updateWorkspace as updateWorkspaceRepo,
  deleteWorkspace as deleteWorkspaceRepo,
  createPage as createPageRepo,
  createTodo as createTodoRepo,
  updateTodo as updateTodoRepo,
  deleteTodo as deleteTodoRepo,
} from "@journal-todo/api"

const isBlankText = (value: unknown) =>
  typeof value !== "string" || value.trim().length === 0

const extractTags = (text: string) => {
  const matches = text.match(/#[^\s#]+/g) ?? []
  const normalized = matches.map((tag) => tag.slice(1).toLowerCase())
  return Array.from(new Set(normalized))
}


/**
 * Generate a fractional index between two existing indices
 * If before is null, generates an index before the first item
 * If after is null, generates an index after the last item
 */
const generateOrderBetween = (before: string | null, after: string | null): string => {
  return generateKeyBetween(before, after)
}

/**
 * Generate the first fractional index for a new list
 */
const generateFirstOrder = (): string => {
  return generateKeyBetween(null, null)
}

const MAX_TODO_DEPTH = 3

const deriveParentMap = (items: TodoItem[]): Map<string, string | null> => {
  const parentMap = new Map<string, string | null>()
  const stack: { id: string; level: number }[] = []

  for (const item of items) {
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }
    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
    parentMap.set(item.id, parentId)
    stack.push({ id: item.id, level: item.level })
  }

  return parentMap
}

const getParentIdForIndex = (items: TodoItem[], index: number, level: number): string | null => {
  if (level === 0) return null
  for (let i = index - 1; i >= 0; i--) {
    if (items[i].level === level - 1) return items[i].id
  }
  return null
}

const clampDepthForInsert = (
  desiredDepth: number,
  maxDepthAllowed: number,
  beforeTodo: TodoItem | undefined,
  afterTodo: TodoItem | undefined,
  sortedTodos: TodoItem[],
  insertIndex: number
): number => {
  let clampedDepth = Math.max(0, Math.min(maxDepthAllowed, desiredDepth))

  // Ensure parent chain exists before insert
  while (clampedDepth > 0) {
    const parentIndex = sortedTodos
      .slice(0, insertIndex)
      .map((t) => t.level)
      .lastIndexOf(clampedDepth - 1)
    if (parentIndex !== -1) break
    clampedDepth -= 1
  }

  const maxDepth = beforeTodo ? Math.min(MAX_TODO_DEPTH, beforeTodo.level + 1) : 0
  const minDepth = afterTodo ? afterTodo.level : 0
  return Math.max(0, Math.min(maxDepth, Math.max(minDepth, clampedDepth)))
}

const buildWorkspace = (name: string, overrides?: Partial<Workspace>): Workspace => {
  const now = new Date()
  return {
    id: uuidv4(),
    name,
    pages: {},
    currentDateKey: getTodayKey(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const buildPage = (dateKey: string): JournalPage => ({
  date: dateKey,
  todos: [
    {
      id: uuidv4(),
      text: "",
      status: "todo",
      tags: [],
      order: generateFirstOrder(),
      level: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const updateWorkspacePage = (
  workspace: Workspace,
  dateKey: string,
  page: JournalPage
): Workspace => ({
  ...workspace,
  pages: {
    ...workspace.pages,
    [dateKey]: page,
  },
  updatedAt: new Date(),
})

// Helper to persist workspace changes
const persistWorkspace = (workspaceId: string, data: Partial<Workspace>) => {
  updateWorkspaceRepo(workspaceId, data).catch(console.error)
}

// Helper to persist a single todo update
const persistTodoUpdate = (todoId: string, data: Partial<TodoItem>) => {
  updateTodoRepo(todoId, { ...data, updatedAt: new Date() }).catch((error) => {
    console.error(`[persist] Failed to update todo ${todoId}:`, error)
  })
}

// Helper to persist a new todo
const persistTodoCreate = (workspaceId: string, date: string, page: JournalPage, todo: TodoItem) => {
  ensurePageExists(workspaceId, page)
    .then(() => createTodoRepo(workspaceId, date, todo))
    .catch((error) => {
      console.error(`[persist] Failed to create todo ${todo.id}:`, error)
    })
}

// Helper to persist todo deletion
const persistTodoDelete = (todoId: string) => {
  deleteTodoRepo(todoId).catch((error) => {
    console.error(`[persist] Failed to delete todo ${todoId}:`, error)
  })
}

const persistTodoMove = (workspaceId: string, toDate: string, todo: TodoItem) => {
  ;(async () => {
    await deleteTodoRepo(todo.id)
    await createTodoRepo(workspaceId, toDate, todo)
  })().catch((error) => {
    console.error(`[persist] Failed to move todo ${todo.id}:`, error)
  })
}

// Helper to ensure page exists in database
const ensurePageExists = async (workspaceId: string, page: JournalPage) => {
  try {
    await createPageRepo(workspaceId, {
      date: page.date,
      todos: [],
      notes: page.notes,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    })
  } catch {
    // Page might already exist, that's fine
  }
}

interface JournalStore {
  // State
  currentWorkspaceId: string
  workspaceOrder: string[]
  workspaceRecentOrder: string[]
  workspaces: Record<string, Workspace>

  // Workspace actions
  setCurrentWorkspace: (workspaceId: string) => void
  createWorkspace: (name?: string) => string
  renameWorkspace: (workspaceId: string, name: string) => void
  deleteWorkspace: (workspaceId: string) => void

  // Date navigation actions
  setCurrentDate: (date: Date) => void
  goToToday: () => void
  goToNextDay: () => void
  goToPreviousDay: () => void

  // Page actions
  getCurrentPage: () => JournalPage
  getOrCreatePage: (dateKey: string) => JournalPage

  // Todo CRUD actions
  addTodo: (text?: string, afterTodoId?: string, dateKey?: string, level?: number) => string
  updateTodoText: (todoId: string, text: string, dateKey?: string) => void
  updateTodoLevel: (todoId: string, direction: "indent" | "outdent", dateKey?: string) => void
  toggleTodo: (todoId: string, dateKey?: string) => boolean
  deleteTodo: (todoId: string, dateKey?: string) => void
  moveTodo: (todoId: string, direction: "up" | "down", dateKey?: string) => void
  reorderTodos: (
    activeId: string,
    beforeId: string | null,
    afterId: string | null,
    newDepth: number,
    dateKey?: string
  ) => void
  getTodo: (todoId: string, dateKey?: string) => TodoItem | undefined
  rollOverTodosToToday: () => number
}

export const useJournalStore = create<JournalStore>()(
  immer((set, get) => {
    const defaultWorkspace = buildWorkspace("Default")

    // Initialize store with data from repository
    const initializeFromRepository = async () => {
      const initResult = await initializeStorage()
      if (!initResult.success) {
        console.error("Failed to initialize storage:", initResult.error)
        return
      }

      const result = await getWorkspaces()
      if (result.success && result.data.length > 0) {
        const workspaces = result.data
        const workspacesMap: Record<string, Workspace> = {}
        workspaces.forEach(ws => {
          workspacesMap[ws.id] = ws
        })

        const workspaceOrder = workspaces
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(ws => ws.id)

        const workspaceRecentOrder = workspaces
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map(ws => ws.id)

        set({
          workspaces: workspacesMap,
          workspaceOrder,
          workspaceRecentOrder,
          currentWorkspaceId: workspaceRecentOrder[0] || workspaceOrder[0],
        })
      } else if (result.success && result.data.length === 0) {
        const persistResult = await createWorkspaceRepo(defaultWorkspace)
        if (!persistResult.success) {
          console.error("Failed to persist default workspace:", persistResult.error)
        }
      }
    }

    initializeFromRepository().catch(console.error)

    return {
      // Initial state
      currentWorkspaceId: defaultWorkspace.id,
      workspaceOrder: [defaultWorkspace.id],
      workspaceRecentOrder: [defaultWorkspace.id],
      workspaces: {
        [defaultWorkspace.id]: defaultWorkspace,
      },

      // Workspace actions
      setCurrentWorkspace: (workspaceId: string) => {
        set({ currentWorkspaceId: workspaceId })
      },

      createWorkspace: (name = "New Workspace") => {
        const newWorkspace = buildWorkspace(name)
        set((state) => {
          state.workspaces[newWorkspace.id] = newWorkspace
          state.workspaceOrder.push(newWorkspace.id)
          state.workspaceRecentOrder.unshift(newWorkspace.id)
          state.currentWorkspaceId = newWorkspace.id
        })
        createWorkspaceRepo(newWorkspace).catch(console.error)
        return newWorkspace.id
      },

      renameWorkspace: (workspaceId: string, name: string) => {
        set((state) => {
          const workspace = state.workspaces[workspaceId]
          if (workspace) {
            workspace.name = name
            workspace.updatedAt = new Date()
          }
        })
        persistWorkspace(workspaceId, { name, updatedAt: new Date() })
      },

      deleteWorkspace: (workspaceId: string) => {
        const { workspaceOrder, currentWorkspaceId } = get()
        if (workspaceOrder.length <= 1) return

        set((state) => {
          delete state.workspaces[workspaceId]
          state.workspaceOrder = state.workspaceOrder.filter((id) => id !== workspaceId)
          state.workspaceRecentOrder = state.workspaceRecentOrder.filter((id) => id !== workspaceId)
          if (currentWorkspaceId === workspaceId) {
            state.currentWorkspaceId = state.workspaceOrder[0]
          }
        })
        deleteWorkspaceRepo(workspaceId).catch(console.error)
      },

      // Date navigation
      setCurrentDate: (date: Date) => {
        const { currentWorkspaceId } = get()
        const dateKey = formatDateKey(date)
        set((state) => {
          const workspace = state.workspaces[currentWorkspaceId]
          if (workspace) {
            workspace.currentDateKey = dateKey
            workspace.updatedAt = new Date()
          }
        })
        persistWorkspace(currentWorkspaceId, { currentDateKey: dateKey, updatedAt: new Date() })
      },

      goToToday: () => {
        const { currentWorkspaceId } = get()
        const todayKey = getTodayKey()
        set((state) => {
          const workspace = state.workspaces[currentWorkspaceId]
          if (workspace) {
            workspace.currentDateKey = todayKey
            workspace.updatedAt = new Date()
          }
        })
        persistWorkspace(currentWorkspaceId, { currentDateKey: todayKey, updatedAt: new Date() })
      },

      goToNextDay: () => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const currentDate = new Date(workspace.currentDateKey)
        currentDate.setDate(currentDate.getDate() + 1)
        const nextDateKey = formatDateKey(currentDate)

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (ws) {
            ws.currentDateKey = nextDateKey
            ws.updatedAt = new Date()
          }
        })
        persistWorkspace(currentWorkspaceId, { currentDateKey: nextDateKey, updatedAt: new Date() })
      },

      goToPreviousDay: () => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const currentDate = new Date(workspace.currentDateKey)
        currentDate.setDate(currentDate.getDate() - 1)
        const prevDateKey = formatDateKey(currentDate)

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (ws) {
            ws.currentDateKey = prevDateKey
            ws.updatedAt = new Date()
          }
        })
        persistWorkspace(currentWorkspaceId, { currentDateKey: prevDateKey, updatedAt: new Date() })
      },

      // Page management
      getCurrentPage: () => {
        const { currentWorkspaceId, workspaces, getOrCreatePage } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return buildPage(getTodayKey())

        const { currentDateKey } = workspace
        if (!workspace.pages[currentDateKey]) {
          return getOrCreatePage(currentDateKey)
        }
        return workspace.pages[currentDateKey]
      },

      getOrCreatePage: (dateKey: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return buildPage(dateKey)
        if (workspace.pages[dateKey]) return workspace.pages[dateKey]

        const newPage = buildPage(dateKey)
        const updatedWorkspace = updateWorkspacePage(workspace, dateKey, newPage)

        set({
          workspaces: {
            ...workspaces,
            [currentWorkspaceId]: updatedWorkspace,
          },
        })

        // Persist new page and its initial todo
        ensurePageExists(currentWorkspaceId, newPage).then(() => {
          if (newPage.todos.length > 0) {
            persistTodoCreate(currentWorkspaceId, dateKey, newPage, newPage.todos[0])
          }
        })

        return newPage
      },

      // Todo CRUD
      addTodo: (text = "", afterTodoId?: string, dateKey?: string, level?: number) => {
        const { currentWorkspaceId, workspaces, getOrCreatePage } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return ""

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey] || getOrCreatePage(targetDateKey)
        const nextLevel = Math.max(0, Math.min(MAX_TODO_DEPTH, level ?? 0))

        // Sort todos by order to find correct position
        const sortedTodos = [...page.todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))

        let newOrder: string
        if (afterTodoId) {
          const afterIndex = sortedTodos.findIndex((t) => t.id === afterTodoId)
          if (afterIndex >= 0) {
            const afterOrder = sortedTodos[afterIndex].order
            const nextOrder = sortedTodos[afterIndex + 1]?.order ?? null
            newOrder = generateOrderBetween(afterOrder, nextOrder)
          } else {
            // Append at end
            const lastOrder = sortedTodos[sortedTodos.length - 1]?.order ?? null
            newOrder = generateOrderBetween(lastOrder, null)
          }
        } else {
          // Append at end
          const lastOrder = sortedTodos[sortedTodos.length - 1]?.order ?? null
          newOrder = generateOrderBetween(lastOrder, null)
        }

        // Determine insertion index for parent chain validation
        const insertIndex = sortedTodos.findIndex((t) => t.order > newOrder)
        const normalizedIndex = insertIndex === -1 ? sortedTodos.length : insertIndex
        const beforeTodo = sortedTodos[normalizedIndex - 1]
        const afterTodo = sortedTodos[normalizedIndex]
        const clampedLevel = clampDepthForInsert(
          nextLevel,
          MAX_TODO_DEPTH,
          beforeTodo,
          afterTodo,
          sortedTodos,
          normalizedIndex
        )
        const parentId = getParentIdForIndex(sortedTodos, normalizedIndex, clampedLevel)

        const newTodo: TodoItem = {
          id: uuidv4(),
          text,
          status: "todo",
          tags: extractTags(text),
          order: newOrder,
          level: clampedLevel,
          parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return
          p.todos.push(newTodo)
          p.updatedAt = new Date()
        })

        // Persist the new todo
        persistTodoCreate(currentWorkspaceId, targetDateKey, page, newTodo)

        return newTodo.id
      },

      updateTodoText: (todoId: string, text: string, dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return

        const todo = page.todos.find((t) => t.id === todoId)
        if (!todo) return

        const newTags = extractTags(text)

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return
          const t = p.todos.find((t) => t.id === todoId)
          if (!t) return
          t.text = text
          t.tags = newTags
          t.updatedAt = new Date()
          p.updatedAt = new Date()
        })

        // Persist only the changed fields
        persistTodoUpdate(todoId, { text, tags: newTags })
      },

      updateTodoLevel: (todoId: string, direction: "indent" | "outdent", dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return

        const todo = page.todos.find((t) => t.id === todoId)
        if (!todo) return

        const sortedTodos = [...page.todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
        const todoIndex = sortedTodos.findIndex((t) => t.id === todoId)
        const prevTodo = todoIndex > 0 ? sortedTodos[todoIndex - 1] : null
        if (todoIndex < 0) return

        const activeTodo = sortedTodos[todoIndex]
        let endIndex = todoIndex + 1
        while (endIndex < sortedTodos.length && sortedTodos[endIndex].level > activeTodo.level) {
          endIndex += 1
        }
        const block = sortedTodos.slice(todoIndex, endIndex)
        const maxDescendantDelta = block.reduce(
          (max, t) => Math.max(max, t.level - activeTodo.level),
          0
        )

        let newLevel: number
        if (direction === "indent") {
          if (!prevTodo) return
          const desired = activeTodo.level + 1
          const maxFromPrev = prevTodo.level + 1
          const maxDepthAllowed = MAX_TODO_DEPTH - maxDescendantDelta
          newLevel = Math.min(desired, maxFromPrev, maxDepthAllowed)
        } else {
          newLevel = Math.max(0, activeTodo.level - 1)
        }

        // Ensure parent chain exists at this position
        while (newLevel > 0) {
          const parentIndex = sortedTodos
            .slice(0, todoIndex)
            .map((t) => t.level)
            .lastIndexOf(newLevel - 1)
          if (parentIndex !== -1) break
          newLevel -= 1
        }

        if (newLevel === activeTodo.level) return

        const delta = newLevel - activeTodo.level
        const updatedSorted = [...sortedTodos]
        const updatedBlock = block.map((t) => ({
          ...t,
          level: t.level + delta,
        }))

        updatedBlock.forEach((t) => {
          const idx = updatedSorted.findIndex((item) => item.id === t.id)
          if (idx >= 0) updatedSorted[idx] = t
        })

        const blockWithParents = updatedBlock.map((t) => {
          const idx = updatedSorted.findIndex((item) => item.id === t.id)
          const parentId = getParentIdForIndex(updatedSorted, idx, t.level)
          return { ...t, parentId }
        })

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return

          const updateMap = new Map(blockWithParents.map((t) => [t.id, t]))
          p.todos = p.todos.map((t) => {
            const updated = updateMap.get(t.id)
            if (!updated) return t
            return {
              ...t,
              level: updated.level,
              parentId: updated.parentId ?? null,
              updatedAt: new Date(),
            }
          })
          p.updatedAt = new Date()
        })

        for (const updated of blockWithParents) {
          persistTodoUpdate(updated.id, { level: updated.level, parentId: updated.parentId ?? null })
        }
      },

      toggleTodo: (todoId: string, dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return false

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return false

        const todo = page.todos.find((t) => t.id === todoId)
        if (!todo) return false

        const newStatus: TodoStatus = todo.status === "done" ? "todo" : "done"

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return
          const t = p.todos.find((t) => t.id === todoId)
          if (!t) return
          t.status = newStatus
          t.updatedAt = new Date()
          p.updatedAt = new Date()
        })

        // Persist only the status change
        persistTodoUpdate(todoId, { status: newStatus })

        return true
      },

      deleteTodo: (todoId: string, dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return
          p.todos = p.todos.filter((t) => t.id !== todoId)
          p.updatedAt = new Date()
        })

        // Persist the deletion
        persistTodoDelete(todoId)
      },

      moveTodo: (todoId: string, direction: "up" | "down", dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return

        // Sort todos by order
        const sortedTodos = [...page.todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
        const parentMap = deriveParentMap(sortedTodos)
        const activeIndex = sortedTodos.findIndex((t) => t.id === todoId)
        if (activeIndex < 0) return

        const activeTodo = sortedTodos[activeIndex]
        const activeParentId = parentMap.get(activeTodo.id) ?? null

        // Build subtree block
        let endIndex = activeIndex + 1
        while (endIndex < sortedTodos.length && sortedTodos[endIndex].level > activeTodo.level) {
          endIndex += 1
        }
        const block = sortedTodos.slice(activeIndex, endIndex)
        const blockIds = new Set(block.map((b) => b.id))
        const remaining = sortedTodos.filter((t) => !blockIds.has(t.id))

        // Find siblings (same parent + same level) in sorted list
        const siblings = sortedTodos.filter(
          (t) => t.level === activeTodo.level && (parentMap.get(t.id) ?? null) === activeParentId
        )
        const siblingIndex = siblings.findIndex((t) => t.id === activeTodo.id)
        if (siblingIndex === -1) return

        const targetSiblingIndex = direction === "up" ? siblingIndex - 1 : siblingIndex + 1
        if (targetSiblingIndex < 0 || targetSiblingIndex >= siblings.length) return

        const targetSibling = siblings[targetSiblingIndex]

        // Find target sibling block in remaining list
        const targetIndex = remaining.findIndex((t) => t.id === targetSibling.id)
        if (targetIndex < 0) return

        let targetEnd = targetIndex + 1
        while (targetEnd < remaining.length && remaining[targetEnd].level > targetSibling.level) {
          targetEnd += 1
        }

        const insertIndex = direction === "up" ? targetIndex : targetEnd

        const beforeId = remaining[insertIndex - 1]?.id ?? null
        const afterId = remaining[insertIndex]?.id ?? null

        get().reorderTodos(todoId, beforeId, afterId, activeTodo.level, targetDateKey)
      },

      reorderTodos: (activeId: string, beforeId: string | null, afterId: string | null, newDepth: number, dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return

        const sortedTodos = [...page.todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
        const activeIndex = sortedTodos.findIndex((t) => t.id === activeId)
        if (activeIndex < 0) return

        const activeTodo = sortedTodos[activeIndex]
        let endIndex = activeIndex + 1
        while (endIndex < sortedTodos.length && sortedTodos[endIndex].level > activeTodo.level) {
          endIndex += 1
        }

        const block = sortedTodos.slice(activeIndex, endIndex)
        const blockIds = new Set(block.map((t) => t.id))
        const remaining = sortedTodos.filter((t) => !blockIds.has(t.id))

        let beforeTodo = beforeId ? remaining.find((t) => t.id === beforeId) : undefined
        let afterTodo = afterId ? remaining.find((t) => t.id === afterId) : undefined

        if (!beforeTodo && afterTodo && afterTodo.level > 0) {
          const afterIndex = remaining.findIndex((t) => t.id === afterTodo?.id)
          for (let i = afterIndex - 1; i >= 0; i -= 1) {
            if (remaining[i].level === 0) {
              afterTodo = remaining[i]
              break
            }
          }
        }

        const beforeOrder = beforeTodo?.order ?? null
        const afterOrder = afterTodo?.order ?? null

        const maxDescendantDelta = block.reduce(
          (max, t) => Math.max(max, t.level - activeTodo.level),
          0
        )
        const maxDepthAllowed = Math.max(0, MAX_TODO_DEPTH - maxDescendantDelta)

        let insertIndex = 0
        if (beforeTodo) {
          const beforeIndex = remaining.findIndex((t) => t.id === beforeTodo.id)
          insertIndex = beforeIndex + 1
        } else if (afterTodo) {
          const afterIndex = remaining.findIndex((t) => t.id === afterTodo.id)
          insertIndex = Math.max(0, afterIndex)
        } else {
          insertIndex = remaining.length
        }

        const clampedDepth = clampDepthForInsert(
          newDepth,
          maxDepthAllowed,
          beforeTodo,
          afterTodo,
          remaining,
          insertIndex
        )

        const newOrders = generateNKeysBetween(beforeOrder, afterOrder, block.length)
        const blockWithLevels = block.map((t, index) => ({
          ...t,
          order: newOrders[index],
          level: clampedDepth + (t.level - activeTodo.level),
        }))

        const combined = [
          ...remaining.slice(0, insertIndex),
          ...blockWithLevels,
          ...remaining.slice(insertIndex),
        ]

        const updatedBlock = blockWithLevels.map((t) => {
          const itemIndex = combined.findIndex((c) => c.id === t.id)
          const parentId = getParentIdForIndex(combined, itemIndex, t.level)
          return { ...t, parentId }
        })

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return
          const p = ws.pages[targetDateKey]
          if (!p) return

          const updateMap = new Map(updatedBlock.map((t) => [t.id, t]))
          p.todos = p.todos.map((t) => {
            const updated = updateMap.get(t.id)
            if (!updated) return t
            return {
              ...t,
              order: updated.order,
              level: updated.level,
              parentId: updated.parentId ?? null,
              updatedAt: new Date(),
            }
          })
          p.updatedAt = new Date()
        })

        for (const updated of updatedBlock) {
          persistTodoUpdate(updated.id, {
            order: updated.order,
            level: updated.level,
            parentId: updated.parentId ?? null,
          })
        }
      },

      getTodo: (todoId: string, dateKey?: string) => {
        const { currentWorkspaceId, workspaces } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return undefined

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return undefined

        return page.todos.find((t) => t.id === todoId)
      },

      rollOverTodosToToday: () => {
        const { currentWorkspaceId, workspaces, getOrCreatePage } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return 0

        const todayKey = getTodayKey()
        const yesterdayDate = new Date(todayKey)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)
        const yesterdayKey = formatDateKey(yesterdayDate)
        const todayPage = workspace.pages[todayKey] || getOrCreatePage(todayKey)
        const yesterdayPage = workspace.pages[yesterdayKey]

        if (!yesterdayPage) return 0

        // Get existing order values in today's page
        const sortedTodayTodos = [...todayPage.todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
        let lastOrder = sortedTodayTodos[sortedTodayTodos.length - 1]?.order ?? null

        const sortedYesterdayTodos = [...yesterdayPage.todos].sort((a, b) =>
          a.order < b.order ? -1 : a.order > b.order ? 1 : 0
        )
        const parentMap = deriveParentMap(sortedYesterdayTodos)

        const baseSet = new Set<string>()
        for (const todo of sortedYesterdayTodos) {
          if (todo.status === "todo" && !isBlankText(todo.text)) {
            baseSet.add(todo.id)
          }
        }

        if (baseSet.size === 0) return 0

        // Include ancestors to preserve structure
        for (const id of Array.from(baseSet)) {
          let parentId = parentMap.get(id) ?? null
          while (parentId) {
            baseSet.add(parentId)
            parentId = parentMap.get(parentId) ?? null
          }
        }

        // Determine root items to move (parent not in set)
        const roots = sortedYesterdayTodos.filter((todo) => {
          if (!baseSet.has(todo.id)) return false
          const parentId = parentMap.get(todo.id) ?? null
          return !parentId || !baseSet.has(parentId)
        })

        if (roots.length === 0) return 0

        const movedBlocks: TodoItem[] = []
        for (const root of roots) {
          const startIndex = sortedYesterdayTodos.findIndex((t) => t.id === root.id)
          if (startIndex < 0) continue
          let endIndex = startIndex + 1
          while (
            endIndex < sortedYesterdayTodos.length &&
            sortedYesterdayTodos[endIndex].level > root.level
          ) {
            endIndex += 1
          }
          const block = sortedYesterdayTodos.slice(startIndex, endIndex)
          movedBlocks.push(...block)
        }

        if (movedBlocks.length === 0) return 0

        // Rebase each root to level 0 while preserving structure
        const movedAdjusted: TodoItem[] = []
        let movedIndex = 0
        for (const root of roots) {
          const startIndex = movedBlocks.findIndex((t) => t.id === root.id)
          if (startIndex < 0) continue
          let endIndex = startIndex + 1
          while (endIndex < movedBlocks.length && movedBlocks[endIndex].level > root.level) {
            endIndex += 1
          }
          const block = movedBlocks.slice(startIndex, endIndex)
          const levelDelta = -root.level
          for (const todo of block) {
            movedAdjusted.push({
              ...todo,
              level: todo.level + levelDelta,
              updatedAt: new Date(),
            })
            movedIndex += 1
          }
        }

        const newOrders = generateNKeysBetween(lastOrder, null, movedAdjusted.length)
        const movedWithOrder = movedAdjusted.map((todo, index) => ({
          ...todo,
          order: newOrders[index],
        }))

        const combined = [...sortedTodayTodos, ...movedWithOrder]
        const movedWithParent = movedWithOrder.map((todo) => {
          const idx = combined.findIndex((t) => t.id === todo.id)
          const parentId = getParentIdForIndex(combined, idx, todo.level)
          return { ...todo, parentId }
        })

        const movedIds = new Set(movedBlocks.map((t) => t.id))

        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return

          const today = ws.pages[todayKey]
          if (today) {
            today.todos.push(...movedWithParent)
            today.updatedAt = new Date()
          }

          const yesterday = ws.pages[yesterdayKey]
          if (yesterday) {
            yesterday.todos = yesterday.todos.filter((t) => !movedIds.has(t.id))
            yesterday.updatedAt = new Date()
          }
        })

        ensurePageExists(currentWorkspaceId, todayPage)

        for (const todo of movedWithParent) {
          persistTodoMove(currentWorkspaceId, todayKey, todo)
        }

        return movedWithParent.length
      },
    }
  })
)
