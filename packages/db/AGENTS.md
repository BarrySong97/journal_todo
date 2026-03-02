# Agent Instructions (`@journal-todo/db`)

This package is the persistence layer for journal data.

## What this package does

- Defines storage domain types (`Workspace`, `JournalPage`, `TodoItem`, `StorageAdapter`).
- Provides adapter implementations:
  - `LocalStorageAdapter` for browser
  - `SqliteStorageAdapter` for Tauri
- Exposes schema modules and sqlite adapter factory.

## Primary business responsibilities

- Maintain consistent data contract across runtimes.
- Implement CRUD persistence behavior for workspace/page/todo.
- Provide safe, typed `Result<T>` responses for data operations.

## Structure

- `src/index.ts`
  - Public exports for types, schema, adapters, and client factory.
- `src/adapters/types.ts`
  - Core domain interfaces and adapter contract.
- `src/adapters/localStorage.ts`
  - Browser storage implementation.
- `src/adapters/sqlite.ts`
  - Tauri sqlite-proxy implementation.
- `src/client.ts`
  - `getSqliteAdapter()` factory.
- `src/schema/*.ts`
  - Schema definitions for workspace/page/todo.
- `src/__tests__/sqliteAdapter.test.ts`
  - Adapter-level tests.

## Integration points

- Used by `@journal-todo/api` as the concrete storage implementation layer.
- SQLite path relies on Tauri command bridge from `@journal-todo/desktop`.

## Commands

- Typecheck: `pnpm -C packages/db typecheck`
- Build check: `pnpm -C packages/db build`
- Drizzle generate: `pnpm -C packages/db db:generate`
- Drizzle push: `pnpm -C packages/db db:push`

## Change guidelines

- Treat `StorageAdapter` as a stable contract.
- Keep adapter behavior aligned between sqlite and localStorage.
- Avoid app-specific UI/business behavior in this package.
