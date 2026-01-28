import type {
  StorageAdapter,
  Result,
  Workspace,
  JournalPage,
  TodoItem,
} from "./types"

const STORAGE_KEY = "journal-storage"

interface StorageState {
  state: {
    currentWorkspaceId: string
    workspaceOrder: string[]
    workspaceRecentOrder: string[]
    workspaces: Record<string, Workspace>
  }
  version: number
}

/**
 * localStorage adapter for web platform
 * Uses same key and data shape as existing Zustand persist middleware
 */
export class LocalStorageAdapter implements StorageAdapter {
  private getStorageState(): StorageState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StorageState
    } catch (error) {
      console.error("Failed to parse localStorage data:", error)
      return null
    }
  }

  private saveStorageState(state: StorageState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
      throw error
    }
  }

  private getAllWorkspaces(): Record<string, Workspace> {
    const state = this.getStorageState()
    return state?.state.workspaces ?? {}
  }

  private updateAllWorkspaces(
    updater: (workspaces: Record<string, Workspace>) => Record<string, Workspace>
  ): void {
    const state = this.getStorageState()
    if (!state) {
      throw new Error("Storage not initialized")
    }

    const updatedWorkspaces = updater(state.state.workspaces)
    this.saveStorageState({
      ...state,
      state: {
        ...state.state,
        workspaces: updatedWorkspaces,
      },
    })
  }

  private normalizeDates(workspace: Workspace): Workspace {
    return {
      ...workspace,
      createdAt: new Date(workspace.createdAt),
      updatedAt: new Date(workspace.updatedAt),
      pages: Object.fromEntries(
        Object.entries(workspace.pages).map(([date, page]) => [
          date,
          {
            ...page,
            createdAt: new Date(page.createdAt),
            updatedAt: new Date(page.updatedAt),
            todos: page.todos.map((todo) => ({
              ...todo,
              createdAt: new Date(todo.createdAt),
              updatedAt: new Date(todo.updatedAt),
            })),
          },
        ])
      ),
    }
  }

  private normalizePage(page: JournalPage): JournalPage {
    return {
      ...page,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
      todos: page.todos.map((todo) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
      })),
    }
  }

  async initialize(): Promise<Result<void>> {
    try {
      const state = this.getStorageState()
      if (!state) {
        this.saveStorageState({
          state: {
            currentWorkspaceId: "",
            workspaceOrder: [],
            workspaceRecentOrder: [],
            workspaces: {},
          },
          version: 8,
        })
      }
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getWorkspaces(): Promise<Result<Workspace[]>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspaceList = Object.values(workspaces).map((ws) =>
        this.normalizeDates(ws)
      )
      return { success: true, data: workspaceList }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getWorkspace(id: string): Promise<Result<Workspace | null>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[id]
      if (!workspace) {
        return { success: true, data: null }
      }

      return { success: true, data: this.normalizeDates(workspace) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async createWorkspace(workspace: Workspace): Promise<Result<Workspace>> {
    try {
      this.updateAllWorkspaces((workspaces) => ({
        ...workspaces,
        [workspace.id]: workspace,
      }))
      return { success: true, data: workspace }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async updateWorkspace(
    id: string,
    data: Partial<Workspace>
  ): Promise<Result<Workspace>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const existing = workspaces[id]
      if (!existing) {
        return { success: false, error: `Workspace ${id} not found` }
      }

      const updated: Workspace = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date(),
      }

      this.updateAllWorkspaces((ws) => ({
        ...ws,
        [id]: updated,
      }))

      return { success: true, data: updated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async deleteWorkspace(id: string): Promise<Result<void>> {
    try {
      const workspaces = this.getAllWorkspaces()
      if (!workspaces[id]) {
        return { success: false, error: `Workspace ${id} not found` }
      }

      this.updateAllWorkspaces((ws) => {
        const updated = { ...ws }
        delete updated[id]
        return updated
      })

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getPage(
    workspaceId: string,
    date: string
  ): Promise<Result<JournalPage | null>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[workspaceId]
      if (!workspace) {
        return { success: false, error: `Workspace ${workspaceId} not found` }
      }

      const page = workspace.pages[date]
      if (!page) {
        return { success: true, data: null }
      }

      return { success: true, data: this.normalizePage(page) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async createPage(
    workspaceId: string,
    page: JournalPage
  ): Promise<Result<JournalPage>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[workspaceId]
      if (!workspace) {
        return { success: false, error: `Workspace ${workspaceId} not found` }
      }

      if (workspace.pages[page.date]) {
        return {
          success: false,
          error: `Page for date ${page.date} already exists`,
        }
      }

      this.updateAllWorkspaces((ws) => ({
        ...ws,
        [workspaceId]: {
          ...workspace,
          pages: {
            ...workspace.pages,
            [page.date]: page,
          },
          updatedAt: new Date(),
        },
      }))

      return { success: true, data: page }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async updatePage(
    workspaceId: string,
    date: string,
    data: Partial<JournalPage>
  ): Promise<Result<JournalPage>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[workspaceId]
      if (!workspace) {
        return { success: false, error: `Workspace ${workspaceId} not found` }
      }

      const existing = workspace.pages[date]
      if (!existing) {
        return { success: false, error: `Page for date ${date} not found` }
      }

      const updated: JournalPage = {
        ...existing,
        ...data,
        date,
        updatedAt: new Date(),
      }

      this.updateAllWorkspaces((ws) => ({
        ...ws,
        [workspaceId]: {
          ...workspace,
          pages: {
            ...workspace.pages,
            [date]: updated,
          },
          updatedAt: new Date(),
        },
      }))

      return { success: true, data: updated }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getTodos(
    workspaceId: string,
    date: string
  ): Promise<Result<TodoItem[]>> {
    try {
      const pageResult = await this.getPage(workspaceId, date)
      if (!pageResult.success) {
        return pageResult
      }

      if (!pageResult.data) {
        return { success: true, data: [] }
      }

      return { success: true, data: pageResult.data.todos }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async createTodo(
    workspaceId: string,
    date: string,
    todo: TodoItem
  ): Promise<Result<TodoItem>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[workspaceId]
      if (!workspace) {
        return { success: false, error: `Workspace ${workspaceId} not found` }
      }

      const page = workspace.pages[date]
      if (!page) {
        return { success: false, error: `Page for date ${date} not found` }
      }

      const updatedPage: JournalPage = {
        ...page,
        todos: [...page.todos, todo],
        updatedAt: new Date(),
      }

      this.updateAllWorkspaces((ws) => ({
        ...ws,
        [workspaceId]: {
          ...workspace,
          pages: {
            ...workspace.pages,
            [date]: updatedPage,
          },
          updatedAt: new Date(),
        },
      }))

      return { success: true, data: todo }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async updateTodo(
    id: string,
    data: Partial<TodoItem>
  ): Promise<Result<TodoItem>> {
    try {
      const workspaces = this.getAllWorkspaces()

      for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        for (const [date, page] of Object.entries(workspace.pages)) {
          const todoIndex = page.todos.findIndex((t) => t.id === id)
          if (todoIndex !== -1) {
            const existing = page.todos[todoIndex]
            const updated: TodoItem = {
              ...existing,
              ...data,
              id,
              updatedAt: new Date(),
            }

            const updatedTodos = [...page.todos]
            updatedTodos[todoIndex] = updated

            const updatedPage: JournalPage = {
              ...page,
              todos: updatedTodos,
              updatedAt: new Date(),
            }

            this.updateAllWorkspaces((ws) => ({
              ...ws,
              [workspaceId]: {
                ...workspace,
                pages: {
                  ...workspace.pages,
                  [date]: updatedPage,
                },
                updatedAt: new Date(),
              },
            }))

            return { success: true, data: updated }
          }
        }
      }

      return { success: false, error: `Todo ${id} not found` }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async deleteTodo(id: string): Promise<Result<void>> {
    try {
      const workspaces = this.getAllWorkspaces()

      for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        for (const [date, page] of Object.entries(workspace.pages)) {
          const todoIndex = page.todos.findIndex((t) => t.id === id)
          if (todoIndex !== -1) {
            const updatedTodos = page.todos.filter((t) => t.id !== id)

            const updatedPage: JournalPage = {
              ...page,
              todos: updatedTodos,
              updatedAt: new Date(),
            }

            this.updateAllWorkspaces((ws) => ({
              ...ws,
              [workspaceId]: {
                ...workspace,
                pages: {
                  ...workspace.pages,
                  [date]: updatedPage,
                },
                updatedAt: new Date(),
              },
            }))

            return { success: true, data: undefined }
          }
        }
      }

      return { success: false, error: `Todo ${id} not found` }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async savePage(
    workspaceId: string,
    page: JournalPage
  ): Promise<Result<void>> {
    try {
      const workspaces = this.getAllWorkspaces()
      const workspace = workspaces[workspaceId]
      if (!workspace) {
        return { success: false, error: `Workspace ${workspaceId} not found` }
      }

      this.updateAllWorkspaces((ws) => ({
        ...ws,
        [workspaceId]: {
          ...workspace,
          pages: {
            ...workspace.pages,
            [page.date]: page,
          },
          updatedAt: new Date(),
        },
      }))

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
