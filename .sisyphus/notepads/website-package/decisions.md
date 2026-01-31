## 2026-01-31 Task: initialize
Placeholder for architecture and decisions.

## 2026-01-31 Cleanup: Remove scaffold artifacts
Removed local artifacts from packages/website that should not be in monorepo:
- node_modules/ (directory)
- .next/ (directory)
- tsconfig.tsbuildinfo (file)
- pnpm-lock.yaml (file)
- pnpm-workspace.yaml (file)

Rationale: Next.js scaffold created these locally. They conflict with monorepo-level pnpm workspace and should be managed at root only. Verified .gitignore remains intact.
