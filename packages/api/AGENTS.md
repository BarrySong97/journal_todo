# Agent Instructions (`@journal-todo/api`)

This package is the data-access facade used by the app layer.

## What this package does

- Exposes repository APIs for `workspace`, `page`, and `todo`.
- Owns adapter selection logic:
  - Tauri runtime -> SQLite adapter
  - Browser runtime -> localStorage adapter
- Provides one shared adapter instance for all repositories.

## Primary business responsibilities

- Keep app-level persistence calls stable and storage-agnostic.
- Centralize storage initialization (`initializeStorage`).
- Return `Result<T>`-style responses from db adapter operations.

## Structure

- `src/index.ts`
  - Public entrypoint for repository exports.
- `src/adapter.ts`
  - Shared adapter singleton and runtime adapter selection.
- `src/repositories/workspace.ts`
  - Workspace CRUD facade.
- `src/repositories/page.ts`
  - Page CRUD + save facade.
- `src/repositories/todo.ts`
  - Todo CRUD facade.

## Integration points

- Depends on `@journal-todo/db` for adapter/types.
- Depends on `@journal-todo/shared` for runtime detection (`isTauri`).
- Consumed mainly by `@journal-todo/web`.

## Commands

- Typecheck: `pnpm -C packages/api typecheck`
- Build check: `pnpm -C packages/api build`

## Change guidelines

- Keep this package thin; avoid embedding UI/store concerns here.
- Do not duplicate schema/business rules that belong in `@journal-todo/db` or `@journal-todo/web`.
- Any adapter selection changes must preserve browser fallback behavior.
