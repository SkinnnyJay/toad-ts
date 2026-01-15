---
title: Code Quality Audit & Engineering Standards Recommendation
date: 2025-01-27
author: Code Quality Auditor
status: active
lastUpdated: 2026-01-14
description: Code quality audit and engineering standards recommendations for TOAD TypeScript
scope: Scratchpad directory and engineering standards
---

# Code Quality Audit & Engineering Standards Recommendation

Revision: v1.1.0
Document Role: Quality bar and remediation guidance; current state adjustments captured in _fixed.md.

---

## Executive Summary

**Overall Code Health Score:** 7.5/10

**High-Risk Areas:**
- Documentation inconsistency across markdown files
- Missing TypeScript strict mode enforcement
- Incomplete project structure (no source code yet)
- Glass tokens implementation has minor type safety gaps

**Most Common Failure Patterns:**
- Inconsistent formatting in markdown (mixed bullet styles, spacing)
- Missing explicit type annotations in TypeScript
- Documentation duplication without clear ownership
- No linting/formatting configuration

---

## Findings Table

| File | Line | Category | Severity | Issue | Why It's Bad | Recommended Fix |
|------|------|----------|----------|-------|--------------|-----------------|
| `glass-tokens-implementation.ts` | 13-14 | TypeScript | Medium | Uses `clsx` and `twMerge` without explicit imports | Potential runtime errors if dependencies missing | Add explicit type imports, document dependencies |
| `glass-tokens-implementation.ts` | 19-21 | TypeScript | Low | `cn` function lacks JSDoc explaining merge behavior | Unclear utility purpose | Add JSDoc explaining Tailwind class merging |
| `glass-tokens-implementation.ts` | 33-46 | Type Safety | Medium | String literals for Tailwind classes (no type checking) | No compile-time validation of Tailwind classes | Consider `tailwind-merge` with typed config or template literal types |
| `spec.md` | 1-1542 | Documentation | Low | Extremely long single file (1542 lines) | Hard to navigate, maintain, and version control | Split into focused documents (architecture.md, memory.md, etc.) |
| `plan.md` | 1-492 | Documentation | Low | Mixed formatting (tabs vs spaces, inconsistent bullets) | Hard to read, unprofessional | Standardize on 2-space indentation, consistent bullet style |
| `engineering-design-plan.md` | 1-1003 | Documentation | Medium | Duplicates content from spec.md | Maintenance burden, risk of divergence | Reference spec.md instead of duplicating |
| All markdown | Various | Documentation | High | No frontmatter with metadata | Can't track ownership, dates, status | Add YAML frontmatter to all docs |
| `design/` files | Various | Documentation | Medium | Design decisions scattered across multiple files | Hard to find single source of truth | Consolidate design decisions into DESIGN.md |
| `glass-tokens-implementation.ts` | 349-377 | Documentation | Low | Commented-out CSS examples in code | Should be in separate docs | Move to README or design docs |
| Project root | N/A | Structure | High | No `tsconfig.json`, `eslintrc`, or `prettierrc` | No type checking, linting, or formatting | Add configuration files immediately |

---

## Pattern Analysis

### Repeated Smells Across Files

1. **Documentation Duplication**
   - `spec.md` and `engineering-design-plan.md` overlap significantly
   - Design decisions repeated in multiple files
   - **Impact:** Maintenance burden, risk of stale information
   - **Fix:** Establish single source of truth, use references

2. **Inconsistent Formatting**
   - Mixed use of tabs/spaces in markdown
   - Inconsistent bullet styles (dash vs asterisk)
   - Inconsistent code block formatting
   - **Impact:** Unprofessional, harder to read
   - **Fix:** Enforce Prettier for markdown, add `.prettierrc`

3. **Missing Type Safety**
   - Glass tokens use string literals without validation
   - No TypeScript config to enforce strict mode
   - **Impact:** Runtime errors possible, no compile-time safety
   - **Fix:** Add `tsconfig.json` with strict mode, consider typed Tailwind

