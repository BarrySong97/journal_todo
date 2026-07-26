import { ChevronDown, Settings } from "lucide-react"
import type { CSSProperties } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Switch,
} from "@journal-todo/ui"
import { getFileNameFromPath } from "@/lib/appInfo"
import { ShortcutList } from "./ShortcutList"

export interface JournalSettingsPopoverProps {
  appName: string
  authorName: string
  version: string | null
  sqlitePath: string | null
  rolloverIsMove: boolean
  onRolloverModeChange: (isMove: boolean) => void
  sortIncompleteFirst: boolean
  onSortModeChange: (incompleteFirst: boolean) => void
  onRevealSqlitePath?: () => void | Promise<void>
  onImportSqlitePath?: () => void | Promise<void>
  canCheckForUpdates?: boolean
  updateStatus?: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "installing" | "error"
  availableVersion?: string | null
  updateProgress?: number | null
  onCheckForUpdates?: () => void | Promise<void>
  onInstallUpdate?: () => void | Promise<void>
}

export function JournalSettingsPopover({
  appName,
  authorName,
  version,
  sqlitePath,
  rolloverIsMove,
  onRolloverModeChange,
  sortIncompleteFirst,
  onSortModeChange,
  onRevealSqlitePath,
  onImportSqlitePath,
  canCheckForUpdates = false,
  updateStatus = "idle",
  availableVersion,
  updateProgress,
  onCheckForUpdates,
  onInstallUpdate,
}: JournalSettingsPopoverProps) {
  const sqliteFileName = getFileNameFromPath(sqlitePath)

  return (
    <Popover>
      <PopoverTrigger
        className="p-1.5 rounded-full hover:bg-accent transition-colors"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        title="Settings"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
        </PopoverHeader>
        <div className="mt-2 grid gap-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">App</span>
            <span>{appName}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Author</span>
            <span>{authorName}</span>
          </div>
          {version && (
            <div className="flex items-start justify-between gap-2 text-sm">
              <span className="pt-0.5 text-muted-foreground">Version</span>
              <div className="flex flex-col items-end gap-0.5 text-right">
                <div className="flex items-center gap-2">
                  <span>v{version}</span>
                  {canCheckForUpdates && updateStatus === "idle" && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={onCheckForUpdates}
                    >
                      Check for updates
                    </button>
                  )}
                </div>
                {canCheckForUpdates && updateStatus === "checking" && (
                  <span className="text-xs text-muted-foreground">Checking...</span>
                )}
                {canCheckForUpdates && updateStatus === "up-to-date" && (
                  <span className="text-xs text-muted-foreground">
                    Up to date
                    <button
                      type="button"
                      className="ml-1 underline underline-offset-2 hover:text-foreground"
                      onClick={onCheckForUpdates}
                    >
                      Check again
                    </button>
                  </span>
                )}
                {canCheckForUpdates && updateStatus === "available" && (
                  <span className="text-xs text-muted-foreground">
                    {availableVersion ? `v${availableVersion} available` : "New version available"}
                    <button
                      type="button"
                      className="ml-1 font-medium text-foreground underline underline-offset-2"
                      onClick={onInstallUpdate}
                    >
                      Update
                    </button>
                  </span>
                )}
                {canCheckForUpdates && updateStatus === "downloading" && (
                  <span className="text-xs text-muted-foreground">
                    {updateProgress == null ? "Downloading..." : `Downloading ${updateProgress}%`}
                  </span>
                )}
                {canCheckForUpdates && updateStatus === "installing" && (
                  <span className="text-xs text-muted-foreground">Installing and restarting...</span>
                )}
                {canCheckForUpdates && updateStatus === "error" && (
                  <span className="text-xs text-destructive">
                    Update check failed
                    <button
                      type="button"
                      className="ml-1 underline underline-offset-2"
                      onClick={onCheckForUpdates}
                    >
                      Retry
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Roll over</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {rolloverIsMove ? "Move" : "Copy"}
              </span>
              <Switch
                checked={rolloverIsMove}
                onCheckedChange={onRolloverModeChange}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {sortIncompleteFirst ? "Incomplete on top" : "Incomplete on bottom"}
              </span>
              <Switch
                checked={sortIncompleteFirst}
                onCheckedChange={onSortModeChange}
              />
            </div>
          </div>
          <div className="flex items-start justify-between gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">SQLite path</span>
            {sqliteFileName ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex max-w-[190px] items-center gap-1 rounded-md px-1 py-0.5 text-right underline underline-offset-2 hover:bg-accent"
                  title={sqlitePath ?? "Unavailable"}
                >
                  <span className="break-all">{sqliteFileName}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
                  <DropdownMenuItem onClick={onRevealSqlitePath} disabled={!onRevealSqlitePath}>
                    Open current path
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onImportSqlitePath} disabled={!onImportSqlitePath}>
                    Import database
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="max-w-[190px] break-all text-right">Unavailable</span>
            )}
          </div>
        </div>
        <ShortcutList />
      </PopoverContent>
    </Popover>
  )
}
