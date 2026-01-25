export type TodoStatus = "todo" | "doing" | "done"

export interface TodoItem {
  id: string
  text: string
  status: TodoStatus
  tags: string[]
  order: number
  level: number // 0 = top level, 1+ = nested levels
  createdAt: Date
  updatedAt: Date
}

export interface JournalPage {
  date: string // YYYY-MM-DD format
  todos: TodoItem[]
  notes?: string // Optional free text area
  createdAt: Date
  updatedAt: Date
}

export interface Workspace {
  id: string
  name: string
  pages: Record<string, JournalPage>
  currentDateKey: string
  createdAt: Date
  updatedAt: Date
}

export interface JournalData {
  workspaces: Record<string, Workspace>
  currentWorkspaceId: string
  version: string
}