4. **No Project Structure**
   - Only scratchpad exists, no `src/` directory
   - No package structure matching spec
   - **Impact:** Can't validate architecture against spec
   - **Fix:** Create monorepo structure per spec

5. **Missing Configuration**
   - No linting configuration
   - No formatting configuration
   - No type checking configuration
   - **Impact:** Inconsistent code quality, harder onboarding
   - **Fix:** Add ESLint, Prettier, TypeScript configs

---

## Remediation Plan

### Phase 1: Foundation & Configuration (Week 1)

**Goal:** Establish development environment and standards

#### Tasks:

1. **Add TypeScript Configuration**
   - Create `tsconfig.json` with strict mode
   - Create `tsconfig.base.json` for monorepo
   - Add `tsconfig.json` to each package
   - **Acceptance:** `npx tsc --noEmit` passes with zero errors

2. **Add Linting Configuration**
   - Create `.eslintrc.js` with TypeScript rules
   - Add ESLint plugins: `@typescript-eslint`, `react`, `next`
   - Configure strict rules (no `any`, no `console.log` in prod)
   - **Acceptance:** `npm run lint` passes

3. **Add Formatting Configuration**
   - Create `.prettierrc` with 2-space indentation
   - Add `.prettierignore`
   - Configure Prettier for markdown files
   - **Acceptance:** `npm run format` formats all files consistently

4. **Add Editor Configuration**
   - Create `.editorconfig` for consistent line endings, indentation
   - Add VSCode settings (`.vscode/settings.json`)
   - **Acceptance:** All editors respect project settings

5. **Fix Glass Tokens TypeScript**
   - Add explicit type annotations to `cn` function
   - Add JSDoc comments
   - Consider typed Tailwind classes (future enhancement)
   - **Acceptance:** TypeScript strict mode passes

**Deliverables:**
- `tsconfig.json`
- `.eslintrc.js`
- `.prettierrc`
- `.editorconfig`
- Updated `glass-tokens-implementation.ts`

---

### Phase 2: Documentation Standards (Week 1-2)

**Goal:** Standardize documentation structure and eliminate duplication

#### Tasks:

1. **Add Frontmatter to All Markdown Files**
   - Standard YAML frontmatter format:
     ```yaml
     ---
     title: Document Title
     date: YYYY-MM-DD
     author: Author Name
     status: draft | review | approved
     ---
     ```
   - **Acceptance:** All markdown files have frontmatter

2. **Consolidate Documentation**
   - Split `spec.md` into focused documents:
     - `docs/architecture.md` - Architecture decisions
     - `docs/memory.md` - Memory model
     - `docs/orchestrator.md` - Orchestrator design
     - `docs/api.md` - API contracts
   - Create `docs/README.md` as index
   - **Acceptance:** Each document is < 500 lines, clear ownership

3. **Eliminate Duplication**
   - Remove duplicated content from `engineering-design-plan.md`
   - Use references instead: `See [architecture.md](./architecture.md)`
   - **Acceptance:** No content duplicated across files

4. **Standardize Design Documentation**
   - Consolidate design decisions into `docs/DESIGN.md`
   - Reference design files from main design doc
   - **Acceptance:** Single source of truth for design decisions

5. **Add Documentation Linting**
   - Configure `markdownlint` or similar
   - Enforce consistent formatting
   - **Acceptance:** `npm run lint:docs` passes

**Deliverables:**
- Restructured `docs/` directory
- All markdown files with frontmatter
- `docs/README.md` index
- No duplicated content

---

### Phase 3: Project Structure (Week 2)

**Goal:** Create monorepo structure matching spec

#### Tasks:

1. **Set Up Monorepo**
   - Choose tool: Turborepo or Nx (recommend Turborepo for simplicity)
   - Create `turbo.json` or `nx.json`
   - **Acceptance:** Monorepo builds successfully

