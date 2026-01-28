/**
 * Todo status type
 */
export type TodoStatus = "todo" | "done"

/**
 * Todo item
 */
export interface TodoItem {
  id: string
  text: string
  status: TodoStatus
  tags: string[]
  order: string // Fractional index for efficient reordering (e.g., "a0", "a0V", "a1")
  level: number
  parentId?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Journal page containing todos for a specific date
 */
export interface JournalPage {
  date: string // YYYY-MM-DD format
  todos: TodoItem[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Workspace containing multiple pages
 */
export interface Workspace {
  id: string
  name: string
  pages: Record<string, JournalPage>
  currentDateKey: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Result type for error handling
 * Represents either a successful result with data or an error
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Storage adapter interface for persisting journal data
 * Implementations: localStorage (web), SQLite (Tauri)
 */
export interface StorageAdapter {
  /**
   * Initialize the storage adapter
   * Sets up database connections, creates tables, etc.
   */
  initialize(): Promise<Result<void>>

  // Workspace operations
  /**
   * Get all workspaces
   */
  getWorkspaces(): Promise<Result<Workspace[]>>

  /**
   * Get a single workspace by ID
   */
  getWorkspace(id: string): Promise<Result<Workspace | null>>

  /**
   * Create a new workspace
   */
  createWorkspace(workspace: Workspace): Promise<Result<Workspace>>

  /**
   * Update an existing workspace
   */
  updateWorkspace(
    id: string,
    data: Partial<Workspace>
  ): Promise<Result<Workspace>>

  /**
   * Delete a workspace
   */
  deleteWorkspace(id: string): Promise<Result<void>>

  // Page operations
  /**
   * Get a page for a specific workspace and date
   */
  getPage(
    workspaceId: string,
    date: string
  ): Promise<Result<JournalPage | null>>

  /**
   * Create a new page
   */
  createPage(
    workspaceId: string,
    page: JournalPage
  ): Promise<Result<JournalPage>>

  /**
   * Update an existing page
   */
  updatePage(
    workspaceId: string,
    date: string,
    data: Partial<JournalPage>
  ): Promise<Result<JournalPage>>

  // Todo operations
  /**
   * Get all todos for a specific page
   */
  getTodos(workspaceId: string, date: string): Promise<Result<TodoItem[]>>

  /**
   * Create a new todo
   */
  createTodo(
    workspaceId: string,
    date: string,
    todo: TodoItem
  ): Promise<Result<TodoItem>>

  /**
   * Update an existing todo
   */
  updateTodo(id: string, data: Partial<TodoItem>): Promise<Result<TodoItem>>

  /**
   * Delete a todo
   */
  deleteTodo(id: string): Promise<Result<void>>

  // Batch operations
  /**
   * Save an entire page with all its todos
   * This is the primary method used by the store for persistence
   */
  savePage(workspaceId: string, page: JournalPage): Promise<Result<void>>
}
