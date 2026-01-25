"use client"

import { useEffect, useState } from "react"
import { DateNavigation } from "./DateNavigation"
import { JournalEditor } from "./JournalEditor"
import { JournalFooter } from "./JournalFooter"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Toast } from "@/components/ui/toast"
import { useJournal } from "@/hooks/useJournal"

interface JournalAppProps {
  isManageOpen?: boolean
  onManageOpenChange?: (open: boolean) => void
}

export function JournalApp({ isManageOpen = false, onManageOpenChange }: JournalAppProps) {
  const {
    workspaces,
    workspaceOrder,
    currentWorkspaceId,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    rollOverTodosToToday,
  } = useJournal()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("")
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

  const currentWorkspace = workspaces[currentWorkspaceId]

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

  const handleRollover = () => {
    const movedCount = rollOverTodosToToday()
    const message =
      movedCount > 0
        ? `Moved ${movedCount} unfinished todo${movedCount > 1 ? "s" : ""} to today.`
        : "No unfinished todos to move."
    setToastMessage(message)
    setToastOpen(true)
    setIsRolloverOpen(false)
  }

  useEffect(() => {
    if (!toastOpen) return
    const timer = window.setTimeout(() => {
      setToastOpen(false)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [toastOpen])

  // Handle manage workspace dialog from Titlebar
  const handleManageClose = () => {
    onManageOpenChange?.(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 ">
      {/* Header with rollover button */}


      {/* Manage Workspace Dialog (triggered from Titlebar) */}
      <AlertDialog open={isManageOpen} onOpenChange={onManageOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Workspaces</AlertDialogTitle>
            <AlertDialogDescription>
              Create, rename, or delete workspaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                handleManageClose()
                setIsCreateOpen(true)
              }}
            >
              New workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleManageClose()
                setIsRenameOpen(true)
              }}
              disabled={!currentWorkspace}
            >
              Rename current workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleManageClose()
                setIsDeleteOpen(true)
              }}
              disabled={workspaceOrder.length <= 1}
              className="text-destructive hover:text-destructive"
            >
              Delete current workspace
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>流转未完成的 To-do</AlertDialogTitle>
            <AlertDialogDescription>
              这会把以前日期中未完成的 To-do 移动到今天。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollover}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScrollArea className="flex-1 min-h-0">
        <div className=" px-2 pb-8">


          <JournalEditor />
        </div>
      </ScrollArea>

      <JournalFooter onManageWorkspace={() => onManageOpenChange?.(true)} />

      <Toast open={toastOpen} message={toastMessage} />
    </div>
  )
}
