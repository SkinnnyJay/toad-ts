# TOAD TypeScript: Missing Features Analysis

## Comparison Sources
- **Your Spec**: TypeScript implementation using direct SDK calls (Claude/OpenAI)
- **Original TOAD** (batrachianai/toad): Python/Textual with full ACP support
- **ACP Protocol**: Full Agent Client Protocol specification
- **OpenCode**: Subagents, task delegation, and orchestration

---

## 🔴 Critical Missing Features

### 1. ACP Protocol Implementation
Your spec uses **direct SDK calls** instead of the **Agent Client Protocol**. This is the most significant architectural difference.

| ACP Feature | Your Spec | Impact |
|-------------|-----------|--------|
| JSON-RPC over stdio | ❌ Not implemented | Cannot communicate with external ACP agents |
| Protocol version negotiation | ❌ | Cannot ensure compatibility |
| Capability negotiation | ❌ | Cannot discover agent features |
| `session/new`, `session/load` | ❌ | Using SDK-native sessions instead |
| `session/prompt`, `session/update` | ❌ | Using SDK streaming |
| `session/cancel` | ⚠️ AbortController (different) | Works but not ACP-compliant |

**What this means**: Your implementation can only work with Claude/OpenAI SDKs, NOT with:
- Claude Code ACP (`claude --experimental-acp`)
- Gemini CLI (`gemini --experimental-acp`)
- Codex CLI (`codex-acp`)
- Any other ACP-compatible agent

### 2. Tool Call System
Your spec **defers tools to Phase 2** but lacks the full ACP tool architecture:

| Tool Feature | ACP Spec | Your Spec |
|--------------|----------|-----------|
| File system read/write | ✅ `fs/read_text_file`, `fs/write_text_file` | ⏳ Deferred |
| Terminal execution | ✅ `terminal/*` methods | ⏳ Deferred |
| Tool call approval flow | ✅ Interactive permission | ❌ Not designed |
| Tool call visualization | ✅ Progress, status | ⏳ Deferred |
| Tool results streaming | ✅ Via `session/update` | ❌ Not designed |

### 3. Content Types Support
ACP supports rich content types your spec doesn't address:

| Content Type | ACP | Your Spec |
|--------------|-----|-----------|
| `ContentBlock::Text` | ✅ Required | ✅ Supported |
| `ContentBlock::Code` | ✅ With language | ⚠️ Via markdown only |
| `ContentBlock::Image` | ✅ Capability | ❌ Not designed |
| `ContentBlock::Audio` | ✅ Capability | ❌ Not designed |
| `ContentBlock::Resource` | ✅ Embedded context | ❌ Not designed |
| `ContentBlock::ResourceLink` | ✅ Required | ❌ Not designed |

---

## 🟠 Important Missing Features

### 4. Session Modes (from ACP)
ACP defines session modes your spec doesn't include:

| Mode | Description | Your Spec |
|------|-------------|-----------|
| `read-only` | Agent cannot modify files | ❌ |
| `auto` | Default, requests permission | ❌ |
| `full-access` | All tools allowed | ❌ |
| `session/setMode` | Runtime mode switching | ❌ |

### 5. Slash Commands (from ACP)
ACP agents can advertise and handle slash commands:

```typescript
// ACP AvailableCommandsUpdate notification
{
  "commands": [
    { "name": "status", "description": "Show agent status" },
    { "name": "init", "description": "Create AGENTS.md" },
    { "name": "model", "description": "Switch model" }
  ]
}
```

**Missing in your spec:**
- Command discovery mechanism
- Command execution routing
- Dynamic command registration
- Autocomplete support

### 6. MCP Server Integration (from ACP)
ACP supports passing MCP servers to agents:

| MCP Feature | ACP | Your Spec |
|-------------|-----|-----------|
| MCP HTTP transport | ✅ Capability | ❌ |
| MCP SSE transport | ✅ Capability | ❌ |
| MCP tool exposure | ✅ Via session config | ❌ |
| MCP credential passing | ✅ | ❌ |

### 7. Agent Plan Feature (from ACP)
ACP includes an agent plan mechanism for multi-step operations:

- Agent announces planned steps before execution
- Client can approve/reject plan
- Progress tracking through steps
- **Your spec**: No equivalent feature

---

## 🟡 OpenCode-Specific Features Missing

### 8. Subagent System
OpenCode's most distinctive feature is the subagent architecture:

| Feature | OpenCode | Your Spec |
|---------|----------|-----------|
| Primary agents | ✅ `build`, `plan` | ✅ Providers (similar) |
| Subagents | ✅ `general`, `explore`, custom | ❌ Not designed |
| `@mention` invocation | ✅ `@security-auditor` | ❌ |
| Task delegation tool | ✅ Agent spawns child sessions | ❌ |
| Child session navigation | ✅ `<Leader>+Right/Left` | ❌ |

