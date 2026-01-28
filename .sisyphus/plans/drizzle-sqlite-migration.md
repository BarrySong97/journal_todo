# Drizzle ORM + SQLite Data Layer Migration

## TL;DR

> **Quick Summary**: 将 To-Do 应用的数据层重构为三层架构，支持 Tauri (SQLite) 和 Web (localStorage) 双平台存储。
> 
> **Deliverables**:
> - packages/db: Drizzle schema + storage adapters
> - packages/api: Repository pattern 数据操作接口
> - Rust SQLite 模块 (sqlx + Tauri commands)
> - 重构后的 Zustand store
> - vitest 测试基础设施
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Test Infra -> DB Package -> API Package -> Rust Backend -> Store Integration

---

## Context

### Original Request
将 To-Do 的数据结构修改成 Drizzle ORM 的数据结构（SQLite），编写两个兼容版本：Web 版本和 Tauri 版本。实现三层架构：
1. 第一层：操作数据的接口层 (packages/api)
2. 第二层：中间状态 State 的管理层 (packages/web - Zustand)
3. 第三层：最底层的 SQLite 或 LocalStorage 数据保存层 (packages/db)

### Interview Summary
**Key Discussions**:
- 不需要 SQLCipher 加密：简化实现
- 不迁移 localStorage 数据：Tauri 版本全新开始
- Web 保持 localStorage：足够 To-Do 应用使用
- 新建 packages/db 和 packages/api 两个包
- Zustand store 最小修改：只替换底层存储
- 不需要 Services 层：直接在 repository 处理业务逻辑
- TDD 测试驱动：使用 vitest

**Research Findings**:
- 参考文章使用 Drizzle Proxy 模式连接 Tauri 后端
- 现有平台检测工具：isTauri(), isBrowser() 已存在
- 当前数据模型：TodoItem, JournalPage, Workspace 层级结构
- Tauri 后端目前是最小配置，需要添加 sqlx 依赖

### Metis Review
**Identified Gaps** (addressed):
- Repository API 接口定义：将在 TODO 中明确定义
- ID 生成策略：保持客户端生成 UUID (与现有行为一致)
- 时间戳处理：UTC ISO 字符串格式
- 错误处理：定义统一的 Result 类型

---

## Work Objectives

### Core Objective
实现三层数据架构，使应用能够在 Tauri 环境使用 SQLite 存储，在 Web 环境使用 localStorage 存储，同时保持 UI 行为完全一致。

### Concrete Deliverables
- `packages/db/` - 新包，包含 Drizzle schema 和 storage adapters
- `packages/api/` - 新包，包含 Repository pattern 接口
- `packages/desktop/src-tauri/src/db/` - Rust SQLite 模块
- `packages/web/src/lib/stores/journalStore.ts` - 重构后的 store
- `vitest.config.ts` - 测试配置
- `drizzle.config.ts` - Drizzle Kit 配置

### Definition of Done
- [x] `pnpm test` 所有测试通过
- [x] `pnpm dev` Web 版本正常运行，数据存储在 localStorage
- [x] `pnpm dev:desktop` Tauri 版本正常运行，数据存储在 SQLite
- [x] 两个版本的 UI 行为完全一致

### Must Have
- Drizzle schema 定义 (workspaces, pages, todos 三张表)
- Storage adapter 接口和两个实现 (SQLite, localStorage)
- Repository 层统一的 CRUD 接口
- Rust 端 sqlx 数据库模块和 Tauri commands
- Drizzle Proxy 实现
- 平台检测自动切换 adapter
- TDD 测试覆盖

### Must NOT Have (Guardrails)
- SQLCipher 加密
- localStorage 到 SQLite 数据迁移
- IndexedDB 支持
- Services 层
- 新功能（搜索、同步、过滤等）
- Schema 重构（保持与现有模型一致）
- 性能优化工作
- UI 行为变更

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (需要设置)
- **User wants tests**: TDD
- **Framework**: vitest

### Test Setup Task
- Install: `pnpm add -D vitest @vitest/ui`
- Config: Create `vitest.config.ts` and `vitest.workspace.ts`
- Verify: `pnpm test` shows help
- Example: Create example test to verify setup

### TDD Workflow
Each TODO follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Setup test infrastructure
└── Task 2: Create packages/db package structure

Wave 2 (After Wave 1):
├── Task 3: Define Drizzle schema
├── Task 4: Implement storage adapter interface
├── Task 5: Implement localStorage adapter
└── Task 6: Create packages/api package structure

Wave 3 (After Wave 2):
├── Task 7: Implement Rust SQLite module
├── Task 8: Implement SQLite adapter (Drizzle Proxy)
└── Task 9: Implement Repository layer

