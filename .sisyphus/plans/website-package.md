# Website Package - Official Website for Journaltodo

## TL;DR

> **Quick Summary**: Create a new `@journal-todo/ui` package with shared UI components, then build a Next.js official website (`packages/website`) that showcases the Journaltodo app with an interactive demo.
> 
> **Deliverables**:
> - `packages/ui` - Shared UI component library (shadcn/ui components)
> - `packages/website` - Next.js official website with homepage and downloads page
> - Updated `packages/web` to import from `@journal-todo/ui`
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (UI package) -> Task 2 (Update web imports) -> Task 3 (Create website) -> Task 4-6 (Website pages)

---

## Context

### Original Request
1. Add a new monorepo package called `website` (official website)
2. Use Next.js created with `pnpm create next-app@latest my-app --yes`
3. Website should be able to import components and store from `packages/web`
4. Website design matches provided mockup (dark teal theme, hero section, interactive app preview)

### Interview Summary
**Key Discussions**:
- Component sharing: Extract shadcn/ui components to new `@journal-todo/ui` package
- Journal components (TodoList, TodoItem, etc.) stay in `packages/web`, website imports cross-package
- Store (Zustand) stays in `packages/web`, website imports cross-package
- App Preview: Interactive real components (not static image)
- Download button: Links to `/downloads` route (empty placeholder page)
- Pages: Homepage + Downloads page
- Testing: Manual verification only
- Next.js: App Router (default)
- UI package: Source-only (no build step, consumed directly by bundlers)

**Research Findings**:
- Current monorepo uses pnpm workspace + Turbo
- Web package has 22 UI components (shadcn/ui), 7 Journal components
- Zustand store in `web/src/lib/stores/journalStore.ts`
- CSS uses Tailwind v4 with custom theme variables (dark teal theme)
- UI components use `@/lib/utils` for `cn()` helper

### Metis Review
**Identified Gaps** (addressed):
- SSR + Zustand hydration: Use `"use client"` wrapper for interactive preview
- Tailwind class pruning: Update content globs to include cross-package components
- Vite-only imports: Verify no `import.meta.env` in exported components
- Package exports: Add explicit exports to `@journal-todo/web` for cross-package imports

---

## Work Objectives

### Core Objective
Create a shared UI component library and build an official website for Journaltodo that showcases the app with an interactive demo.

### Concrete Deliverables
- `packages/ui/package.json` - New UI package configuration
- `packages/ui/src/components/ui/*.tsx` - 22 shadcn/ui components
- `packages/ui/src/lib/utils.ts` - Shared utilities (cn helper)
- `packages/ui/src/styles/globals.css` - Shared CSS variables and Tailwind config
- `packages/website/` - Complete Next.js app with App Router
- `packages/website/src/app/page.tsx` - Homepage with hero and interactive preview
- `packages/website/src/app/downloads/page.tsx` - Empty downloads page placeholder
- Updated `packages/web/` imports to use `@journal-todo/ui`

### Definition of Done
- [x] `pnpm typecheck` passes with exit code 0
- [ ] `pnpm build` passes with exit code 0
- [x] `pnpm -C packages/website dev` starts without errors
- [x] Homepage displays hero section with "Master your day, Linear style."
- [x] Interactive app preview renders and responds to user input
- [x] `/downloads` route renders placeholder page
- [x] `pnpm -C packages/web dev` still works after refactoring

### Must Have
- [x] Dark teal theme matching mockup design
- [x] Interactive Journal component preview (not static image)
- [x] Header with logo, GitHub link, Download button
- [x] Footer with copyright and social links
- [x] Responsive layout

### Must NOT Have (Guardrails)
- [x] NO actual download functionality (placeholder only)
- [x] NO additional pages beyond homepage and downloads
- [x] NO SEO optimization or meta tags beyond basics
- [x] NO analytics or tracking code
- [x] NO authentication or user accounts
- [x] NO refactoring of Journal component logic (only import path changes)
- [x] NO changes to Zustand store logic
- [x] NO new features in the Journal components

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (no test runner configured)
- **User wants tests**: Manual-only
- **Framework**: none

