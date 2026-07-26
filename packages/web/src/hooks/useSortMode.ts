"use client"

import { useJournal } from "@/hooks/useJournal"

export function useSortMode() {
  const { sortDirection: direction, setSortDirection: setDirection } = useJournal()
  return { direction, setDirection }
}
