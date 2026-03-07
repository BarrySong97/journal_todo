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
} from "@journal-todo/ui"
import { getFileNameFromPath } from "@/lib/appInfo"
import { ShortcutList } from "./ShortcutList"

export interface JournalSettingsPopoverProps {
  appName: string
  authorName: string
  version: string | null
  sqlitePath: string | null
  onRevealSqlitePath?: () => void | Promise<void>
  onImportSqlitePath?: () => void | Promise<void>
}

export function JournalSettingsPopover({
  appName,
  authorName,
  version,
  sqlitePath,
  onRevealSqlitePath,
  onImportSqlitePath,
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
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Version</span>
              <span>v{version}</span>
            </div>
          )}
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