### Automated Verification (Agent-Executable)

Each TODO includes EXECUTABLE verification procedures:

**Build Verification** (using Bash):
```bash
pnpm typecheck
# Assert: exit code 0

pnpm build
# Assert: exit code 0
```

**Dev Server Verification** (using Bash):
```bash
# Start dev server in background, check it responds
timeout 30 pnpm -C packages/website dev &
sleep 10
curl -s http://localhost:3000 | grep -q "Journaltodo"
# Assert: exit code 0
```

**Route Verification** (using Playwright skill):
```
1. Navigate to: http://localhost:3000
2. Assert: text "Master your day" appears on page
3. Navigate to: http://localhost:3000/downloads
4. Assert: page loads without error
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create @journal-todo/ui package
└── (blocked: nothing can run in parallel - sequential dependency)

Wave 2 (After Task 1):
├── Task 2: Update packages/web imports
└── Task 3: Create packages/website with Next.js

Wave 3 (After Task 2 & 3):
├── Task 4: Build homepage layout (header, footer)
├── Task 5: Build hero section
└── Task 6: Build interactive app preview

Wave 4 (After Wave 3):
├── Task 7: Create downloads page
└── Task 8: Final integration and verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4, 5, 6 | 3 |
| 3 | 1 | 4, 5, 6 | 2 |
| 4 | 2, 3 | 8 | 5, 6 |
| 5 | 2, 3 | 8 | 4, 6 |
| 6 | 2, 3 | 8 | 4, 5 |
| 7 | 3 | 8 | 4, 5, 6 |
| 8 | 4, 5, 6, 7 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | delegate_task(category="unspecified-high", load_skills=["frontend-ui-ux"]) |
| 2 | 2, 3 | dispatch parallel after Wave 1 completes |
| 3 | 4, 5, 6, 7 | dispatch parallel after Wave 2 completes |
| 4 | 8 | final verification task |

---

## TODOs

- [x] 1. Create @journal-todo/ui package with shared UI components

  **What to do**:
  - Create `packages/ui/` directory structure
  - Create `packages/ui/package.json` following `@journal-todo/shared` pattern
  - Create `packages/ui/tsconfig.json` for TypeScript configuration
  - Move all 22 UI components from `packages/web/src/components/ui/` to `packages/ui/src/components/ui/`
  - Move `packages/web/src/lib/utils.ts` (cn helper) to `packages/ui/src/lib/utils.ts`
  - Create `packages/ui/src/styles/globals.css` with shared CSS variables (copy from web/src/index.css, extract theme variables only)
  - Create `packages/ui/src/index.ts` to export all components
  - Update `pnpm-workspace.yaml` if needed (should auto-detect packages/*)
  - Add `@journal-todo/ui` to turbo.json if needed

  **Must NOT do**:
  - Do NOT modify component logic or styling
  - Do NOT add new components
  - Do NOT change component APIs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Package restructuring requires careful file operations and configuration
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding of component architecture and Tailwind setup

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `packages/shared/package.json` - Package.json structure for workspace packages (exports, scripts, type: module)
  - `packages/shared/tsconfig.json` - TypeScript configuration pattern for shared packages

  **Source Files to Move**:
  - `packages/web/src/components/ui/*.tsx` - All 22 UI components (alert-dialog, badge, button, calendar, card, checkbox, combobox, command, dialog, dropdown-menu, field, input-group, input, kbd, label, popover, scroll-area, select, separator, simple-toast, textarea, tooltip)
  - `packages/web/src/lib/utils.ts` - cn() helper function

  **Style References**:
  - `packages/web/src/index.css:16-126` - CSS custom properties for theme (extract :root and .dark variables)

  **Dependencies to Include**:
  - From `packages/web/package.json`: class-variance-authority, clsx, tailwind-merge, @base-ui/react, lucide-react, cmdk, react-day-picker, date-fns, sonner

  **Acceptance Criteria**:

  ```bash
  # Verify package.json exists and is valid
  node -e "require('./packages/ui/package.json')"
  # Assert: exit code 0

  # Verify all UI components exist
  ls packages/ui/src/components/ui/button.tsx
  # Assert: exit code 0

  # Verify utils exists
  ls packages/ui/src/lib/utils.ts
  # Assert: exit code 0

  # Verify TypeScript compiles
  pnpm -C packages/ui typecheck
  # Assert: exit code 0
  ```

  **Commit**: YES
  - Message: `feat(ui): create shared UI component package`
  - Files: `packages/ui/**`
  - Pre-commit: `pnpm -C packages/ui typecheck`

---

- [x] 2. Update packages/web to import from @journal-todo/ui

  **What to do**:
  - Add `@journal-todo/ui` as workspace dependency in `packages/web/package.json`
  - Update all imports in `packages/web/src/` from `@/components/ui/*` to `@journal-todo/ui`
  - Update imports from `@/lib/utils` to `@journal-todo/ui` (for cn helper)
  - Remove the now-empty `packages/web/src/components/ui/` directory
  - Remove `packages/web/src/lib/utils.ts` (moved to ui package)
  - Update `packages/web/src/index.css` to import shared styles from ui package OR keep local copy
  - Update Tailwind content config to include `@journal-todo/ui` package

  **Must NOT do**:
  - Do NOT change component usage patterns
  - Do NOT modify Journal components logic
  - Do NOT change store logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mostly find-and-replace import paths
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding of import patterns and module resolution

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: Task 1

  **References**:

  **Files to Update** (use lsp_find_references or grep):
  - All files importing from `@/components/ui/*`
  - All files importing from `@/lib/utils`

  **Pattern References**:
  - `packages/web/package.json:19-21` - How workspace dependencies are declared

  **Acceptance Criteria**:

  ```bash
  # Verify no old imports remain
  grep -r "@/components/ui" packages/web/src/ || echo "No old imports found"
  # Assert: "No old imports found" in output

  # Verify web package builds
  pnpm -C packages/web build
  # Assert: exit code 0

  # Verify web dev server starts
  timeout 30 pnpm -C packages/web dev &
  sleep 10
  curl -s http://localhost:1420 | head -1
  # Assert: HTML response received
  ```

  **Commit**: YES
  - Message: `refactor(web): use @journal-todo/ui for shared components`
  - Files: `packages/web/**`
  - Pre-commit: `pnpm -C packages/web typecheck`

---

- [x] 3. Create packages/website with Next.js

  **What to do**:
  - Run `pnpm create next-app@latest packages/website --yes` to scaffold Next.js project
  - Update `packages/website/package.json`:
    - Change name to `@journal-todo/website`
    - Add workspace dependencies: `@journal-todo/ui`, `@journal-todo/web`, `@journal-todo/shared`
  - Configure `packages/website/tsconfig.json` for workspace imports
  - Configure Tailwind to include ui package in content paths
  - Import shared CSS variables from ui package or copy theme
  - Add `@journal-todo/web` exports in `packages/web/package.json` for Journal components and store
  - Verify Next.js dev server starts

  **Must NOT do**:
  - Do NOT customize Next.js config beyond necessary
  - Do NOT add unnecessary dependencies
  - Do NOT set up complex build pipelines

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Project scaffolding and configuration requires attention to detail
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Next.js and Tailwind configuration expertise

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/shared/package.json` - Workspace package naming convention
  - `packages/web/package.json:19-21` - Workspace dependency declaration pattern
  - `packages/web/src/index.css` - Tailwind and theme configuration

  **Next.js Configuration**:
  - Default App Router structure: `src/app/page.tsx`, `src/app/layout.tsx`
  - Tailwind v4 integration (Next.js 15+ supports it natively)

  **Cross-Package Imports Needed**:
  - `@journal-todo/ui` - UI components (Button, etc.)
  - `@journal-todo/web` - Journal components (JournalApp, TodoList, etc.) and store
  - `@journal-todo/shared` - Types and utilities

  **Acceptance Criteria**:

  ```bash
  # Verify package.json exists with correct name
  node -e "const p = require('./packages/website/package.json'); if(p.name !== '@journal-todo/website') process.exit(1)"
  # Assert: exit code 0

  # Verify workspace dependencies
  node -e "const p = require('./packages/website/package.json'); if(!p.dependencies['@journal-todo/ui']) process.exit(1)"
  # Assert: exit code 0

  # Verify Next.js dev server starts
  timeout 30 pnpm -C packages/website dev &
  sleep 15
  curl -s http://localhost:3000 | head -1
  # Assert: HTML response received
  ```

  **Commit**: YES
  - Message: `feat(website): scaffold Next.js official website`
  - Files: `packages/website/**`, `packages/web/package.json`
  - Pre-commit: `pnpm -C packages/website typecheck`

---

- [x] 4. Build homepage layout (header and footer)

  **What to do**:
  - Create `packages/website/src/components/Header.tsx`:
    - Logo "Journaltodo" on left (with J icon)
    - GitHub icon link on right
    - "Download" button linking to /downloads
  - Create `packages/website/src/components/Footer.tsx`:
    - "journaltodo BETA" badge on left
    - Copyright text in center
    - Social icons on right (GitHub, Discord, etc.)
  - Update `packages/website/src/app/layout.tsx` to include Header and Footer
  - Apply dark teal theme (use CSS variables from ui package)

  **Must NOT do**:
  - Do NOT add complex navigation
  - Do NOT add authentication UI
  - Do NOT add language switcher

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI layout and styling work
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Design implementation and Tailwind styling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Design Reference** (from mockup):
  - Header: Dark background, logo left, GitHub icon + teal "Download" button right
  - Footer: "journaltodo BETA" badge, "2024 Journaltodo Inc. All rights reserved.", social icons

  **Pattern References**:
  - `packages/web/src/components/ui/button.tsx` - Button component usage
  - `packages/web/src/index.css:51-84` - Dark theme CSS variables

  **Icon References**:
  - Use `lucide-react` for icons (already in ui package dependencies)
  - GitHub icon: `<Github />`
  - Other social icons as needed

  **Acceptance Criteria**:

  **Using Playwright skill**:
  ```
  1. Navigate to: http://localhost:3000
  2. Assert: element with text "Journaltodo" is visible in header
  3. Assert: element with text "Download" is visible (button)
  4. Assert: GitHub icon/link is visible
  5. Assert: footer contains "journaltodo" text
  6. Assert: footer contains copyright text
  7. Screenshot: .sisyphus/evidence/task-4-layout.png
  ```

  **Commit**: YES
  - Message: `feat(website): add header and footer layout`
  - Files: `packages/website/src/components/Header.tsx`, `packages/website/src/components/Footer.tsx`, `packages/website/src/app/layout.tsx`
  - Pre-commit: `pnpm -C packages/website typecheck`

---

- [x] 5. Build hero section

  **What to do**:
  - Create `packages/website/src/components/Hero.tsx`:
    - Large headline: "Master your day," (white) + "Linear style." (teal gradient)
    - Subtitle: "The precision of a project manager meets the fluidity of a journal. Experience task management distilled to its purest form."
  - Add hero section to homepage (`packages/website/src/app/page.tsx`)
  - Style with Tailwind: large text, centered, gradient text for "Linear style."

  **Must NOT do**:
  - Do NOT add CTA buttons in hero (Download is in header)
  - Do NOT add animations beyond simple CSS
  - Do NOT add background images

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Typography and gradient styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Design implementation and text styling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Design Reference** (from mockup):
  - "Master your day," in white/light color
  - "Linear style." in teal/cyan gradient
  - Subtitle in muted gray color
  - Centered layout

  **Style References**:
  - `packages/web/src/index.css:59` - Primary color (teal): `oklch(0.75 0.12 175)`
  - Gradient: from teal to slightly lighter teal

  **Acceptance Criteria**:

  **Using Playwright skill**:
  ```
  1. Navigate to: http://localhost:3000
  2. Assert: text "Master your day" is visible
  3. Assert: text "Linear style" is visible
  4. Assert: text "precision of a project manager" is visible (subtitle)
  5. Screenshot: .sisyphus/evidence/task-5-hero.png
  ```

  **Commit**: YES
  - Message: `feat(website): add hero section with headline`
  - Files: `packages/website/src/components/Hero.tsx`, `packages/website/src/app/page.tsx`
  - Pre-commit: `pnpm -C packages/website typecheck`

---

- [x] 6. Build interactive app preview

  **What to do**:
  - Create `packages/website/src/components/AppPreview.tsx`:
    - Wrapper with window chrome (minimize, maximize, close buttons)
    - Import and render Journal components from `@journal-todo/web`
    - Wrap in `"use client"` directive for client-side rendering
    - Initialize with demo data (sample todos)
  - Add AppPreview to homepage below hero section
  - Style wrapper to look like a desktop app window (rounded corners, shadow, window controls)
  - Ensure Zustand store works in Next.js context (client-only)

  **Must NOT do**:
  - Do NOT persist data to any backend
  - Do NOT modify Journal component behavior
  - Do NOT add new features to the preview

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex component integration with styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component composition and cross-package imports

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Design Reference** (from mockup):
  - Window chrome with minimize/maximize/close buttons (top right)
  - Date navigation showing "January 31" with prev/next/Today buttons
  - Todo list with checkboxes
  - Footer with workspace selector and keyboard shortcut hints

  **Component References**:
  - `packages/web/src/components/journal/JournalApp.tsx` - Main journal container
  - `packages/web/src/components/journal/JournalEditor.tsx` - Editor with todos
  - `packages/web/src/components/journal/DateNavigation.tsx` - Date picker
  - `packages/web/src/components/journal/TodoList.tsx` - Todo list
  - `packages/web/src/components/journal/JournalFooter.tsx` - Footer

  **Store References**:
  - `packages/web/src/lib/stores/journalStore.ts` - Zustand store
  - `packages/web/src/hooks/useJournal.ts` - Journal hook

  **SSR Considerations**:
  - Must use `"use client"` directive
  - Initialize store with demo data on client side only
  - Avoid hydration mismatches

  **Acceptance Criteria**:

  **Using Playwright skill**:
  ```
  1. Navigate to: http://localhost:3000
  2. Wait for: app preview container to be visible
  3. Assert: window controls (close/minimize/maximize) are visible
  4. Assert: date navigation is visible
  5. Assert: todo items are visible
  6. Click: on a todo checkbox
  7. Assert: todo state changes (visual feedback)
  8. Screenshot: .sisyphus/evidence/task-6-preview.png
  ```

  **Commit**: YES
  - Message: `feat(website): add interactive app preview`
  - Files: `packages/website/src/components/AppPreview.tsx`, `packages/website/src/app/page.tsx`
  - Pre-commit: `pnpm -C packages/website typecheck`

---

- [x] 7. Create downloads page

  **What to do**:
  - Create `packages/website/src/app/downloads/page.tsx`:
    - Simple placeholder page
    - Title: "Downloads" or similar
    - Placeholder content indicating downloads will be added later
  - Ensure page is accessible via `/downloads` route

  **Must NOT do**:
  - Do NOT implement actual download functionality
  - Do NOT add platform detection
  - Do NOT add download links

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple placeholder page
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Basic page layout

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `packages/website/src/app/page.tsx` - Page component pattern (after Task 3)

  **Acceptance Criteria**:

  **Using Playwright skill**:
  ```
  1. Navigate to: http://localhost:3000/downloads
  2. Assert: page loads without error (no 404)
  3. Assert: text "Downloads" or similar is visible
  4. Screenshot: .sisyphus/evidence/task-7-downloads.png
  ```

  ```bash
  # Verify route file exists
  ls packages/website/src/app/downloads/page.tsx
  # Assert: exit code 0
  ```

  **Commit**: YES
  - Message: `feat(website): add downloads page placeholder`
  - Files: `packages/website/src/app/downloads/page.tsx`
  - Pre-commit: `pnpm -C packages/website typecheck`

---

- [ ] 8. Final integration and verification

  **What to do**:
  - Run full build: `pnpm build`
  - Run typecheck: `pnpm typecheck`
  - Verify all packages work together
  - Test web package still works: `pnpm -C packages/web dev`
  - Test website package: `pnpm -C packages/website dev`
  - Verify cross-package imports work correctly
  - Fix any remaining issues

  **Must NOT do**:
  - Do NOT add new features
  - Do NOT refactor working code
  - Do NOT change configurations unless fixing issues

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and minor fixes only
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding of build systems and debugging

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:

  **Build Commands**:
  - `pnpm build` - Build all packages
  - `pnpm typecheck` - Type check all packages
  - `pnpm -C packages/web dev` - Start web dev server
  - `pnpm -C packages/website dev` - Start website dev server

  **Acceptance Criteria**:

  ```bash
  # Full typecheck
  pnpm typecheck
  # Assert: exit code 0

  # Full build
  pnpm build
  # Assert: exit code 0
  ```

  **Using Playwright skill**:
  ```
  1. Navigate to: http://localhost:3000
  2. Assert: homepage loads with hero section
  3. Assert: app preview is interactive
  4. Click: "Download" button in header
  5. Assert: navigates to /downloads page
  6. Navigate to: http://localhost:1420 (web app)
  7. Assert: web app still works
  8. Screenshot: .sisyphus/evidence/task-8-final.png
  ```

  **Commit**: YES (if fixes needed)
  - Message: `fix(website): resolve integration issues`
  - Files: Any files that needed fixes
  - Pre-commit: `pnpm typecheck && pnpm build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(ui): create shared UI component package` | packages/ui/** | pnpm -C packages/ui typecheck |
| 2 | `refactor(web): use @journal-todo/ui for shared components` | packages/web/** | pnpm -C packages/web build |
| 3 | `feat(website): scaffold Next.js official website` | packages/website/**, packages/web/package.json | pnpm -C packages/website typecheck |
| 4 | `feat(website): add header and footer layout` | packages/website/src/components/Header.tsx, Footer.tsx, layout.tsx | pnpm -C packages/website typecheck |
| 5 | `feat(website): add hero section with headline` | packages/website/src/components/Hero.tsx, page.tsx | pnpm -C packages/website typecheck |
| 6 | `feat(website): add interactive app preview` | packages/website/src/components/AppPreview.tsx, page.tsx | pnpm -C packages/website typecheck |
| 7 | `feat(website): add downloads page placeholder` | packages/website/src/app/downloads/page.tsx | pnpm -C packages/website typecheck |
| 8 | `fix(website): resolve integration issues` (if needed) | Any files | pnpm typecheck && pnpm build |

---

## Success Criteria

### Verification Commands
```bash
# All packages type check
pnpm typecheck
# Expected: exit code 0

# All packages build
pnpm build
# Expected: exit code 0

# Website dev server starts
pnpm -C packages/website dev
# Expected: Server running on http://localhost:3000

# Web dev server still works
pnpm -C packages/web dev
# Expected: Server running on http://localhost:1420
```

### Final Checklist
- [x] All "Must Have" present:
  - [x] Dark teal theme matching mockup
  - [x] Interactive Journal component preview
  - [x] Header with logo, GitHub link, Download button
  - [x] Footer with copyright and social links
  - [x] Responsive layout
- [x] All "Must NOT Have" absent:
  - [x] No actual download functionality
  - [x] No additional pages beyond homepage and downloads
  - [x] No SEO optimization beyond basics
  - [x] No analytics or tracking
  - [x] No authentication
- [ ] All builds pass
- [x] Both dev servers work
