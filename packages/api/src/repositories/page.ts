import type { JournalPage, Result } from "@journal-todo/db"
import { getAdapter } from "../adapter"

/**
 * Get a page for a specific workspace and date
 */
export async function getPage(
  workspaceId: string,
  date: string
): Promise<Result<JournalPage | null>> {
  const adapter = getAdapter()
  return adapter.getPage(workspaceId, date)
}

/**
 * Create a new page
 */
export async function createPage(
  workspaceId: string,
  page: JournalPage
): Promise<Result<JournalPage>> {
  const adapter = getAdapter()
  return adapter.createPage(workspaceId, page)
}

/**
 * Update an existing page
 */
export async function updatePage(
  workspaceId: string,
  date: string,
  data: Partial<JournalPage>
): Promise<Result<JournalPage>> {
  const adapter = getAdapter()
  return adapter.updatePage(workspaceId, date, data)
}

/**
 * Save an entire page with all its todos (primary persistence method)
 */
export async function savePage(
  workspaceId: string,
  page: JournalPage
): Promise<Result<void>> {
  const adapter = getAdapter()
  return adapter.savePage(workspaceId, page)
}

