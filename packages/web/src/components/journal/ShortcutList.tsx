import { Kbd } from "@journal-todo/ui"
import {
  getTodoDeleteKeyLabel,
  getTodoModifierLabel,
  getTodoShortcutPlatform,
} from "@/lib/utils/multiSelectShortcuts"

export function ShortcutList() {
  const shortcutPlatform = getTodoShortcutPlatform()
  const mod = getTodoModifierLabel(shortcutPlatform)
  const deleteKey = getTodoDeleteKeyLabel(shortcutPlatform)

  return (
    <div className="mt-2 grid gap-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Command palette</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Switch workspace</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
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
          <Kbd>{mod}</Kbd>
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
        <span className="text-muted-foreground">Select todo</span>
        <div className="flex items-center gap-1">
          <Kbd>Shift</Kbd>
          <Kbd>Click</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Copy selected</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>C</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Cut selected</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>X</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Delete selected</span>
        <div className="flex items-center gap-1">
          <Kbd>{deleteKey}</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Extend selection</span>
        <div className="flex items-center gap-1">
          <Kbd>Shift</Kbd>
          <Kbd>↑/↓</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Clear selection</span>
        <div className="flex items-center gap-1">
          <Kbd>Esc</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Move todo up/down</span>
        <div className="flex items-center gap-1">
          <Kbd>Alt</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>↑/↓</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Switch pane focus</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>I</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">New workspace</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>Alt</Kbd>
          <Kbd>N</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Rename workspace</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>Alt</Kbd>
          <Kbd>R</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Delete workspace</span>
        <div className="flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>Alt</Kbd>
          <Kbd>⌫</Kbd>
        </div>
      </div>
    </div>
  )
}