### 9. Agent Configuration System
OpenCode has rich agent configuration:

```yaml
# OpenCode agent definition (.opencode/agent/reviewer.md)
---
mode: subagent
model: anthropic/claude-sonnet-4
temperature: 0.1
tools:
  write: false
  edit: false
  bash: ask
---
You are a code reviewer...
```

**Missing in your spec:**
- Per-agent tool permissions
- Per-agent model selection
- Custom system prompts per agent
- Permission profiles (`allow`, `ask`, `deny`)
- Agent markdown files

### 10. Tool Permission System
OpenCode has granular tool permissions:

| Permission | Behavior |
|------------|----------|
| `allow` | Tool runs automatically |
| `ask` | Requires user confirmation |
| `deny` | Tool is disabled |
| Pattern matching | `bash: "pnpm test*": allow` |

**Your spec**: No permission system designed

### 11. AGENTS.md Support
Both OpenCode and ACP agents support AGENTS.md:

- Project-specific agent instructions
- Automatically loaded into context
- Standard location convention
- **Your spec**: Not mentioned

---

## 🔵 Additional Features to Consider

### 12. Authentication Methods (from ACP)
ACP supports various auth methods:

```json
{
  "authMethods": [
    { "id": "api-key", "type": "apiKey" },
    { "id": "oauth", "type": "oauth" }
  ]
}
```

### 13. Model Selection (from ACP/OpenCode)
Dynamic model switching within sessions:

- `session/setModel` method
- Model list discovery
- Reasoning effort control (for reasoning models)
- Provider-specific parameters

### 14. Web Server Mode (from TOAD)
Original TOAD can run as a web application:

```bash
toad web   # Serve TUI via browser
```

### 15. Agent Discovery & Installation (from TOAD)
Original TOAD has agent lifecycle management:

- Scan PATH for ACP-compatible agents
- Built-in agent installation
- Agent registry management
- **Your spec**: Explicitly deferred

---

## Summary: Feature Gap Matrix

| Category | Original TOAD | ACP Protocol | OpenCode | Your Spec |
|----------|---------------|--------------|----------|-----------|
| **Protocol** | ACP (stdio) | Full spec | SDK + MCP | SDK only |
| **Multi-agent** | ✅ Registry | ✅ External | ✅ Primary+Sub | ⚠️ Providers only |
| **Tool calls** | ✅ Full | ✅ Full | ✅ Full | ⏳ Deferred |
| **Permissions** | ⚠️ Basic | ✅ Approval flow | ✅ Granular | ❌ None |
| **Session modes** | ✅ | ✅ | ✅ | ❌ |
| **Slash commands** | ✅ | ✅ | ✅ | ❌ |
| **MCP integration** | ✅ | ✅ | ✅ | ❌ |
| **Subagents** | ❌ | ❌ | ✅ | ❌ |
| **Rich content** | ✅ | ✅ | ✅ | ⚠️ Text only |
| **Persistence** | ❌ | ⚠️ Optional | ✅ | ✅ |

---

## Recommended Prioritization

### Phase 1 (MVP) - Keep as-is
Your current MVP scope is reasonable for a first release.

### Phase 2 - Add These First
1. **Tool call system** with approval flow
2. **File system operations** (`fs/read`, `fs/write`)
3. **Terminal integration** (shell commands)
4. **Session modes** (read-only, auto, full-access)

### Phase 3 - ACP Compatibility
1. **ACP client implementation** (JSON-RPC over stdio)
2. **Capability negotiation**
3. **Slash command support**
4. **MCP server integration**

### Phase 4 - Advanced Features
1. **Subagent system** (if differentiating from OpenCode)
2. **Agent Plan feature**
3. **Rich content types** (images, audio)
4. **Web server mode**

---

## Key Architectural Decision

Your spec makes a deliberate trade-off:

> **SDK-first vs ACP-first**

| Approach | Pros | Cons |
|----------|------|------|
| **SDK-first** (your spec) | Simpler, faster MVP, direct API access | Not interoperable with ACP agents |
| **ACP-first** (original TOAD) | Universal agent support | More complex, requires process management |

Consider: Will you eventually support ACP? If yes, designing the abstraction layer now (even if not implementing ACP) would reduce future refactoring.

```typescript
// Suggested abstraction for future ACP support
interface AgentConnection {
  initialize(): Promise<Capabilities>;
  createSession(config: SessionConfig): Promise<Session>;
  sendPrompt(sessionId: string, content: Content[]): AsyncGenerator<Update>;
  cancelPrompt(sessionId: string): Promise<void>;
}

// Current: SDKAgentConnection (Claude, OpenAI)
// Future: ACPAgentConnection (stdio JSON-RPC)
```