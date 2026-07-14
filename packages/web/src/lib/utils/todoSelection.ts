/**
 * Pure helpers for todo row selection (shift+click ranges, drag-sweep,
 * keyboard range extension, and subtree-inclusive semantics).
 */

export interface SelectableRow {
  id: string
  level: number
}

const INDENT = "  "

/**
 * Inclusive range of rows between anchor and focus, in list order.
 * Falls back to [focusId] when the anchor is missing, [] when focus is missing.
 */
export const getRowRange = <T extends { id: string }>(
  rows: T[],
  anchorId: string,
  focusId: string
): string[] => {
  const focusIndex = rows.findIndex((row) => row.id === focusId)
  if (focusIndex === -1) return []

  const anchorIndex = rows.findIndex((row) => row.id === anchorId)
  if (anchorIndex === -1) return [focusId]

  const start = Math.min(anchorIndex, focusIndex)
  const end = Math.max(anchorIndex, focusIndex)
  return rows.slice(start, end + 1).map((row) => row.id)
}

/**
 * Contiguous level-based subtree block: the row plus every following row
 * with a deeper level, until a row at the same or shallower level appears.
 */
export const getSubtreeIds = <T extends SelectableRow>(
  allRows: T[],
  id: string
): string[] => {
  const index = allRows.findIndex((row) => row.id === id)
  if (index === -1) return []

  const rootLevel = allRows[index].level
  const ids = [id]
  for (let i = index + 1; i < allRows.length; i += 1) {
    if (allRows[i].level <= rootLevel) break
    ids.push(allRows[i].id)
  }
  return ids
}

/**
 * Expand explicitly selected rows to include each row's entire subtree
 * (collapsed descendants included). Selecting a row always selects its block.
 */
export const expandSelectionToSubtrees = <T extends SelectableRow>(
  allRows: T[],
  selectedIds: ReadonlySet<string>
): Set<string> => {
  const result = new Set<string>()
  let selectedBlockLevel: number | null = null

  for (const row of allRows) {
    if (selectedBlockLevel !== null && row.level > selectedBlockLevel) {
      result.add(row.id)
      continue
    }
    selectedBlockLevel = null
    if (selectedIds.has(row.id)) {
      result.add(row.id)
      selectedBlockLevel = row.level
    }
  }

  return result
}

/**
 * Drag-sweep activation: returns null until the pointer is over a DIFFERENT
 * row than the origin (never activates on a pixel threshold), otherwise the
 * visible range between origin and the row under the pointer.
 */
export const getSweepSelection = <T extends { id: string }>(
  visibleRows: T[],
  originId: string,
  overId: string | null
): string[] | null => {
  if (overId === null || overId === originId) return null
  const range = getRowRange(visibleRows, originId, overId)
  return range.length > 0 ? range : null
}

/**
 * Shift+Arrow range extension over visible rows: moves the focus end one row
 * up/down and recomputes the anchor→focus range (reversing past the anchor
 * shrinks the range naturally). Returns null at the first/last row.
 */
export const extendSelectionByRow = <T extends { id: string }>(
  visibleRows: T[],
  anchorId: string,
  focusId: string,
  direction: "up" | "down"
): { focusId: string; selectedIds: string[] } | null => {
  const focusIndex = visibleRows.findIndex((row) => row.id === focusId)
  if (focusIndex === -1) return null

  const next = visibleRows[direction === "up" ? focusIndex - 1 : focusIndex + 1]
  if (!next) return null

  return {
    focusId: next.id,
    selectedIds: getRowRange(visibleRows, anchorId, next.id),
  }
}

/**
 * Serialize the effective selection (subtrees included, hidden collapsed
 * descendants too) with absolute-level indentation.
 */
export const serializeSelectedTodos = <T extends SelectableRow & { text: string }>(
  allRows: T[],
  effectiveIds: ReadonlySet<string>
): string | null => {
  const texts = allRows
    .filter((row) => effectiveIds.has(row.id))
    .map((row) => `${INDENT.repeat(row.level)}${row.text}`)
    .filter((text) => text.trim().length > 0)

  if (texts.length === 0) return null

  return texts.join("\n")
}
