---
title: Toad TypeScript Enhanced Specification
date: 2025-01-27
author: Jonathan Boice
status: active
lastUpdated: 2026-01-14
description: Enhanced specification with package ecosystem analysis and testing strategy
---

# Toad TypeScript Enhanced Specification

Revision: v1.1.0
Document Role: Canonical specification for TOAD-TS; research specs supplement this document.

## Package Ecosystem Analysis & Testing Strategy

This document enhances the original Toad specification with insights from production TUI projects, proven NPM packages, and comprehensive testing strategies including LLM-based validation.

---

## Table of Contents

1. [NPM Package Ecosystem Deep Dive](#npm-package-ecosystem-deep-dive)
2. [Architecture Patterns from Industry Leaders](#architecture-patterns-from-industry-leaders)
3. [Full Lifecycle Scenarios](#full-lifecycle-scenarios)
4. [LLM-Based Validation Testing](#llm-based-validation-testing)
5. [Enhanced Implementation Recommendations](#enhanced-implementation-recommendations)

---

## NPM Package Ecosystem Deep Dive

### Core TUI Packages Analysis

After analyzing packages used by Claude CLI, Codex CLI, OpenCode, and similar projects:

#### Rendering & Layout

| Package | Used By | Purpose | Why It's Great |
|---------|---------|---------|----------------|
| **ink** | Claude CLI, many TUIs | React-based TUI | Flexbox layout, component model, excellent TS support |
| **blessed** | Legacy TUIs | Low-level terminal | Full control, but complex API |
| **neo-blessed** | OpenTUI | Blessed fork | Better maintained, modern features |
| **yoga-layout** | Ink internal | Flexbox engine | Facebook's cross-platform layout |
| **terminal-kit** | Various | All-in-one terminal | Rich features, good for rapid prototyping |

#### Input & Interaction

| Package | Purpose | Key Features |
|---------|---------|--------------|
| **@inkjs/ui** | Pre-built Ink components | TextInput, Select, Spinner, ProgressBar |
| **ink-text-input** | Text input handling | Multi-line, history, completions |
| **ink-select-input** | Selection menus | Keyboard navigation, search |
| **ink-spinner** | Loading indicators | Multiple spinner styles |
| **ink-table** | Data tables | Sortable, scrollable |
| **ink-syntax-highlight** | Code highlighting | Prism-based, terminal colors |
| **keypress** | Raw keyboard input | Low-level key detection |
| **readline** | Line editing | Built-in, battle-tested |

#### Text Processing & Rendering

| Package | Purpose | Notes |
|---------|---------|-------|
| **marked** | Markdown parsing | Fast, extensible |
| **marked-terminal** | Terminal markdown | ANSI colors, links |
| **cli-markdown** | Simple MD rendering | Lightweight alternative |
| **chalk** | ANSI styling | De facto standard |
| **ansi-escapes** | Cursor/screen control | Low-level terminal ops |
| **wrap-ansi** | Text wrapping | ANSI-aware wrapping |
| **slice-ansi** | ANSI substring | Safe string slicing |
| **strip-ansi** | Remove ANSI | Clean text extraction |
| **figures** | Unicode symbols | Cross-platform symbols |
| **log-symbols** | Status icons | ✓ ✗ ⚠ ℹ |

#### Syntax Highlighting

| Package | Purpose | Best For |
|---------|---------|----------|
| **shiki** | VS Code highlighting | Accurate, many themes |
| **prism-react-renderer** | React + Prism | Component-based |
| **highlight.js** | Universal highlighting | Fast, 190+ languages |
| **cli-highlight** | Terminal highlighting | ANSI output |

#### State Management

| Package | Used By | Why |
|---------|---------|-----|
| **zustand** | Claude CLI, modern apps | Minimal, TS-first, hooks-based |
| **jotai** | Some TUIs | Atomic state model |
| **valtio** | Various | Proxy-based reactivity |
| **immer** | With any | Immutable updates |

#### Process & IPC

| Package | Purpose | Key Features |
|---------|---------|--------------|
| **execa** | Process execution | Better than child_process |
| **cross-spawn** | Cross-platform spawn | Windows compatibility |
| **tree-kill** | Process tree termination | Clean shutdown |
| **node-pty** | Pseudo terminals | Full PTY support |
| **xterm.js** | Terminal emulation | Full VT100+ emulation |

#### File System & Paths

| Package | Purpose | Why Use It |
|---------|---------|------------|
| **fs-extra** | Enhanced fs | Promises, recursive ops |
| **chokidar** | File watching | Efficient, cross-platform |
| **globby** | Glob patterns | Modern glob matching |
| **fast-glob** | Fast globbing | Performance focused |
| **pathe** | Path utilities | Cross-platform paths |
| **find-up** | Find files upward | Config file discovery |

#### Search & Indexing

| Package | Purpose | Why Use It |
|---------|---------|------------|
| **@vscode/ripgrep** | Bundled rg binary | Fast text search, `rg --json` output |
| **fdir** | File crawler | Very fast directory walks |
| **fast-glob** | Glob queries | Full glob semantics |
| **tinyglobby** | Minimal glob | Smaller alternative to globby |
| **@ast-grep/napi** | AST search | Structural code queries |
| **fuzzysort** | Fuzzy matching | Fast ranking for large lists |

### Recommended Enhanced Package.json

```json
{
  "name": "toad-ts",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "toad": "./dist/cli.js"
  },
  "dependencies": {
    "ink": "^5.0.1",
    "@inkjs/ui": "^2.0.0",
    "react": "^18.3.1",

    "@agentclientprotocol/sdk": "^0.12.0",

    "commander": "^12.1.0",
    "zod": "^3.23.8",
    "zustand": "^4.5.4",

    "chalk": "^5.3.0",
    "figures": "^6.1.0",
    "log-symbols": "^6.0.0",

    "marked": "^14.1.0",
    "marked-terminal": "^7.1.0",
    "shiki": "^1.14.1",

    "execa": "^9.3.1",
    "tree-kill": "^1.2.2",

    "fs-extra": "^11.2.0",
    "chokidar": "^3.6.0",
    "fdir": "^6.5.0",
    "fast-glob": "^3.3.3",
    "find-up": "^7.0.0",
    "tinyglobby": "^0.2.15",
    "@vscode/ripgrep": "^1.17.0",
    "@ast-grep/napi": "^0.40.5",
    "fuzzysort": "^3.1.0",

    "wrap-ansi": "^9.0.0",
    "slice-ansi": "^7.1.0",
    "strip-ansi": "^7.1.0",

    "nanoid": "^5.0.7",
    "date-fns": "^3.6.0",
    "conf": "^13.0.1",

    // Phase 4.1: Abstract Persistence Layer
    "sequelize": "^6.37.0",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/react": "^18.3.3",
    "@types/fs-extra": "^11.0.4",

    "vitest": "^2.0.5",
    "ink-testing-library": "^4.0.0",

    "tsx": "^4.17.0",
    "tsup": "^8.2.4",

    "eslint": "^9.9.0",
    "@typescript-eslint/eslint-plugin": "^8.1.0",
    "@typescript-eslint/parser": "^8.1.0",
    "prettier": "^3.3.3",

    // Phase 4.1: Abstract Persistence Layer
    "@types/sqlite3": "^3.1.11"
  }
}
```

---

## Abstract Persistence Layer (Phase 4.1)

### Persistence Provider Architecture

Toad implements a pluggable persistence architecture that allows users to choose between different storage backends based on their needs.

#### PersistenceProvider Interface

```typescript
export interface PersistenceConfig {
  provider: 'json' | 'sqlite';
  json?: {
    filePath: string;
  };
  sqlite?: {
    filePath: string;
    writeMode: 'per_token' | 'per_message' | 'on_session_change';
    batchDelay: number;
  };
}

export interface PersistenceProvider {
  // Core persistence operations
  load(): Promise<SessionSnapshot>;
  save(snapshot: SessionSnapshot): Promise<void>;
  close(): Promise<void>;

  // Advanced querying (provider-specific capabilities)
  search(query: ChatQuery): Promise<Message[]>;
  getSessionHistory(sessionId: string): Promise<Session & { messages: Message[] }>;
}
```

#### Provider Implementations

##### JSON Provider (Default)
- **Use Case**: Simple deployments, development, backwards compatibility
- **Features**: Basic load/save, in-memory search filtering
- **Performance**: Fast for small datasets, rewrites entire file on save
- **Limitations**: No advanced querying, scales poorly with large histories

##### SQLite Provider (Advanced)
- **Use Case**: Production deployments, large chat histories, advanced search
- **Features**:
  - Worker thread architecture (no UI blocking)
  - FTS5 full-text search across messages
  - Configurable write modes with debouncing
  - ACID transactions and data integrity
  - Advanced filtering (by agent, date, session, content)
- **Performance**: Scales to large datasets, WAL mode for concurrency

#### Configuration

```bash
# Environment variables
PERSISTENCE_PROVIDER=json          # 'json' or 'sqlite'
PERSISTENCE_JSON_PATH=./sessions.json
PERSISTENCE_SQLITE_PATH=./toad.db
PERSISTENCE_SQLITE_WRITE_MODE=per_message
PERSISTENCE_SQLITE_BATCH_DELAY=300
```

#### Migration Strategy

Users can migrate between providers using built-in utilities:

```bash
# Export from current provider
npm run persistence:export > chat-backup.json

# Switch provider in config
echo "PERSISTENCE_PROVIDER=sqlite" >> .env

# Import to new provider
npm run persistence:import < chat-backup.json
```

---

## Architecture Patterns from Industry Leaders

### OpenCode Architecture Insights

OpenCode (anomalyco/opencode) demonstrates several key patterns:

```
┌─────────────────────────────────────────────────────────┐
│                     OpenCode TUI                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Editor    │  │   Chat      │  │   Files     │     │
│  │   Panel     │  │   Panel     │  │   Panel     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │              Multi-Provider Abstraction           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │  │
│  │  │ OpenAI  │  │ Claude  │  │ Gemini  │           │  │
│  │  └─────────┘  └─────────┘  └─────────┘           │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │              Tool Execution Engine                │  │
│  │  File Ops • Shell • LSP • Git • Search           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key Takeaways:**
1. Panel-based layout with flexible sizing
2. Provider abstraction layer (we use ACP for this)
3. Unified tool execution interface
4. Real-time file watching integration

### Zed Editor Patterns

Zed's ACP integration shows:

```typescript
// Zed-style assistant panel architecture
interface AssistantPanel {
  // Conversation management
  conversations: Conversation[];
  activeConversation: ConversationId | null;
  
  // Context management
  contextEntries: ContextEntry[];
  
  // Inline assistance (code actions)
  inlineAssists: Map<EditorId, InlineAssist>;
}

// Context can be files, selections, symbols
type ContextEntry = 
  | { type: 'file'; path: string; content: string }
  | { type: 'selection'; range: Range; text: string }
  | { type: 'symbol'; name: string; kind: SymbolKind };
```

### Ralph-Claude-Code Patterns

Shows lightweight integration approach:

```typescript
// Minimal but effective tool definitions
const TOOL_DEFINITIONS = {
  read_file: { path: 'string' },
  write_file: { path: 'string', content: 'string' },
  execute_command: { command: 'string' },
  search_files: { pattern: 'string', path?: 'string' },
  list_directory: { path: 'string' },
} as const;
```

---

## Full Lifecycle Scenarios

### Scenario Matrix

| Scenario | Complexity | Tools Used | Validation Method |
|----------|------------|------------|-------------------|
| Simple Q&A | Low | None | Text matching |
| Code generation | Medium | write_file | Syntax + LLM |
| File modification | Medium | read_file, write_file | Diff + LLM |
| Multi-file project | High | Multiple | Full build + LLM |
| Debug session | High | read, execute, write | Test pass + LLM |
| Refactoring | High | Multiple | AST + Tests + LLM |

### Detailed Scenario Specifications

#### Scenario 1: Simple HTML Generation

```typescript
// test/scenarios/simple-html.test.ts

import { describe, it, expect } from 'vitest';
import { TestHarness } from '../harness';
import { LLMValidator } from '../validators/llm';

describe('Scenario: Simple HTML Generation', () => {
  const harness = new TestHarness();
  const validator = new LLMValidator();
  
  it('creates a Shakespeare landing page', async () => {
    const prompt = `
      Create a single HTML file that:
      1. Uses Tailwind CSS via CDN
      2. Creates a Shakespeare landing page
      3. Lists all his major works with descriptions
      4. Has a creative, period-appropriate design
      5. Is responsive and accessible
    `;
    
    const result = await harness.runSession(prompt);
    
    // 1. Heuristic checks (fast, deterministic)
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toMatch(/\.html$/);
    
    const html = result.files[0].content;
    expect(html).toContain('tailwindcss');
    expect(html).toContain('Shakespeare');
    expect(html).toMatch(/Hamlet|Macbeth|Romeo/i);
    
    // 2. Structural validation
    const structureCheck = await validateHTMLStructure(html);
    expect(structureCheck.valid).toBe(true);
    expect(structureCheck.hasDoctype).toBe(true);
    expect(structureCheck.hasHead).toBe(true);
    expect(structureCheck.hasBody).toBe(true);
    
    // 3. LLM-based validation (comprehensive)
    const llmValidation = await validator.validate({
      prompt,
      output: html,
      criteria: [
        'Contains Tailwind CSS CDN link',
        'Lists at least 5 Shakespeare works',
        'Each work has a title and description',
        'Design feels period-appropriate or creative',
        'Page is well-structured HTML5',
        'Would render correctly in a browser',
      ],
    });
    
    expect(llmValidation.score).toBeGreaterThan(0.8);
    expect(llmValidation.passedCriteria).toContain('Contains Tailwind CSS CDN link');
  });
});
```

#### Scenario 2: Multi-File Project

```typescript
// test/scenarios/multi-file-project.test.ts

describe('Scenario: Create React Component Library', () => {
  it('scaffolds a component with tests', async () => {
    const prompt = `
      Create a React Button component with:
      1. Primary, secondary, and danger variants
      2. Small, medium, large sizes
      3. Loading state with spinner
      4. TypeScript types
      5. Unit tests using Vitest
      6. Storybook story file
    `;
    
    const result = await harness.runSession(prompt);
    
    // Verify file structure
    const files = result.files.map(f => f.path);
    expect(files).toContainEqual(expect.stringMatching(/Button\.(tsx|ts)$/));
    expect(files).toContainEqual(expect.stringMatching(/Button\.test\.(tsx|ts)$/));
    expect(files).toContainEqual(expect.stringMatching(/Button\.stories\.(tsx|ts)$/));
    
    // Verify TypeScript compiles
    const tsCheck = await runTypeScript(result.projectDir);
    expect(tsCheck.errors).toHaveLength(0);
    
    // Verify tests pass
    const testRun = await runVitest(result.projectDir);
    expect(testRun.passed).toBeGreaterThan(0);
    expect(testRun.failed).toBe(0);
    
    // LLM validation for quality
    const qualityCheck = await validator.validateCodeQuality({
      files: result.files,
      criteria: [
        'Button component handles all specified variants',
        'TypeScript types are properly defined',
        'Tests cover the main functionality',
        'Code follows React best practices',
      ],
    });
    
    expect(qualityCheck.overallScore).toBeGreaterThan(0.75);
  });
});
```

#### Scenario 3: Debugging Workflow

```typescript
describe('Scenario: Debug Failing Tests', () => {
  it('identifies and fixes a bug', async () => {
    // Setup: Create a file with an intentional bug
    await harness.setupFixture('buggy-calculator', {
      'calculator.ts': `
        export function add(a: number, b: number): number {
          return a - b; // Bug: should be a + b
        }
      `,
      'calculator.test.ts': `
        import { add } from './calculator';
        import { test, expect } from 'vitest';
        
        test('add works correctly', () => {
          expect(add(2, 3)).toBe(5);
        });
      `,
    });
    
    const prompt = `
      The tests are failing. Debug and fix the issue.
      Run the tests first to see the error.
    `;
    
    const result = await harness.runSession(prompt);
    
    // Verify the agent followed correct process
    expect(result.toolCalls).toContainEqual(
      expect.objectContaining({ name: 'execute_command' })
    );
    expect(result.toolCalls).toContainEqual(
      expect.objectContaining({ name: 'read_file' })
    );
    expect(result.toolCalls).toContainEqual(
      expect.objectContaining({ name: 'write_file' })
    );
    
    // Verify the fix
    const fixedFile = result.files.find(f => f.path.includes('calculator.ts'));
    expect(fixedFile?.content).toContain('a + b');
    
    // Verify tests now pass
    const testRun = await runVitest(result.projectDir);
    expect(testRun.failed).toBe(0);
  });
});
```

---

## LLM-Based Validation Testing

### LLM Validator Implementation

```typescript
// src/testing/validators/llm-validator.ts

import { ACPConnection } from "@/core/acp-connection";
import { z } from 'zod';

const ValidationResultSchema = z.object({
  score: z.number().min(0).max(1),
  passedCriteria: z.array(z.string()),
  failedCriteria: z.array(z.string()),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
});

type ValidationResult = z.infer<typeof ValidationResultSchema>;

interface ValidationRequest {
  prompt: string;
  output: string;
  criteria: string[];
  context?: string;
}

export class LLMValidator {
  private connection: ACPConnection;
  
  constructor() {
    this.connection = new ACPConnection({ command: "claude --experimental-acp" });
  }
  
  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const systemPrompt = `
You are a code quality validator. Your job is to evaluate whether generated code/content meets specified criteria.

Respond with a JSON object containing:
- score: number between 0 and 1 representing overall quality
- passedCriteria: array of criteria that were met
- failedCriteria: array of criteria that were not met
- reasoning: brief explanation of your evaluation
- suggestions: array of improvement suggestions

Be strict but fair. A score of 0.8+ means high quality.
    `.trim();
    
    const userPrompt = `
## Original Prompt Given to AI
${request.prompt}

## Generated Output
\`\`\`
${request.output}
\`\`\`

## Criteria to Evaluate
${request.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${request.context ? `## Additional Context\n${request.context}` : ''}

Please evaluate the output against all criteria and respond with JSON only.
    `.trim();
    
    const response = await this.connection.sendPrompt({
      system: systemPrompt,
      content: [{ type: "text", text: userPrompt }],
    });
    
    const text = response.text ?? "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return ValidationResultSchema.parse(parsed);
  }
  
  async validateCodeQuality(request: {
    files: Array<{ path: string; content: string }>;
    criteria: string[];
  }): Promise<ValidationResult & { fileAnalysis: Record<string, string> }> {
    const fileContents = request.files
      .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');
    
    const result = await this.validate({
      prompt: 'Analyze the following code files',
      output: fileContents,
      criteria: [
        ...request.criteria,
        'Code is syntactically correct',
        'No obvious bugs or errors',
        'Follows language conventions',
        'Properly structured',
      ],
    });
    
    return {
      ...result,
      fileAnalysis: {},  // Could be extended with per-file analysis
    };
  }
  
  async compareVersions(
    original: string,
    modified: string,
    intent: string
  ): Promise<{
    changesCorrect: boolean;
    preservedFunctionality: boolean;
    reasoning: string;
  }> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `
## Intent
${intent}

## Original Code
\`\`\`
${original}
\`\`\`

## Modified Code
\`\`\`
${modified}
\`\`\`

Evaluate:
1. Do the changes correctly implement the intent?
2. Is existing functionality preserved where it should be?

Respond with JSON: { changesCorrect: boolean, preservedFunctionality: boolean, reasoning: string }
        `.trim()
      }],
    });
    
    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch![0]);
  }
}
```

### Heuristic Validators

```typescript
// src/testing/validators/heuristics.ts

