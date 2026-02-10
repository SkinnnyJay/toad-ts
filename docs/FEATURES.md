# TOAD TypeScript - Features

Comprehensive feature documentation for TOAD TypeScript, a type-safe terminal interface for AI coding agents.

---

## Core Architecture

### ACP Protocol Integration
- **JSON-RPC 2.0 over stdio** - Full Agent Client Protocol compliance
- **Protocol version negotiation** - Automatic compatibility checking with agents
- **Capability discovery** - Dynamically discover agent features and tools
- **Multi-agent support** - Switch between Claude CLI, Gemini CLI, OpenHands, Codex, and more

### Type-Safe State Management
- **Zustand store** - Minimal, immutable state management
- **Branded ID types** - `SessionId`, `AgentId`, `MessageId`, `ToolCallId`, `TaskId`, `PlanId`, `SubAgentId`
- **Zod validation** - Runtime type checking at every boundary
- **Strict TypeScript mode** - 100% type coverage, no `any` types allowed

### React-Based Terminal UI
- **Ink 5.x framework** - React paradigm for terminal interfaces
- **@inkjs/ui components** - Battle-tested input and selection widgets
- **60fps rendering** - Smooth streaming without jank
- **Keyboard-first navigation** - Efficient power user experience

---

## Agent System

### Primary Agent Support
- **Agent selection UI** - Fuzzy search through available agents
- **Agent hot-swapping** - Switch providers mid-session (Ctrl+P)
- **Provider configuration** - Custom models, tokens, and parameters per agent

### Multi-Agent Orchestration (Designed, Not Yet Implemented)
**Types available in `src/types/domain.ts`:**

- **Plan execution engine**
  - Plan creation from user prompts
  - Task decomposition
  - Dependency tracking between tasks
  - Status tracking (planning, executing, completed, failed)

- **Subagent system**
  - Subagent spawning and management
  - Task delegation with `@mention` syntax
  - Child session navigation
  - Inter-agent messaging (task_complete, task_failed, need_help, share_result, coordinate)

- **Task management**
  - Task assignment to specific subagents
  - Parallel task execution
  - Task dependency resolution
  - Result aggregation and error handling

---

## Developer Experience

### Type Safety
- **Branded IDs prevent mixing** - `SessionId` cannot be assigned to `AgentId`
- **Zod schemas everywhere** - Runtime validation for all domain types
- **No implicit `any`** - Explicit types required
- **Strict null checks** - Compile-time null safety

### Session Management
- **Session persistence** - Resume conversations across restarts
- **Multi-session support** - Switch between active sessions (Ctrl+N)
- **Session history** - Navigate previous sessions
- **Auto-save** - Continuous state persistence

### Content Handling
- **Content block types**:
  - `TextContentBlock` - Plain text responses
  - `CodeContentBlock` - Code with language specification
  - `ThinkingContentBlock` - Agent reasoning traces
  - `ToolCallContentBlock` - Tool invocation with status tracking
  - (Planned) `ResourceContentBlock` - Embedded file context
  - (Planned) `ResourceLinkContentBlock` - Links to external resources

### Message Streaming
- **Real-time token streaming** - Character-by-character display
- **Progressive updates** - Tool call status updates live
- **Partial message assembly** - Efficient chunk handling
- **Stream completion detection** - Clean finalization

---

## Planned Features (Not Yet Implemented)

### Tool System
- **File system operations** - Read/write files with permission checks
- **Terminal integration** - Execute shell commands with output streaming
- **Tool call approval flow** - Allow/ask/deny permission profiles
- **Tool result streaming** - Real-time tool output display
- **Tool visualization** - Progress indicators and status badges

### Session Modes (ACP)
- **read-only** - Agent cannot modify files
- **auto** - Default, requests permission for destructive operations
- **full-access** - All tools allowed without prompts
- **Runtime mode switching** - `session/setMode` support

### Slash Commands (ACP)
- **Command discovery** - Agents advertise available commands
- **Command routing** - Execute commands via `/` prefix
- **Autocomplete hints** - Tab completion for available commands
- **Dynamic registration** - Runtime command updates

