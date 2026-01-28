import { SqliteStorageAdapter } from "./adapters/sqlite"
import type { StorageAdapter } from "./adapters/types"

/**
 * Get a SQLite storage adapter instance
 * This is the primary way to interact with the database in Tauri apps
 */
export function getSqliteAdapter(): StorageAdapter {
  return new SqliteStorageAdapter()
}