import { parse as parseHTML } from 'node-html-parser';
import * as ts from 'typescript';

export interface HTMLValidationResult {
  valid: boolean;
  hasDoctype: boolean;
  hasHead: boolean;
  hasBody: boolean;
  errors: string[];
  warnings: string[];
}

export function validateHTMLStructure(html: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const hasDoctype = html.trim().toLowerCase().startsWith('<!doctype html');
  if (!hasDoctype) {
    warnings.push('Missing DOCTYPE declaration');
  }
  
  let root;
  try {
    root = parseHTML(html);
  } catch (e) {
    return {
      valid: false,
      hasDoctype,
      hasHead: false,
      hasBody: false,
      errors: [`Failed to parse HTML: ${e}`],
      warnings,
    };
  }
  
  const hasHead = !!root.querySelector('head');
  const hasBody = !!root.querySelector('body');
  
  if (!hasHead) errors.push('Missing <head> element');
  if (!hasBody) errors.push('Missing <body> element');
  
  // Check for title
  if (!root.querySelector('title')) {
    warnings.push('Missing <title> element');
  }
  
  // Check for viewport meta
  const viewport = root.querySelector('meta[name="viewport"]');
  if (!viewport) {
    warnings.push('Missing viewport meta tag');
  }
  
  return {
    valid: errors.length === 0,
    hasDoctype,
    hasHead,
    hasBody,
    errors,
    warnings,
  };
}

