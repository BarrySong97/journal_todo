# AGENTS.md

Guidelines for AI coding agents working in this React + TypeScript + Vite codebase.

## Build & Development Commands

```bash
pnpm dev      # Development server (hot reload)
pnpm build    # Production build (TypeScript check + Vite bundle)
pnpm lint     # Lint code (ESLint)
pnpm preview  # Preview production build locally
```

**No test framework is configured.** If tests are added, update this section.

## Project Architecture

```
src/
├── components/
│   ├── ui/           # shadcn/ui primitives (Button, Checkbox, etc.)
│   └── journal/      # Feature components (JournalApp, TodoItem, etc.)
├── hooks/            # Custom React hooks (useJournal, useTodoKeyboard)
├── lib/
│   ├── stores/       # Zustand state management
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions (dateUtils, cn helper)
└── index.css         # Tailwind CSS v4 theme configuration
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - no implicit any, unused variables, or parameters
- **Never use** `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use `type` imports for type-only imports: `import type { TodoItem } from "@/lib/types/journal"`
- Define interfaces for component props with explicit types
- Use union types for constrained values: `type TodoStatus = "todo" | "doing" | "done"`

### Imports

Use the `@/*` path alias for all internal imports:

```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TodoItem } from "@/lib/types/journal"
```

**Import order** (maintain manually - no auto-formatter):
1. React imports
2. External libraries
3. Internal `@/` imports
4. Type imports last

### Component Patterns

**UI Components** (`src/components/ui/`):
- Add `"use client"` directive at top
- Use `React.forwardRef` for ref forwarding
- Export named components (not default)
- Use `cn()` for className composition

**Feature Components** (`src/components/journal/`):
- Add `"use client"` directive
- Named function declarations: `export function TodoItem() {}`
- Define props interface above component

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TodoItem`, `JournalApp` |
| Hooks | camelCase with `use` prefix | `useJournal`, `useTodoKeyboard` |
| Types/Interfaces | PascalCase | `TodoItem`, `JournalPage` |
| Functions | camelCase | `formatDateKey`, `extractTags` |
| Files (ui) | kebab-case | `button.tsx`, `checkbox.tsx` |
| Files (features) | PascalCase | `TodoItem.tsx`, `JournalApp.tsx` |

### State Management (Zustand)

- Store files in `src/lib/stores/`
- Use `persist` middleware for localStorage
- Use selectors to prevent unnecessary re-renders:

```typescript
// Good - selective subscription
const currentDateKey = useJournalStore((state) => state.currentDateKey)

// Avoid - subscribes to entire store
const store = useJournalStore()
```

### Styling (Tailwind CSS v4)

- Use Tailwind utility classes directly in JSX
- Use `cn()` helper for conditional classes
- Theme tokens in `src/index.css` using oklch color space
- Color tokens: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`
- Light/dark mode via `.dark` class

### Error Handling

- Never use empty catch blocks
- Use early returns for guard clauses
- Validate function inputs at boundaries

### Event Handlers

- Name with `handle` prefix: `handleClick`, `handleKeyDown`
- Use proper TypeScript event types: `KeyboardEvent<HTMLInputElement>`, `ChangeEvent<HTMLInputElement>`

## Key Dependencies

| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript 5.9 | Type safety |
| Vite 7 | Build tool |
| Tailwind CSS 4 | Styling |
| shadcn/ui (base-nova) | UI components |
| Zustand | State management |
| date-fns | Date utilities |
| lucide-react | Icons |

## Common Patterns

### Adding a New UI Component

1. Create file in `src/components/ui/` (kebab-case)
2. Add `"use client"` directive
3. Import `cn` from `@/lib/utils`
4. Use `React.forwardRef` if ref access needed
5. Export named component

### Adding a New Feature Component

1. Create file in feature folder (PascalCase)
2. Add `"use client"` directive
3. Define props interface
4. Use hooks for state access
5. Export named function component

### Adding a New Hook

1. Create file in `src/hooks/` with `use` prefix
2. Import types with `import type`
3. Define props interface if needed
4. Return object with named properties

### Modifying Store State

1. Add action to store interface in `src/lib/stores/`
2. Implement action in store creation
3. Update migration version if schema changes
4. Expose through custom hook if needed

## Pre-Commit Checklist

- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm build` completes successfully
- [ ] No TypeScript errors in changed files
- [ ] Imports use `@/` alias
- [ ] New components follow established patterns
