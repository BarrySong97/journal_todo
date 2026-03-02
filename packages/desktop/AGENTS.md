# Agent Instructions (`@journal-todo/desktop`)

This package is the desktop runtime wrapper based on Tauri v2.

## What this package does

- Hosts the desktop app runtime and Tauri build/dev commands.
- Bridges frontend calls to Rust commands for sqlite execution and app-level desktop features.
- Manages updater/process/opener plugins and platform-specific window behavior.

## Primary business responsibilities

- Provide desktop-only capabilities not available in browser:
  - SQL execution bridge (`execute_single_sql`, `execute_batch_sql`)
  - updater/plugin integration
  - database path retrieval/reveal in system file explorer
  - platform-specific window decoration/titlebar behavior
- Initialize and migrate desktop database and logs directories.

## Structure

- `package.json`
  - Desktop scripts: `dev:tauri`, `build`, `tauri`.
- `src-tauri/tauri.conf.json`
  - Tauri app/build/bundle/updater configuration.
- `src-tauri/src/lib.rs`
  - Main Tauri setup and command registration.
- `src-tauri/src/db/*`
  - DB state, migration, and SQL command handling.
- `src-tauri/src/logger.rs`
  - File logger setup used by app runtime.
- `src-tauri/migrations/*`
  - SQLite migration scripts.

## Integration points

- Depends on `@journal-todo/web` as frontend content source.
- Provides runtime APIs consumed by db/api/web packages in desktop mode.

## Commands

- Dev desktop: `pnpm -C packages/desktop dev:tauri`
- Build desktop: `pnpm -C packages/desktop build`

## Change guidelines

- Be conservative with `src-tauri/tauri.conf.json` and Rust setup changes.
- Keep command names/signatures stable if frontend already calls them.
- Do not edit generated/compiled artifacts under `src-tauri/target`.