export interface TypeScriptValidationResult {
  valid: boolean;
  errors: ts.Diagnostic[];
  errorMessages: string[];
}

export function validateTypeScript(
  code: string,
  filename = 'test.ts'
): TypeScriptValidationResult {
  const sourceFile = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true
  );
  
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    strict: true,
    noEmit: true,
  };
  
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (name, languageVersion) => {
    if (name === filename) return sourceFile;
    return originalGetSourceFile(name, languageVersion);
  };
  
  const program = ts.createProgram([filename], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  
  return {
    valid: diagnostics.length === 0,
    errors: [...diagnostics],
    errorMessages: diagnostics.map(d => 
      ts.flattenDiagnosticMessageText(d.messageText, '\n')
    ),
  };
}

export function validateJSON(str: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(str);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}
```

### Test Harness

```typescript
// src/testing/harness.ts

import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ACPConnection } from '../core/acp-connection';
import { MessageHandler } from '../core/message-handler';
import type { AgentConfig, ContentBlock } from '../types/domain';

interface SessionResult {
  messages: Array<{
    role: 'user' | 'assistant';
    content: ContentBlock[];
  }>;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  }>;
  files: Array<{
    path: string;
    content: string;
  }>;
  projectDir: string;
  duration: number;
}

export class TestHarness {
  private projectDir: string | null = null;
  private connection: ACPConnection | null = null;
  
