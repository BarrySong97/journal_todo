# Agent Instructions (`@journal-todo/ui`)

This package is the shared UI component library for the workspace.

## What this package does

- Exports reusable UI primitives (dialogs, popovers, inputs, command UI, scroll areas, toast, etc.).
- Exports shared styling utilities (`cn` and related helpers).
- Provides global UI styles consumed by app packages.

## Primary business responsibilities

- Keep visual and interaction primitives consistent across products.
- Reduce duplicate component logic in `web` and `website`.

## Structure

- `src/index.ts`
  - Public component/util export barrel.
- `src/components/ui/*`
  - Individual UI primitives.
- `src/lib/utils.ts`
  - Shared className and utility helpers.
- `src/styles/globals.css`
  - Shared UI styles export (`@journal-todo/ui/styles`).
- `src/hooks/useTheme.ts`
  - Theme-related hook(s).

## Integration points

- Consumed by `@journal-todo/web` and `@journal-todo/website`.

## Commands

- Typecheck: `pnpm -C packages/ui typecheck`
- Build check: `pnpm -C packages/ui build`

## Change guidelines

- Preserve stable component APIs where already consumed.
- Keep package free of app-specific store/business logic.
- Prefer additive changes over breaking changes in shared components.
