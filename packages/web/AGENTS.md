# Agent Instructions (`@journal-todo/web`)

This package is the core product app (journal + todo workflow).

## What this package does

- Implements the main writing/task experience.
- Owns workspace/date navigation, todo editing/ordering, and footer/settings UX.
- Can run standalone (Vite) and be embedded by `@journal-todo/website`.

## Primary business responsibilities

- Render and manage journal/todo interactions.
- Coordinate persistence via `@journal-todo/api`.
- Handle desktop-specific integrations (when running under Tauri) while still supporting browser fallback.

## Structure

- `src/main.tsx`
  - Standalone Vite entrypoint.
- `src/App.tsx`
  - Main shell for desktop/browser runtime behavior.
- `src/AppTSX.tsx`
  - Embedded-friendly app entry exported for website embedding.
- `src/components/journal/*`
  - Core journal UI (editor, list, footer, settings, date nav, todo item/list).
- `src/hooks/*`
  - Journal and input interaction hooks.
- `src/lib/stores/journalStore.ts`
  - Zustand store and core journal business state/actions.
- `src/lib/appInfo.ts`
  - App info/version resolution logic.
- `src/__tests__/*`
  - Unit tests for store/components/hooks.

## Integration points

- Uses `@journal-todo/api` for persistence.
- Uses `@journal-todo/ui` for shared primitives.
- Is embedded inside `@journal-todo/website` via dynamic import.

## Commands

- Dev: `pnpm -C packages/web dev`
- Build: `pnpm -C packages/web build`
- Typecheck: `pnpm -C packages/web typecheck`
- Tests: `pnpm -C packages/web vitest`

## Change guidelines

- Keep store logic in `journalStore` coherent with UI behavior.
- Avoid cross-package UI duplication; use `@journal-todo/ui` first.
- Validate with typecheck/tests after behavior or store changes.
