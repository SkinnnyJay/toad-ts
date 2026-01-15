---
title: TOAD TypeScript - Agent Initialization Guide
date: 2025-01-27
author: Jonathan Boice
status: active
lastUpdated: 2026-01-14
description: Agent initialization guide for TOAD TypeScript development
---

# TOAD TypeScript - Agent Initialization Guide

Revision: v1.1.0
Document Role: Onboarding quickstart for agents; see plan.md for roadmap and spec.md for authoritative definitions.

## 🎯 Project Overview

**TOAD (Terminal Orchestration for AI Development)** is a unified terminal interface for AI coding agents, built with TypeScript, Ink (React for CLIs), and ACP (Agent Client Protocol). This is a complete rewrite of the original Python/Textual Toad project, designed to provide a powerful, type-safe, and extensible interface for AI agent communication.

## 📚 Essential Context

### What You're Building
A production-ready terminal UI that connects to AI coding agents (primarily Claude CLI) via the Agent Client Protocol (ACP). The system features:
- Real-time streaming responses with rich markdown rendering
- Multi-agent support with session management
- Harness registry + config layering (`.toad/harnesses.json`, `~/.toad/harnesses.json`)
- Tool visualization (file operations, terminal commands)
- Type-safe architecture with Zod validation at all boundaries
- Comprehensive testing including LLM-based validation

### Key Architectural Principles
1. **Type Safety First**: TypeScript strict mode, no `any` types, Zod schemas everywhere
2. **Protocol-Oriented Design**: Clean separation via interfaces (ports/adapters pattern)
3. **Value Semantics**: Immutable data structures where possible
4. **Deterministic Testing**: Heuristic + LLM validation layers
5. **Performance**: 60fps UI rendering, <100ms streaming latency

## 📋 Documentation Hierarchy

### 1. Primary Planning Documents

#### `plan.md` (Master Plan)
The complete project roadmap with phases, milestones, and technical specifications. This is your north star - consult it for overall direction and phase breakdowns.

#### `research/recon/*.md` (Recon Briefs)
Concise references for TOAD, OpenCode, Claude CLI, Ink, and ACP. Use these for fast context on inspirations and protocol quirks.

#### `progress.md` (Task Tracking)
Real-time status of all tasks organized by completion state:
- ✅ **Done**: Completed and verified tasks
- 🔄 **In Progress**: Currently active work
- ⏳ **Not Done**: Pending tasks in priority order

**⚠️ CRITICAL**: Update this file continuously as you work!

#### `journal.md` (Work Log)
Session-by-session documentation of:
- Decisions made and rationale
- Problems encountered and solutions
- Key insights and learnings
- Context for future sessions

**⚠️ CRITICAL**: Document decisions immediately - context is freshest when captured in real-time!

### 2. Technical Specifications

#### `spec.md` (Original Toad TypeScript Spec)
Comprehensive 1950-line specification covering:
- Complete type definitions with Zod schemas
- ACP protocol implementation details
- Component architecture and data flow
- Implementation examples and patterns

#### `research/toad-typescript-implementation-spec.md`
The foundational spec document with:
- Domain language glossary
- Architecture diagrams
- Phase-by-phase implementation guide
- Testing strategies

#### `research/toad-enhanced-spec.md`
Enhanced specification with:
- NPM package ecosystem analysis
- Architecture patterns from industry leaders
- LLM-based validation testing approach
- Performance optimization strategies

### 3. Engineering Documentation

#### `engineering/engineering-design-plan.md`
Detailed engineering architecture:
- System architecture with full interface contracts
- ADRs (Architecture Decision Records)
- Performance budgets and reliability matrix
- 16-week execution plan with clear deliverables

#### `engineering/swift-engineering-design.md`
Swift-inspired engineering patterns:
- Protocol-oriented design patterns
- Value semantics and branded types
- Explicit state machines
- SwiftUI-inspired UI patterns

### 4. Design Documentation (Planned)

**Note**: The `design/` directory exists but design documentation is not yet created. The engineering documents above contain Glass UI design concepts that will be extracted into dedicated design files when needed.

### 5. Code Quality

#### `CODE_QUALITY_REMEDIATION.md`
Comprehensive code quality audit with:
- Current issues and severity levels
- 5-phase remediation plan
- Engineering standards recommendations
- Success criteria and acceptance tests

## 🚀 Quick Start Path

### Phase 1: Context Gathering (First 30 minutes)
1. Read `plan.md` - Understand the complete roadmap
2. Read `progress.md` - See current status
3. Read `journal.md` - Get recent context
4. Review `spec.md` sections relevant to current phase

### Phase 2: Environment Setup
```bash
# Create project structure
mkdir -p toad-ts/src/{cli,types,core,store,ui,config,utils,testing}
cd toad-ts

# Initialize project
npm init -y
npm install ink react @agentclientprotocol/sdk commander zod zustand
npm install -D typescript @types/react vitest tsx eslint biome

# Setup TypeScript (strict mode)
npx tsc --init --strict
```

### Phase 3: Begin Implementation
Start with Phase 1 (V0 Foundation) from `plan.md`:
1. Core type definitions (`src/types/domain.ts`)
2. ACP connection module (`src/core/acp-connection.ts`)
3. Zustand store (`src/store/app-store.ts`)
4. Basic Ink UI shell (`src/ui/components/App.tsx`)

## 🏗️ Project Structure