Wave 4 (After Wave 3):
├── Task 10: Refactor Zustand store
└── Task 11: Integration testing

Critical Path: Task 1 -> Task 3 -> Task 9 -> Task 10 -> Task 11
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3,4,5,6,7,8,9 | 2 |
| 2 | None | 3,4,5 | 1 |
| 3 | 1,2 | 5,7,8,9 | 4,6 |
| 4 | 1,2 | 5,8 | 3,6 |
| 5 | 3,4 | 9,10 | 6,7 |
| 6 | 1 | 9 | 3,4,5 |
| 7 | 3 | 8 | 5,6 |
| 8 | 4,7 | 9,10 | None |
| 9 | 5,6,8 | 10 | None |
| 10 | 9 | 11 | None |
| 11 | 10 | None | None |

---

## TODOs

### Task 1: Setup Test Infrastructure

**What to do**:
- Install vitest and related dependencies
- Create vitest.config.ts at root
- Create vitest.workspace.ts for monorepo support
- Add test scripts to root package.json
- Create example test to verify setup

**Must NOT do**:
- Install unnecessary testing libraries
- Configure coverage (not required for this project)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 2)
- **Blocks**: Tasks 3-11
- **Blocked By**: None

**References**:
- `packages/web/vite.config.ts` - Vite configuration pattern
- `package.json` - Root package.json for script additions

**Acceptance Criteria**:
- [x] `pnpm add -D vitest` completes successfully
- [x] `vitest.config.ts` exists at root
- [x] `pnpm test` runs without errors
- [x] Example test passes

**Commit**: YES
- Message: `chore: setup vitest test infrastructure`
- Files: `vitest.config.ts`, `package.json`

---

### Task 2: Create packages/db Package Structure

**What to do**:
- Create packages/db directory structure
- Initialize package.json with correct dependencies
- Setup TypeScript configuration
- Install drizzle-orm and drizzle-kit

**Must NOT do**:
- Implement any actual functionality yet
- Add unnecessary dependencies

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 1)
- **Blocks**: Tasks 3, 4, 5
- **Blocked By**: None

**References**:
- `packages/shared/package.json` - Package structure pattern
- `packages/shared/tsconfig.json` - TypeScript config pattern

**Acceptance Criteria**:
- [x] `packages/db/package.json` exists with name "@journal-todo/db"
- [x] `packages/db/tsconfig.json` exists
- [x] `packages/db/src/index.ts` exists (empty export)
- [x] `pnpm install` succeeds
- [x] drizzle-orm is in dependencies

**Commit**: YES
- Message: `feat(db): initialize packages/db package structure`
- Files: `packages/db/*`

---

### Task 3: Define Drizzle Schema

**What to do**:
- Create schema files for workspaces, pages, todos tables
- Define relations between tables
- Export schema types
- Write tests for schema validation

**Must NOT do**:
- Change existing data model structure
- Add fields not in current model
- Implement migrations yet

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 6)
- **Blocks**: Tasks 5, 7, 8, 9
- **Blocked By**: Tasks 1, 2

**References**:
- `packages/web/src/lib/types/journal.ts` - Current type definitions (TodoItem, JournalPage, Workspace)
- Drizzle docs: https://orm.drizzle.team/docs/sql-schema-declaration

**Schema Design**:
```typescript
// workspaces table
workspaces: id (PK), name, currentDateKey, createdAt, updatedAt

// pages table  
pages: id (PK), workspaceId (FK), date, notes, createdAt, updatedAt

// todos table
todos: id (PK), pageId (FK), text, status, tags (JSON), order, level, createdAt, updatedAt
```

**Acceptance Criteria**:
- [x] `packages/db/src/schema/workspace.ts` defines workspaces table
- [x] `packages/db/src/schema/page.ts` defines pages table
- [x] `packages/db/src/schema/todo.ts` defines todos table
- [x] `packages/db/src/schema/index.ts` exports all schemas
- [x] Schema types match existing TypeScript types
- [x] `pnpm test` - schema tests pass

**Commit**: YES
- Message: `feat(db): define Drizzle schema for workspaces, pages, todos`
- Files: `packages/db/src/schema/*`

---

### Task 4: Implement Storage Adapter Interface

**What to do**:
- Define StorageAdapter interface with all required methods
- Define Result type for error handling
- Write interface tests (mock implementation)

**Must NOT do**:
- Implement actual adapters yet
- Add methods not needed by current store

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 6)
- **Blocks**: Tasks 5, 8
- **Blocked By**: Tasks 1, 2

**References**:
- `packages/web/src/lib/stores/journalStore.ts` - Current store actions (lines 67-105)

