import { Layers, Square } from "lucide-react"
import type { CSSProperties } from "react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@journal-todo/ui"
import { useJournal } from "@/hooks/useJournal"

interface ScopeTodosActionProps {
  className?: string
}

export function ScopeTodosAction({ className }: ScopeTodosActionProps) {
  const { allTodosScope, setAllTodosScope, currentWorkspace, workspaceOrder } = useJournal()

  if (workspaceOrder.length <= 1) return null

  const isScoped = allTodosScope === "workspace"
  const workspaceName = currentWorkspace?.name ?? "this workspace"
  const label = isScoped ? `Showing ${workspaceName} only` : "Showing all workspaces"

  const handleToggle = () => {
    const next = isScoped ? "all" : "workspace"
    setAllTodosScope(next)
    toast(next === "workspace" ? `Showing ${workspaceName} only` : "Showing all workspaces")
  }

  const Icon = isScoped ? Square : Layers

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={`rounded-full p-1.5 transition-colors hover:bg-accent ${className ?? ""}`}
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        onClick={handleToggle}
        aria-label={label}
        aria-pressed={isScoped}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