  private readonly agentConfig: AgentConfig = {
    id: 'claude-cli-test',
    name: 'Claude CLI (Test)',
    command: 'claude',
    args: ['--experimental-acp'],
  };
  
  async setup(): Promise<string> {
    this.projectDir = await mkdtemp(join(tmpdir(), 'toad-test-'));
    return this.projectDir;
  }
  
  async setupFixture(
    name: string,
    files: Record<string, string>
  ): Promise<string> {
    const dir = await this.setup();
    
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(dir, path);
      await writeFile(fullPath, content, 'utf-8');
    }
    
    return dir;
  }
  
  async teardown(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
    
    if (this.projectDir) {
      await rm(this.projectDir, { recursive: true, force: true });
      this.projectDir = null;
    }
  }
  
  async runSession(prompt: string): Promise<SessionResult> {
    if (!this.projectDir) {
      await this.setup();
    }
    
    const startTime = Date.now();
    const toolCalls: SessionResult['toolCalls'] = [];
    const messages: SessionResult['messages'] = [];
    
    // Connect to agent
    this.connection = new ACPConnection({
      ...this.agentConfig,
      projectDir: this.projectDir!,
    });
    
    const messageHandler = new MessageHandler();
    
    // Track tool calls
    messageHandler.on('tool-call', (call) => {
      toolCalls.push({
        name: call.name,
        arguments: call.arguments,
      });
    });
    
    messageHandler.on('tool-result', (result) => {
      const last = toolCalls[toolCalls.length - 1];
      if (last) {
        last.result = result.result;
      }
    });
    
    this.connection.on('session-update', (update) => {
      messageHandler.handleUpdate(update);
    });
    
    await this.connection.connect();
    const sessionId = await this.connection.createSession(this.projectDir);
    
    // Send prompt and wait for completion
    await this.connection.sendPrompt(sessionId, prompt);
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      messageHandler.on('done', () => resolve());
    });
    
    // Collect files created/modified
    const files = await this.collectModifiedFiles();
    
    return {
      messages,
      toolCalls,
      files,
      projectDir: this.projectDir!,
      duration: Date.now() - startTime,
    };
  }
  
  private async collectModifiedFiles(): Promise<Array<{ path: string; content: string }>> {
    // This would scan the project directory for files
    // Implementation depends on tracking which files were created/modified
    return [];
  }
}
```

### Running Tests

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Increase timeout for LLM-based tests
    testTimeout: 60000,
    hookTimeout: 30000,
    
    // Run scenario tests serially (they spawn processes)
    sequence: {
      concurrent: false,
    },
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**'],
    },
  },
});
```

