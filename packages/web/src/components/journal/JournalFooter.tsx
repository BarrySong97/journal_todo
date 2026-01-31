"use client"

import { Moon, Sun, Check, ChevronDown, RotateCcw, CircleHelp } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { getVersion } from "@tauri-apps/api/app"
import { isTauri } from "@tauri-apps/api/core"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { useJournal } from "@/hooks/useJournal"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
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
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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

const AutoUpdateTracker = () => {
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    let isActive = true

    const runCheck = async () => {
      if (!import.meta.env.PROD || !isTauri()) return

      try {
        const update = await check()
        if (isActive && update) {
          setAvailableUpdate(update)
        }
      } catch (error) {
        console.warn("Updater check failed", error)
      }
    }

    runCheck()
    return () => {
      isActive = false
    }
  }, [])

  const handleInstall = async () => {
    if (!availableUpdate || isInstalling) return

    setIsInstalling(true)
    try {
      const toastId = toastIdRef.current ?? toast(`V ${availableUpdate.version} 是新版本`, {
        duration: Infinity,
      })
      toastIdRef.current = toastId

      let downloaded = 0
      let contentLength = 0

      toast(`V ${availableUpdate.version} 是新版本`, {
        id: toastId,
        description: "开始下载...",
        duration: Infinity,
      })

      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength ?? 0
          toast(`V ${availableUpdate.version} 是新版本`, {
            id: toastId,
            description: "开始下载...",
            duration: Infinity,
          })
        }

        if (event.event === "Progress") {
          downloaded += event.data.chunkLength
          const percent = contentLength
            ? Math.min(100, Math.round((downloaded / contentLength) * 100))
            : null
          const progressText = percent !== null
            ? `正在下载 ${percent}%`
            : "正在下载..."

          toast(`V ${availableUpdate.version} 是新版本`, {
            id: toastId,
            description: progressText,
            duration: Infinity,
          })
        }

        if (event.event === "Finished") {
          toast(`V ${availableUpdate.version} 是新版本`, {
            id: toastId,
            description: "下载完成，正在安装...",
            duration: Infinity,
          })
        }
      })

      toast(`V ${availableUpdate.version} 是新版本`, {
        id: toastId,
        description: "安装完成，正在重启...",
        duration: Infinity,
      })
      await relaunch()
    } catch (error) {
      console.warn("Updater install failed", error)
      setIsInstalling(false)
    }
  }

  useEffect(() => {
    if (!availableUpdate || toastIdRef.current) return

    const id = toast(`V ${availableUpdate.version} 是新版本`, {
      action: {
        label: "点击更新",
        onClick: handleInstall,
      },
      duration: Infinity,
    })

    toastIdRef.current = id
  }, [availableUpdate, handleInstall, isInstalling, toast])

  return null
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
    goToNextDay,
    goToPreviousDay,
  } = useJournal()

  const { isDark, toggleTheme } = useTheme()
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [shouldRestoreCommand, setShouldRestoreCommand] = useState(false)
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false)
  const [workspaceSwitchList, setWorkspaceSwitchList] = useState<string[]>([])
  const [workspaceSwitchIndex, setWorkspaceSwitchIndex] = useState(0)
  const workspaceSwitchListRef = useRef<string[]>([])
  const workspaceSwitchIndexRef = useRef(0)
  const workspaceSwitchOpenRef = useRef(false)
  const lastWorkspaceIdRef = useRef<string | null>(null)
  const previousWorkspaceIdRef = useRef<string | null>(null)

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

  useEffect(() => {
    const prev = previousWorkspaceIdRef.current
    if (prev && prev !== currentWorkspaceId) {
      lastWorkspaceIdRef.current = prev
    }
    previousWorkspaceIdRef.current = currentWorkspaceId
  }, [currentWorkspaceId])

  useEffect(() => {
    workspaceSwitchListRef.current = workspaceSwitchList
  }, [workspaceSwitchList])

  useEffect(() => {
    workspaceSwitchIndexRef.current = workspaceSwitchIndex
  }, [workspaceSwitchIndex])

  useEffect(() => {
    workspaceSwitchOpenRef.current = isWorkspaceSwitcherOpen
  }, [isWorkspaceSwitcherOpen])

  // Calculate incomplete todo counts for each workspace
  const incompleteTodoCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [id, workspace] of Object.entries(workspaces)) {
      if (!workspace) continue
      let count = 0
      for (const page of Object.values(workspace.pages)) {
        count += page.todos.filter((t) => t.status === "todo").length
      }
      counts[id] = count
    }
    return counts
  }, [workspaces])

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
          const lastId = lastWorkspaceIdRef.current
          const lastIndex = lastId ? recentWorkspaceList.indexOf(lastId) : -1
          const initialIndex = lastIndex >= 0
            ? lastIndex
            : (recentWorkspaceList.length > 1 ? 1 : 0)
          workspaceSwitchListRef.current = recentWorkspaceList
          workspaceSwitchIndexRef.current = initialIndex
          workspaceSwitchOpenRef.current = true
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

      // Arrow key navigation when workspace switcher is open
        if (isWorkspaceSwitcherOpen && workspaceSwitchList.length > 0) {
        if (key === "arrowdown") {
          event.preventDefault()
          event.stopPropagation()
          setWorkspaceSwitchIndex((prev) =>
            (prev + 1) % workspaceSwitchList.length
          )
          return
        }
        if (key === "arrowup") {
          event.preventDefault()
          event.stopPropagation()
          setWorkspaceSwitchIndex((prev) =>
            (prev - 1 + workspaceSwitchList.length) % workspaceSwitchList.length
          )
          return
        }
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        switch (key) {
          case "arrowleft": {
            event.preventDefault()
            goToPreviousDay()
            return
          }
          case "arrowright": {
            event.preventDefault()
            goToNextDay()
            return
          }
          default:
            break
        }
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

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [
    currentWorkspaceIndex,
    workspaceOrder,
    currentWorkspace,
    isCommandOpen,
    isWorkspaceSwitcherOpen,
    recentWorkspaceList,
    goToNextDay,
    goToPreviousDay,
  ])

  useEffect(() => {
    let isActive = true

    const loadVersion = async () => {
      if (!isTauri()) return

      try {
        const version = await getVersion()
        if (isActive) {
          setAppVersion(version)
        }
      } catch (error) {
        console.warn("Failed to load app version", error)
      }
    }

    loadVersion()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!workspaceSwitchOpenRef.current) return

      const key = event.key.toLowerCase()
      const isCtrlRelease = key === "control"

      if (!isCtrlRelease) return

      const selectedId = workspaceSwitchListRef.current[workspaceSwitchIndexRef.current]
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
      <AutoUpdateTracker />
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
                  {incompleteTodoCounts[id] > 0 && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {incompleteTodoCounts[id]}
                    </span>
                  )}
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
                  {incompleteTodoCounts[workspace.id] > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {incompleteTodoCounts[workspace.id]}
                    </span>
                  )}
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
          <Popover>
            <PopoverTrigger>
              <button
                className="p-1.5 rounded-full hover:bg-accent transition-colors"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                title="Shortcuts"
              >
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <PopoverHeader>
                <PopoverTitle className="flex items-center justify-between">
                  <span>Keyboard shortcuts</span>
                  {appVersion && (
                    <span className="text-xs font-medium text-muted-foreground">
                      v{appVersion}
                    </span>
                  )}
                </PopoverTitle>
              </PopoverHeader>
              <div className="mt-2 grid gap-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Command palette</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Switch workspace</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Tab</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Previous day</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Alt</Kbd>
                    <Kbd>←</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Next day</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Alt</Kbd>
                    <Kbd>→</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Toggle todo status</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Enter</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Indent todo</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Tab</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Outdent todo</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Shift</Kbd>
                    <Kbd>Tab</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">New workspace</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Alt</Kbd>
                    <Kbd>N</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Rename workspace</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Alt</Kbd>
                    <Kbd>R</Kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Delete workspace</span>
                  <div className="flex items-center gap-1">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Alt</Kbd>
                    <Kbd>⌫</Kbd>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