2. **Create Package Structure**
   - Create `src/packages/types/`
   - Create `src/packages/schemas/`
   - Create `src/packages/constants/`
   - Create `src/packages/utils/`
   - Create `src/packages/ui/` (for glass tokens)
   - **Acceptance:** All packages have `package.json`, `tsconfig.json`

3. **Move Glass Tokens**
   - Move `glass-tokens-implementation.ts` to `src/packages/ui/tokens/glass.ts`
   - Update imports
   - **Acceptance:** Tokens are importable from `@/packages/ui/tokens`

4. **Create App Structure**
   - Create `src/apps/ui/` (Next.js)
   - Create `src/apps/agent-core/` (Node.js)
   - **Acceptance:** Both apps have proper structure

5. **Create Services Structure**
   - Create `src/services/orchestrator/`
   - Create `src/services/memory/`
   - Create `src/services/claude-sdk/`
   - Create `src/services/claude-cli/`
   - **Acceptance:** All services have proper structure

**Deliverables:**
- Complete monorepo structure
- All packages configured
- Glass tokens in correct location

---

### Phase 4: Type Safety & Validation (Week 2-3)

**Goal:** Enforce strict typing and validation

#### Tasks:

1. **Shared Types Package**
   - Create `src/packages/types/` with all domain types
   - Export from `index.ts`
   - **Acceptance:** No `any` types, all types exported

2. **Zod Schemas Package**
   - Create `src/packages/schemas/` with Zod schemas
   - Match all types from types package
   - **Acceptance:** All types have corresponding schemas

3. **Constants Package**
   - Create `src/packages/constants/` with all enums and magic strings
   - Use `as const` for type safety
   - **Acceptance:** No magic strings in codebase

4. **Type Safety Enforcement**
   - Add ESLint rule: `@typescript-eslint/no-explicit-any: error`
   - Add ESLint rule: `@typescript-eslint/no-unsafe-*` rules
   - **Acceptance:** `npm run lint` fails on any `any` usage

5. **Runtime Validation**
   - Use Zod schemas at all boundaries (API, WebSocket, file I/O)
   - **Acceptance:** All inputs validated with Zod

**Deliverables:**
- Complete types package
- Complete schemas package
- Complete constants package
- Zero `any` types in codebase

---

### Phase 5: Testing & Quality Gates (Week 3)

**Goal:** Establish testing standards and quality gates

#### Tasks:

1. **Add Testing Framework**
   - Set up Jest or Vitest
   - Configure for TypeScript
   - **Acceptance:** `npm run test` runs successfully

2. **Add Test Structure**
   - Create `__tests__/` directories
   - Add example tests
   - **Acceptance:** Test structure matches project structure

3. **Add Pre-commit Hooks**
   - Set up Husky
   - Add pre-commit: lint, format, type-check
   - **Acceptance:** Commits blocked if checks fail

4. **Add CI/CD Configuration**
   - Create GitHub Actions workflow
   - Run: lint, type-check, test, build
   - **Acceptance:** CI passes on all PRs

5. **Add Code Coverage**
   - Configure coverage reporting
   - Set minimum threshold (80% recommended)
   - **Acceptance:** Coverage reports generated

**Deliverables:**
- Jest/Vitest configured
- Pre-commit hooks working
- CI/CD pipeline
- Coverage reporting

---

## Engineering Standards Recommendation

### 1. TypeScript Standards

**Non-Negotiable Rules:**
- TypeScript strict mode enabled (`strict: true` in `tsconfig.json`)
- No `any` types (use `unknown` and type guards)
- All functions must have explicit return types
- All exported types must be documented with JSDoc
- Use branded types for IDs (`SessionId`, `AgentId`)

**Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Enforcement:**
- ESLint rule: `@typescript-eslint/no-explicit-any: error`
- Pre-commit hook: `tsc --noEmit`
- CI: Type check must pass

