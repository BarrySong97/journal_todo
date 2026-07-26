import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react"
import type { CSSProperties } from "react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@journal-todo/ui"
import { useJournal } from "@/hooks/useJournal"
import { useSortMode } from "@/hooks/useSortMode"

interface SortTodosActionProps {
  scope: "workspace" | "important" | "all"
  className?: string
}

export function SortTodosAction({ scope, className }: SortTodosActionProps) {
  const { sortTodos, sortImportant, allTodosSortDirection, setAllTodosSortDirection } = useJournal()
  const { direction } = useSortMode()

  const label =
    scope === "all"
      ? allTodosSortDirection === "date-asc"
        ? "Sort by date (oldest first)"
        : "Sort by date (newest first)"
      : "Sort"

  const handleSort = () => {
    if (scope === "all") {
      const nextDirection = allTodosSortDirection === "date-asc" ? "date-desc" : "date-asc"
      setAllTodosSortDirection(nextDirection)
      toast(nextDirection === "date-asc" ? "Sorted oldest dates first" : "Sorted newest dates first")
      return
    }

    const count = scope === "workspace" ? sortTodos(direction) : sortImportant(direction)
    toast(count > 0 ? `Sorted ${count} item${count === 1 ? "" : "s"}` : "Already sorted")
  }

  const Icon = scope === "all" ? (allTodosSortDirection === "date-asc" ? ArrowUp : ArrowDown) : ArrowDownUp

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={`rounded-full p-1.5 transition-colors hover:bg-accent ${className ?? ""}`}
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        onClick={handleSort}
        aria-label={label}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