```
toad-ts/
├── src/
│   ├── cli.ts                      # CLI entry point
│   ├── types/                      # Type definitions & schemas
│   │   ├── domain.ts               # Core domain types (Zod)
│   │   ├── acp.ts                  # ACP protocol types
│   │   └── store.ts                # Store interfaces
│   ├── core/                       # Core business logic
│   │   ├── acp-connection.ts       # ACP client wrapper
│   │   ├── message-handler.ts      # Stream processing
│   │   ├── fs-handler.ts           # File operations
│   │   └── terminal-handler.ts     # Shell execution
│   ├── store/                      # State management
│   │   └── app-store.ts            # Zustand store
│   ├── ui/                         # UI components
│   │   ├── components/             # React/Ink components
│   │   └── hooks/                  # Custom React hooks
│   ├── config/                     # Configuration
│   │   ├── loader.ts               # Config file parsing
│   │   └── schema.ts               # Config schemas
│   └── testing/                    # Test utilities
│       └── validators/             # LLM & heuristic validators
├── scratchpad/                     # Planning documents
├── test/                          # Test files
├── package.json
├── tsconfig.json
├── biome.json                     # Linting/formatting config
└── vitest.config.ts               # Test configuration
```

## 🧩 Harness Configuration

- Project defaults: `./.toad/harnesses.json`
- User overrides: `~/.toad/harnesses.json`
- CLI overrides: `--harness <id>`, `--config <path>`
- `.env` defaults for CLI command/args and session storage paths

## 🛠️ Technology Stack

### Core Dependencies
- **ink**: React-based TUI framework with flexbox layout
- **@agentclientprotocol/sdk**: Official ACP TypeScript SDK
- **zustand**: Minimal, TypeScript-first state management
- **zod**: Runtime type validation with TS inference
- **marked + marked-terminal**: Terminal-optimized markdown

### Development Tools
- **typescript**: Strict mode enforcement
- **vitest**: Fast, TypeScript-native testing
- **biome**: Fast linting and formatting (replaces ESLint + Prettier)
- **tsx**: TypeScript execution for development

## ✅ Quality Gates

**Every commit MUST pass these checks:**

```bash
npm run format        # Biome formatting
npm run lint:fix      # Biome linting with fixes
npm run typecheck     # TypeScript type checking
npm run test          # Unit tests
npm run build         # Build verification
```

## 🎯 Success Criteria

### V0 (Foundation) Completion
- [ ] TypeScript compiles with zero errors in strict mode
- [ ] ACP connection establishes with Claude CLI
- [ ] Basic TUI renders without crashes
- [ ] Zustand store manages state correctly
- [ ] All types have Zod schemas

### MVP Completion
- [ ] Streaming messages render progressively
- [ ] Tool calls display with status indicators
- [ ] File operations work correctly
- [ ] Terminal commands execute successfully
- [ ] Error recovery and reconnection work

### Production Ready
- [ ] 60fps UI rendering (no jank)
- [ ] <100ms streaming latency (p95)
- [ ] LLM validation tests pass (>80% score)
- [ ] All quality gates pass
- [ ] Documentation complete

## 🔄 Development Workflow

### Daily Cycle
1. **Start**: Read `progress.md` and `journal.md`
2. **Plan**: Select next task(s) from "Not Done" list
3. **Implement**: Follow specs, maintain quality gates
4. **Test**: Run all checks before committing
5. **Document**: Update `progress.md` and `journal.md`
6. **Commit**: Clean, working state only

### Key Commands
```bash
# Development
npm run dev           # Watch mode with hot reload
npm run dev:watch     # Alternative watch mode

# Quality checks
npm run typecheck     # Type checking
npm run lint          # Linting
npm run format        # Auto-format code
npm run test          # Run tests

# Build & Run
npm run build         # Build for production
npm start             # Run the application
```

## 📝 Important Notes

### Architecture Decisions
- **Ports/Adapters Pattern**: Clean separation between core logic and external dependencies
- **Branded Types**: Use branded types for IDs to prevent mixing (SessionID, AgentID, etc.)
- **Value Semantics**: Prefer immutable data structures with `readonly` modifiers
- **Protocol-Oriented**: Define interfaces first, implementations second

### Testing Philosophy
Three-layer validation approach:
1. **Unit Tests**: Component and function level
2. **Heuristic Checks**: Fast, deterministic structural validation
3. **LLM Validation**: Semantic quality assessment

### Common Pitfalls to Avoid
- Don't use `any` types - use `unknown` with type guards
- Don't skip Zod validation at boundaries
- Don't leave the codebase in a broken state
- Don't implement features not in the current phase
- Don't forget to update progress tracking

## 🚦 Next Steps

1. **Immediate**: Set up the project structure and install dependencies
2. **Today**: Complete V0.1 (Project Setup) and V0.2 (Core Types)
3. **This Week**: Achieve V0 completion (basic working prototype)
4. **Next Week**: Begin MVP features (streaming, tools, etc.)

## 📞 Getting Help

- **Specifications**: Consult `spec.md` for detailed requirements
- **Architecture**: Review `engineering/` documents for patterns
- **Research**: Check `research/` folder for implementation specs
- **Code Quality**: Check `CODE_QUALITY_REMEDIATION.md` for standards
- **Previous Work**: Read `journal.md` for context and decisions (once created)

## 🎯 Mission Statement

Build a production-ready, type-safe, performant terminal interface that makes AI coding agents accessible and powerful for developers. Focus on correctness, user experience, and maintainability.

---

**Remember**: This is not just a chatbot - it's a professional development tool. Build it with the quality and attention to detail it deserves.

**Start Here**: Open `plan.md` and begin with Phase 1, Task 1!

---

## Changelog
- v1.1.0 (2026-01-14): Updated status and dates, added revision tag, clarified document role, and aligned guidance with current execution phase.