---

### 2. Code Style Standards

**Formatting:**
- **Indentation:** 2 spaces (no tabs)
- **Quotes:** Single quotes for strings
- **Trailing commas:** Always
- **Semicolons:** Always
- **Line length:** 100 characters (soft limit)

**Configuration:**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Enforcement:**
- Prettier for formatting
- Pre-commit hook: `prettier --write`
- CI: Format check must pass

---

### 3. Naming Conventions

**TypeScript:**
- **Functions/Variables:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE` or `camelCase` with `as const`
- **Files:** `camelCase.ts` for TypeScript, `kebab-case` for directories

**Examples:**
```typescript
// ✅ Good
const sessionId: SessionId = 'abc-123'
type AgentDefinition = { ... }
const MAX_TOKENS = 100_000 as const

// ❌ Bad
const SessionId = 'abc-123'
type agentDefinition = { ... }
const maxTokens = 100000
```

**Enforcement:**
- ESLint rules for naming conventions
- Code review

---

### 4. Documentation Standards

**Markdown Files:**
- All files must have YAML frontmatter
- Use consistent heading hierarchy (H1 → H2 → H3)
- Use consistent bullet style (dash `-` preferred)
- Code blocks must specify language
- Links must be descriptive (no "click here")

**Frontmatter Template:**
```yaml
---
title: Document Title
date: YYYY-MM-DD
author: Author Name
status: draft | review | approved
lastUpdated: YYYY-MM-DD
---
```

**Code Documentation:**
- All exported functions must have JSDoc
- JSDoc must explain **why**, not **what**
- Include `@param` and `@returns` tags
- Include `@example` for complex functions

**Example:**
```typescript
/**
 * Compresses agent memory when token threshold is exceeded.
 * Preserves decisions, constraints, and open tasks while removing
 * redundant reasoning.
 *
 * @param agentId - The agent whose memory to compress
 * @param sessionId - The session context
 * @returns Compressed memory that replaces working memory
 *
 * @example
 * ```typescript
 * const compressed = await compressMemory('agent-123', 'session-456')
 * ```
 */
