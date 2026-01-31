## 2026-01-31 Task: initialize
Placeholder for issues/gotchas.

## 2026-01-31 Issue: TypeScript Path Resolution for Workspace Package Aliases

### Problem
When running `pnpm -C packages/website typecheck`, TypeScript was failing with errors like:
```
../ui/src/components/ui/alert-dialog.tsx(6,20): error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.
../ui/src/components/ui/button.tsx(6,20): error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.
```

### Root Cause
The website package imports from `@journal-todo/ui`, which uses `@/` path aliases internally (e.g., `@/lib/utils`, `@/components/ui/button`). When TypeScript follows these imports during type checking, it tries to resolve the `@/` aliases using the website's tsconfig.json, which only mapped `@/*` to `./src/*` (the website's own src directory).

Since the ui package's internal imports like `@/lib/utils` couldn't be resolved to `../ui/src/lib/utils`, TypeScript threw module resolution errors.

### Solution
Updated `packages/website/tsconfig.json` to include both the website's src and the ui package's src in the `@/*` path mapping:

```json
"paths": {
  "@/*": ["./src/*", "../ui/src/*"]
}
```

This allows TypeScript to resolve `@/` aliases to either:
1. The website's own `src/` directory (for website code)
2. The ui package's `src/` directory (for ui package internal imports)

### Why This Happens
- Next.js with `transpilePackages` includes workspace package source files in the build
- TypeScript follows imports from workspace packages and tries to type-check their source files
- Each package can have its own `@/` alias, but when type-checking from the website package, TypeScript needs to know where to resolve all `@/` aliases it encounters

### Verification
✅ `pnpm -C packages/website typecheck` now passes with no errors
✅ LSP diagnostics show no errors in website files
✅ Both website and ui package `@/` aliases resolve correctly

### Alternative Approaches Considered
1. **Exclude ui package from typecheck**: Doesn't work because Next.js transpilePackages requires source files
2. **Use skipLibCheck only**: Doesn't skip source file imports, only declaration files
3. **Project references**: More complex setup, overkill for this use case
4. **Remove @/ aliases from ui package**: Would require refactoring all ui components

The path mapping solution is the simplest and most maintainable approach.

## 2026-01-31 Issue: TypeScript cannot resolve @/ aliases from @journal-todo/web

### Problem
When website package imports JournalApp from `@journal-todo/web/components/journal`, TypeScript follows the source files and encounters unresolved `@/` path aliases (e.g., `@/hooks/useJournal`, `@/lib/utils/dateUtils`, `@/lib/types/journal`). Additionally, `import.meta.env` from Vite was not recognized.

### Root Cause
- Website tsconfig.json only mapped `@/*` to `./src/*` and `../ui/src/*`
- Did not include `../web/src/*` in the paths mapping
- Missing `vite/client` types for `import.meta.env`

### Solution
Updated `packages/website/tsconfig.json`:
1. Added `baseUrl: "."` to compilerOptions
2. Extended `paths["@/*"]` to include `"../web/src/*"` alongside existing paths
3. Added `types: ["vite/client"]` to compilerOptions
4. Installed `vite` as devDependency for type definitions

### Files Modified
- `packages/website/tsconfig.json`: Added baseUrl, updated paths, added types
- `packages/website/package.json`: Added `vite ^7.3.1` to devDependencies

### Verification
✅ `pnpm -C packages/website typecheck` passes with no errors

### Notes
- This allows TypeScript to resolve `@/` imports from web package source files
- Alternative would be to build web package and use compiled output, but that adds build complexity
- Current approach works because Next.js transpilePackages handles the runtime transpilation
- Vite types needed for `import.meta.env` used in web components

## 2026-01-31 Issue: monorepo build fails in desktop due to missing signing key

### Problem
`pnpm build` fails when `@journal-todo/desktop` runs Tauri build. It requires `TAURI_SIGNING_PRIVATE_KEY` and exits with an error.

### Impact
Blocks full monorepo build success, though `@journal-todo/web` and `@journal-todo/website` build successfully.

### Notes
This is outside the website scope; requires signing key configuration to pass.

## 2026-01-31 Issue: web dev server verification not automated

### Problem
The plan requests a short `pnpm -C packages/web dev` check, but this environment lacks a safe, cross-platform timeout/teardown for long-running dev servers without risking unrelated Node processes.

### Impact
Dev-server verification for the web app is not automated here; manual check recommended.


## 2026-01-31 Issue: Next.js build fails with "createContext is not a function" during SSR

### Problem
Next.js build failed with error `(0 , s.createContext) is not a function` when trying to render pages during static generation. The error occurred when evaluating AppPreview component and UI components (Badge, Button) from `@journal-todo/ui` during server-side rendering.

### Root Cause
1. AppPreview component imports JournalApp which uses Zustand store and React hooks
2. UI components from `@journal-todo/ui` use `@base-ui/react` which relies on React context
3. These client-side dependencies were being evaluated during SSR in Next.js App Router
4. Next.js 16 with Turbopack requires explicit client boundaries for components using client-only features

### Solution
**Created client wrapper component:**
- Created `AppPreviewClient.tsx` with `"use client"` directive
- Uses `next/dynamic` with `ssr: false` to load AppPreview only on client
- Provides loading placeholder (fixed-height skeleton matching AppPreview dimensions)
- Updated `page.tsx` to import AppPreviewClient instead of AppPreview directly

**Made layout components client-side:**
- Added `"use client"` to Header.tsx (uses Button from @journal-todo/ui)
- Added `"use client"` to Footer.tsx (uses Badge from @journal-todo/ui)

**Updated Next.js config:**
- Added `serverExternalPackages: ["zustand"]` to next.config.ts
- Prevents Zustand from being bundled in server components

### Files Modified
- `packages/website/app/page.tsx`: Import AppPreviewClient instead of AppPreview
- `packages/website/src/components/AppPreviewClient.tsx`: New client wrapper with dynamic import
- `packages/website/src/components/Header.tsx`: Added "use client" directive
- `packages/website/src/components/Footer.tsx`: Added "use client" directive
- `packages/website/next.config.ts`: Added serverExternalPackages for zustand

### Verification
✅ `pnpm -C packages/website build` succeeds
✅ All pages prerendered as static content (/, /_not-found, /downloads)
✅ AppPreview loads client-side only with proper loading state

### Notes
- Next.js App Router requires explicit client boundaries for components using React context, hooks, or browser APIs
- `next/dynamic` with `ssr: false` must be used in client components, not server components
- UI components from @journal-todo/ui need client boundary because they use @base-ui/react
- Zustand stores need to be externalized from server bundle
- Loading placeholder prevents layout shift during client-side hydration

## 2026-01-31 Cleanup: Removed stray file from repo root

### Issue
File `D:codejournal-todo.sisyphusnotepadswebsite-packagelearnings.md` was created in repo root due to incorrect absolute path write operation.

### Resolution
✅ Deleted stray file from repo root
- File had malformed name with Windows drive letter prefix
- No longer appears in `git status --short`

### Prevention
- Ensure write operations use correct relative paths
- Validate file paths before write operations