**Interface Design**:
```typescript
interface StorageAdapter {
  // Workspace operations
  getWorkspaces(): Promise<Result<Workspace[]>>
  getWorkspace(id: string): Promise<Result<Workspace | null>>
  createWorkspace(workspace: Workspace): Promise<Result<Workspace>>
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<Result<Workspace>>
  deleteWorkspace(id: string): Promise<Result<void>>
  
  // Page operations
  getPage(workspaceId: string, date: string): Promise<Result<JournalPage | null>>
  createPage(page: JournalPage): Promise<Result<JournalPage>>
  updatePage(workspaceId: string, date: string, data: Partial<JournalPage>): Promise<Result<JournalPage>>
  
  // Todo operations
  getTodos(pageId: string): Promise<Result<TodoItem[]>>
  createTodo(todo: TodoItem): Promise<Result<TodoItem>>
  updateTodo(id: string, data: Partial<TodoItem>): Promise<Result<TodoItem>>
  deleteTodo(id: string): Promise<Result<void>>
  
  // Batch operations
  savePage(page: JournalPage): Promise<Result<void>>
  
  // Initialization
  initialize(): Promise<Result<void>>
}
```

**Acceptance Criteria**:
- [x] `packages/db/src/adapters/types.ts` defines StorageAdapter interface
- [x] `packages/db/src/adapters/types.ts` defines Result type
- [x] Interface covers all operations needed by journalStore
- [x] `pnpm test` - interface tests pass with mock

**Commit**: YES
- Message: `feat(db): define StorageAdapter interface`
- Files: `packages/db/src/adapters/types.ts`

---

### Task 5: Implement localStorage Adapter

**What to do**:
- Implement StorageAdapter for localStorage
- Handle JSON serialization/deserialization
- Write comprehensive tests

**Must NOT do**:
- Change localStorage key format
- Add caching layer
- Implement migration logic

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 6, 7)
- **Blocks**: Tasks 9, 10
- **Blocked By**: Tasks 3, 4

**References**:
- `packages/web/src/lib/stores/journalStore.ts:905-946` - Current localStorage persist config
- `packages/db/src/adapters/types.ts` - StorageAdapter interface (from Task 4)

**Acceptance Criteria**:
- [x] `packages/db/src/adapters/localStorage.ts` implements StorageAdapter
- [x] All interface methods implemented
- [x] Data persists to localStorage correctly
- [x] `pnpm test` - localStorage adapter tests pass

**Commit**: YES
- Message: `feat(db): implement localStorage storage adapter`
- Files: `packages/db/src/adapters/localStorage.ts`

---

### Task 6: Create packages/api Package Structure

**What to do**:
- Create packages/api directory structure
- Initialize package.json
- Setup TypeScript configuration
- Define repository interfaces

**Must NOT do**:
- Implement repository logic yet
- Add Services layer

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
- **Blocks**: Task 9
- **Blocked By**: Task 1

**References**:
- `packages/shared/package.json` - Package structure pattern

**Acceptance Criteria**:
- [x] `packages/api/package.json` exists with name "@journal-todo/api"
- [x] `packages/api/tsconfig.json` exists
- [x] `packages/api/src/index.ts` exists
- [x] `pnpm install` succeeds

**Commit**: YES
- Message: `feat(api): initialize packages/api package structure`
- Files: `packages/api/*`

---

### Task 7: Implement Rust SQLite Module

**What to do**:
- Add sqlx dependency to Cargo.toml
- Create db module with Database struct
- Implement execute_single_sql Tauri command
- Implement execute_batch_sql Tauri command
- Setup database initialization and migrations

**Must NOT do**:
- Add SQLCi
pher encryption
- Implement complex query optimization
- Add unnecessary Rust dependencies

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 5, 6)
- **Blocks**: Task 8
- **Blocked By**: Task 3

**References**:
- `packages/desktop/src-tauri/Cargo.toml` - Current Rust dependencies
- `packages/desktop/src-tauri/src/lib.rs` - Current Tauri setup
- Reference article: https://codeforreal.com/blogs/setup-encrypted-sqlitedb-in-tauri-with-drizzle-orm/

**Acceptance Criteria**:
- [x] `Cargo.toml` includes sqlx with sqlite feature
- [x] `src/db/mod.rs` exports Database struct
- [x] `execute_single_sql` command works
- [x] `execute_batch_sql` command works
- [x] Database file created in app data directory
- [x] `pnpm dev:desktop` starts without errors

**Commit**: YES
- Message: `feat(desktop): implement Rust SQLite module with Tauri commands`
- Files: `packages/desktop/src-tauri/src/db/*`, `packages/desktop/src-tauri/Cargo.toml`

