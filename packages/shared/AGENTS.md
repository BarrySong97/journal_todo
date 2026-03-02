# Agent Instructions (`@journal-todo/shared`)

This package contains lightweight shared utilities and exports.

## What this package does

- Provides runtime/platform detection helpers.
- Re-exports shared utils/types used across multiple packages.
- Keeps cross-package helpers small and dependency-light.

## Primary business responsibilities

- Offer shared primitives used by API/Web/Desktop without UI coupling.
- Keep runtime checks consistent (`tauri`, `browser`, `server`).

## Structure

- `src/index.ts`
  - Root exports for utils/types.
- `src/utils/index.ts`
  - Utility export barrel.
- `src/utils/platform.ts`
  - `isTauri`, `isBrowser`, `getPlatform`.
- `src/types/index.ts`
  - Shared type exports.

## Integration points

- Used by `@journal-todo/api`, `@journal-todo/web`, and `@journal-todo/website`.

## Commands

- Typecheck: `pnpm -C packages/shared typecheck`
- Build check: `pnpm -C packages/shared build`

## Change guidelines

- Keep this package generic and low-level.
- Avoid domain-specific behavior that belongs in web/api/db packages.
