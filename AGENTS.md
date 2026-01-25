# Agent Instructions (journal-todo)

This file is for automated coding agents working in this repository.
Follow existing conventions first; do not invent new tooling or styles.

## Repository layout

- `packages/web`: Vite + React app (UI)
- `packages/desktop`: Tauri desktop wrapper
- `packages/desktop/src-tauri`: Rust backend for Tauri
- `packages/shared`: Shared TS utilities and types

## Package manager and workspace

- Workspace is managed with `pnpm` and `turbo`.
- Root `package.json` scripts drive most tasks.
- You can scope to a package using `pnpm -C <path> ...`.

## Build, lint, and test commands

Run from repo root unless noted.

- Install deps: `pnpm install`
- Dev (web): `pnpm dev`
- Dev (desktop/tauri): `pnpm dev:desktop`
- Build all: `pnpm build`
- Build web only: `pnpm build:web`
- Build desktop only: `pnpm build:desktop`
- Lint (turbo): `pnpm lint`
- Typecheck (turbo): `pnpm typecheck`

Notes:
- `turbo` tasks are defined in `turbo.json`.
- `packages/web` has `eslint.config.js` but no `lint` script is
  currently defined in package scripts. If `pnpm lint` fails because
  no package exposes a lint task, add one rather than inventing flags.

### Single-test guidance

There is no JavaScript test runner configured in this repo yet.
If/when tests are added, prefer a single-test flag in that runner.

- Vitest: `pnpm -C packages/web vitest -t "test name"`
- Jest: `pnpm -C packages/web jest -t "test name"`

Rust (Tauri) tests, if added:

- `cd packages/desktop/src-tauri && cargo test`
- Single test: `cargo test test_name`

## TypeScript and React conventions

- TypeScript is strict. See `packages/web/tsconfig*.json` and
  `packages/shared/tsconfig.json` for exact flags.
- No unused locals/parameters and no fallthrough switches.
- ESM modules (`"type": "module"`). Use `import`/`export`.
- React components are function components with hooks.

### Imports

- Use the `@/*` alias in `packages/web` for app code (see
  `packages/web/tsconfig.json`).
- Prefer absolute alias imports over deep relative paths in web.
- Keep imports grouped: external deps, workspace deps, app aliases,
  then relative paths.

### Formatting

- No Prettier or Biome config is present. Preserve existing style.
- Current code uses double quotes and minimal semicolons.
- Do not apply aggressive reformatting.

### Naming

- Components: `PascalCase` (e.g., `JournalApp`).
- Functions/variables: `camelCase`.
- Files: follow existing casing in the folder you touch.

### Error handling

- Do not swallow errors. Log or surface failures meaningfully.
- Clean up side effects (event listeners, timers) in React effects.
- Prefer early returns over deeply nested branches.

## Tailwind and styling

- `packages/web` uses Tailwind. Keep class lists readable.
- Prefer the `cn` helper (`packages/web/src/lib/utils.ts`) for
  className composition.

## Tauri notes

- Desktop app uses Tauri v2 (`packages/desktop`).
- Rust code lives under `packages/desktop/src-tauri`.
- Avoid changing Rust build configuration unless necessary.

## Linting configuration

- ESLint flat config lives at `packages/web/eslint.config.js`.
- Uses `@eslint/js`, `typescript-eslint`, `react-hooks`, and
  `react-refresh` presets.

## TypeScript configuration highlights

- Web app uses `moduleResolution: "bundler"` and `jsx: "react-jsx"`.
- Shared package emits declarations for reuse.

## Cursor/Copilot rules

- No `.cursor/rules`, `.cursorrules`, or
  `.github/copilot-instructions.md` found in this repo.

## When adding or changing code

- Keep changes focused and minimal; avoid refactors during bug fixes.
- Match surrounding patterns (imports, naming, structure).
- Update or add scripts if new tooling is introduced.
- Run `pnpm typecheck` after TypeScript changes when feasible.

## If you must add tests later

- Prefer co-locating tests near the code under test.
- Choose a single test runner per package.
- Document the runner and single-test command in this file.
