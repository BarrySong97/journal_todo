import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { v4 as uuidv4 } from "uuid"
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing"
import type { TodoItem, JournalPage, TodoStatus, Workspace, ImportantItemState } from "../types/journal"
import { getTodayKey, formatDateKey } from "../utils/dateUtils"
import { isIncompleteMeaningfulTodo } from "../utils/todoFilters"
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
  getImportantItems,
  upsertImportantItem as upsertImportantItemRepo,
  deleteImportantItem as deleteImportantItemRepo,
} from "@journal-todo/api"
import { buildImportantTree, findTodoLocation } from "../utils/importantTree"

const extractTags = (text: string) => {
  const matches = text.match(/#[^\s#]+/g) ?? []
  const normalized = matches.map((tag) => tag.slice(1).toLowerCase())
  return Array.from(new Set(normalized))
}

export const splitTodoParagraphs = (text: string): string[] => {
  if (typeof text !== "string") return []

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const trimmedNormalized = normalized.replace(/\s+$/g, "")
  if (trimmedNormalized.length === 0) return []

  const hasParagraphBreak = /\n\s*\n/.test(trimmedNormalized)
  const lines = trimmedNormalized.split("\n")

  if (lines.length <= 1 && !hasParagraphBreak) {
    const trimmed = trimmedNormalized.trim()
    return trimmed.length > 0 ? [trimmed] : []
  }

  if (hasParagraphBreak) {
    return trimmedNormalized
      .split(/\n\s*\n+/)
      .map((paragraph) =>
        paragraph
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join(" ")
          .trim()
      )
      .filter((paragraph) => paragraph.length > 0)
  }

  return lines.map((line) => line.trim()).filter((line) => line.length > 0)
}

const insertTextAtSelection = (value: string, insert: string, start: number, end: number) => {
  const safeStart = Math.max(0, Math.min(start, value.length))
  const safeEnd = Math.max(safeStart, Math.min(end, value.length))
  return value.slice(0, safeStart) + insert + value.slice(safeEnd)
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
  return ensurePageExists(workspaceId, page)
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

const persistImportantItem = (item: ImportantItemState) => {
  upsertImportantItemRepo(item).catch((error) => {
    console.error(`[persist] Failed to save important item ${item.todoId}:`, error)
  })
}

const persistImportantDelete = (todoId: string) => {
  deleteImportantItemRepo(todoId).catch((error) => {
    console.error(`[persist] Failed to delete important item ${todoId}:`, error)
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
  importantItems: Record<string, ImportantItemState>

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
  pasteTodoText: (
    todoId: string,
    pastedText: string,
    selectionStart: number,
    selectionEnd: number,
    dateKey?: string
  ) => boolean
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
  rollOverTodosToToday: (mode?: "copy" | "move") => number
  toggleImportant: (todoId: string) => void
  removeFromImportant: (todoId: string) => ImportantItemState | undefined
  restoreImportantItem: (todoId: string, previous?: ImportantItemState) => void
  reorderImportant: (activeId: string, overId: string) => void
  updateTodoTextById: (todoId: string, text: string) => void
  toggleTodoById: (todoId: string) => boolean
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

      const [result, importantResult] = await Promise.all([
        getWorkspaces(),
        getImportantItems(),
      ])
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

        const knownTodoIds = new Set(
          workspaces.flatMap((workspace) =>
            Object.values(workspace.pages).flatMap((page) => page.todos.map((todo) => todo.id))
          )
        )
        const loadedImportantItems = importantResult.success ? importantResult.data : []
        const validImportantItems = loadedImportantItems.filter((item) => knownTodoIds.has(item.todoId))
        loadedImportantItems
          .filter((item) => !knownTodoIds.has(item.todoId))
          .forEach((item) => persistImportantDelete(item.todoId))

        set({
          workspaces: workspacesMap,
          workspaceOrder,
          workspaceRecentOrder,
          currentWorkspaceId: workspaceRecentOrder[0] || workspaceOrder[0],
          importantItems: Object.fromEntries(validImportantItems.map((item) => [item.todoId, item])),
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
      importantItems: {},

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
          const removedTodoIds = new Set(
            Object.values(state.workspaces[workspaceId]?.pages ?? {}).flatMap((page) =>
              page.todos.map((todo) => todo.id)
            )
          )
          for (const todoId of removedTodoIds) {
            delete state.importantItems[todoId]
            persistImportantDelete(todoId)
          }
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

      pasteTodoText: (
        todoId: string,
        pastedText: string,
        selectionStart: number,
        selectionEnd: number,
        dateKey?: string
      ) => {
        const { currentWorkspaceId, workspaces, addTodo, updateTodoText } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return false

        const targetDateKey = dateKey || workspace.currentDateKey
        const page = workspace.pages[targetDateKey]
        if (!page) return false

        const todo = page.todos.find((t) => t.id === todoId)
        if (!todo) return false

        const paragraphs = splitTodoParagraphs(pastedText)
        if (paragraphs.length <= 1) return false

        const currentText = todo.text ?? ""
        const mergedText = insertTextAtSelection(
          currentText,
          paragraphs[0],
          selectionStart,
          selectionEnd
        )
        updateTodoText(todoId, mergedText, targetDateKey)

        const sortedTodos = [...page.todos].sort((a, b) =>
          a.order < b.order ? -1 : a.order > b.order ? 1 : 0
        )
        const currentIndex = sortedTodos.findIndex((t) => t.id === todoId)
        if (currentIndex === -1) return true

        let insertIndex = currentIndex
        for (let i = currentIndex + 1; i < sortedTodos.length; i += 1) {
          if (sortedTodos[i].level > todo.level) {
            insertIndex = i
          } else {
            break
          }
        }

        let afterTodoId = sortedTodos[insertIndex]?.id ?? todoId
        for (const paragraph of paragraphs.slice(1)) {
          afterTodoId = addTodo(paragraph, afterTodoId, targetDateKey, todo.level)
        }

        return true
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
          delete state.importantItems[todoId]
          p.updatedAt = new Date()
        })

        // Persist the deletion
        persistTodoDelete(todoId)
        persistImportantDelete(todoId)
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

      rollOverTodosToToday: (mode: "copy" | "move" = "copy") => {
        const { currentWorkspaceId, workspaces, getOrCreatePage } = get()
        const workspace = workspaces[currentWorkspaceId]
        if (!workspace) return 0

        const todayKey = getTodayKey()
        const todayPage = workspace.pages[todayKey] || getOrCreatePage(todayKey)
        const todayTodoIds = new Set(todayPage.todos.map((todo) => todo.id))
        const rolloverPrefix = `rollover:${todayKey}:`

        const sourceDateKeys = Object.keys(workspace.pages)
          .filter((dateKey) => dateKey < todayKey)
          .sort((a, b) => a.localeCompare(b))
        if (sourceDateKeys.length === 0) return 0

        const sortedTodayTodos = [...todayPage.todos].sort((a, b) =>
          a.order < b.order ? -1 : a.order > b.order ? 1 : 0
        )
        const lastOrder = sortedTodayTodos[sortedTodayTodos.length - 1]?.order ?? null

        const copiedTodos: TodoItem[] = []
        const sourceDeletions = new Map<string, string[]>()
        const movedIdMap = new Map<string, string>()

        for (const dateKey of sourceDateKeys) {
          const sourcePage = workspace.pages[dateKey]
          if (!sourcePage) continue

          const sortedSourceTodos = [...sourcePage.todos].sort((a, b) =>
            a.order < b.order ? -1 : a.order > b.order ? 1 : 0
          )
          if (sortedSourceTodos.length === 0) continue

          const parentMap = deriveParentMap(sortedSourceTodos)
          const includedSet = new Set<string>()
          for (const todo of sortedSourceTodos) {
            if (isIncompleteMeaningfulTodo(todo)) {
              includedSet.add(todo.id)
            }
          }
          if (includedSet.size === 0) continue

          const roots = sortedSourceTodos.filter((todo) => {
            if (!includedSet.has(todo.id)) return false

            let parentId = parentMap.get(todo.id) ?? null
            while (parentId) {
              if (includedSet.has(parentId)) return false
              parentId = parentMap.get(parentId) ?? null
            }
            return true
          })
          if (roots.length === 0) continue

          // P2b fix: track entire blocks for deletion, not just includedSet,
          // so completed/empty descendants don't become orphans when the parent is moved
          const blockDeletionIds = new Set<string>()

          for (const root of roots) {
            const startIndex = sortedSourceTodos.findIndex((todo) => todo.id === root.id)
            if (startIndex < 0) continue
            let endIndex = startIndex + 1
            while (endIndex < sortedSourceTodos.length && sortedSourceTodos[endIndex].level > root.level) {
              endIndex += 1
            }

            const block = sortedSourceTodos.slice(startIndex, endIndex)

            // Collect all items in the block for deletion in move mode (P2b)
            for (const todo of block) {
              blockDeletionIds.add(todo.id)
            }

            for (const todo of block) {
              if (!includedSet.has(todo.id)) continue

              const copiedId = `${rolloverPrefix}${todo.id}`
              if (mode === "move") movedIdMap.set(todo.id, copiedId)
              if (todayTodoIds.has(copiedId)) continue

              const now = new Date()
              let parentId = parentMap.get(todo.id) ?? null
              let includedDepth = 0
              while (parentId) {
                if (includedSet.has(parentId)) {
                  includedDepth += 1
                }
                parentId = parentMap.get(parentId) ?? null
              }

              copiedTodos.push({
                ...todo,
                id: copiedId,
                parentId: null,
                level: includedDepth,
                createdAt: now,
                updatedAt: now,
              })
              todayTodoIds.add(copiedId)
            }
          }

          if (mode === "move" && blockDeletionIds.size > 0) {
            sourceDeletions.set(dateKey, [...blockDeletionIds])
          }
        }

        // P2a fix: apply move deletions even when nothing new was copied
        // (e.g. already rolled over today in copy mode, then switched to move)
        if (copiedTodos.length === 0) {
          if (mode === "move" && sourceDeletions.size > 0) {
            const metadataToPersist: ImportantItemState[] = []
            set((state) => {
              const ws = state.workspaces[currentWorkspaceId]
              if (!ws) return
              for (const [dateKey, todoIds] of sourceDeletions) {
                const page = ws.pages[dateKey]
                if (!page) continue
                const toDelete = new Set(todoIds)
                page.todos = page.todos.filter((t) => !toDelete.has(t.id))
                page.updatedAt = new Date()
              }
              for (const todoIds of sourceDeletions.values()) {
                for (const todoId of todoIds) {
                  const metadata = state.importantItems[todoId]
                  delete state.importantItems[todoId]
                  const movedId = movedIdMap.get(todoId)
                  if (metadata && movedId) {
                    const movedMetadata = {
                      ...metadata,
                      todoId: movedId,
                      sortParentId: metadata.sortParentId
                        ? (movedIdMap.get(metadata.sortParentId) ?? null)
                        : null,
                      updatedAt: new Date(),
                    }
                    state.importantItems[movedId] = movedMetadata
                    metadataToPersist.push(movedMetadata)
                  }
                }
              }
            })
            for (const todoIds of sourceDeletions.values()) {
              for (const todoId of todoIds) {
                persistTodoDelete(todoId)
                persistImportantDelete(todoId)
              }
            }
            metadataToPersist.forEach(persistImportantItem)
          }
          return 0
        }

        const newOrders = generateNKeysBetween(lastOrder, null, copiedTodos.length)
        const copiedWithOrder = copiedTodos.map((todo, index) => ({
          ...todo,
          order: newOrders[index],
        }))

        const combined = [...sortedTodayTodos, ...copiedWithOrder]
        const copiedWithParent = copiedWithOrder.map((todo) => {
          const idx = combined.findIndex((t) => t.id === todo.id)
          const parentId = getParentIdForIndex(combined, idx, todo.level)
          return { ...todo, parentId }
        })

        const metadataToPersist: ImportantItemState[] = []
        set((state) => {
          const ws = state.workspaces[currentWorkspaceId]
          if (!ws) return

          const today = ws.pages[todayKey]
          if (today) {
            today.todos.push(...copiedWithParent)
            today.updatedAt = new Date()
          }

          if (mode === "move" && sourceDeletions.size > 0) {
            for (const [dateKey, todoIds] of sourceDeletions) {
              const page = ws.pages[dateKey]
              if (!page) continue
              const toDelete = new Set(todoIds)
              page.todos = page.todos.filter((t) => !toDelete.has(t.id))
              page.updatedAt = new Date()
            }
            for (const todoIds of sourceDeletions.values()) {
              for (const todoId of todoIds) {
                const metadata = state.importantItems[todoId]
                delete state.importantItems[todoId]
                const movedId = movedIdMap.get(todoId)
                if (metadata && movedId) {
                  const movedMetadata = {
                    ...metadata,
                    todoId: movedId,
                    sortParentId: metadata.sortParentId
                      ? (movedIdMap.get(metadata.sortParentId) ?? null)
                      : null,
                    updatedAt: new Date(),
                  }
                  state.importantItems[movedId] = movedMetadata
                  metadataToPersist.push(movedMetadata)
                }
              }
            }
          }
        })

        ensurePageExists(currentWorkspaceId, todayPage)
        for (const todo of copiedWithParent) {
          const createPromise = persistTodoCreate(currentWorkspaceId, todayKey, todayPage, todo)
          const metadata = metadataToPersist.find((item) => item.todoId === todo.id)
          if (metadata) createPromise.then(() => persistImportantItem(metadata))
        }
        const newlyCreatedIds = new Set(copiedWithParent.map((todo) => todo.id))
        metadataToPersist
          .filter((item) => !newlyCreatedIds.has(item.todoId))
          .forEach(persistImportantItem)

        if (mode === "move" && sourceDeletions.size > 0) {
          for (const todoIds of sourceDeletions.values()) {
            for (const todoId of todoIds) {
              persistTodoDelete(todoId)
              persistImportantDelete(todoId)
            }
          }
        }

        return copiedWithParent.length
      },

      toggleImportant: (todoId: string) => {
        const { importantItems, workspaces } = get()
        if (!findTodoLocation(workspaces, todoId)) return
        const existing = importantItems[todoId]
        const now = new Date()
        const next: ImportantItemState = {
          todoId,
          isPinned: !existing?.isPinned,
          isExcluded: existing?.isPinned ? Boolean(existing.isExcluded) : false,
          sortOrder: existing?.sortOrder ?? null,
          sortParentId: existing?.sortParentId ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        set((state) => {
          state.importantItems[todoId] = next
        })
        persistImportantItem(next)
      },

      removeFromImportant: (todoId: string) => {
        const existing = get().importantItems[todoId]
        const previous = existing ? { ...existing } : undefined
        const now = new Date()
        const next: ImportantItemState = {
          todoId,
          isPinned: false,
          isExcluded: true,
          sortOrder: existing?.sortOrder ?? null,
          sortParentId: existing?.sortParentId ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        set((state) => {
          state.importantItems[todoId] = next
        })
        persistImportantItem(next)
        return previous
      },

      restoreImportantItem: (todoId: string, previous?: ImportantItemState) => {
        if (previous) {
          const restored = { ...previous, updatedAt: new Date() }
          set((state) => {
            state.importantItems[todoId] = restored
          })
          persistImportantItem(restored)
          return
        }
        set((state) => {
          delete state.importantItems[todoId]
        })
        persistImportantDelete(todoId)
      },

      reorderImportant: (activeId: string, overId: string) => {
        const { workspaces, importantItems } = get()
        const { todos } = buildImportantTree(workspaces, importantItems)
        const active = todos.find((todo) => todo.id === activeId)
        const over = todos.find((todo) => todo.id === overId)
        if (!active || !over || active.parentId !== over.parentId) return

        const siblings = todos.filter((todo) => todo.parentId === active.parentId)
        const activeIndex = siblings.findIndex((todo) => todo.id === activeId)
        const overIndex = siblings.findIndex((todo) => todo.id === overId)
        if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return
        const reordered = [...siblings]
        const [moved] = reordered.splice(activeIndex, 1)
        reordered.splice(overIndex, 0, moved)
        const orders = generateNKeysBetween(null, null, reordered.length)
        const now = new Date()

        set((state) => {
          reordered.forEach((todo, index) => {
            const existing = state.importantItems[todo.id]
            const next: ImportantItemState = {
              todoId: todo.id,
              isPinned: existing?.isPinned ?? false,
              isExcluded: existing?.isExcluded ?? false,
              sortOrder: orders[index],
              sortParentId: active.parentId,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            }
            state.importantItems[todo.id] = next
            persistImportantItem(next)
          })
        })
      },

      updateTodoTextById: (todoId: string, text: string) => {
        const location = findTodoLocation(get().workspaces, todoId)
        if (!location) return
        const tags = extractTags(text)
        set((state) => {
          const todo = state.workspaces[location.workspaceId]?.pages[location.dateKey]?.todos
            .find((item) => item.id === todoId)
          if (!todo) return
          todo.text = text
          todo.tags = tags
          todo.updatedAt = new Date()
          state.workspaces[location.workspaceId].pages[location.dateKey].updatedAt = new Date()
        })
        persistTodoUpdate(todoId, { text, tags })
      },

      toggleTodoById: (todoId: string) => {
        const location = findTodoLocation(get().workspaces, todoId)
        if (!location) return false
        const nextStatus: TodoStatus = location.todo.status === "done" ? "todo" : "done"
        set((state) => {
          const todo = state.workspaces[location.workspaceId]?.pages[location.dateKey]?.todos
            .find((item) => item.id === todoId)
          if (todo) {
            todo.status = nextStatus
            todo.updatedAt = new Date()
            state.workspaces[location.workspaceId].pages[location.dateKey].updatedAt = new Date()
          }
        })
        persistTodoUpdate(todoId, { status: nextStatus })
        return true
      },
    }
  })
)