---

## Enhanced Implementation Recommendations

### 0. ACP Interoperability & Protocol Coverage

The current SDK-first approach limits interoperability with ACP agents. Prioritize ACP JSON-RPC over
stdio (with protocol + capability negotiation) so the client can work with Claude CLI, Gemini CLI,
and any ACP-compatible agent. Ensure the core pipeline supports:

- Tool call system with approval flow and permission profiles
- Content blocks for code, resource, and resource_link
- Session modes (read-only/auto/full-access) with `session/setMode`
- Slash command discovery + routing
- MCP server integration
- Agent plan announcements + approval
- Future differentiators: subagents, AGENTS.md auto-load, rich content types (images/audio)

Maintain an `AgentConnection` abstraction so ACP and future direct providers can coexist without refactors.

### 1. Enhanced UI Components

```typescript
// src/ui/components/CodeBlock.tsx
// Using shiki for VS Code-quality highlighting

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { getHighlighter, type Highlighter } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getSharedHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'python', 'rust', 'go', 'html', 'css', 'json', 'bash'],
    });
  }
  return highlighterPromise;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  showLineNumbers = false,
}) => {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedHighlighter().then((highlighter) => {
      const tokens = highlighter.codeToTokens(code, {
        lang: language as any,
        theme: 'github-dark',
      });
      
      // Convert tokens to ANSI
      const ansi = tokensToAnsi(tokens);
      setHighlighted(ansi);
    });
  }, [code, language]);
  
  const lines = (highlighted ?? code).split('\n');
  const lineNumWidth = String(lines.length).length;
  
  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor="gray"
      paddingX={1}
    >
      {language && (
        <Text color="gray" dimColor>{language}</Text>
      )}
      {lines.map((line, i) => (
        <Box key={i}>
          {showLineNumbers && (
            <Text color="gray" dimColor>
              {String(i + 1).padStart(lineNumWidth)} │ 
            </Text>
          )}
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};

function tokensToAnsi(tokens: any): string {
  // Convert shiki tokens to ANSI-colored string
  // Implementation would map token colors to chalk calls
  return '';
}
```

