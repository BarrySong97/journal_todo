"use client"

import { Moon, Sun, Check, ChevronDown, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
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
  CommandShortcut,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import type { Workspace } from "@/lib/types/journal"

interface JournalFooterProps {
  className?: string
  isRolloverOpen?: boolean
  onOpenRollover?: () => void
}

const nameSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required"),
})

type NameFormValues = z.infer<typeof nameSchema>

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

export function JournalFooter({
  className,
  isRolloverOpen,
  onOpenRollover,
}: JournalFooterProps) {
  const {
    workspaces,
    workspaceOrder,
    workspaceRecentOrder,
    currentWorkspaceId,
    setCurrentWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useJournal()

  const { isDark, toggleTheme } = useTheme()
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [shouldRestoreCommand, setShouldRestoreCommand] = useState(false)
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false)
  const [workspaceSwitchList, setWorkspaceSwitchList] = useState<string[]>([])
  const [workspaceSwitchIndex, setWorkspaceSwitchIndex] = useState(0)

  const workspaceList = workspaceOrder
    .map((id) => workspaces[id])
    .filter((workspace): workspace is Workspace => Boolean(workspace))

  const currentWorkspace = workspaces[currentWorkspaceId]
  const currentWorkspaceIndex = useMemo(
    () => workspaceOrder.findIndex((id) => id === currentWorkspaceId),
    [workspaceOrder, currentWorkspaceId]
  )
  const recentWorkspaceList = useMemo(() => {
    const recent = workspaceRecentOrder.filter((id) => workspaces[id])
    const fallback = workspaceOrder.filter((id) => workspaces[id])
    return recent.length > 0 ? recent : fallback
  }, [workspaceRecentOrder, workspaceOrder, workspaces])

  const createForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  })

  const renameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: currentWorkspace?.name ?? "" },
    mode: "onChange",
  })

  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId)
    setIsCommandOpen(false)
  }

  const focusCommandInput = () => {
    setTimeout(() => {
      const input = document.querySelector('[data-slot="command-input"]') as HTMLInputElement | null
      if (input) {
        input.focus()
        input.select()
      }
    }, 50)
  }

  const restoreCommandIfNeeded = () => {
    if (!shouldRestoreCommand) return
    setShouldRestoreCommand(false)
    setIsCommandOpen(true)
    focusCommandInput()
  }

  const openCreateDialog = (restoreCommand = false) => {
    setShouldRestoreCommand(restoreCommand)
    setIsCreateOpen(true)
  }

  const openRenameDialog = (restoreCommand = false) => {
    setShouldRestoreCommand(restoreCommand)
    setIsRenameOpen(true)
  }

  const openDeleteDialog = (restoreCommand = false) => {
    setShouldRestoreCommand(restoreCommand)
    setIsDeleteOpen(true)
  }

  const openRolloverDialog = (restoreCommand = false) => {
    if (!onOpenRollover) return
    setShouldRestoreCommand(restoreCommand)
    onOpenRollover()
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    restoreCommandIfNeeded()
  }

  const closeRenameDialog = () => {
    setIsRenameOpen(false)
    restoreCommandIfNeeded()
  }

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false)
    restoreCommandIfNeeded()
  }

  const handleCreateSubmit = createForm.handleSubmit(({ name }: NameFormValues) => {
    createWorkspace(name.trim())
    closeCreateDialog()
    createForm.reset({ name: "" })
  })

  const handleRenameSubmit = renameForm.handleSubmit(({ name }: NameFormValues) => {
    if (!currentWorkspace) return
    renameWorkspace(currentWorkspace.id, name.trim())
    closeRenameDialog()
  })

  const handleDeleteWorkspace = () => {
    if (!currentWorkspace) return
    if (workspaceOrder.length <= 1) return
    deleteWorkspace(currentWorkspace.id)
    closeDeleteDialog()
  }

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open)
    if (!open) restoreCommandIfNeeded()
  }

  const handleRenameOpenChange = (open: boolean) => {
    setIsRenameOpen(open)
    if (!open) restoreCommandIfNeeded()
  }

  const handleDeleteOpenChange = (open: boolean) => {
    setIsDeleteOpen(open)
    if (!open) restoreCommandIfNeeded()
  }

  useEffect(() => {
    if (isCreateOpen) {
      createForm.reset({ name: "" })
    }
  }, [isCreateOpen, createForm])

  useEffect(() => {
    if (isRenameOpen) {
      renameForm.reset({ name: currentWorkspace?.name ?? "" })
    }
  }, [isRenameOpen, currentWorkspace?.name, renameForm])

  useEffect(() => {
    if (isRolloverOpen === false) {
      restoreCommandIfNeeded()
    }
  }, [isRolloverOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const metaOrCtrl = event.ctrlKey || event.metaKey
      const isTyping = isEditableTarget(event.target)

      if (metaOrCtrl && key === "k") {
        event.preventDefault()
        setIsCommandOpen((prev) => !prev)
        return
      }

      if (event.ctrlKey && key === "tab") {
        event.preventDefault()
        if (recentWorkspaceList.length === 0) return

        if (!isWorkspaceSwitcherOpen) {
          const initialIndex = recentWorkspaceList.length > 1 ? 1 : 0
          setWorkspaceSwitchList(recentWorkspaceList)
          setWorkspaceSwitchIndex(initialIndex)
          setIsWorkspaceSwitcherOpen(true)
          return
        }

        setWorkspaceSwitchIndex((prev) =>
          recentWorkspaceList.length > 0
            ? (prev + 1) % recentWorkspaceList.length
            : 0
        )
        return
      }

      if (isTyping) return

      if (metaOrCtrl && event.altKey) {
        switch (key) {
          case "arrowleft": {
            event.preventDefault()
            if (currentWorkspaceIndex > 0) {
              handleWorkspaceChange(workspaceOrder[currentWorkspaceIndex - 1])
            }
            break
          }
          case "arrowright": {
            event.preventDefault()
            if (currentWorkspaceIndex >= 0 && currentWorkspaceIndex < workspaceOrder.length - 1) {
              handleWorkspaceChange(workspaceOrder[currentWorkspaceIndex + 1])
            }
            break
          }
          case "n": {
            event.preventDefault()
            openCreateDialog(isCommandOpen)
            break
          }
          case "r": {
            event.preventDefault()
            if (currentWorkspace) {
              openRenameDialog(isCommandOpen)
            }
            break
          }
          case "backspace": {
            event.preventDefault()
            if (workspaceOrder.length > 1) {
              openDeleteDialog(isCommandOpen)
            }
            break
          }
          default:
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentWorkspaceIndex,
    workspaceOrder,
    currentWorkspace,
    isCommandOpen,
    isWorkspaceSwitcherOpen,
    recentWorkspaceList,
  ])

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isWorkspaceSwitcherOpen) return
      if (event.key.toLowerCase() !== "control") return

      const selectedId = workspaceSwitchList[workspaceSwitchIndex]
      if (selectedId) {
        handleWorkspaceChange(selectedId)
      }

      setIsWorkspaceSwitcherOpen(false)
      setWorkspaceSwitchList([])
      setWorkspaceSwitchIndex(0)
    }

    window.addEventListener("keyup", handleKeyUp)
    return () => window.removeEventListener("keyup", handleKeyUp)
  }, [isWorkspaceSwitcherOpen, workspaceSwitchList, workspaceSwitchIndex])

    return (
      <>
        {isWorkspaceSwitcherOpen && workspaceSwitchList.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="min-w-72 rounded-xl border border-border bg-background/95 p-3 shadow-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Switch workspace
              </div>
              <div className="space-y-1">
                {workspaceSwitchList.map((id, index) => (
                  <div
                    key={id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                      index === workspaceSwitchIndex
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className="flex-1 truncate">
                      {workspaces[id]?.name ?? "Workspace"}
                    </span>
                    {id === currentWorkspaceId && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      <div
        className={cn(
          "h-12 border-t border-border bg-background flex items-center justify-between px-4",
          className
        )}
      >
        {/* Left: Current Workspace */}
        <div className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">
              <span className="max-w-[200px] truncate">
                {currentWorkspace?.name ?? "Journal"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="min-w-56">
              {workspaceList.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleWorkspaceChange(workspace.id)}
                >
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {workspace.id === currentWorkspaceId && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openCreateDialog(false)}>
                New workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openRenameDialog(false)}
                disabled={!currentWorkspace}
              >
                Rename current workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(false)}
                disabled={workspaceOrder.length <= 1}
                className="text-destructive focus:text-destructive"
              >
                Delete current workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <Command loop>
          <CommandInput placeholder="Search commands..." />
          <CommandList>
            <CommandEmpty>No command found.</CommandEmpty>
            <CommandGroup heading="Workspace actions">
              <CommandItem onSelect={() => openCreateDialog(true)}>
                New workspace
                <CommandShortcut>Ctrl Alt N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => openRenameDialog(true)}
                disabled={!currentWorkspace}
              >
                Rename current workspace
                <CommandShortcut>Ctrl Alt R</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => openDeleteDialog(true)}
                disabled={workspaceOrder.length <= 1}
              >
                Delete current workspace
                <CommandShortcut>Ctrl Alt Backspace</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Journal actions">
              <CommandItem
                onSelect={() => openRolloverDialog(true)}
                disabled={!onOpenRollover}
              >
                <RotateCcw className="text-muted-foreground" />
                Roll over unfinished todos
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Give this workspace a name to keep projects separated.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleCreateSubmit}>
            <Input
              {...createForm.register("name")}
              placeholder="Workspace name"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!createForm.formState.isValid}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={handleRenameOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>
              Update the workspace name shown in the switcher.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleRenameSubmit}>
            <Input
              {...renameForm.register("name")}
              placeholder="Workspace name"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRenameDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameForm.formState.isValid}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all journal entries in
              {currentWorkspace ? ` "${currentWorkspace.name}".` : " this workspace."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={workspaceOrder.length <= 1}
              className={buttonVariants({ variant: "destructive" })}
              autoFocus
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
