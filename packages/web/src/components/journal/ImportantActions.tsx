import { CheckCircle2, Circle, Eraser } from "lucide-react"
import type { CSSProperties } from "react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@journal-todo/ui"
import { useJournal } from "@/hooks/useJournal"
import { buildImportantTree } from "@/lib/utils/importantTree"

type ClearMode = "incomplete" | "completed" | "all"

const actionCopy: Record<ClearMode, { label: string; pastTense: string }> = {
  incomplete: { label: "Clear incomplete", pastTense: "incomplete" },
  completed: { label: "Clear completed", pastTense: "completed" },
  all: { label: "Clear all", pastTense: "" },
}

export function ImportantActions() {
  const {
    workspaces,
    importantItems,
    clearImportantItems,
    restoreImportantItems,
  } = useJournal()
  const todos = buildImportantTree(workspaces, importantItems).todos
  const counts = {
    incomplete: todos.filter((todo) => todo.status !== "done").length,
    completed: todos.filter((todo) => todo.status === "done").length,
    all: todos.length,
  }

  const handleClear = (mode: ClearMode) => {
    const { count, previous } = clearImportantItems(mode)
    if (count === 0) return

    const itemLabel = count === 1 ? "item" : "items"
    const qualifier = actionCopy[mode].pastTense
    toast(`Cleared ${count}${qualifier ? ` ${qualifier}` : ""} ${itemLabel} from Important`, {
      action: {
        label: "Undo",
        onClick: () => restoreImportantItems(previous),
      },
    })
  }

  const buttonClass =
    "rounded-full p-1.5 transition-colors hover:bg-accent aria-disabled:opacity-30"
  const iconClass = "h-4 w-4 text-muted-foreground"
  const noDragStyle = { WebkitAppRegion: "no-drag" } as CSSProperties

  return (
    <div className="absolute right-1 flex items-center" style={noDragStyle}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={buttonClass}
          onClick={counts.incomplete > 0 ? () => handleClear("incomplete") : undefined}
          aria-disabled={counts.incomplete === 0}
          aria-label={actionCopy.incomplete.label}
        >
          <Circle className={iconClass} />
        </TooltipTrigger>
        <TooltipContent side="bottom">{actionCopy.incomplete.label}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={buttonClass}
          onClick={counts.completed > 0 ? () => handleClear("completed") : undefined}
          aria-disabled={counts.completed === 0}
          aria-label={actionCopy.completed.label}
        >
          <CheckCircle2 className={iconClass} />
        </TooltipTrigger>
        <TooltipContent side="bottom">{actionCopy.completed.label}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={buttonClass}
          onClick={counts.all > 0 ? () => handleClear("all") : undefined}
          aria-disabled={counts.all === 0}
          aria-label={actionCopy.all.label}
        >
          <Eraser className={iconClass} />
        </TooltipTrigger>
        <TooltipContent side="bottom">{actionCopy.all.label}</TooltipContent>
      </Tooltip>
    </div>
  )
}