### 2. Split Pane Layout

```typescript
// src/ui/components/SplitPane.tsx

import React, { useState } from 'react';
import { Box, useInput } from 'ink';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number;  // 0-1, left pane width
  minRatio?: number;
  maxRatio?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
}) => {
  const [ratio, setRatio] = useState(defaultRatio);
  const [resizing, setResizing] = useState(false);
  
  useInput((input, key) => {
    if (key.ctrl && input === 'r') {
      setResizing(!resizing);
    }
    
    if (resizing) {
      if (key.leftArrow) {
        setRatio(Math.max(minRatio, ratio - 0.05));
      } else if (key.rightArrow) {
        setRatio(Math.min(maxRatio, ratio + 0.05));
      } else if (key.return || key.escape) {
        setResizing(false);
      }
    }
  });
  
  const leftPercent = `${Math.round(ratio * 100)}%`;
  const rightPercent = `${Math.round((1 - ratio) * 100)}%`;
  
  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box width={leftPercent} flexDirection="column">
        {left}
      </Box>
      <Box 
        width={1} 
        borderStyle="single" 
        borderColor={resizing ? 'cyan' : 'gray'}
      />
      <Box width={rightPercent} flexDirection="column">
        {right}
      </Box>
    </Box>
  );
};
```

### 3. Command Palette

