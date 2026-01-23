# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite application using shadcn/ui component library with Tailwind CSS v4. The project is set up as a modern frontend template with a comprehensive UI component system.

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production (runs TypeScript compiler and Vite build)
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Architecture & Structure

### Component System

The project uses **shadcn/ui** with the "base-nova" style variant. Components are built on top of **@base-ui/react** and styled with Tailwind CSS v4.

- **UI Components**: Located in `src/components/ui/`
  - All shadcn/ui components follow the compound component pattern
  - Components use `render` prop for polymorphism (e.g., `AlertDialogTrigger render={<Button />}`)
  - Styling uses `class-variance-authority` for variant management

- **Layout Components**: `src/components/example.tsx`
  - `ExampleWrapper`: Main grid layout container for showcasing components
  - `Example`: Individual example container with optional title

### Styling System

The project uses **Tailwind CSS v4** with a custom design token system:

- **CSS Variables**: Defined in `src/index.css` using oklch color space
- **Theme System**: Supports light/dark modes via CSS custom properties
- **Color Tokens**: Background, foreground, primary, secondary, muted, accent, destructive, border, ring, chart colors, and sidebar colors
- **Border Radius**: Configurable via `--radius` variable (default: 0.625rem) with computed scales (sm, md, lg, xl, 2xl, 3xl, 4xl)
- **Font**: Inter Variable as the default sans-serif font

### Path Aliases

TypeScript and Vite are configured with the `@/*` alias pointing to `./src/*`:

```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

### Utility Functions

- **`cn()` function** (`src/lib/utils.ts`): Combines `clsx` and `tailwind-merge` for conditional className handling and Tailwind class deduplication

## shadcn/ui Configuration

The `components.json` file configures shadcn CLI:
- Style: base-nova
- Icon library: lucide-react
- CSS variables: enabled
- Base color: neutral
- Tailwind prefix: none

## Key Technical Details

### React & TypeScript

- React 19.2+ with TypeScript 5.9
- Strict mode enabled in `main.tsx`
- Uses JSX automatic runtime (no need to import React in component files)

### Build System

- Vite 7.2+ with React plugin
- ESLint with TypeScript and React Hooks plugins
- Build output: `tsc -b && vite build` (type checks before bundling)

### Component Patterns

When creating new components:
1. UI components should be placed in `src/components/ui/`
2. Use the `cn()` utility for className composition
3. Follow shadcn/ui patterns: compound components with forwarded refs
4. Import icons from `lucide-react`
5. Use `"use client"` directive for components with interactivity (even though this is not Next.js, it's a convention from the shadcn/ui template)

### Color System

The project uses oklch color format for better color perception and manipulation:
- Light theme: High contrast with neutral backgrounds (oklch(1 0 0))
- Dark theme: Lower luminance backgrounds (oklch(0.145 0 0))
- All color tokens have both light and dark variants