### MCP Integration
- **MCP server configuration** - HTTP and SSE transport support
- **MCP credential passing** - Secure auth forwarding
- **MCP tool exposure** - MCP tools via agent capabilities

### Agent Plan Feature (ACP)
- **Plan announcements** - Agent reveals steps before execution
- **Plan approval/deny** - User review and confirmation
- **Step progress tracking** - Real-time task status
- **Plan UI display** - Visual plan progress in terminal

### Rich Content Types (ACP)
- **Image blocks** - Embedded images in responses
- **Audio blocks** - Voice/audio content
- **Video blocks** - Embedded video content
- **Custom block types** - Extensible content system

---

## UI Features

### Chat Interface
- **Message list** - Scrollable conversation history
- **Input editor** - Multi-line editing with syntax highlighting
- **Markdown rendering** - Formatted output with syntax highlighting
- **Timestamps** - Message timing display

### Navigation
- **Keyboard shortcuts**:
  - `Enter` - Send message
  - `Shift+Enter` - New line
  - `↑` / `↓` - Navigate input history
  - `Ctrl+P` - Switch provider
  - `Ctrl+N` - New session
  - `Ctrl+L` - Clear screen
  - `Escape` - Cancel current request
  - `Ctrl+C` - Exit

### Status Display
- **Connection status** - Real-time agent connection state
- **Session info** - Current session and agent display
- **Multi-agent status** - Active plan and subagent overview (when implemented)

---

## Configuration

### Environment Variables
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude CLI
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
- `TOADSTOOL_DEFAULT_AGENT` - Default agent ID
- `TOADSTOOL_CONFIG_PATH` - Custom config file location

### Agent Configuration
**JSON config at `~/.config/toadstool/config.json`:**

```json
{
  "agents": {
    "claude": {
      "command": "claude --experimental-acp",
      "model": "claude-sonnet-4-20250514",
      "maxTokens": 4096
    },
    "gemini": {
      "command": "gemini --experimental-acp",
      "model": "gemini-2.5-pro",
      "maxTokens": 8192
    }
  },
  "defaults": {
    "agent": "claude"
  }
}
```

### Custom Agents
Create `.opencode/agent/{name}.md` files with YAML frontmatter:

```yaml
---
mode: primary
model: anthropic/claude-sonnet-4
temperature: 0.1
tools:
  write: ask
  edit: ask
  bash: allow
---

You are a code reviewer...
```

---

## Testing & Quality

### Test Coverage
- **Unit tests** - 80%+ coverage for critical paths
- **Integration tests** - E2E flow validation
- **LLM validation** - Semantic quality scoring

### Quality Gates
Every commit must pass:
```bash
bun run format      # Code formatting
bun run lint:fix    # Linting with fixes
bun run typecheck   # TypeScript compilation
bun run test        # Test suite
bun run build       # Build verification
```

### Type Safety Metrics
- **100% TypeScript** - No JavaScript files
- **Strict mode enabled** - All compiler checks active
- **No implicit any** - Explicit types everywhere
- **Zero null issues** - Compile-time null safety

---

## Performance Targets

| Metric | Target | Current |
|--------|---------|---------|
| First Response Time | <2s | ⏳ TBD |
| Streaming Latency | <100ms | ⏳ TBD |
| UI Render FPS | 60fps | ✅ Achieved |
| Memory Usage | <200MB | ⏳ TBD |
| Error Rate | <0.1% | ⏳ TBD |

---

## Extensibility

### Plugin Architecture (Planned)
- Custom tool handlers
- Custom content block renderers
- Custom agent providers
- Custom slash commands

### Agent SDK
Library exports for programmatic usage:

```typescript
import { TOADSTOOLClient } from 'toadstool-ts';

const client = new TOADClient({
  agent: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await client.prompt('Hello, world!');
```

---

## Documentation

- **README.md** - Quick start and overview
- **FEATURES.md** - This file
- **COMPARISON.md** - Competitive analysis
- **scratchpad/plan.md** - Master implementation roadmap
- **scratchpad/spec.md** - Technical specifications

---

*Last Updated: 2026-01-14*  
*Status: Phase 3 Complete (~50% of planned features)*