```typescript
// src/ui/components/CommandPalette.tsx

import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    
    const lower = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.category?.toLowerCase().includes(lower)
    );
  }, [commands, query]);
  
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(filteredCommands.length - 1, selectedIndex + 1));
    } else if (key.return && filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
      onClose();
    }
  });
  
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={60}
    >
      <Box marginBottom={1}>
        <Text color="cyan">❯ </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Type a command..."
        />
      </Box>
      
      <Box flexDirection="column" maxHeight={10}>
        {filteredCommands.slice(0, 10).map((cmd, i) => (
          <Box key={cmd.id}>
            <Text
              color={i === selectedIndex ? 'cyan' : undefined}
              inverse={i === selectedIndex}
            >
              {' '}{cmd.label}{' '}
            </Text>
            {cmd.shortcut && (
              <Text color="gray" dimColor> {cmd.shortcut}</Text>
            )}
          </Box>
        ))}
      </Box>
      
      {filteredCommands.length === 0 && (
        <Text color="gray" italic>No matching commands</Text>
      )}
    </Box>
  );
};
```

### 4. Persistent Config with `conf`

```typescript
// src/config/store.ts

import Conf from 'conf';
import { z } from 'zod';
import { ToadConfigSchema } from './schema';

const CONFIG_SCHEMA = {
  agents: {
    type: 'array',
    default: [],
  },
  defaults: {
    type: 'object',
    default: {},
  },
  recentSessions: {
    type: 'array',
    default: [],
  },
} as const;

class ConfigStore {
  private conf: Conf<z.infer<typeof ToadConfigSchema>>;
  
  constructor() {
    this.conf = new Conf({
      projectName: 'toad',
      schema: CONFIG_SCHEMA as any,
    });
  }
  
  get<K extends keyof z.infer<typeof ToadConfigSchema>>(
    key: K
  ): z.infer<typeof ToadConfigSchema>[K] {
    return this.conf.get(key);
  }
  
  set<K extends keyof z.infer<typeof ToadConfigSchema>>(
    key: K,
    value: z.infer<typeof ToadConfigSchema>[K]
  ): void {
    this.conf.set(key, value);
  }
  
  addRecentSession(session: { agentId: string; sessionId: string; timestamp: Date }): void {
    const recent = this.conf.get('recentSessions') || [];
    recent.unshift(session);
    this.conf.set('recentSessions', recent.slice(0, 10));
  }
  
  get path(): string {
    return this.conf.path;
  }
}

export const configStore = new ConfigStore();
```

