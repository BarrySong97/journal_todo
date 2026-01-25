"use client"

import { Moon, Sun, Check } from "lucide-react"
import { useEffect, useState } from "react"
import { useJournal } from "@/hooks/useJournal"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import type { Workspace } from "@/lib/types/journal"

interface JournalFooterProps {
  className?: string
  onManageWorkspace?: () => void
}

export function JournalFooter({ className, onManageWorkspace }: JournalFooterProps) {
  const {
    workspaces,
    workspaceOrder,
    currentWorkspaceId,
    setCurrentWorkspace,
  } = useJournal()

  const { isDark, toggleTheme } = useTheme()
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  const workspaceList = workspaceOrder
    .map((id) => workspaces[id])
    .filter((workspace): workspace is Workspace => Boolean(workspace))

  const currentWorkspace = workspaces[currentWorkspaceId]

  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId)
    setIsCommandOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsCommandOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <div
        className={cn(
          "h-12 border-t border-border bg-background flex items-center justify-between px-4",
          className
        )}
      >
        {/* Left: Current Workspace */}
        <div className="flex-1">
          <span className="text-sm font-medium text-muted-foreground">
            {currentWorkspace?.name ?? "Journal"}
          </span>
        </div>

        {/* Center: Kbd Hint */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </button>
        </div>

        {/* Right: Theme Toggle */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full hover:bg-accent transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            title="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Command Dialog - Center of Screen */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaceList.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => handleWorkspaceChange(workspace.id)}
                >
                  <span className="flex-1">{workspace.name}</span>
                  {workspace.id === currentWorkspaceId && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
