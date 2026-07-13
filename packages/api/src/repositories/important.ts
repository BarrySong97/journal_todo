import type { ImportantItemState, Result } from "@journal-todo/db"
import { getAdapter } from "../adapter"

export const getImportantItems = (): Promise<Result<ImportantItemState[]>> =>
  getAdapter().getImportantItems()

export const upsertImportantItem = (
  item: ImportantItemState
): Promise<Result<ImportantItemState>> => getAdapter().upsertImportantItem(item)

export const deleteImportantItem = (todoId: string): Promise<Result<void>> =>
  getAdapter().deleteImportantItem(todoId)