### 5. Comprehensive Error Handling

```typescript
// src/core/error-handler.ts

import { EventEmitter } from 'events';

export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface ToadError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  context?: Record<string, unknown>;
  originalError?: Error;
}

export const ErrorCodes = {
  // Connection errors
  CONN_SPAWN_FAILED: 'CONN_SPAWN_FAILED',
  CONN_INIT_FAILED: 'CONN_INIT_FAILED',
  CONN_DISCONNECTED: 'CONN_DISCONNECTED',
  CONN_TIMEOUT: 'CONN_TIMEOUT',
  
  // Session errors
  SESSION_CREATE_FAILED: 'SESSION_CREATE_FAILED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_PROMPT_FAILED: 'SESSION_PROMPT_FAILED',
  
  // Tool errors
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  TOOL_PERMISSION_DENIED: 'TOOL_PERMISSION_DENIED',
  
  // UI errors
  UI_RENDER_ERROR: 'UI_RENDER_ERROR',
} as const;

export class ErrorHandler extends EventEmitter {
  private errors: ToadError[] = [];
  
  handle(error: ToadError): void {
    this.errors.push(error);
    this.emit('error', error);
    
    if (error.severity === ErrorSeverity.FATAL) {
      this.emit('fatal', error);
    }
  }
  
  createError(
    code: string,
    message: string,
    options: Partial<ToadError> = {}
  ): ToadError {
    return {
      code,
      message,
      severity: options.severity ?? ErrorSeverity.ERROR,
      recoverable: options.recoverable ?? true,
      context: options.context,
      originalError: options.originalError,
    };
  }
  
  getRecent(count = 10): ToadError[] {
    return this.errors.slice(-count);
  }
  
  clear(): void {
    this.errors = [];
  }
}

export const errorHandler = new ErrorHandler();
```

---

## Summary: Key Enhancements

### Package Recommendations

1. **Use `shiki`** for VS Code-quality syntax highlighting
2. **Use `execa`** instead of raw child_process for better DX
3. **Use `conf`** for persistent configuration
4. **Use `nanoid`** for ID generation
5. **Use `date-fns`** for date formatting
6. **Keep `zustand`** - it's the right choice

### Testing Strategy

1. **Layer tests**: Unit → Component → Integration → E2E
2. **Heuristic validators** for fast, deterministic checks
3. **LLM validators** for semantic/quality assessment
4. **Test harness** for full session simulation
5. **Fixture-based testing** for reproducible scenarios

### Architecture Patterns

1. **Panel-based layout** (like OpenCode/Zed)
2. **Command palette** for discoverability
3. **Split panes** for side-by-side views
4. **Provider abstraction** via ACP
5. **Event-driven communication** between layers

### Quality Assurance

1. **TypeScript strict mode** - no exceptions
2. **Zod schemas** for runtime validation
3. **Error boundaries** with recovery
4. **Comprehensive logging**
5. **CI/CD with LLM validation**

---

## Changelog
- v1.1.0 (2026-01-14): Added revision tag and document role; marked this spec as canonical; refreshed metadata.
