import { Kbd } from "@journal-todo/ui"

export function ShortcutList() {
  return (
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
  )
}
