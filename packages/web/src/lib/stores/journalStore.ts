import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { TodoItem, JournalPage, TodoStatus, Workspace } from "@/lib/types/journal"
import { getTodayKey, formatDateKey } from "@/lib/utils/dateUtils"

const normalizeStatus = (status: unknown): TodoStatus =>
  status === "done" ? "done" : "todo"

const isTodoStatus = (status: unknown): status is TodoStatus =>
  status === "todo" || status === "done"

const isBlankText = (value: unknown) =>
  typeof value !== "string" || value.trim().length === 0

const extractTags = (text: string) => {
  const matches = text.match(/#[^\s#]+/g) ?? []
  const normalized = matches.map((tag) => tag.slice(1).toLowerCase())
  return Array.from(new Set(normalized))
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
      order: 0,
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

interface JournalStore {
  // State
  currentWorkspaceId: string
  workspaceOrder: string[]
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
  addTodo: (text?: string, afterTodoId?: string, dateKey?: string, level?: number) => string // returns new todo id
  updateTodoText: (todoId: string, text: string, dateKey?: string) => void
  updateTodoLevel: (todoId: string, direction: "indent" | "outdent", dateKey?: string) => void
  toggleTodo: (todoId: string, dateKey?: string) => void
  deleteTodo: (todoId: string, dateKey?: string) => void
  moveTodo: (todoId: string, direction: "up" | "down", dateKey?: string) => void
  getTodo: (todoId: string, dateKey?: string) => TodoItem | undefined
  rollOverTodosToToday: () => number
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => {
      const defaultWorkspace = buildWorkspace("Default")

      return {
        // Initial state
        currentWorkspaceId: defaultWorkspace.id,
        workspaceOrder: [defaultWorkspace.id],
        workspaces: {
          [defaultWorkspace.id]: defaultWorkspace,
        },

        // Workspace actions
        setCurrentWorkspace: (workspaceId: string) => {
          const { workspaces } = get()
          if (!workspaces[workspaceId]) return
          set({ currentWorkspaceId: workspaceId })
        },

        createWorkspace: (name?: string) => {
          const { workspaces, workspaceOrder } = get()
          const trimmedName = name?.trim()
          const workspaceName = trimmedName && trimmedName.length > 0
            ? trimmedName
            : `Workspace ${workspaceOrder.length + 1}`
          const newWorkspace = buildWorkspace(workspaceName)

          set({
            workspaces: {
              ...workspaces,
              [newWorkspace.id]: newWorkspace,
            },
            workspaceOrder: [...workspaceOrder, newWorkspace.id],
            currentWorkspaceId: newWorkspace.id,
          })

          return newWorkspace.id
        },

        renameWorkspace: (workspaceId: string, name: string) => {
          const trimmedName = name.trim()
          if (!trimmedName) return
          const { workspaces } = get()
          const workspace = workspaces[workspaceId]
          if (!workspace) return

          set({
            workspaces: {
              ...workspaces,
              [workspaceId]: {
                ...workspace,
                name: trimmedName,
                updatedAt: new Date(),
              },
            },
          })
        },

        deleteWorkspace: (workspaceId: string) => {
          const { workspaces, workspaceOrder, currentWorkspaceId } = get()
          if (!workspaces[workspaceId]) return
          if (workspaceOrder.length <= 1) return

          const nextOrder = workspaceOrder.filter((id) => id !== workspaceId)
          const nextWorkspaces = { ...workspaces }
          delete nextWorkspaces[workspaceId]

          const nextCurrent =
            currentWorkspaceId === workspaceId
              ? nextOrder[0]
              : currentWorkspaceId

          set({
            workspaces: nextWorkspaces,
            workspaceOrder: nextOrder,
            currentWorkspaceId: nextCurrent,
          })
        },

        // Date navigation
        setCurrentDate: (date: Date) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: {
                ...workspace,
                currentDateKey: formatDateKey(date),
                updatedAt: new Date(),
              },
            },
          })
        },

        goToToday: () => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: {
                ...workspace,
                currentDateKey: getTodayKey(),
                updatedAt: new Date(),
              },
            },
          })
        },

        goToNextDay: () => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const currentDate = new Date(workspace.currentDateKey)
          currentDate.setDate(currentDate.getDate() + 1)

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: {
                ...workspace,
                currentDateKey: formatDateKey(currentDate),
                updatedAt: new Date(),
              },
            },
          })
        },

        goToPreviousDay: () => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const currentDate = new Date(workspace.currentDateKey)
          currentDate.setDate(currentDate.getDate() - 1)

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: {
                ...workspace,
                currentDateKey: formatDateKey(currentDate),
                updatedAt: new Date(),
              },
            },
          })
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

          return newPage
        },

        // Todo CRUD
        addTodo: (text = "", afterTodoId?: string, dateKey?: string, level?: number) => {
          const { currentWorkspaceId, workspaces, getOrCreatePage } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return ""

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey] || getOrCreatePage(targetDateKey)
          const nextLevel = Math.max(0, Math.min(3, level ?? 0))

          const newTodo: TodoItem = {
            id: uuidv4(),
            text,
            status: "todo",
            tags: extractTags(text),
            order: 0,
            level: nextLevel,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          let newTodos: TodoItem[]

          if (afterTodoId) {
            // Insert after the specified todo
            const afterIndex = page.todos.findIndex((t) => t.id === afterTodoId)
            if (afterIndex !== -1) {
              newTodos = [
                ...page.todos.slice(0, afterIndex + 1),
                newTodo,
                ...page.todos.slice(afterIndex + 1),
              ]
            } else {
              // If afterTodoId not found, add at end
              newTodos = [...page.todos, newTodo]
            }
          } else {
            // No afterTodoId specified, add at end
            newTodos = [...page.todos, newTodo]
          }

          // Recalculate order for all todos
          newTodos.forEach((todo, index) => {
            todo.order = index
          })

          const updatedPage: JournalPage = {
            ...page,
            todos: newTodos,
            updatedAt: new Date(),
          }

          const updatedWorkspace = updateWorkspacePage(
            workspace,
            targetDateKey,
            updatedPage
          )

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })

          return newTodo.id
        },

        updateTodoText: (todoId: string, text: string, dateKey?: string) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey]
          if (!page) return

          const updatedTodos = page.todos.map((todo) =>
            todo.id === todoId
              ? { ...todo, text, tags: extractTags(text), updatedAt: new Date() }
              : todo
          )

          const updatedPage: JournalPage = {
            ...page,
            todos: updatedTodos,
            updatedAt: new Date(),
          }

          const updatedWorkspace = updateWorkspacePage(
            workspace,
            targetDateKey,
            updatedPage
          )

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })
        },

        toggleTodo: (todoId: string, dateKey?: string) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey]
          if (!page) return

          const currentIndex = page.todos.findIndex((todo) => todo.id === todoId)
          if (currentIndex === -1) return

          const currentTodo = page.todos[currentIndex]
          const currentStatus = normalizeStatus(currentTodo.status)
          const nextStatus: TodoStatus = currentStatus === "done" ? "todo" : "done"

          if (nextStatus === "done") {
            const currentLevel = currentTodo.level
            for (let i = currentIndex + 1; i < page.todos.length; i += 1) {
              if (page.todos[i].level <= currentLevel) break
              if (normalizeStatus(page.todos[i].status) !== "done") {
                return
              }
            }
          }

          const updatedTodos = page.todos.map((todo, index) =>
            index === currentIndex
              ? { ...todo, status: nextStatus, updatedAt: new Date() }
              : todo
          )

          const updatedPage: JournalPage = {
            ...page,
            todos: updatedTodos,
            updatedAt: new Date(),
          }

          const updatedWorkspace = updateWorkspacePage(
            workspace,
            targetDateKey,
            updatedPage
          )

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })
        },

        deleteTodo: (todoId: string, dateKey?: string) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey]
          if (!page) return

          const updatedTodos = page.todos
            .filter((todo) => todo.id !== todoId)
            .map((todo, index) => ({ ...todo, order: index }))

          // Ensure there's always at least one todo
          if (updatedTodos.length === 0) {
            updatedTodos.push({
              id: uuidv4(),
              text: "",
              status: "todo",
              tags: [],
              order: 0,
              level: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          const updatedPage: JournalPage = {
            ...page,
            todos: updatedTodos,
            updatedAt: new Date(),
          }

          const updatedWorkspace = updateWorkspacePage(
            workspace,
            targetDateKey,
            updatedPage
          )

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })
        },

        moveTodo: (todoId: string, direction: "up" | "down", dateKey?: string) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey]
          if (!page) return

          const currentIndex = page.todos.findIndex((todo) => todo.id === todoId)
          if (currentIndex === -1) return

          const currentTodo = page.todos[currentIndex]
          const findBlockEnd = (startIndex: number) => {
            const rootLevel = page.todos[startIndex].level
            let endIndex = startIndex

            for (let i = startIndex + 1; i < page.todos.length; i++) {
              if (page.todos[i].level > rootLevel) {
                endIndex = i
              } else {
                break
              }
            }

            return endIndex
          }

          const currentBlockEnd = findBlockEnd(currentIndex)
          let newTodos: typeof page.todos

          if (direction === "up") {
            let prevRootIndex = currentIndex - 1

            while (prevRootIndex >= 0 && page.todos[prevRootIndex].level > currentTodo.level) {
              prevRootIndex -= 1
            }

            if (prevRootIndex < 0) return
            if (page.todos[prevRootIndex].level !== currentTodo.level) return

            const prevBlockEnd = findBlockEnd(prevRootIndex)

            const beforePrev = page.todos.slice(0, prevRootIndex)
            const prevBlock = page.todos.slice(prevRootIndex, prevBlockEnd + 1)
            const currentBlock = page.todos.slice(currentIndex, currentBlockEnd + 1)
            const afterCurrent = page.todos.slice(currentBlockEnd + 1)

            newTodos = [...beforePrev, ...currentBlock, ...prevBlock, ...afterCurrent]
          } else {
            const nextRootIndex = currentBlockEnd + 1
            if (nextRootIndex >= page.todos.length) return
            if (page.todos[nextRootIndex].level !== currentTodo.level) return

            const nextBlockEnd = findBlockEnd(nextRootIndex)

            const beforeCurrent = page.todos.slice(0, currentIndex)
            const currentBlock = page.todos.slice(currentIndex, currentBlockEnd + 1)
            const nextBlock = page.todos.slice(nextRootIndex, nextBlockEnd + 1)
            const afterNext = page.todos.slice(nextBlockEnd + 1)

            newTodos = [...beforeCurrent, ...nextBlock, ...currentBlock, ...afterNext]
          }

          // Update order numbers
          newTodos.forEach((todo, index) => {
            todo.order = index
          })

          const updatedPage: JournalPage = {
            ...page,
            todos: newTodos,
            updatedAt: new Date(),
          }

          const updatedWorkspace = updateWorkspacePage(
            workspace,
            targetDateKey,
            updatedPage
          )

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })
        },

        updateTodoLevel: (todoId: string, direction: "indent" | "outdent", dateKey?: string) => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return

          const targetDateKey = dateKey || workspace.currentDateKey
          const page = workspace.pages[targetDateKey]
          if (!page) return

          const currentIndex = page.todos.findIndex((todo) => todo.id === todoId)
          if (currentIndex === -1) return

          const currentTodo = page.todos[currentIndex]
          let newLevel = currentTodo.level

          // Find children (consecutive items after current with higher level)
          const children: number[] = []
          for (let i = currentIndex + 1; i < page.todos.length; i++) {
            if (page.todos[i].level > currentTodo.level) {
              children.push(i)
            } else {
              break // Stop when we reach an item at same or lower level
            }
          }

          if (direction === "indent") {
            // Indent one level, but never deeper than the previous todo allows.
            if (currentIndex > 0) {
              const prevTodo = page.todos[currentIndex - 1]
              const targetLevel = Math.min(
                3,
                Math.min(currentTodo.level + 1, prevTodo.level + 1)
              )
              if (targetLevel > currentTodo.level) {
                newLevel = targetLevel
              }
            }
          } else if (direction === "outdent") {
            // Can outdent if level > 0
            if (currentTodo.level > 0) {
              newLevel = currentTodo.level - 1
            }
          }

          // Only update if level actually changed
          if (newLevel !== currentTodo.level) {
            const levelDiff = newLevel - currentTodo.level

            const updatedTodos = page.todos.map((todo, index) => {
              if (index === currentIndex) {
                // Update the current todo
                return { ...todo, level: newLevel, updatedAt: new Date() }
              }
              if (children.includes(index)) {
                // Update children with the same level difference
                const childNewLevel = Math.max(0, Math.min(3, todo.level + levelDiff))
                return { ...todo, level: childNewLevel, updatedAt: new Date() }
              }
              return todo
            })

            const updatedPage: JournalPage = {
              ...page,
              todos: updatedTodos,
              updatedAt: new Date(),
            }

            const updatedWorkspace = updateWorkspacePage(
              workspace,
              targetDateKey,
              updatedPage
            )

            set({
              workspaces: {
                ...workspaces,
                [currentWorkspaceId]: updatedWorkspace,
              },
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

          return page.todos.find((todo) => todo.id === todoId)
        },

        rollOverTodosToToday: () => {
          const { currentWorkspaceId, workspaces } = get()
          const workspace = workspaces[currentWorkspaceId]
          if (!workspace) return 0

          const todayKey = getTodayKey()
          const pages = workspace.pages
          const updatedPages: Record<string, JournalPage> = { ...pages }
          const movedTodos: TodoItem[] = []

          const dateKeys = Object.keys(pages).filter((key) => key < todayKey)
          dateKeys.sort()

          dateKeys.forEach((dateKey) => {
            const page = pages[dateKey]
            if (!page) return

            const remaining: TodoItem[] = []
            const rolling: TodoItem[] = []

            for (let i = 0; i < page.todos.length; i += 1) {
              const todo = page.todos[i]
              const rawStatus = (todo as { status?: unknown }).status
              const rawText = (todo as { text?: unknown }).text

              if (isBlankText(rawText)) {
                remaining.push(todo)
                const currentLevel = todo.level

                for (let j = i + 1; j < page.todos.length; j += 1) {
                  const child = page.todos[j]
                  if (child.level <= currentLevel) break
                  remaining.push(child)
                  i = j
                }
                continue
              }

              if (!isTodoStatus(rawStatus)) {
                remaining.push(todo)
                const currentLevel = todo.level

                for (let j = i + 1; j < page.todos.length; j += 1) {
                  const child = page.todos[j]
                  if (child.level <= currentLevel) break
                  remaining.push(child)
                  i = j
                }
                continue
              }

              if (normalizeStatus(todo.status) === "done") {
                remaining.push(todo)
              } else {
                rolling.push(todo)
              }
            }

            if (rolling.length === 0) return
            movedTodos.push(...rolling)

            let finalRemaining = remaining
            if (finalRemaining.length === 0) {
              finalRemaining = [
                {
                  id: uuidv4(),
                  text: "",
                  status: "todo",
                  tags: [],
                  order: 0,
                  level: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            }

            finalRemaining = finalRemaining.map((todo, index) => ({
              ...todo,
              order: index,
            }))

            updatedPages[dateKey] = {
              ...page,
              todos: finalRemaining,
              updatedAt: new Date(),
            }
          })

          if (movedTodos.length === 0) return 0

          const todayPage = pages[todayKey] ?? buildPage(todayKey)
          const combined = [...todayPage.todos, ...movedTodos]
          const reindexed = combined.map((todo, index) => ({
            ...todo,
            order: index,
          }))

          updatedPages[todayKey] = {
            ...todayPage,
            todos: reindexed,
            updatedAt: new Date(),
          }

          const updatedWorkspace: Workspace = {
            ...workspace,
            pages: updatedPages,
            updatedAt: new Date(),
          }

          set({
            workspaces: {
              ...workspaces,
              [currentWorkspaceId]: updatedWorkspace,
            },
          })

          return movedTodos.length
        },
      }
    },
    {
      name: "journal-storage",
      version: 7,
      migrate: (state, version) => {
        if (version >= 7) return state as JournalStore

        const persistedState = state as Partial<JournalStore> & {
          pages?: Record<string, JournalPage>
          currentDateKey?: string
        }

        if (persistedState.workspaces && persistedState.currentWorkspaceId) {
          const order =
            persistedState.workspaceOrder ?? Object.keys(persistedState.workspaces)

          return {
            currentWorkspaceId: persistedState.currentWorkspaceId,
            workspaceOrder: order,
            workspaces: persistedState.workspaces,
          } as JournalStore
        }

        const legacyPages = persistedState.pages ?? {}
        const legacyDateKey = persistedState.currentDateKey ?? getTodayKey()
        const defaultWorkspace = buildWorkspace("Default", {
          pages: legacyPages,
          currentDateKey: legacyDateKey,
        })

        return {
          currentWorkspaceId: defaultWorkspace.id,
          workspaceOrder: [defaultWorkspace.id],
          workspaces: {
            [defaultWorkspace.id]: defaultWorkspace,
          },
        } as JournalStore
      },
    }
  )
)
