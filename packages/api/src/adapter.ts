import type { StorageAdapter, Result } from "@journal-todo/db"
import { isTauri } from "@journal-todo/shared"
import { LocalStorageAdapter, getSqliteAdapter } from "@journal-todo/db"

/**
 * Shared adapter instance used by all repositories
 * Ensures single adapter across workspace, page, and todo operations
 */
let adapter: StorageAdapter | null = null

/**
 * Get or create the storage adapter based on platform
 * Lazy initialization: adapter created on first use
 * Platform detection: isTauri() ? SQLite : localStorage
 */
export function getAdapter(): StorageAdapter {
  if (adapter === null) {
    adapter = isTauri() ? getSqliteAdapter() : new LocalStorageAdapter()
  }
  return adapter
}

/**
 * Initialize the storage adapter
 * Must be called before using any repository functions
 * Uses the same shared adapter instance as all repositories
 */
export async function initializeStorage(): Promise<Result<void>> {
  const storageAdapter = getAdapter()
  return storageAdapter.initialize()
}