---

### Task 8: Implement SQLite Adapter (Drizzle Proxy)

**What to do**:
- Implement Drizzle Proxy driver
- Connect to Tauri commands
- Implement StorageAdapter for SQLite
- Write tests (mocked Tauri commands)

**Must NOT do**:
- Implement db.transaction() (use batch instead)
- Add caching layer

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Sequential
- **Blocks**: Tasks 9, 10
- **Blocked By**: Tasks 4, 7

**References**:
- `packages/db/src/adapters/types.ts` - StorageAdapter interface
- Drizzle Proxy docs: https://orm.drizzle.team/docs/connect-drizzle-proxy

**Acceptance Criteria**:
- [x] `packages/db/src/adapters/sqlite.ts` implements StorageAdapter
- [x] Drizzle Proxy connects to Tauri commands
- [x] All interface methods implemented
- [x] `pnpm test` - SQLite adapter tests pass (mocked)

**Commit**: YES
- Message: `feat(db): implement SQLite storage adapter with Drizzle Proxy`
- Files: `packages/db/src/adapters/sqlite.ts`, `packages/db/src/client.ts`

---

### Task 9: Implement Repository Layer

**What to do**:
- Implement WorkspaceRepository
- Implement PageRepository  
- Implement TodoRepository
- Add platform detection for adapter selection
- Write comprehensive tests

**Must NOT do**:
- Add Services layer
- Change business logic
- Add new operations not in current store

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Sequential
- **Blocks**: Task 10
- **Blocked By**: Tasks 5, 6, 8

**References**:
- `packages/db/src/adapters/types.ts` - StorageAdapter interface
- `packages/web/src/lib/stores/journalStore.ts` - Current store operations
- `packages/shared/src/utils/platform.ts` - Platform detection utilities

**Acceptance Criteria**:
- [x] `packages/api/src/repositories/workspace.ts` implements WorkspaceRepository
- [x] `packages/api/src/repositories/page.ts` implements PageRepository
- [x] `packages/api/src/repositories/todo.ts` implements TodoRepository
- [x] Platform detection auto-selects correct adapter
- [x] `pnpm test` - repository tests pass

**Commit**: YES
- Message: `feat(api): implement repository layer with platform-aware adapter selection`
- Files: `packages/api/src/repositories/*`

---

### Task 10: Refactor Zustand Store

**What to do**:
- Replace localStorage persist with repository calls
- Keep all existing actions and state structure
- Add async initialization
- Maintain backward compatibility

**Must NOT do**:
- Change action signatures
- Change state structure
- Remove any existing functionality
- Change UI behavior

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: None required

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Sequential
- **Blocks**: Task 11
- **Blocked By**: Task 9

**References**:
- `packages/web/src/lib/stores/journalStore.ts` - Current store implementation
- `packages/api/src/repositories/*` - Repository layer (from Task 9)

**Acceptance Criteria**:
- [x] Store no longer uses Zustand persist middleware
- [x] All actions call repository methods
- [x] State structure unchanged
- [x] `pnpm dev` - Web version works with localStorage
- [x] `pnpm dev:desktop` - Tauri version works with SQLite

**Commit**: YES
- Message: `refactor(web): integrate repository layer into Zustand store`
- Files: `packages/web/src/lib/stores/journalStore.ts`

---

### Task 11: Integration Testing

**What to do**:
- Write end-to-end tests for data flow
- Test Web version with localStorage
- Test Tauri version with SQLite (manual)
- Verify UI behavior consistency

**Must NOT do**:
- Add new features
- Change any implementation

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: [`playwright`] (for browser testing)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Final
- **Blocks**: None
- **Blocked By**: Task 10

**Acceptance Criteria**:
- [x] Integration tests cover CRUD operations
- [x] Web version: data persists in localStorage
- [x] Tauri version: data persists in SQLite file
- [x] Both versions have identical UI behavior
- [x] `pnpm test` - all tests pass
- [x] `pnpm build` - builds successfully

**Commit**: YES
- Message: `test: add integration tests for data layer`
- Files: `packages/*/src/__tests__/*`

---

## Success Criteria

### Verification Commands
```bash
pnpm test          # All tests pass
pnpm typecheck     # No TypeScript errors
pnpm build         # Build succeeds
pnpm dev           # Web version runs
pnpm dev:desktop   # Tauri version runs
```

### Final Checklist
- [x] All "Must Have" items present
- [x] All "Must NOT Have" items absent
- [x] All tests pass
- [x] Web version uses localStorage
- [x] Tauri version uses SQLite
- [x] UI behavior identical on both platforms
