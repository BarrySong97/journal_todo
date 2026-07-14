---
name: verify
description: How to launch and drive this app to verify web/desktop UI changes end-to-end.
---

# Verifying journal-todo UI changes

## Launch

- Root `pnpm dev` starts the **Tauri desktop app** (opens a native window and
  writes to `packages/desktop/journal-dev.db`). For browser-driven
  verification use the web package instead:

  ```bash
  cd packages/web && npx vite --port 5199 --strictPort
  ```

- Wide mode (main list + Important pane) needs viewport width >= ~725px;
  below that the app switches to narrow mode with a single view.

## Driving with agent-browser (headless)

- Platform detection follows the browser UA. Headless Chrome on macOS reports
  a Mac UA, so in-app shortcuts use **Meta** (⌘), not Ctrl.
- **Gotcha:** real CDP `press Control+<letter>` combos intermittently crash
  the headless tab (page goes `about:blank`). Use synthetic dispatch instead:
  `window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", metaKey: true, cancelable: true }))`.
- `agent-browser eval` runs in an isolated world: stubbing
  `navigator.clipboard.writeText` there does NOT affect the app. To intercept
  the app's clipboard writes, inject a `<script>` tag (runs in main world) that
  writes the payload to `document.body.dataset.copied`.
- Plain keys (`Enter`, `Tab`, `Delete`, `Shift+ArrowDown`, `Alt+Shift+ArrowDown`,
  `Meta+Shift+i`) work fine as real CDP presses.
- Rows carry `data-todo-id`; selected rows get a `bg-accent/60` class on their
  first child div. The Important pane root has `data-pane="important"`.
- Seeding todos: click the placeholder textarea, `keyboard type`, `Enter` for
  a new row, `Tab`/`Shift+Tab` to indent/outdent.

## Known quirks (pre-existing, don't chase)

- No sonner `<Toaster>` is mounted in `packages/web`, so `toast.*` calls
  (copy/cut/delete feedback) render nothing.
- Web/localStorage mode did not restore todos after a page reload in headless
  verification; treat reloads as data loss and re-seed.
- `JournalFooter` hardcodes some `Ctrl` labels even on Mac UA.
