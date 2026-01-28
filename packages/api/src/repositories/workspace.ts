import type { Workspace, Result } from "@journal-todo/db"
import { getAdapter, initializeStorage } from "../adapter"

/**
 * Initialize the storage adapter
 */
export { initializeStorage }

/**
 * Get all workspaces
 */
export async function getWorkspaces(): Promise<Result<Workspace[]>> {
  const adapter = getAdapter()
  return adapter.getWorkspaces()
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(id: string): Promise<Result<Workspace | null>> {
  const adapter = getAdapter()
  return adapter.getWorkspace(id)
}

/**
 * Create a new workspace
 */
export async function createWorkspace(workspace: Workspace): Promise<Result<Workspace>> {
  const adapter = getAdapter()
  return adapter.createWorkspace(workspace)
}

/**
 * Update an existing workspace
 */
export async function updateWorkspace(
  id: string,
  data: Partial<Workspace>
): Promise<Result<Workspace>> {
  const adapter = getAdapter()
  return adapter.updateWorkspace(id, data)
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(id: string): Promise<Result<void>> {
  const adapter = getAdapter()
  return adapter.deleteWorkspace(id)
}

