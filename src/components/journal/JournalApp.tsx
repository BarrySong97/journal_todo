"use client"

import { useState } from "react"
import { DateNavigation } from "./DateNavigation"
import { JournalEditor } from "./JournalEditor"
import { buttonVariants } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useJournal } from "@/hooks/useJournal"
import type { Workspace } from "@/lib/types/journal"

export function JournalApp() {
  const {
    workspaces,
    workspaceOrder,
    currentWorkspaceId,
    setCurrentWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useJournal()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("")

  const workspaceList = workspaceOrder
    .map((id) => workspaces[id])
    .filter((workspace): workspace is Workspace => Boolean(workspace))

  const currentWorkspace = workspaces[currentWorkspaceId]

  const handleWorkspaceChange = (value: string | null) => {
    if (value) {
      setCurrentWorkspace(value)
    }
  }

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open)
    if (open) {
      setNewWorkspaceName("")
    }
  }

  const handleRenameOpenChange = (open: boolean) => {
    setIsRenameOpen(open)
    if (open) {
      setRenameWorkspaceName(currentWorkspace?.name ?? "")
    }
  }

  const handleCreateWorkspace = () => {
    const trimmed = newWorkspaceName.trim()
    if (!trimmed) return
    createWorkspace(trimmed)
    setIsCreateOpen(false)
  }

  const handleRenameWorkspace = () => {
    if (!currentWorkspace) return
    const trimmed = renameWorkspaceName.trim()
    if (!trimmed) return
    renameWorkspace(currentWorkspace.id, trimmed)
    setIsRenameOpen(false)
  }

  const handleDeleteWorkspace = () => {
    if (!currentWorkspace) return
    if (workspaceOrder.length <= 1) return
    deleteWorkspace(currentWorkspace.id)
    setIsDeleteOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Journal Todo</h1>
          <div className="flex items-center gap-2">
            <Select value={currentWorkspaceId} onValueChange={handleWorkspaceChange}>
              <SelectTrigger size="sm" className="min-w-[160px]">
                <span className="flex flex-1 text-left">
                  {currentWorkspace?.name ?? "Select workspace"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {workspaceList.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Manage
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
                  New workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsRenameOpen(true)}
                  disabled={!currentWorkspace}
                >
                  Rename workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={workspaceOrder.length <= 1}
                >
                  Delete workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <AlertDialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>New workspace</AlertDialogTitle>
              <AlertDialogDescription>
                Give this workspace a name to keep projects separated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
              >
                Create
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isRenameOpen} onOpenChange={handleRenameOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rename workspace</AlertDialogTitle>
              <AlertDialogDescription>
                Update the workspace name shown in the switcher.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={renameWorkspaceName}
              onChange={(event) => setRenameWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRenameWorkspace}
                disabled={!renameWorkspaceName.trim()}
              >
                Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
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
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mb-6">
          <DateNavigation />
        </div>

        <JournalEditor />
      </div>
    </div>
  )
}