export async function compressMemory(
  agentId: AgentId,
  sessionId: SessionId
): Promise<CompressedMemory> {
  // ...
}
```

**Enforcement:**
- ESLint rule: `jsdoc/require-jsdoc` for exported functions
- Code review

---

### 5. File Organization Standards

**Directory Structure:**
- Follow spec structure exactly:
  ```
  src/
    apps/
      ui/
      agent-core/
    packages/
      types/
      schemas/
      constants/
      utils/
      ui/
    services/
      orchestrator/
      memory/
      claude-sdk/
      claude-cli/
   shared/
      utils/
  ```

**File Naming:**
- TypeScript files: `camelCase.ts`
- Directories: `kebab-case`
- Test files: `*.test.ts` or `*.spec.ts`
- Config files: `.config.js` or `.config.ts`

**File Size:**
- Maximum 500 lines per file
- Split large files into focused modules
- Use barrel exports (`index.ts`)

**Enforcement:**
- ESLint rule: `max-lines`
- Code review

---

### 6. Import/Export Standards

**Import Order:**
1. External dependencies
2. Internal packages (`@/packages/*`)
3. Relative imports
4. Type-only imports (`import type { ... }`)

**Example:**
```typescript
// External
import { z } from 'zod'
import { clsx } from 'clsx'

// Internal packages
import { AgentDefinition } from '@/packages/types'
import { AgentDefinitionSchema } from '@/packages/schemas'

// Relative
import { buildPrompt } from './prompt-builder'

// Types
import type { Session } from '@/packages/types'
```

**Barrel Exports:**
- Use `index.ts` for package exports
- Re-export only public API
- Don't re-export implementation details

**Enforcement:**
- ESLint rule: `import/order`
- Code review

---

### 7. Error Handling Standards

**Error Types:**
- Use custom error classes for domain errors
- Use Zod validation errors for input errors
- Never throw strings or generic `Error`

**Example:**
```typescript
class SessionNotFoundError extends Error {
  constructor(sessionId: SessionId) {
    super(`Session not found: ${sessionId}`)
    this.name = 'SessionNotFoundError'
  }
}

// Usage
if (!session) {
  throw new SessionNotFoundError(sessionId)
}
```

**Error Handling:**
- Always handle errors explicitly
- Log errors with context
- Never swallow errors silently

**Enforcement:**
- ESLint rule: `@typescript-eslint/no-throw-literal`
- Code review

---

### 8. Testing Standards

**Test Structure:**
- One test file per source file
- Tests colocated or in `__tests__/` directory
- Use descriptive test names: `describe('compressMemory', () => { ... })`

**Test Coverage:**
- Minimum 80% coverage
- 100% coverage for critical paths (orchestrator, memory)
- Test all error cases

**Test Types:**
- Unit tests: Fast, isolated
- Integration tests: Test boundaries (API, WebSocket)
- E2E tests: Critical user flows

**Example:**
```typescript
describe('compressMemory', () => {
  it('preserves decisions when compressing', async () => {
    // Arrange
    const memory = createTestMemory({ decisions: ['decision1'] })
    
    // Act
    const compressed = await compressMemory(memory)
    
    // Assert
    expect(compressed.decisions).toContain('decision1')
  })
  
  it('throws when memory is empty', async () => {
    await expect(compressMemory([])).rejects.toThrow()
  })
})
```

**Enforcement:**
- Jest coverage thresholds
- CI: Coverage must meet threshold

---

### 9. Git Standards

**Commit Messages:**
- Use Conventional Commits format:
  - `feat: add memory compression`
  - `fix: correct token estimation`
  - `docs: update architecture spec`
  - `refactor: extract prompt builder`
  - `test: add compression tests`

**Branch Naming:**
- `feat/feature-name`
- `fix/bug-name`
- `docs/doc-name`
- `refactor/refactor-name`

**PR Requirements:**
- All CI checks must pass
- At least one approval
- PR description must include:
  - Summary
  - Rationale
  - Validation steps
  - Screenshots (for UI changes)

**Enforcement:**
- Pre-commit hooks
- Branch protection rules
- PR template

---

### 10. Performance Standards

**Latency Budgets:**
- WebSocket message: < 100ms
- REST API: < 200ms (p95)
- Memory compression: < 5s (p95)
- Session resume: < 500ms (p95)

**Monitoring:**
- Log all operations > 100ms
- Track token usage per turn
- Monitor memory compression frequency

**Optimization:**
- Use memoization for expensive computations
- Virtualize long lists (> 100 items)
- Batch DOM updates for streaming

**Enforcement:**
- Performance tests
- Monitoring dashboards

---

## Change Log

- 2026-01-14 - Added revision v1.1.0, clarified document role, aligned status/date
- 2025-01-27 - Initial audit created
- 2025-01-27 - Engineering standards recommendation added

---

## Next Steps

1. **Review this document** with team
2. **Prioritize phases** (start with Phase 1)
3. **Set up configuration files** (TypeScript, ESLint, Prettier)
4. **Restructure documentation** (split spec.md, add frontmatter)
5. **Create monorepo structure** (packages, apps, services)
6. **Begin implementation** following standards

---

## Questions for Team

1. **Monorepo Tool:** Turborepo or Nx? (Recommend Turborepo for simplicity)
2. **Testing Framework:** Jest or Vitest? (Recommend Vitest for speed)
3. **Documentation Tool:** Standard markdown or MDX? (Recommend markdown for now)
4. **Coverage Threshold:** 80% or higher? (Recommend 80% minimum)
5. **Pre-commit Hooks:** Husky or simple-scripts? (Recommend Husky)

---

## References

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Jest Configuration](https://jestjs.io/docs/configuration)
