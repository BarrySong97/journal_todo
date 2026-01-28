// Database package entry point

// Export types and interfaces
export type {
  TodoStatus,
  TodoItem,
  JournalPage,
  Workspace,
  Result,
  StorageAdapter,
} from "./adapters/types"

// Export schema
export * as schema from "./schema"

// Export adapters
export { LocalStorageAdapter } from "./adapters/localStorage"
export { SqliteStorageAdapter } from "./adapters/sqlite"

// Export client functions
export { getSqliteAdapter } from "./client"
