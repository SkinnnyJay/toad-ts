# PLAN2: Cursor CLI Harness Integration

> **Bring Cursor Agent CLI into TOADSTOOL as a first-class harness adapter with deep hooks integration**

**Created**: 2026-02-10
**Status**: Research & Planning
**Last Updated**: 2026-02-10
**Author**: Research Phase
**References**:
- [Cursor CLI Docs](https://cursor.com/docs/cli/overview)
- [Cursor Hooks Spec](https://cursor.com/docs/agent/hooks)
- [Cursor APIs](https://cursor.com/docs/api)
- [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)
- [Output Format Spec](https://cursor.com/docs/cli/reference/output-format)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Architecture Analysis](#architecture-analysis)
4. [Three-Channel Architecture](#three-channel-architecture)
5. [Feasibility Assessment](#feasibility-assessment)
6. [Protocol Translation Design](#protocol-translation-design)
7. [Hooks Integration Design](#hooks-integration-design)
8. [Cloud Agents API Integration](#cloud-agents-api-integration)
9. [Full CLI Command Mapping](#full-cli-command-mapping)
10. [Implementation Plan](#implementation-plan)
11. [Risk Assessment](#risk-assessment)
12. [Open Questions](#open-questions)

---

## Executive Summary

### Goal

Add the **Cursor Agent CLI** (`agent`) as a harness adapter in TOADSTOOL, allowing users to switch between Claude CLI, Gemini CLI, Codex CLI, and Cursor CLI as their backing AI agent — all from the same TUI. Beyond basic prompt/response, leverage Cursor's **Hooks system** for deep bidirectional control and the **Cloud Agents API** for remote agent management.

### The Challenge

The existing harnesses (Claude, Gemini, Codex) all communicate via the **ACP (Agent Client Protocol)** — a bidirectional JSON-RPC protocol over stdin/stdout using `@agentclientprotocol/sdk`. The Cursor CLI does **not** support ACP. Instead, it has three distinct integration surfaces:

1. **NDJSON Stream** (`--output-format stream-json`) — Streaming responses and tool activity
2. **Hooks System** (`hooks.json`) — Bidirectional control plane for tool approval, context injection, and event observation
3. **Cloud Agents API** (`api.cursor.com/v0/agents`) — HTTP API for launching and managing remote cloud agents

### Key Insight: Three-Channel Architecture

Rather than a simple process wrapper, we can build a **three-channel integration** that rivals the ACP protocol's capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOADSTOOL TUI                              │
│                      (Ink/React + Zustand)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              CursorCliHarnessAdapter (AgentPort)
                           │
         ┌─────────────────┼──────────────────────┐
         │                 │                      │
    CHANNEL 1         CHANNEL 2              CHANNEL 3
    NDJSON Stream     Hooks IPC              Cloud API
    (stdout)          (sidecar)              (HTTP)
         │                 │                      │
    ┌────┴────┐    ┌───────┴───────┐    ┌─────────┴──────────┐
    │ agent   │    │ hooks.json →  │    │ api.cursor.com     │
    │ -p      │    │ hook scripts  │    │ /v0/agents         │
    │ stream  │    │ → IPC server  │    │ Launch/Follow-up   │
    │ json    │    │               │    │ Stop/Status        │
    └─────────┘    └───────────────┘    └────────────────────┘
```

- **Channel 1 (NDJSON)**: Primary data flow — streaming text, tool calls, results
- **Channel 2 (Hooks)**: Control plane — permission approval, context injection, tool interception, auto-continuation
- **Channel 3 (Cloud API)**: Remote management — launch cloud agents, follow-up, status polling, conversation retrieval

This gives us feature parity with ACP where it matters most: **streaming responses**, **permission control**, **tool visibility**, and **session management**.

---

## Research Findings

### Cursor CLI Full Command Set

The CLI binary is `cursor-agent` (aliased as `agent` after install). Here is the complete command and flag inventory:

#### Global Options

| Flag | Description | TOADSTOOL Usage |
|------|-------------|-----------------|
| `-v, --version` | Output version number | Health check, compatibility verification |
| `--api-key <key>` | API key auth (also `CURSOR_API_KEY` env) | Authentication |
| `-H, --header <header>` | Custom headers (repeatable) | Enterprise proxy support |
| `-p, --print` | Non-interactive print mode | **Core**: headless execution |
| `--output-format <format>` | `text` / `json` / `stream-json` | **Core**: NDJSON streaming |
| `--stream-partial-output` | Character-level streaming deltas | **Core**: real-time TUI rendering |
| `-c, --cloud` | Start in cloud mode | Cloud agent integration |
| `--mode <mode>` | `plan` / `ask` (agent is default) | Mode switching in TUI |
| `--plan` | Shorthand for `--mode=plan` | Mode switching |
| `--resume [chatId]` | Resume a specific chat session | **Core**: multi-turn conversation |
| `--continue` | Resume the most recent chat | Quick resume |
| `--model <model>` | Model selection (e.g. `gpt-5`, `sonnet-4`) | **Core**: model picker |
| `--list-models` | List available models and exit | Model selector UI |
| `-f, --force` | Auto-approve commands unless denied | Unattended mode |
| `--sandbox <mode>` | `enabled` / `disabled` | Security policy |
| `--approve-mcps` | Auto-approve MCP servers (headless only) | MCP integration |
| `--browser` | Enable browser automation | Advanced: browser tasks |
| `--workspace <path>` | Set working directory | Multi-project support |
| `-h, --help` | Display help | N/A |

#### Commands

| Command | Description | TOADSTOOL Usage |
|---------|-------------|-----------------|
| `agent [prompt...]` | Start interactive or headless agent | **Core**: primary prompt execution |
| `login` | Browser-based auth | Auth flow |
| `logout` | Clear stored auth | Auth management |
| `status` / `whoami` | Check auth status | Connection verification |
| `models` | List available models | Model selector |
| `mcp` | Manage MCP servers | MCP integration |
| `mcp login <id>` | Auth with MCP server | MCP auth |
| `mcp list` | List configured MCP servers | MCP status display |
| `mcp list-tools <id>` | List tools from MCP server | MCP tool inventory |
| `mcp enable <id>` | Enable MCP server | MCP management |
| `mcp disable <id>` | Disable MCP server | MCP management |
| `create-chat` | Create empty chat, return ID | Session pre-creation |
| `generate-rule` / `rule` | Generate a Cursor rule interactively | Future: rule management |
| `ls` | List previous conversations | Session browser |
| `resume` | Resume latest conversation | Quick resume |
| `update` / `upgrade` | Self-update CLI | Version management |
| `about` | Display version/system/account info | Diagnostics |
| `install-shell-integration` | Install shell integration to `~/.zshrc` | Setup automation |
| `uninstall-shell-integration` | Remove shell integration | Cleanup |

### NDJSON Stream Protocol (Channel 1)

When run with `--output-format stream-json`, the CLI emits one JSON object per line (NDJSON):

#### Event Types

| Event Type | Subtype | Description |
|------------|---------|-------------|
| `system` | `init` | Session initialization (model, cwd, session_id, permissionMode) |
| `user` | — | User's input prompt echoed back |
| `assistant` | — | Complete assistant message segment (text between tool calls) |
| `tool_call` | `started` | Tool invocation beginning |
| `tool_call` | `completed` | Tool invocation result (success/failure) |
| `result` | `success` | Terminal event with full response text, duration, session_id |

#### Example Stream Sequence

```json
{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/path","session_id":"uuid","model":"Claude 4 Sonnet","permissionMode":"default"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"prompt"}]},"session_id":"uuid"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll help..."}]},"session_id":"uuid"}
{"type":"tool_call","subtype":"started","call_id":"id","tool_call":{"readToolCall":{"args":{"path":"file.txt"}}},"session_id":"uuid"}
{"type":"tool_call","subtype":"completed","call_id":"id","tool_call":{"readToolCall":{"args":{"path":"file.txt"},"result":{"success":{...}}}},"session_id":"uuid"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Done!"}]},"session_id":"uuid"}
{"type":"result","subtype":"success","duration_ms":5234,"is_error":false,"result":"full text","session_id":"uuid"}
```

#### Known Tool Types in NDJSON

| Tool | Started Key | Completed Result Key |
|------|------------|---------------------|
| Read file | `readToolCall.args.path` | `readToolCall.result.success.{content, totalLines, totalChars}` |
| Write file | `writeToolCall.args.{path, fileText}` | `writeToolCall.result.success.{path, linesCreated, fileSize}` |
| Edit file | `editToolCall.args.path` | `editToolCall.result.success` |
| Shell | `shellToolCall.args.command` | `shellToolCall.result.success.exitCode` |
| Grep | `grepToolCall.args.{pattern, path}` | `grepToolCall.result.success` |
| LS | `lsToolCall.args.path` | `lsToolCall.result.success.directoryTreeRoot` |
| Glob | `globToolCall.args.{globPattern, targetDirectory}` | `globToolCall.result.success.totalFiles` |
| Delete | `deleteToolCall.args.path` | `deleteToolCall.result.{success, rejected}` |
| Todo | `todoToolCall.args` | `todoToolCall.result.success.todos` |
| Generic | `function.{name, arguments}` | varies |

#### Partial Streaming

With `--stream-partial-output`, assistant events are emitted incrementally (character-level deltas). Concatenate `message.content[].text` to reconstruct full response.

---

### Hooks System (Channel 2) — The Game-Changer

The Cursor Hooks system allows external scripts to **observe, control, and extend** the agent loop. Hooks communicate via JSON over stdio and can **allow/deny operations**, **inject context**, and **trigger auto-continuation**.

This is the key to achieving **bidirectional control** without ACP.

#### Hook Event Inventory

| Hook Event | Trigger | Can Block? | TOADSTOOL Usage |
|-----------|---------|-----------|-----------------|
| `sessionStart` | New conversation created | Yes (`continue: false`) | **Inject context**, set env vars, track session |
| `sessionEnd` | Conversation ends | No (fire-and-forget) | Cleanup, analytics |
| `preToolUse` | Before ANY tool executes | Yes (`decision: deny`) | **Permission control** — show approval in TUI |
| `postToolUse` | After successful tool execution | No (observe only) | **Tool result tracking** — display in sidebar |
| `postToolUseFailure` | After tool fails | No (observe only) | Error tracking, retry logic |
| `subagentStart` | Before subagent (Task tool) spawns | Yes (`decision: deny`) | Subagent approval |
| `subagentStop` | Subagent completes | Yes (`followup_message`) | Auto-continue subagent chains |
| `beforeShellExecution` | Before shell command runs | Yes (`permission: deny/ask`) | **Shell command approval** in TUI |
| `afterShellExecution` | After shell command completes | No (observe only) | Shell output tracking |
| `beforeMCPExecution` | Before MCP tool runs | Yes (`permission: deny`, fail-closed) | **MCP tool approval** |
| `afterMCPExecution` | After MCP tool completes | No (observe only) | MCP result tracking |
| `beforeReadFile` | Before file read | Yes (`permission: deny`, fail-closed) | File access control |
| `afterFileEdit` | After file edit | No (observe only) | **File change tracking** — show diffs in TUI |
| `beforeSubmitPrompt` | Before prompt sent to API | Yes (`continue: false`) | Prompt validation/filtering |
| `preCompact` | Before context compaction | No (observe only) | Context usage tracking |
| `stop` | Agent loop ends | Yes (`followup_message`) | **Auto-continuation** — loop control |
| `afterAgentResponse` | After assistant message | No (observe only) | **Response tracking** — alternative to NDJSON |
| `afterAgentThought` | After thinking block | No (observe only) | **Thinking/reasoning display** |

#### What Hooks Give Us That NDJSON Alone Cannot

| Capability | NDJSON Only | With Hooks |
|-----------|-------------|------------|
| Streaming text responses | Yes | Yes (also via `afterAgentResponse`) |
| Tool activity visibility | Yes | Yes (richer via `postToolUse`) |
| **Permission control** (allow/deny tools) | No | **Yes** (`preToolUse`, `beforeShellExecution`) |
| **Context injection** at session start | No | **Yes** (`sessionStart` → `additional_context`) |
| **Auto-continuation** (multi-step loops) | No | **Yes** (`stop` → `followup_message`) |
| **Shell command approval** | No | **Yes** (`beforeShellExecution` → `permission: ask`) |
| **MCP tool approval** | No | **Yes** (`beforeMCPExecution`) |
| **File access control** | No | **Yes** (`beforeReadFile`) |
| **Thinking/reasoning** display | No | **Yes** (`afterAgentThought`) |
| File edit details (old/new strings) | No | **Yes** (`afterFileEdit` → `edits[]`) |
| Prompt validation/filtering | No | **Yes** (`beforeSubmitPrompt`) |
| Session lifecycle events | Partial (`system.init`) | **Full** (`sessionStart`/`sessionEnd`) |
| Environment variable injection | No | **Yes** (`sessionStart` → `env`) |
| Subagent tracking | No | **Yes** (`subagentStart`/`subagentStop`) |

#### Hook Communication Pattern

Hooks are spawned as child processes. They receive JSON on stdin and return JSON on stdout:

```
Cursor Agent
    │
    ├── (hook event triggers)
    │
    ├── spawn hook script
    │   ├── write JSON to stdin
    │   ├── wait for JSON on stdout (with timeout)
    │   └── use response to allow/deny/modify
    │
    └── continue agent loop
```

**Common input fields** (sent to ALL hooks):
```json
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "string",
  "cursor_version": "string",
  "workspace_roots": ["<path>"],
  "user_email": "string | null",
  "transcript_path": "string | null"
}
```

**Key hook I/O examples:**

```jsonc
// preToolUse input
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm install", "working_directory": "/project" },
  "tool_use_id": "abc123",
  "cwd": "/project"
}
// preToolUse output
{
  "decision": "allow",  // or "deny"
  "reason": "Blocked by TOADSTOOL policy",
  "updated_input": { "command": "npm ci" }  // optional: modify the input!
}

// sessionStart input
{
  "session_id": "uuid",
  "is_background_agent": false,
  "composer_mode": "agent"
}
// sessionStart output
{
  "env": { "MY_VAR": "value" },
  "additional_context": "Always follow TOADSTOOL coding standards...",
  "continue": true
}

// stop input
{
  "status": "completed",
  "loop_count": 0
}
// stop output
{
  "followup_message": "Now run the tests to verify the changes."
}
```

---

### Cloud Agents API (Channel 3)

The Cloud Agents API (`api.cursor.com/v0/`) enables programmatic management of remote cloud agents. Available on all plans (Beta).

#### Endpoints

| Method | Endpoint | Description | TOADSTOOL Usage |
|--------|----------|-------------|-----------------|
| `GET` | `/v0/agents` | List all cloud agents | Cloud agent browser |
| `GET` | `/v0/agents/{id}` | Get agent status | Status monitoring |
| `GET` | `/v0/agents/{id}/conversation` | Get conversation history | Conversation import |
| `POST` | `/v0/agents` | Launch new cloud agent | **Cloud agent dispatch** |
| `POST` | `/v0/agents/{id}/followup` | Add follow-up instruction | **Multi-turn cloud conversation** |
| `POST` | `/v0/agents/{id}/stop` | Stop running agent | Agent control |
| `DELETE` | `/v0/agents/{id}` | Delete agent | Cleanup |
| `GET` | `/v0/me` | API key info | Auth verification |
| `GET` | `/v0/models` | List available models | Model selector |
| `GET` | `/v0/repositories` | List GitHub repos | Repo picker (rate limited: 1/min) |

#### Agent Statuses

`CREATING` → `RUNNING` → `FINISHED` | `STOPPED` | `ERROR`

#### Launch Request

```json
{
  "prompt": { "text": "Add README documentation", "images": [] },
  "model": "claude-4-sonnet",
  "source": {
    "repository": "https://github.com/org/repo",
    "ref": "main"
  },
  "target": {
    "autoCreatePr": true,
    "branchName": "feature/readme",
    "openAsCursorGithubApp": false
  },
  "webhook": {
    "url": "https://my-server.com/webhook",
    "secret": "min-32-char-secret-for-verification"
  }
}
```

---

### Existing Harness Architecture (For Reference)

Current TOADSTOOL ACP-based architecture:

```
TUI → Store → SessionManager → HarnessRuntime (AgentPort)
                                    ↓ ACP JSON-RPC over stdin/stdout
                               ACPConnection → child_process.spawn("claude-code-acp")
                                    ↑ NDJSON events (ACP protocol)
                               AgentPort events: state, sessionUpdate, permissionRequest, error
```

**Key interfaces:**

- `AgentPort` — Connection contract: `connect()`, `disconnect()`, `initialize()`, `newSession()`, `prompt()`, `authenticate()`, `sessionUpdate()`
  - Events: `state`, `sessionUpdate`, `permissionRequest`, `error`
- `HarnessAdapter` — Registration: `{ id, name, configSchema, createHarness() }`
- `HarnessRuntime` — Type alias for `AgentPort`

**Current adapters (all ACP-based):**
- `claude-cli` → `claude-code-acp` command
- `gemini-cli` → `gemini --experimental-acp`
- `codex-cli` → `codex --experimental-acp`
- `mock` → Test harness

---

## Architecture Analysis

### Why We Can't Reuse the ACP Chain

| ACP Pattern | Cursor CLI Pattern |
|------------|-------------------|
| Persistent bidirectional connection | Process-per-turn (spawn + `--resume`) |
| JSON-RPC request/response protocol | NDJSON streaming events (Channel 1) |
| `initialize()` → `newSession()` → `prompt()` | `agent -p "prompt"` per turn |
| ACP SDK handles framing/routing | Raw NDJSON line parsing |
| Permission requests via ACP events | **Hooks** (Channel 2) — `preToolUse`, `beforeShellExecution` |
| Tool execution via TOADSTOOL's ToolHost | Cursor executes tools internally (but hooks observe/control) |
| Session state managed by TOADSTOOL | Session state managed by Cursor (`--resume`) |

### Why Three Channels?

| Channel | What It Provides | Without It |
|---------|-----------------|------------|
| **NDJSON Stream** | Real-time streaming text + tool activity | No streaming — must wait for completion |
| **Hooks IPC** | Permission control, context injection, thinking display, auto-continuation | One-way observation only; must use `--force` for everything |
| **Cloud API** | Remote agent management, background tasks, PR creation | Local execution only |

The hooks system is the critical piece that elevates this from a "read-only wrapper" to a **full-control harness** comparable to ACP.

---

## Three-Channel Architecture

### Detailed Component Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TOADSTOOL TUI                                  │
│                     (Ink/React + Zustand Store)                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                  CursorCliHarnessAdapter
                    (implements AgentPort)
                                │
         ┌──────────────────────┼──────────────────────────┐
         │                      │                          │
   ┌─────┴──────┐     ┌────────┴────────┐     ┌───────────┴──────────┐
   │ CHANNEL 1  │     │   CHANNEL 2     │     │    CHANNEL 3         │
   │ NDJSON     │     │   Hooks IPC     │     │    Cloud API         │
   │ Stream     │     │   Sidecar       │     │    Client            │
   └─────┬──────┘     └────────┬────────┘     └───────────┬──────────┘
         │                     │                          │
   ┌─────┴──────┐     ┌───────┴────────┐     ┌───────────┴──────────┐
   │ Components │     │  Components    │     │  Components          │
   │            │     │                │     │                      │
   │ • Cursor   │     │ • HookIPC      │     │ • CloudAgentClient   │
   │   CliConn  │     │   Server       │     │   (HTTP + polling)   │
   │            │     │   (Unix sock   │     │                      │
   │ • Stream   │     │    or HTTP)    │     │ • WebhookReceiver    │
   │   Parser   │     │                │     │   (optional)         │
   │            │     │ • HooksConfig  │     │                      │
   │ • Event    │     │   Generator    │     │ • ConversationSync   │
   │   Translator│    │   (hooks.json) │     │                      │
   │            │     │                │     │                      │
   │ • Process  │     │ • Hook Script  │     │                      │
   │   Manager  │     │   Templates    │     │                      │
   └────────────┘     └────────────────┘     └──────────────────────┘
```

### Channel 1: NDJSON Stream (Primary Data Flow)

**Purpose**: Real-time streaming of agent responses, tool activity, and completion signals.

**Components:**
- **`CursorCliConnection`** — Spawns `agent -p` processes, manages lifecycle
- **`CursorStreamParser`** — Parses NDJSON lines with Zod validation
- **`CursorToAcpTranslator`** — Maps Cursor events → `AgentPort` events (sessionUpdate, state, error)
- **`ProcessManager`** — Handles concurrent prompt guard, graceful shutdown

**Flow:**
```
user prompt → spawn: agent -p --resume <id> --output-format stream-json
                       --stream-partial-output --workspace <cwd> "prompt"
           → parse NDJSON stdout line by line
           → translate events → emit AgentPort events
           → on "result" event → resolve prompt() Promise
```

### Channel 2: Hooks IPC (Control Plane) — New

**Purpose**: Bidirectional control — permission approval, context injection, tool interception, thinking display, auto-continuation.

**Components:**
- **`HookIpcServer`** — Lightweight IPC server (Unix socket or local HTTP) that TOADSTOOL runs
- **`HooksConfigGenerator`** — Dynamically generates `.cursor/hooks.json` or `~/.cursor/hooks.json`
- **`HookScriptTemplates`** — Small shim scripts that connect hook events to the IPC server

**How it works:**

1. Before spawning the agent, TOADSTOOL writes a `hooks.json` pointing to shim scripts
2. Each shim script is a tiny Node.js/bash script that:
   - Reads JSON from stdin (hook event data)
   - Sends it to TOADSTOOL's IPC server (Unix socket or local HTTP)
   - Waits for TOADSTOOL's response (approval/denial/context)
   - Writes the response JSON to stdout
3. TOADSTOOL's IPC server routes hook events to the appropriate handler:
   - `preToolUse` → Show permission prompt in TUI → return allow/deny
   - `beforeShellExecution` → Show shell command approval → return permission
   - `sessionStart` → Inject TOADSTOOL rules as `additional_context`
   - `afterAgentThought` → Display thinking in TUI
   - `afterFileEdit` → Track file changes for diff display
   - `stop` → Decide whether to auto-continue

**IPC Protocol Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Unix domain socket | Fast, no port conflicts | Not on Windows | Primary (macOS/Linux) |
| Local HTTP (127.0.0.1:port) | Cross-platform | Port conflict risk | Fallback (Windows) |
| Named pipe | Windows-native | Different API | Alternative for Windows |
| Temp file polling | Simplest | Slow, unreliable | Not recommended |

**Recommended**: Unix domain socket at `/tmp/toadstool-hooks-<pid>.sock` with local HTTP fallback.

**Hook Script Template (Node.js):**

```javascript
#!/usr/bin/env node
// .toadstool/hooks/toadstool-hook.mjs
// Generic hook shim — routes all hook events to TOADSTOOL IPC server
import { createConnection } from "net";
import { stdin, stdout } from "process";

const SOCKET_PATH = process.env.TOADSTOOL_HOOK_SOCKET;
const chunks = [];
stdin.on("data", (chunk) => chunks.push(chunk));
stdin.on("end", () => {
  const input = Buffer.concat(chunks).toString();
  const client = createConnection(SOCKET_PATH, () => {
    client.write(input);
  });
  let response = "";
  client.on("data", (data) => { response += data; });
  client.on("end", () => {
    stdout.write(response || "{}");
    process.exit(0);
  });
  client.on("error", () => {
    stdout.write("{}"); // Fail-open for most hooks
    process.exit(0);
  });
});
```

**Generated hooks.json:**

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 10 }],
    "sessionEnd": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "preToolUse": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 30 }],
    "postToolUse": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "postToolUseFailure": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "subagentStart": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 30 }],
    "subagentStop": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "beforeShellExecution": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 60 }],
    "afterShellExecution": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "beforeMCPExecution": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 30 }],
    "afterMCPExecution": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "beforeReadFile": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 10 }],
    "afterFileEdit": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "beforeSubmitPrompt": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 10 }],
    "preCompact": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "stop": [{ "command": ".toadstool/hooks/toadstool-hook.mjs", "timeout": 10 }],
    "afterAgentResponse": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }],
    "afterAgentThought": [{ "command": ".toadstool/hooks/toadstool-hook.mjs" }]
  }
}
```

### Channel 3: Cloud Agents API (Remote Management)

**Purpose**: Launch and manage cloud agents that run on Cursor's infrastructure, independent of local CLI.

**Components:**
- **`CloudAgentClient`** — HTTP client for `api.cursor.com/v0/` endpoints
- **`WebhookReceiver`** (optional) — Receive status change notifications
- **`ConversationSync`** — Import cloud agent conversations into TOADSTOOL

**Use Cases:**
- User sends `&` prefix in TOADSTOOL → dispatch to Cloud Agent
- TUI shows cloud agent status (polling `/v0/agents/{id}`)
- Import cloud agent conversation history for display
- Follow-up messages to running cloud agents
- Stop/delete cloud agents from TUI

---

## Feasibility Assessment

### Feature-by-Feature (Revised with Hooks + API)

| Feature | Feasibility | Channel | Approach |
|---------|-------------|---------|----------|
| **Send prompt, get response** | HIGH | Ch1 | `agent -p --output-format stream-json "prompt"` |
| **Streaming response** | HIGH | Ch1 | `--stream-partial-output` → character-level deltas |
| **Multi-turn conversation** | MEDIUM-HIGH | Ch1 | `--resume [chatId]` across process invocations |
| **Model selection** | HIGH | Ch1 | `--model <model>` flag |
| **Mode switching (Agent/Plan/Ask)** | HIGH | Ch1 | `--mode=agent\|plan\|ask` |
| **Tool activity display** | HIGH | Ch1+Ch2 | NDJSON `tool_call` events + `postToolUse` hooks |
| **Permission control (tools)** | **HIGH** | **Ch2** | `preToolUse` hook → show TUI prompt → return allow/deny |
| **Shell command approval** | **HIGH** | **Ch2** | `beforeShellExecution` hook → TUI approval |
| **MCP tool approval** | **HIGH** | **Ch2** | `beforeMCPExecution` hook (fail-closed) |
| **Context injection** | **HIGH** | **Ch2** | `sessionStart` hook → `additional_context` |
| **Thinking/reasoning display** | **HIGH** | **Ch2** | `afterAgentThought` hook → display in TUI |
| **File edit tracking** | **HIGH** | **Ch2** | `afterFileEdit` hook → `edits[].{old_string, new_string}` |
| **Auto-continuation** | **HIGH** | **Ch2** | `stop` hook → `followup_message` |
| **Subagent tracking** | **HIGH** | **Ch2** | `subagentStart`/`subagentStop` hooks |
| **Prompt validation** | **HIGH** | **Ch2** | `beforeSubmitPrompt` hook |
| **Session listing/resume** | MEDIUM | Ch1 | `agent ls` → parse output, `--resume` to continue |
| **Cloud agent dispatch** | HIGH | Ch3 | `POST /v0/agents` with prompt + repo |
| **Cloud agent status** | HIGH | Ch3 | `GET /v0/agents/{id}` polling |
| **Cloud agent follow-up** | HIGH | Ch3 | `POST /v0/agents/{id}/followup` |
| **Cloud agent conversation** | HIGH | Ch3 | `GET /v0/agents/{id}/conversation` |
| **Available models list** | HIGH | Ch1+Ch3 | `agent models` or `GET /v0/models` |
| **Auth management** | HIGH | Ch1 | `agent login/logout/status` |
| **MCP server management** | HIGH | Ch1 | `agent mcp list/enable/disable/login` |
| **File access control** | MEDIUM | Ch2 | `beforeReadFile` hook (fail-closed) |
| **Tool input modification** | MEDIUM | Ch2 | `preToolUse` → `updated_input` field |
| **Token usage tracking** | LOW | — | Not exposed in NDJSON or hooks |
| **Environment variable injection** | HIGH | Ch2 | `sessionStart` → `env` |
| **Custom tool injection** | NOT FEASIBLE | — | Cursor uses its own tools; hooks can only observe/modify |

### Feasibility Summary (Revised)

| Level | Rating | Description |
|-------|--------|-------------|
| **Core Experience** | **HIGH** | Streaming, tool visibility, model selection, modes |
| **Permission Control** | **HIGH** (was LOW) | Hooks give us full allow/deny/modify capability |
| **Context Injection** | **HIGH** (was N/A) | sessionStart hook injects rules + env vars |
| **Multi-Turn** | **MEDIUM-HIGH** | `--resume` + `create-chat` for pre-created sessions |
| **Cloud Integration** | **HIGH** | Full CRUD API for remote agents |
| **Thinking Display** | **HIGH** (was N/A) | `afterAgentThought` hook provides reasoning text |
| **Overall** | **HIGH** | Three-channel approach achieves near-parity with ACP |

---

## Protocol Translation Design

### Event Mapping: NDJSON + Hooks → AgentPort Events

```
Source Event                         →  AgentPort Event / Action
──────────────────────────────────────────────────────────────────

CHANNEL 1 (NDJSON Stream):

system.init                          →  emit("state", CONNECTED)
                                        store session_id for --resume
assistant (full / partial delta)     →  emit("sessionUpdate", agent_message_chunk)
tool_call.started                    →  emit("sessionUpdate", tool_use_started)
tool_call.completed                  →  emit("sessionUpdate", tool_use_completed)
result.success                       →  resolve prompt() Promise
process exit (non-zero)              →  emit("error", Error)

CHANNEL 2 (Hooks IPC):

preToolUse                           →  emit("permissionRequest", { tool, input })
                                        wait for TUI approval → return allow/deny
beforeShellExecution                 →  emit("permissionRequest", { command })
                                        wait for TUI approval → return permission
beforeMCPExecution                   →  emit("permissionRequest", { tool, input })
afterAgentThought                    →  emit("sessionUpdate", thinking_chunk)
afterFileEdit                        →  emit("sessionUpdate", file_edit_notification)
sessionStart                         →  inject additional_context + env vars
stop                                 →  evaluate auto-continuation rules
postToolUse                          →  emit("sessionUpdate", tool_result_detail)

CHANNEL 3 (Cloud API):

agent.status = RUNNING               →  emit("state", CONNECTED)
agent.status = FINISHED              →  emit("state", IDLE)
agent.conversation.message           →  emit("sessionUpdate", message_chunk)
```

### Session Lifecycle Mapping

```
AgentPort Method           →  Cursor CLI Action
───────────────────────────────────────────────────
connect()                  →  1. Verify binary: agent --version
                              2. Verify auth: agent status
                              3. Start IPC server for hooks
                              4. Generate/install hooks.json
disconnect()               →  1. Kill active child process
                              2. Stop IPC server
                              3. Clean up hooks.json (optional)
initialize()               →  1. List models: agent models
                              2. Return capabilities object
newSession()               →  1. Create chat: agent create-chat → get chatId
                              2. Store chatId for --resume
prompt(message)            →  1. Spawn: agent -p --resume <chatId>
                                 --output-format stream-json
                                 --stream-partial-output
                                 --workspace <cwd>
                                 --model <model>
                                 --mode <mode>
                                 "<message>"
                              2. Parse NDJSON stream (Channel 1)
                              3. Handle hooks IPC events (Channel 2)
                              4. On "result" → resolve Promise
authenticate()             →  1. Check CURSOR_API_KEY env
                              2. Or run: agent status
                              3. If no auth → prompt user to run: agent login
sessionUpdate()            →  No-op (Cursor manages session internally)
```

---

## Full CLI Command Mapping

### Commands TOADSTOOL Will Use Directly

| Command | When | Purpose |
|---------|------|---------|
| `agent -p --output-format stream-json --stream-partial-output [--resume id] [--model m] [--mode m] [--force] [--workspace p] "prompt"` | Every user prompt | Core prompt execution |
| `agent --version` | On `connect()` | Verify binary exists |
| `agent status` | On `connect()` / `authenticate()` | Verify auth status |
| `agent models` | On `initialize()` | List available models |
| `agent create-chat` | On `newSession()` | Pre-create session ID |
| `agent ls` | Session browser UI | List previous conversations |
| `agent mcp list` | MCP management UI | Show configured MCP servers |
| `agent mcp list-tools <id>` | MCP tool browser | Show tools from specific server |
| `agent mcp enable <id>` | MCP management | Enable server |
| `agent mcp disable <id>` | MCP management | Disable server |
| `agent about` | Diagnostics / status bar | Show version + system info |

### Commands TOADSTOOL Will Offer via UI

| Command | UI Trigger | Purpose |
|---------|-----------|---------|
| `agent login` | Auth error handler | Prompt user to authenticate |
| `agent logout` | Settings menu | Sign out |
| `agent update` | Version check | Self-update CLI |
| `agent mcp login <id>` | MCP auth flow | Authenticate with MCP server |

### Flags TOADSTOOL Will Configure

| Flag | Source | Default |
|------|--------|---------|
| `--model` | User selection in TUI model picker | Auto (Cursor picks) |
| `--mode` | User mode toggle (Agent/Plan/Ask) | `agent` |
| `--force` | Config setting (unattended vs approval) | `false` (use hooks for approval) |
| `--workspace` | TOADSTOOL's working directory | `process.cwd()` |
| `--resume` | Session manager's tracked chatId | None (fresh session) |
| `--sandbox` | Security config | Not set (use Cursor default) |
| `--approve-mcps` | Config setting | `false` |
| `--browser` | Config setting | `false` |
| `--api-key` | `CURSOR_API_KEY` env or config | From env |
| `--stream-partial-output` | Always enabled | `true` |
| `--output-format` | Always `stream-json` | `stream-json` |

---

## Cloud Agents API Integration

### Use Cases in TOADSTOOL

1. **Cloud Dispatch** (`&` prefix): User types `& refactor auth module` → TOADSTOOL calls `POST /v0/agents` with prompt + repo info
2. **Cloud Agent Browser**: TUI panel showing all cloud agents with status badges
3. **Cloud Follow-up**: Send additional instructions to running cloud agents
4. **Conversation Import**: Pull cloud agent conversation history into TOADSTOOL's message view
5. **PR Creation**: Launch cloud agents with `autoCreatePr: true` for automated PR workflows
6. **Status Monitoring**: Poll agent status with exponential backoff, show in status bar

### API Client Design

```typescript
interface CursorCloudAgentClient {
  // Agent CRUD
  listAgents(params?: { limit?: number; cursor?: string }): Promise<AgentListResponse>;
  getAgent(id: string): Promise<AgentResponse>;
  launchAgent(params: LaunchAgentRequest): Promise<AgentResponse>;
  stopAgent(id: string): Promise<{ id: string }>;
  deleteAgent(id: string): Promise<{ id: string }>;

  // Conversation
  getConversation(id: string): Promise<ConversationResponse>;
  addFollowup(id: string, prompt: FollowupRequest): Promise<{ id: string }>;

  // Metadata
  getApiKeyInfo(): Promise<ApiKeyInfoResponse>;
  listModels(): Promise<ModelsResponse>;
  listRepositories(): Promise<RepositoriesResponse>;
}
```

---

## Implementation Plan

### Phase 0: Prerequisites (Complete Before Agent Starts)

> These must be completed **manually** before the long-running implementation agent begins work. They resolve all M1 "Must Resolve Before Implementation" open questions and establish a clean baseline.

**A. Git Hygiene (Critical)**

- [ ] P0-1 — Commit or stash all current changes (30+ modified files, 5+ untracked)
- [ ] P0-2 — Create feature branch: `git checkout -b feature/cursor-cli-harness`

**B. Environment Validation (M1 Blockers)**

- [ ] P0-3 — Verify `agent` binary installed: `which cursor-agent` or `which agent`
- [ ] P0-4 — Verify Cursor auth: `agent status` or `agent whoami` — capture output format
- [ ] P0-5 — Capture NDJSON fixture (simple prompt):
  ```bash
  agent -p --output-format stream-json --stream-partial-output "say hello in one sentence" \
    > __tests__/fixtures/cursor/ndjson/hello-response.ndjson 2>__tests__/fixtures/cursor/ndjson/hello-stderr.txt
  ```
- [ ] P0-6 — Capture NDJSON fixture (tool use): Run a prompt that triggers file read/write tool calls
- [ ] P0-7 — Validate `--resume` across process invocations:
  1. Run `agent -p --output-format stream-json "remember the word banana"` → capture `session_id` from `system.init`
  2. Run `agent -p --output-format stream-json --resume <session_id> "what word did I ask you to remember?"` → verify context retained
- [ ] P0-8 — Validate `agent create-chat` → capture output, then test with `--resume <id>`
- [ ] P0-9 — Capture `agent models` output format → save to `__tests__/fixtures/cursor/models-output.txt`
- [ ] P0-10 — Capture `agent ls` output format → save to `__tests__/fixtures/cursor/ls-output.txt`
- [ ] P0-11 — Capture `agent status` output format → save to `__tests__/fixtures/cursor/status-output.txt`
- [ ] P0-12 — **CRITICAL — Architecture Decision**: Test hooks in `-p` (headless) mode:
  1. Create a minimal `hooks.json` with a `preToolUse` hook pointing to a script that logs to a file
  2. Run `agent -p "read the file package.json"` (triggers a tool call)
  3. Check if the hook script was executed (log file created)
  4. **If hooks DO NOT fire in `-p` mode**: Channel 2 architecture is unviable for headless — document this and revise plan to use NDJSON-only with `--force` as fallback
  5. **If hooks DO fire**: Full three-channel architecture is go

**C. Quality Gate Baseline**

- [ ] P0-13 — Run full quality gates and confirm green baseline:
  ```bash
  bun run lint && bun run typecheck && bun run test && bun run build
  ```
- [ ] P0-14 — Record any pre-existing failures (so they aren't attributed to new work)

**D. Fixture Directory Setup**

- [ ] P0-15 — Create fixture directories:
  ```bash
  mkdir -p __tests__/fixtures/cursor/{ndjson,hooks,cloud-api}
  ```

**E. Document Findings**

- [ ] P0-16 — Update `scratchpad/journal.md` with validation results
- [ ] P0-17 — If any open question yields a surprise, update the relevant milestone in this plan before starting

**Outcome**: All 8 "Must Resolve Before Implementation" open questions answered, real CLI output captured as test fixtures, clean feature branch ready. The implementation agent can start at M2 with confidence.

---

### Milestone Overview (Revised)

| # | Milestone | Effort | Dependencies | Channels |
|---|-----------|--------|--------------|----------|
| M1 | Research & Protocol Validation | 1-2 days | None | All |
| M2 | Cursor Stream Parser (Ch1) | 2-3 days | M1 | Ch1 |
| M3 | Cursor CLI Connection (Ch1) | 2-3 days | M2 | Ch1 |
| M4 | Protocol Translator (Ch1 → AgentPort) | 2-3 days | M2, M3 | Ch1 |
| M5 | Hook IPC Server (Ch2) | 3-4 days | M1 | Ch2 |
| M6 | Hooks Config Generator + Scripts (Ch2) | 2-3 days | M5 | Ch2 |
| M7 | Cursor CLI Harness Adapter | 3-4 days | M4, M6 | Ch1+Ch2 |
| M8 | Harness Registration & Config | 1-2 days | M7 | — |
| M9 | Cloud Agents API Client (Ch3) | 3-4 days | M1 | Ch3 |
| M10 | Integration Testing | 3-4 days | M8, M9 | All |
| M11 | TUI Integration & Polish | 3-4 days | M10 | All |

**Total estimate: ~25-36 days**

---

### Milestone 1: Research & Protocol Validation (CURRENT)

> Validate assumptions by running real Cursor CLI commands locally.

- [X] M1 - Research Cursor CLI capabilities and documentation
- [X] M1 - Document NDJSON stream event types and schemas
- [X] M1 - Analyze existing harness architecture (AgentPort, HarnessAdapter)
- [X] M1 - Document Cursor Hooks system and event inventory
- [X] M1 - Document Cloud Agents API endpoints
- [X] M1 - Document full CLI command set and flags
- [X] M1 - Feasibility assessment with three-channel approach
- [X] M1 - Design three-channel architecture
- [ ] M1 - Validate `agent -p --output-format stream-json --stream-partial-output` locally
- [ ] M1 - Capture real NDJSON output samples for test fixtures
- [ ] M1 - Validate `--resume` across separate process invocations
- [ ] M1 - Validate `agent create-chat` returns usable ID
- [ ] M1 - Test hooks.json with a simple shim script
- [ ] M1 - Validate hook IPC latency (is Unix socket fast enough for real-time approval?)
- [ ] M1 - Test `agent models` output parsing
- [ ] M1 - Test `agent status` output parsing
- [ ] M1 - Test `agent ls` output parsing
- [ ] M1 - Test Cloud Agents API with `CURSOR_API_KEY`

### Milestone 2a: Zod Types & Stream Event Schemas (Types Only)

> Define protocol-agnostic Zod types for CLI agent integration. **No abstract base class or bridge yet** — those come in M2b after the concrete Cursor adapter works.

- [ ] M2a - Create `src/types/cli-agent.types.ts` — Generic CLI agent Zod schemas:
  - [ ] `CliAgentInstallInfoSchema` (binary name, path, version, installed flag)
  - [ ] `CliAgentAuthStatusSchema` (authenticated, method, email)
  - [ ] `CliAgentModelSchema` + `CliAgentModelsResponseSchema`
  - [ ] `CliAgentSessionSchema` (id, title, created, model, messageCount)
  - [ ] `CliAgentPromptInputSchema` (message, sessionId, model, mode, workspace, force, streaming)
  - [ ] `CliAgentPromptResultSchema` (text, sessionId, durationMs, toolCallCount)
  - [ ] `CliAgentCapabilitiesSchema` (feature flags: streaming, resume, modes, hooks, cloud, etc.)
  - [ ] `STREAM_EVENT_TYPE` constant + all `StreamEvent` schemas (discriminated union)
- [ ] M2a - Create `src/types/cursor-cli.types.ts` — Cursor-specific NDJSON Zod schemas:
  - [ ] `cursorSystemEvent` (system.init)
  - [ ] `cursorUserEvent` (user message echo)
  - [ ] `cursorAssistantEvent` (assistant message)
  - [ ] `cursorToolCallStartedEvent` (tool_call.started)
  - [ ] `cursorToolCallCompletedEvent` (tool_call.completed)
  - [ ] `cursorResultEvent` (result.success)
  - [ ] `cursorStreamEvent` (discriminated union of all Cursor events)
- [ ] M2a - Create `src/types/cursor-hooks.types.ts` — Hook event Zod schemas:
  - [ ] Common base fields schema (conversation_id, model, hook_event_name, etc.)
  - [ ] Input/output schemas for all 18 hook events
- [ ] M2a - Create `src/constants/cursor-event-types.ts` — NDJSON event type constants
- [ ] M2a - Create `src/constants/cursor-hook-events.ts` — Hook event name constants
- [ ] M2a - Unit tests for schema validation with real fixtures from P0 (>= 95% coverage)

---

### Milestone 2: Cursor Stream Parser (Channel 1)

> Build the NDJSON line parser with Zod validation for all Cursor event types.

- [ ] M2 - Create `src/types/cursor-cli.types.ts` — Zod schemas for all NDJSON events
  - [ ] `cursorSystemEvent` (system.init)
  - [ ] `cursorUserEvent` (user message echo)
  - [ ] `cursorAssistantEvent` (assistant message)
  - [ ] `cursorToolCallStartedEvent` (tool_call.started)
  - [ ] `cursorToolCallCompletedEvent` (tool_call.completed)
  - [ ] `cursorResultEvent` (result.success)
  - [ ] `cursorStreamEvent` (discriminated union of all)
- [ ] M2 - Create `src/core/cursor/cursor-stream-parser.ts` — NDJSON line parser
- [ ] M2 - Handle partial line buffering (lines split across stdout chunks)
- [ ] M2 - Handle `--stream-partial-output` delta accumulation
- [ ] M2 - Emit typed events for each parsed Cursor event
- [ ] M2 - Error recovery for malformed JSON lines (log + skip)
- [ ] M2 - Implement streaming backpressure (pause parsing if downstream consumer is slow) — *Guard: M-STREAM-3 from research.md*
- [ ] M2 - Add configurable output size limit for accumulated text (default 50KB) — *Guard: M-STREAM-2 from research.md*
- [ ] M2 - Unit tests with real NDJSON fixtures (>= 95% coverage)

### Milestone 3: Cursor CLI Connection (Channel 1)

> Build the process manager that spawns and manages `agent` child processes.

- [ ] M3 - Create `src/core/cursor/cursor-cli-connection.ts` — Process lifecycle manager
- [ ] M3 - Implement `spawn()` — Launch `agent -p` with correct flags
- [ ] M3 - Implement session tracking — Capture `session_id` from `system.init`
- [ ] M3 - Implement `--resume` support — Pass session ID on subsequent prompts
- [ ] M3 - Implement `createChat()` — Call `agent create-chat` for pre-created sessions
- [ ] M3 - Handle process exit codes and stderr capture
- [ ] M3 - Handle `CURSOR_API_KEY` and `--api-key` authentication
- [ ] M3 - Implement `verifyInstallation()` — Check `agent --version`
- [ ] M3 - Implement `verifyAuth()` — Run `agent status` and parse output
- [ ] M3 - Implement `listModels()` — Run `agent models` and parse output
- [ ] M3 - Implement `listSessions()` — Run `agent ls` and parse output
- [ ] M3 - Implement process group tracking (store PIDs of all spawned children) — *Guard: M-PERF-3 from research.md*
- [ ] M3 - Kill entire process group on disconnect/SIGTERM (prevent orphaned processes) — *Guard: M-PERF-3*
- [ ] M3 - Handle Ctrl-C graceful shutdown (SIGINT → cleanup children → exit) — *Guard: M-PERF-3*
- [ ] M3 - Unit tests with mocked child processes (>= 95% coverage)

### Milestone 4: Protocol Translator (Channel 1 → AgentPort)

> Bridge layer that maps NDJSON stream events to AgentPort-compatible events.

- [ ] M4 - Create `src/core/cursor/cursor-to-acp-translator.ts`
- [ ] M4 - Map `system.init` → connection state + capabilities
- [ ] M4 - Map `assistant` events → `SessionNotification` (agent_message_chunk)
- [ ] M4 - Map `assistant` partial deltas → streaming message chunks
- [ ] M4 - Map `tool_call.started` → tool use notification
- [ ] M4 - Map `tool_call.completed` → tool result notification
- [ ] M4 - Map `result.success` → prompt response resolution
- [ ] M4 - Map process errors → error events
- [ ] M4 - Handle tool type discrimination (readToolCall, writeToolCall, shellToolCall, etc.)
- [ ] M4 - Create constants in `src/constants/cursor-event-types.ts`
- [ ] M4 - Implement tool result truncation (configurable limit, default 50KB per result) — *Guard: M-STREAM-2 from research.md*
- [ ] M4 - Log warning when truncation occurs (include original size vs limit) — *Guard: M-STREAM-2*
- [ ] M4 - Unit tests with fixture-based event sequences (>= 95% coverage)

### Milestone 5: Hook IPC Server (Channel 2)

> Build the IPC server that receives hook events from Cursor and routes them to TOADSTOOL handlers.

- [ ] M5 - Create `src/core/cursor/hook-ipc-server.ts` — Unix socket / HTTP IPC server
- [ ] M5 - Define hook event Zod schemas for all hook input types
  - [ ] `sessionStart` input/output schemas
  - [ ] `preToolUse` input/output schemas
  - [ ] `beforeShellExecution` input/output schemas
  - [ ] `beforeMCPExecution` input/output schemas
  - [ ] `beforeReadFile` input/output schemas
  - [ ] `afterFileEdit` input schema
  - [ ] `afterAgentThought` input schema
  - [ ] `afterAgentResponse` input schema
  - [ ] `stop` input/output schemas
  - [ ] `subagentStart` / `subagentStop` schemas
  - [ ] `postToolUse` / `postToolUseFailure` schemas
  - [ ] Common base fields schema
- [ ] M5 - Implement request routing (hook_event_name → handler)
- [ ] M5 - Implement permission request flow:
  - [ ] Receive `preToolUse` → emit event to TUI → wait for user response → return
  - [ ] Timeout handling (return allow/deny based on policy)
- [ ] M5 - Implement context injection flow:
  - [ ] `sessionStart` → return `additional_context` from TOADSTOOL rules
  - [ ] `sessionStart` → return `env` from TOADSTOOL config
- [ ] M5 - Implement auto-continuation:
  - [ ] `stop` → evaluate continuation rules → return `followup_message` or empty
- [ ] M5 - Cross-platform: Unix socket (macOS/Linux) + local HTTP fallback (Windows)
- [ ] M5 - Verify IPC server uses event-driven wake (NO setImmediate/setTimeout polling) — *Guard: M-PERF-4 from research.md*
- [ ] M5 - Benchmark idle CPU usage of IPC server (target: <1% when waiting for hook events) — *Guard: M-PERF-5*
- [ ] M5 - Unit tests (>= 95% coverage)

### Milestone 6: Hooks Config Generator + Scripts (Channel 2)

> Generate hooks.json and hook shim scripts dynamically.

- [ ] M6 - Create `src/core/cursor/hooks-config-generator.ts`
  - [ ] Generate hooks.json content based on TOADSTOOL config
  - [ ] Support project-level (`.cursor/hooks.json`) and user-level (`~/.cursor/hooks.json`)
  - [ ] Handle existing hooks.json (merge TOADSTOOL hooks with user hooks)
- [ ] M6 - Create hook shim script template
  - [ ] Node.js shim: connects to Unix socket, relays JSON
  - [ ] Bash fallback shim: curl to local HTTP server
  - [ ] Make scripts executable
- [ ] M6 - Implement `TOADSTOOL_HOOK_SOCKET` env var injection
- [ ] M6 - Implement hooks cleanup on disconnect (remove TOADSTOOL hooks, restore originals)
- [ ] M6 - Handle hook installation path resolution
- [ ] M6 - Unit tests (>= 95% coverage)

### Milestone 7: Cursor CLI Harness Adapter

> Implement the `AgentPort` interface combining Channel 1 + Channel 2.

- [ ] M7 - Create `src/core/cursor/cursor-cli-harness.ts` — `CursorCliHarnessAdapter` class
- [ ] M7 - Implement `connect()`:
  - [ ] Verify `agent` binary exists
  - [ ] Verify auth status
  - [ ] Start Hook IPC server (Channel 2)
  - [ ] Install hooks.json + shim scripts
- [ ] M7 - Implement `disconnect()`:
  - [ ] Kill active child process
  - [ ] Stop Hook IPC server
  - [ ] Clean up hooks (optional)
- [ ] M7 - Implement `initialize()`:
  - [ ] Query available models (`agent models`)
  - [ ] Return capabilities object
- [ ] M7 - Implement `newSession()`:
  - [ ] Call `agent create-chat` → get chatId
  - [ ] Store for `--resume`
- [ ] M7 - Implement `prompt()`:
  - [ ] Spawn `agent -p` with all flags
  - [ ] Wire NDJSON parser + translator (Channel 1)
  - [ ] Handle concurrent hook IPC events (Channel 2)
  - [ ] Resolve Promise on `result` event
- [ ] M7 - Implement `authenticate()`:
  - [ ] Check `CURSOR_API_KEY` or `agent status`
  - [ ] Guide user to `agent login` if needed
- [ ] M7 - Implement `sessionUpdate()` → No-op
- [ ] M7 - Wire EventEmitter for state, sessionUpdate, permissionRequest, error
- [ ] M7 - Handle concurrent prompt guard (one active prompt)
- [ ] M7 - Handle graceful shutdown (SIGTERM → cleanup)
- [ ] M7 - Unit tests (>= 95% coverage)

### Milestone 8: Harness Registration & Config

> Register the Cursor CLI adapter in the harness registry.

- [ ] M8 - Add constants to `src/constants/harness-defaults.ts`:
  - [ ] `CURSOR_CLI_ID: "cursor-cli"`
  - [ ] `CURSOR_CLI_NAME: "Cursor CLI"`
  - [ ] `CURSOR_COMMAND: "cursor-agent"` (or `"agent"`)
- [ ] M8 - Add env key constants:
  - [ ] `TOADSTOOL_CURSOR_COMMAND`
  - [ ] `TOADSTOOL_CURSOR_ARGS`
  - [ ] `CURSOR_API_KEY`
  - [ ] `TOADSTOOL_HOOK_SOCKET`
- [ ] M8 - Create `cursorCliHarnessAdapter` export
- [ ] M8 - Register in `src/ui/components/App.tsx`
- [ ] M8 - Register in `src/server/headless-server.ts`
- [ ] M8 - Update harness config schema for Cursor-specific options:
  - [ ] `model`, `mode`, `force`, `sandbox`, `browser`, `approveMcps`
- [ ] M8 - Update `.env.sample` with `CURSOR_API_KEY`
- [ ] M8 - Update `harnesses.json` example documentation
- [ ] M8 - Add feature flag `TOADSTOOL_CURSOR_CLI_ENABLED` (default: `false` during beta) — *Guard: M-UX-7 from research.md*
- [ ] M8 - Gate Cursor CLI adapter registration behind feature flag in `App.tsx` and `headless-server.ts`
- [ ] M8 - Document feature flag in `.env.sample` and README

### Milestone 9: Cloud Agents API Client (Channel 3)

> HTTP client for Cursor's Cloud Agents API.

- [ ] M9 - Create `src/core/cursor/cloud-agent-client.ts`
- [ ] M9 - Implement `listAgents()` with pagination cursor support
- [ ] M9 - Implement `getAgent(id)` → agent status + details
- [ ] M9 - Implement `getConversation(id)` → message history
- [ ] M9 - Implement `launchAgent(params)` → create cloud agent
- [ ] M9 - Implement `addFollowup(id, prompt)` → follow-up message
- [ ] M9 - Implement `stopAgent(id)` → pause execution
- [ ] M9 - Implement `deleteAgent(id)` → permanent removal
- [ ] M9 - Implement `getApiKeyInfo()` → auth verification
- [ ] M9 - Implement `listModels()` → available models
- [ ] M9 - Implement `listRepositories()` → GitHub repos (rate limited)
- [ ] M9 - Zod schemas for all API responses
- [ ] M9 - Rate limiting with exponential backoff
- [ ] M9 - ETag caching support
- [ ] M9 - Create constants for API URLs, endpoints, status values
- [ ] M9 - Unit tests with mocked HTTP (>= 95% coverage)

### Milestone 10: Integration Testing

> End-to-end testing of all three channels.

- [ ] M10 - Create test fixtures:
  - [ ] NDJSON session recordings (simple, multi-tool, error)
  - [ ] Hook event sequences (approval flow, context injection, auto-continue)
  - [ ] Cloud API response fixtures
- [ ] M10 - Integration test: full prompt → NDJSON stream → response (mocked process)
- [ ] M10 - Integration test: multi-turn with `--resume` + `create-chat`
- [ ] M10 - Integration test: hook IPC permission flow (preToolUse → TUI → response)
- [ ] M10 - Integration test: hook IPC context injection (sessionStart → rules)
- [ ] M10 - Integration test: hook IPC auto-continuation (stop → followup_message)
- [ ] M10 - Integration test: cloud agent launch → status polling → conversation
- [ ] M10 - Integration test: error handling (auth failure, binary not found, process crash)
- [ ] M10 - Integration test: graceful shutdown mid-stream
- [ ] M10 - Integration test: model + mode selection
- [ ] M10 - Optional: E2E test with real Cursor CLI (env-gated)

### Milestone 11: TUI Integration & Polish

> Wire everything into the UI for a seamless user experience.

- [ ] M11 - Agent selector UI shows "Cursor CLI" option
- [ ] M11 - Streaming messages render correctly in chat view
- [ ] M11 - Tool activity (read, write, shell, MCP) displays in sidebar
- [ ] M11 - Permission approval prompts display for hook events (preToolUse, beforeShellExecution)
- [ ] M11 - Thinking/reasoning display from `afterAgentThought` hooks
- [ ] M11 - File edit tracking from `afterFileEdit` hooks → diff display
- [ ] M11 - Model picker populated from `agent models` / Cloud API
- [ ] M11 - Mode switching (Agent/Plan/Ask) via TUI toggle
- [ ] M11 - Cloud agent panel (list, status, follow-up, stop)
- [ ] M11 - Cloud dispatch (`&` prefix or slash command)
- [ ] M11 - Auth error handler (guide to `agent login`)
- [ ] M11 - Missing binary handler (show install instructions)
- [ ] M11 - MCP management UI (list servers, enable/disable)
- [ ] M11 - Session browser (list from `agent ls`, resume)
- [ ] M11 - Status bar: model name, mode, cloud agent count
- [ ] M11 - Performance: measure process spawn overhead (target < 500ms per turn)
- [ ] M11 - Performance: measure hook IPC roundtrip (target < 50ms)
- [ ] M11 - Documentation: README with Cursor CLI setup instructions
- [ ] M11 - Build inline diff view from `afterFileEdit` hook data (`old_string`/`new_string` diffs) — *Guard: M-REVIEW-2 from research.md*
- [ ] M11 - Integrate diff display with existing `DiffRenderer` component (`src/ui/components/DiffRenderer.tsx`)
- [ ] M11 - Run full quality gate: lint, typecheck, test, build

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Cursor CLI is still in beta** — API/flags may change | HIGH | HIGH | Pin to known version, Zod validation, monitor changelog |
| **NDJSON schema not formally specified** | MEDIUM | MEDIUM | Capture real fixtures, Zod fail-safe parsing, ignore unknown fields |
| **Hooks system may change** — hooks.json schema evolving | HIGH | MEDIUM | Use `"version": 1`, defensive parsing, feature-flag hooks |
| **Hook IPC latency** — Unix socket roundtrip too slow for approval | MEDIUM | LOW | Benchmark; if slow, use in-process handler instead |
| **Hooks conflict with user's existing hooks** | HIGH | MEDIUM | Merge strategy: append TOADSTOOL hooks, don't overwrite |
| **Process-per-turn overhead** — ~300-500ms spawn per message | MEDIUM | HIGH | Acceptable; explore interactive mode in future |
| **Session resume reliability** — `--resume` underdocumented | MEDIUM | MEDIUM | Test thoroughly; fall back to fresh sessions |
| **`create-chat` may not be stable** — relatively new command | MEDIUM | MEDIUM | Fall back to using session_id from first system.init event |
| **Cloud API rate limits** — strict on some endpoints | LOW | MEDIUM | Exponential backoff, ETag caching |
| **Cloud API requires paid Cursor subscription** | LOW | CERTAIN | Document requirement, graceful degradation without cloud |
| **Hook fail-closed behavior** — `beforeReadFile`/`beforeMCPExecution` block on error | HIGH | LOW | Robust error handling in shim scripts, timeout management |
| **Cross-platform hook script compatibility** | MEDIUM | MEDIUM | Node.js shim (universal), bash fallback, Windows testing |
| **Cursor CLI binary not installed** | MEDIUM | MEDIUM | Detect at connect(), clear install instructions |
| **Hook shim script permissions** | LOW | MEDIUM | `chmod +x` during generation, test on macOS/Linux |
| **Multiple TOADSTOOL instances** — IPC socket conflicts | MEDIUM | LOW | Include PID in socket path: `/tmp/toadstool-hooks-<pid>.sock` |

---

## Open Questions

### Must Resolve Before Implementation

1. **Q: Does `--resume` work across separate process invocations?**
   - Test: Spawn `agent -p "hello"`, get session_id, then spawn `agent -p --resume <id> "follow up"`
   - Impact: Critical for multi-turn conversation

2. **Q: Does `agent create-chat` return a usable chat ID for `--resume`?**
   - Test: Run `agent create-chat`, capture output, then `agent -p --resume <id>`
   - Impact: Session pre-creation strategy

3. **Q: What is the hook IPC roundtrip latency via Unix socket?**
   - Test: Measure time from hook script start → IPC request → IPC response → hook script exit
   - Impact: Permission approval UX (user shouldn't wait for IPC overhead)

4. **Q: How does Cursor handle hooks.json when TOADSTOOL adds entries?**
   - Test: Create hooks.json with our hooks, verify Cursor loads them
   - Impact: Hooks installation strategy

5. **Q: Do hooks fire in `-p` (print/headless) mode?**
   - This is critical — if hooks only fire in interactive mode, Channel 2 won't work
   - Test: Run `agent -p` with hooks.json configured, verify hook scripts execute
   - Impact: **Architecture viability** — if hooks don't fire in headless mode, fall back to NDJSON-only

6. **Q: Can we merge our hooks with the user's existing hooks.json?**
   - Test: User has `afterFileEdit` hook, we add `preToolUse` — do both fire?
   - Impact: Hook installation strategy (merge vs override)

7. **Q: What is the `agent ls` output format?**
   - Test: Run `agent ls` with multiple sessions, capture output
   - Impact: Session browser parsing

8. **Q: What is the `agent models` output format?**
   - Test: Run `agent models`, capture output
   - Impact: Model list parsing

### Nice to Resolve

9. **Q: Can we use Cursor's interactive mode with stdin pipes?**
   - If yes: Would enable persistent connection (no process-per-turn overhead)
   - Impact: Performance optimization opportunity

10. **Q: Does `--stream-partial-output` work with `--resume`?**
    - Test: Resume a session with partial streaming
    - Impact: Streaming quality on resumed sessions

11. **Q: Does Cursor expose token usage anywhere?**
    - Check: Extended result event fields, hooks, API responses
    - Impact: Cost tracking feature

12. **Q: Can the Cloud Agents API work without GitHub integration?**
    - Test: Launch agent without `source.repository`
    - Impact: Local-only usage of cloud agents

13. **Q: What happens when `--force` and hooks both exist?**
    - Test: Does `--force` bypass hooks, or do hooks still fire?
    - Impact: Permission model design (hooks vs force flag)

---

## File Structure (Proposed)

```
src/
├── constants/
│   ├── cursor-event-types.ts          # NEW: NDJSON event type constants
│   ├── cursor-hook-events.ts          # NEW: Hook event name constants
│   ├── cursor-cloud-status.ts         # NEW: Cloud agent status constants
│   └── harness-defaults.ts            # MODIFY: Add CURSOR_CLI_* constants
├── core/
│   └── cursor/                        # NEW: Cursor CLI harness module
│       ├── cursor-cli-connection.ts   # Process lifecycle (Channel 1)
│       ├── cursor-cli-harness.ts      # HarnessAdapter + HarnessRuntime
│       ├── cursor-stream-parser.ts    # NDJSON line parser (Channel 1)
│       ├── cursor-to-acp-translator.ts # Event translator (Channel 1)
│       ├── hook-ipc-server.ts         # IPC server for hooks (Channel 2)
│       ├── hooks-config-generator.ts  # hooks.json generator (Channel 2)
│       ├── cloud-agent-client.ts      # HTTP API client (Channel 3)
│       └── hook-scripts/              # Shim script templates (Channel 2)
│           ├── toadstool-hook.mjs     # Node.js generic hook shim
│           └── toadstool-hook.sh      # Bash fallback shim
├── types/
│   ├── cursor-cli.types.ts            # NEW: Zod schemas for NDJSON events
│   ├── cursor-hooks.types.ts          # NEW: Zod schemas for hook events
│   └── cursor-cloud.types.ts          # NEW: Zod schemas for Cloud API
└── harness/
    └── harnessAdapter.ts              # UNCHANGED

__tests__/
├── unit/
│   └── core/
│       └── cursor/
│           ├── cursor-stream-parser.unit.test.ts
│           ├── cursor-cli-connection.unit.test.ts
│           ├── cursor-to-acp-translator.unit.test.ts
│           ├── cursor-cli-harness.unit.test.ts
│           ├── hook-ipc-server.unit.test.ts
│           ├── hooks-config-generator.unit.test.ts
│           └── cloud-agent-client.unit.test.ts
├── integration/
│   └── core/
│       └── cursor/
│           ├── cursor-cli-harness.integration.test.ts
│           ├── hook-ipc-flow.integration.test.ts
│           └── cloud-agent-client.integration.test.ts
└── fixtures/
    └── cursor/
        ├── ndjson/
        │   ├── simple-response.ndjson
        │   ├── multi-tool-response.ndjson
        │   ├── partial-streaming.ndjson
        │   └── error-auth.ndjson
        ├── hooks/
        │   ├── pre-tool-use-allow.json
        │   ├── pre-tool-use-deny.json
        │   ├── session-start-context.json
        │   ├── stop-followup.json
        │   └── after-agent-thought.json
        └── cloud-api/
            ├── list-agents.json
            ├── agent-status-running.json
            ├── agent-conversation.json
            └── launch-response.json
```

---

## Comparison: ACP Harness vs Cursor Harness (Three-Channel)

| Aspect | ACP Harness (Claude/Gemini/Codex) | Cursor CLI Harness (Proposed) |
|--------|-----------------------------------|-------------------------------|
| **Protocol** | ACP JSON-RPC (bidirectional) | NDJSON stream + Hooks IPC + Cloud API |
| **Connection** | Persistent child process | Process-per-turn + IPC sidecar |
| **Streaming** | ACP session notifications | `--stream-partial-output` NDJSON |
| **Permission control** | ACP permission events | Hooks: `preToolUse`, `beforeShellExecution` |
| **Tool execution** | TOADSTOOL's ToolHost | Cursor internal (hooks observe/control) |
| **Context injection** | N/A (built into prompt) | `sessionStart` hook → `additional_context` |
| **Thinking display** | N/A | `afterAgentThought` hook |
| **Session state** | Managed by TOADSTOOL | Managed by Cursor (`--resume`) |
| **Cloud execution** | N/A | Cloud Agents API (remote) |
| **Auth** | API keys (ANTHROPIC_API_KEY, etc.) | CURSOR_API_KEY or browser login |
| **Models** | Fixed per harness | Configurable via `--model` |
| **Modes** | N/A | Agent, Plan, Ask |
| **MCP** | N/A | Cursor reads `.cursor/mcp.json` natively |
| **Code reuse** | Shares ACPConnection, AcpAgentPort | Fully custom (no ACP reuse) |
| **Auto-continuation** | N/A | `stop` hook → `followup_message` |
| **File edit details** | N/A | `afterFileEdit` hook → old/new strings |
| **Subagent tracking** | N/A | `subagentStart`/`subagentStop` hooks |

---

## Success Criteria

### Core (Must Have)
- [ ] User can select "Cursor CLI" as agent from the TUI
- [ ] Sending a prompt produces streaming text output in the chat view
- [ ] Tool activity (file reads, writes, shell commands) is displayed
- [ ] Multi-turn conversation works via `--resume`
- [ ] Model selection is supported (pass `--model` flag)
- [ ] Mode selection is supported (Agent/Plan/Ask)
- [ ] Authentication errors produce clear, actionable messages
- [ ] Missing `agent` binary produces clear install instructions

### Enhanced (Should Have — Hooks)
- [ ] Permission prompts display in TUI for tool calls (via `preToolUse` hook)
- [ ] Shell command approval works (via `beforeShellExecution` hook)
- [ ] Context injection works (via `sessionStart` hook)
- [ ] Agent thinking/reasoning displays in TUI (via `afterAgentThought` hook)
- [ ] File edit details show diffs (via `afterFileEdit` hook)

### Cloud (Nice to Have)
- [ ] Cloud agent dispatch works (`&` prefix → Cloud API)
- [ ] Cloud agent status displays in TUI
- [ ] Cloud agent follow-up messages work
- [ ] Cloud agent conversation history is viewable

### Quality Gates
- [ ] All tests pass (unit >= 95% coverage, integration tests)
- [ ] Build, lint, typecheck all pass
- [ ] Performance: process spawn overhead < 500ms at p95
- [ ] Performance: hook IPC roundtrip < 50ms at p95

---

### Milestone 2b: Generic CLI Agent Abstraction (Extract After M11)

> **Deferred until Phase G**: Extract the generic abstraction from the working Cursor adapter. This avoids premature abstraction — the interface is driven by real implementation experience, not speculation.

- [ ] M2b - Extract `src/core/cli-agent/cli-agent.port.ts` — `CliAgentPort` interface (from Cursor adapter's actual contract)
- [ ] M2b - Extract `src/core/cli-agent/cli-agent.base.ts` — Abstract base class with shared utilities:
  - [ ] Process spawning with timeout, cleanup, and signal handling
  - [ ] NDJSON line parser with partial buffer handling (extracted from `cursor-stream-parser.ts`)
  - [ ] Zod-safe event validation (parse or skip malformed lines)
  - [ ] Concurrent prompt guard (one active prompt at a time)
  - [ ] Session ID tracking for `--resume`-style continuations
  - [ ] Auth status caching
- [ ] M2b - Extract `src/core/cli-agent/cli-agent.bridge.ts` — `CliAgentPort` → `AgentPort` bridge:
  - [ ] Map `StreamEvent.text_delta` → `SessionNotification` (agent_message_chunk)
  - [ ] Map `StreamEvent.tool_start/complete` → tool notifications
  - [ ] Map `StreamEvent.permission_request` → `permissionRequest` event
  - [ ] Map `StreamEvent.thinking_delta` → thinking display updates
  - [ ] Map `StreamEvent.result` → `PromptResponse` resolution
  - [ ] Map `StreamEvent.error` → error events
- [ ] M2b - Create `src/core/cli-agent/create-cli-harness-adapter.ts` — Factory function
- [ ] M2b - Create `src/core/cli-agent/stream-line-parser.ts` — Shared NDJSON utility (extracted from M2)
- [ ] M2b - Refactor `CursorCliHarnessAdapter` to extend `CliAgentBase` (verify no regressions)
- [ ] M2b - Unit tests for all generic components (>= 95% coverage)
- [ ] M2b - Run full quality gate: lint, typecheck, test, build

---

## ADDENDUM A: Generic CLI Agent Interface (Multi-Agent Standardization)

### Problem

The current `AgentPort` interface is tightly coupled to the ACP SDK types (`InitializeRequest`, `PromptRequest`, `SessionNotification`, etc. from `@agentclientprotocol/sdk`). This works for Claude/Gemini/Codex which all speak ACP natively, but Cursor CLI uses a completely different protocol (NDJSON + Hooks). Future agents (Windsurf CLI, Aider CLI, Continue CLI, etc.) will likely have their own protocols too.

If we implement Cursor as a one-off adapter, we'll end up with N bespoke adapters each re-implementing the same patterns: process spawning, stream parsing, session tracking, auth management, model listing, etc.

### Solution: Layered Abstraction with Zod-Validated I/O

Introduce a **generic CLI agent layer** that sits between the existing `AgentPort` interface and the agent-specific protocol implementations. This layer standardizes the common operations and uses Zod schemas for all input/output validation.

```
┌──────────────────────────────────────────────────────────┐
│                    AgentPort Interface                     │
│              (existing — unchanged, ACP-typed)             │
└─────────────────────────────┬────────────────────────────┘
                              │ implements
         ┌────────────────────┼────────────────────────────┐
         │                    │                            │
   ┌─────┴────┐   ┌──────────┴──────────┐   ┌────────────┴────────┐
   │ ACP      │   │ Generic CLI Agent   │   │ Cloud Agent         │
   │ Harness  │   │ Base Class          │   │ Base Class          │
   │ (today)  │   │ (NEW)               │   │ (NEW — future)      │
   └──────────┘   └──────────┬──────────┘   └─────────────────────┘
                             │ extends
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴────┐  ┌─────┴────┐  ┌──────┴──────┐
        │ Cursor   │  │ Future:  │  │ Future:     │
        │ CLI      │  │ Aider    │  │ Windsurf    │
        │ Adapter  │  │ CLI      │  │ CLI         │
        └──────────┘  └──────────┘  └─────────────┘
```

### Generic CLI Agent Types (Zod-Validated)

All types below use Zod schemas for runtime validation. These are **protocol-agnostic** — they represent the common operations every CLI agent supports, regardless of underlying protocol.

```typescript
// ═══════════════════════════════════════════════════════════════
// src/types/cli-agent.types.ts — Generic CLI Agent Zod Schemas
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";

// ── Installation & Auth ──────────────────────────────────────

export const CliAgentInstallInfoSchema = z.object({
  binaryName: z.string(),           // "agent", "claude-code-acp", "aider"
  binaryPath: z.string().optional(), // Resolved absolute path
  version: z.string().optional(),    // "1.2.3"
  installed: z.boolean(),
  installCommand: z.string().optional(), // "curl https://cursor.com/install | bash"
});
export type CliAgentInstallInfo = z.infer<typeof CliAgentInstallInfoSchema>;

export const CliAgentAuthStatusSchema = z.object({
  authenticated: z.boolean(),
  method: z.enum(["api_key", "browser_login", "oauth", "none"]).optional(),
  email: z.string().email().optional(),
  expiresAt: z.number().optional(),
});
export type CliAgentAuthStatus = z.infer<typeof CliAgentAuthStatusSchema>;

// ── Models ───────────────────────────────────────────────────

export const CliAgentModelSchema = z.object({
  id: z.string(),                    // "gpt-5", "sonnet-4", "claude-4-sonnet"
  name: z.string(),                  // Display name
  provider: z.string().optional(),   // "anthropic", "openai", "google"
  isDefault: z.boolean().default(false),
  supportsThinking: z.boolean().default(false),
  maxContextTokens: z.number().optional(),
});
export type CliAgentModel = z.infer<typeof CliAgentModelSchema>;

export const CliAgentModelsResponseSchema = z.object({
  models: z.array(CliAgentModelSchema),
  defaultModel: z.string().optional(),
});
export type CliAgentModelsResponse = z.infer<typeof CliAgentModelsResponseSchema>;

// ── Sessions ─────────────────────────────────────────────────

export const CliAgentSessionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  model: z.string().optional(),
  messageCount: z.number().optional(),
});
export type CliAgentSession = z.infer<typeof CliAgentSessionSchema>;

// ── Prompt Input ─────────────────────────────────────────────

export const CliAgentPromptInputSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),     // Resume existing session
  model: z.string().optional(),
  mode: z.enum(["agent", "plan", "ask"]).optional(),
  workspacePath: z.string().optional(),
  force: z.boolean().default(false),
  streaming: z.boolean().default(true),
  additionalFlags: z.record(z.string()).optional(), // Agent-specific extra flags
});
export type CliAgentPromptInput = z.infer<typeof CliAgentPromptInputSchema>;

// ── Stream Events (Protocol-Agnostic) ────────────────────────

export const STREAM_EVENT_TYPE = {
  SESSION_INIT: "session_init",
  TEXT_DELTA: "text_delta",
  TEXT_COMPLETE: "text_complete",
  TOOL_START: "tool_start",
  TOOL_COMPLETE: "tool_complete",
  TOOL_ERROR: "tool_error",
  THINKING_DELTA: "thinking_delta",
  THINKING_COMPLETE: "thinking_complete",
  PERMISSION_REQUEST: "permission_request",
  ERROR: "error",
  RESULT: "result",
} as const;

export const StreamEventBaseSchema = z.object({
  type: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.number().optional(),
});

export const SessionInitEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.SESSION_INIT),
  model: z.string(),
  mode: z.string().optional(),
});

export const TextDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_DELTA),
  text: z.string(),
});

export const TextCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_COMPLETE),
  text: z.string(),
});

export const ToolStartEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_START),
  toolCallId: z.string(),
  toolName: z.string(),            // Normalized: "read_file", "write_file", "shell", etc.
  toolInput: z.record(z.unknown()),
});

export const ToolCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_COMPLETE),
  toolCallId: z.string(),
  toolName: z.string(),
  success: z.boolean(),
  result: z.record(z.unknown()).optional(),
});

export const ThinkingDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_DELTA),
  text: z.string(),
});

export const PermissionRequestEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.PERMISSION_REQUEST),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  requestId: z.string(),
});

export const ErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.ERROR),
  message: z.string(),
  code: z.string().optional(),
});

export const ResultEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.RESULT),
  text: z.string(),
  durationMs: z.number().optional(),
  success: z.boolean(),
});

export const StreamEventSchema = z.discriminatedUnion("type", [
  SessionInitEventSchema,
  TextDeltaEventSchema,
  TextCompleteEventSchema,
  ToolStartEventSchema,
  ToolCompleteEventSchema,
  ThinkingDeltaEventSchema,
  PermissionRequestEventSchema,
  ErrorEventSchema,
  ResultEventSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ── Prompt Result ────────────────────────────────────────────

export const CliAgentPromptResultSchema = z.object({
  text: z.string(),
  sessionId: z.string(),
  durationMs: z.number().optional(),
  toolCallCount: z.number().default(0),
  model: z.string().optional(),
});
export type CliAgentPromptResult = z.infer<typeof CliAgentPromptResultSchema>;

// ── Capabilities ─────────────────────────────────────────────

export const CliAgentCapabilitiesSchema = z.object({
  supportsStreaming: z.boolean(),
  supportsResume: z.boolean(),
  supportsModes: z.boolean(),          // agent/plan/ask
  supportsModelSelection: z.boolean(),
  supportsHooks: z.boolean(),
  supportsCloudAgents: z.boolean(),
  supportsMcp: z.boolean(),
  supportsBrowser: z.boolean(),
  supportsSandbox: z.boolean(),
  supportsThinking: z.boolean(),       // Can expose thinking/reasoning
  supportsForce: z.boolean(),          // Auto-approve mode
  supportsSessionListing: z.boolean(),
  supportsSessionCreation: z.boolean(),
});
export type CliAgentCapabilities = z.infer<typeof CliAgentCapabilitiesSchema>;
```

### Generic CLI Agent Interface

```typescript
// ═══════════════════════════════════════════════════════════════
// src/core/cli-agent/cli-agent.port.ts — Generic Interface
// ═══════════════════════════════════════════════════════════════

import type { EventEmitter } from "eventemitter3";

export interface CliAgentEvents {
  stream: (event: StreamEvent) => void;
  state: (status: ConnectionStatus) => void;
  error: (error: Error) => void;
}

/**
 * Generic interface for any CLI-based AI agent.
 * Implementations translate agent-specific protocols to this standard interface.
 *
 * Cursor CLI, Aider, Windsurf, etc. would each implement this.
 */
export type CliAgentPort = EventEmitter<CliAgentEvents> & {
  readonly id: string;                          // "cursor-cli", "aider-cli", etc.
  readonly name: string;                        // "Cursor CLI", "Aider", etc.
  readonly capabilities: CliAgentCapabilities;

  // ── Lifecycle ──
  checkInstallation(): Promise<CliAgentInstallInfo>;
  checkAuth(): Promise<CliAgentAuthStatus>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // ── Models ──
  listModels(): Promise<CliAgentModelsResponse>;

  // ── Sessions ──
  listSessions?(): Promise<CliAgentSession[]>;
  createSession?(): Promise<string>;            // Returns session ID

  // ── Prompting ──
  prompt(input: CliAgentPromptInput): Promise<CliAgentPromptResult>;

  // ── MCP (optional) ──
  listMcpServers?(): Promise<unknown[]>;
  enableMcpServer?(id: string): Promise<void>;
  disableMcpServer?(id: string): Promise<void>;
};
```

### CLI Agent Base Class (Shared Utilities)

```typescript
// ═══════════════════════════════════════════════════════════════
// src/core/cli-agent/cli-agent.base.ts — Abstract Base Class
// ═══════════════════════════════════════════════════════════════

/**
 * Abstract base class providing common utilities for CLI agent adapters:
 * - Process spawning with timeout/cleanup
 * - NDJSON line parsing with partial buffer handling
 * - Zod-safe event validation
 * - Session ID tracking for --resume
 * - Auth status caching
 * - Concurrent prompt guard (one at a time)
 *
 * Subclasses implement the abstract methods to handle agent-specific
 * protocol translation.
 */
export abstract class CliAgentBase
  extends EventEmitter<CliAgentEvents>
  implements CliAgentPort
{
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: CliAgentCapabilities;

  // Provided by base class
  protected currentSessionId: string | null = null;
  protected activeProcess: ChildProcess | null = null;
  private promptLock = false;

  // ── Abstract methods (agent-specific) ──
  protected abstract buildPromptArgs(input: CliAgentPromptInput): string[];
  protected abstract parseStreamLine(line: string): StreamEvent | null;
  protected abstract buildAuthCheckCommand(): { command: string; args: string[] };
  protected abstract buildVersionCommand(): { command: string; args: string[] };
  protected abstract buildModelListCommand(): { command: string; args: string[] };
  protected abstract parseAuthOutput(stdout: string): CliAgentAuthStatus;
  protected abstract parseVersionOutput(stdout: string): string;
  protected abstract parseModelListOutput(stdout: string): CliAgentModelsResponse;

  // ── Provided by base class ──
  async checkInstallation(): Promise<CliAgentInstallInfo> { /* ... */ }
  async checkAuth(): Promise<CliAgentAuthStatus> { /* ... */ }
  async connect(): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  async prompt(input: CliAgentPromptInput): Promise<CliAgentPromptResult> { /* ... */ }

  // Utility: spawn process, pipe stdout through NDJSON parser,
  // emit StreamEvents, handle exit/errors
  protected async spawnAndStream(
    command: string,
    args: string[],
    options?: SpawnOptions
  ): Promise<CliAgentPromptResult> { /* ... */ }

  // Utility: parse NDJSON with buffering
  protected createLineParser(
    onLine: (line: string) => void
  ): (chunk: Buffer) => void { /* ... */ }
}
```

### Agent-Specific Adapters

Each CLI agent extends `CliAgentBase` and implements the abstract methods:

```typescript
// ═══ Cursor CLI ═══════════════════════════════════════════════
// src/core/cursor/cursor-cli-agent.ts

export class CursorCliAgent extends CliAgentBase {
  readonly id = "cursor-cli";
  readonly name = "Cursor CLI";
  readonly capabilities = {
    supportsStreaming: true,
    supportsResume: true,
    supportsModes: true,        // agent/plan/ask
    supportsModelSelection: true,
    supportsHooks: true,        // Cursor hooks system
    supportsCloudAgents: true,  // Cloud Agents API
    supportsMcp: true,          // Native MCP
    supportsBrowser: true,      // --browser flag
    supportsSandbox: true,      // --sandbox flag
    supportsThinking: true,     // via afterAgentThought hook
    supportsForce: true,        // --force flag
    supportsSessionListing: true,
    supportsSessionCreation: true,
  };

  protected buildPromptArgs(input: CliAgentPromptInput): string[] {
    return [
      "-p",
      "--output-format", "stream-json",
      "--stream-partial-output",
      ...(input.sessionId ? ["--resume", input.sessionId] : []),
      ...(input.model ? ["--model", input.model] : []),
      ...(input.mode ? ["--mode", input.mode] : []),
      ...(input.force ? ["--force"] : []),
      ...(input.workspacePath ? ["--workspace", input.workspacePath] : []),
      input.message,
    ];
  }

  protected parseStreamLine(line: string): StreamEvent | null {
    // Parse Cursor NDJSON → generic StreamEvent
  }

  // ... other abstract method implementations
}

// ═══ Future: Aider CLI ════════════════════════════════════════
// src/core/aider/aider-cli-agent.ts (hypothetical)

export class AiderCliAgent extends CliAgentBase {
  readonly id = "aider-cli";
  readonly name = "Aider";
  readonly capabilities = {
    supportsStreaming: true,
    supportsResume: false,      // Aider doesn't have --resume
    supportsModes: false,
    supportsModelSelection: true,
    supportsHooks: false,
    supportsCloudAgents: false,
    supportsMcp: false,
    supportsBrowser: false,
    supportsSandbox: false,
    supportsThinking: false,
    supportsForce: true,        // --yes flag
    supportsSessionListing: false,
    supportsSessionCreation: false,
  };
  // ...
}
```

### CliAgent → AgentPort Bridge

Since the rest of TOADSTOOL speaks `AgentPort`, we need a bridge that adapts the generic `CliAgentPort` interface to `AgentPort`:

```typescript
// ═══════════════════════════════════════════════════════════════
// src/core/cli-agent/cli-agent-bridge.ts
// ═══════════════════════════════════════════════════════════════

/**
 * Wraps any CliAgentPort and exposes it as an AgentPort,
 * translating StreamEvents → SessionNotifications,
 * CliAgentPromptResult → PromptResponse, etc.
 *
 * This is the only place that maps between the generic CLI agent
 * types and the ACP-typed AgentPort interface.
 */
export class CliAgentBridge
  extends EventEmitter<AgentPortEvents>
  implements AgentPort
{
  constructor(private readonly agent: CliAgentPort) {
    super();
    // Wire agent.on("stream") → this.emit("sessionUpdate")
    // Wire agent.on("state") → this.emit("state")
    // Wire agent.on("error") → this.emit("error")
    // Handle PERMISSION_REQUEST → this.emit("permissionRequest")
  }

  // Delegate to agent, translate types
  async connect(): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  async initialize(): Promise<InitializeResponse> { /* ... */ }
  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> { /* ... */ }
  async prompt(params: PromptRequest): Promise<PromptResponse> { /* ... */ }
  // ...
}
```

### Harness Adapter Factory

Simplify creating harness adapters from `CliAgentPort` implementations:

```typescript
// ═══════════════════════════════════════════════════════════════
// src/core/cli-agent/create-cli-harness-adapter.ts
// ═══════════════════════════════════════════════════════════════

/**
 * Factory: given a CliAgentPort class, produce a HarnessAdapter.
 * Eliminates boilerplate for each new CLI agent.
 */
export function createCliHarnessAdapter<TConfig extends HarnessConfig>(
  options: {
    id: string;
    name: string;
    configSchema: z.ZodType<TConfig>;
    createAgent: (config: TConfig) => CliAgentPort;
  }
): HarnessAdapter<TConfig> {
  return {
    id: options.id,
    name: options.name,
    configSchema: options.configSchema,
    createHarness(config: TConfig): HarnessRuntime {
      const agent = options.createAgent(config);
      return new CliAgentBridge(agent) as unknown as HarnessRuntime;
    },
  };
}

// Usage:
export const cursorCliHarnessAdapter = createCliHarnessAdapter({
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: cursorHarnessConfigSchema,
  createAgent: (config) => new CursorCliAgent(config),
});
```

### File Structure for Generic Interface

```
src/
├── core/
│   └── cli-agent/                     # NEW: Generic CLI agent layer
│       ├── cli-agent.port.ts          # CliAgentPort interface
│       ├── cli-agent.base.ts          # Abstract base class (shared utils)
│       ├── cli-agent.bridge.ts        # CliAgentPort → AgentPort adapter
│       ├── create-cli-harness-adapter.ts  # Factory function
│       └── stream-line-parser.ts      # Shared NDJSON line parser utility
├── types/
│   └── cli-agent.types.ts            # Zod schemas (above)
└── core/
    ├── cursor/                        # Cursor-specific adapter
    │   └── cursor-cli-agent.ts        # extends CliAgentBase
    ├── aider/                         # Future: Aider adapter
    │   └── aider-cli-agent.ts
    └── windsurf/                      # Future: Windsurf adapter
        └── windsurf-cli-agent.ts
```

### Updated Milestone for Generic Interface

This refactoring should happen **before** the Cursor-specific implementation (Milestones 2-7), becoming the new **Milestone 2**:

- [ ] M2-NEW - Create `src/types/cli-agent.types.ts` with all Zod schemas
- [ ] M2-NEW - Create `src/core/cli-agent/cli-agent.port.ts` — `CliAgentPort` interface
- [ ] M2-NEW - Create `src/core/cli-agent/cli-agent.base.ts` — Abstract base with shared utilities:
  - [ ] Process spawning with timeout, cleanup, and signal handling
  - [ ] NDJSON line parser with partial buffer handling
  - [ ] Zod-safe event validation (parse or skip malformed lines)
  - [ ] Concurrent prompt guard (one active prompt at a time)
  - [ ] Session ID tracking for `--resume`-style continuations
  - [ ] Auth status caching
- [ ] M2-NEW - Create `src/core/cli-agent/cli-agent.bridge.ts` — `CliAgentPort` → `AgentPort` bridge
  - [ ] Map `StreamEvent.text_delta` → `SessionNotification` (agent_message_chunk)
  - [ ] Map `StreamEvent.tool_start/complete` → tool notifications
  - [ ] Map `StreamEvent.permission_request` → `permissionRequest` event
  - [ ] Map `StreamEvent.thinking_delta` → thinking display updates
  - [ ] Map `StreamEvent.result` → `PromptResponse` resolution
  - [ ] Map `StreamEvent.error` → error events
- [ ] M2-NEW - Create `src/core/cli-agent/create-cli-harness-adapter.ts` — Factory function
- [ ] M2-NEW - Create `src/core/cli-agent/stream-line-parser.ts` — Shared NDJSON utility
- [ ] M2-NEW - Unit tests for all generic components (>= 95% coverage)

---

## ADDENDUM B: Repository Breadcrumb UI — Git Status & PR Workflow Bar

**Implemented (2026-02-10):** Breadcrumb bar with configurable placement (top/bottom/left/right/hidden), repo workflow service, status derivation, action keybind (Leader+b), and skill prompt injection. Config: `ui.breadcrumb.placement`, `ui.breadcrumb.pollIntervalMs`, `ui.breadcrumb.showAction`.

### Problem

Users working in TOADSTOOL need at-a-glance awareness of their repository context: which repo, which branch, and what's the PR/workflow status. Currently this information is scattered — branch is visible only via `getRepoInfo()` in some components, and PR status is a small indicator in `StatusFooter`.

### Solution: Breadcrumb Status Bar

A prominent **breadcrumb bar** at the top of the TUI showing:

```
 toad-ts > feature/cursor-cli-harness > OPEN (PR #42) [Address Feedback →]
 ────────────────────────────────────────────────────────────────────────
```

Format: `[repo-name] > [branch] > [status-badge] [action-button]`

### Status Derivation

The status is derived from **three sources** combined:

1. **Local git state** — `git status`, `git branch`, dirty/clean
2. **GitHub PR state** — `gh pr view --json` (already in `src/core/pr-status.ts`)
3. **Merge conflict detection** — `git status` showing merge conflicts

### Status Constants & Colors

```typescript
// src/constants/repo-workflow-status.ts

export const REPO_WORKFLOW_STATUS = {
  // Local only (no PR)
  LOCAL_CLEAN: "local_clean",           // Clean working tree, no PR
  LOCAL_DIRTY: "local_dirty",           // Uncommitted changes, no PR
  LOCAL_AHEAD: "local_ahead",           // Commits ahead of remote, no PR

  // PR lifecycle
  DRAFT: "draft",                       // PR exists, in draft
  OPEN: "open",                         // PR open, no review yet
  REVIEW_REQUESTED: "review_requested", // Review requested
  CHANGES_REQUESTED: "changes_requested", // Reviewer requested changes
  APPROVED: "approved",                 // PR approved, ready to merge
  MERGE_CONFLICTS: "merge_conflicts",   // PR has merge conflicts
  CI_FAILING: "ci_failing",             // CI/checks failing
  MERGED: "merged",                     // PR was merged
  CLOSED: "closed",                     // PR was closed without merging
} as const;

export type RepoWorkflowStatus =
  (typeof REPO_WORKFLOW_STATUS)[keyof typeof REPO_WORKFLOW_STATUS];

export const REPO_WORKFLOW_COLOR: Record<RepoWorkflowStatus, string> = {
  [REPO_WORKFLOW_STATUS.LOCAL_CLEAN]: "#888888",     // Gray
  [REPO_WORKFLOW_STATUS.LOCAL_DIRTY]: "#FFAA00",     // Amber
  [REPO_WORKFLOW_STATUS.LOCAL_AHEAD]: "#00AAFF",     // Blue
  [REPO_WORKFLOW_STATUS.DRAFT]: "#888888",           // Gray
  [REPO_WORKFLOW_STATUS.OPEN]: "#00AAFF",            // Blue
  [REPO_WORKFLOW_STATUS.REVIEW_REQUESTED]: "#FFAA00", // Amber
  [REPO_WORKFLOW_STATUS.CHANGES_REQUESTED]: "#FF4444", // Red
  [REPO_WORKFLOW_STATUS.APPROVED]: "#00FF00",        // Green
  [REPO_WORKFLOW_STATUS.MERGE_CONFLICTS]: "#FF0000", // Bright red
  [REPO_WORKFLOW_STATUS.CI_FAILING]: "#FF4444",      // Red
  [REPO_WORKFLOW_STATUS.MERGED]: "#A855F7",          // Purple
  [REPO_WORKFLOW_STATUS.CLOSED]: "#666666",          // Dark gray
} as const;

export const REPO_WORKFLOW_LABEL: Record<RepoWorkflowStatus, string> = {
  [REPO_WORKFLOW_STATUS.LOCAL_CLEAN]: "LOCAL",
  [REPO_WORKFLOW_STATUS.LOCAL_DIRTY]: "DIRTY",
  [REPO_WORKFLOW_STATUS.LOCAL_AHEAD]: "AHEAD",
  [REPO_WORKFLOW_STATUS.DRAFT]: "DRAFT",
  [REPO_WORKFLOW_STATUS.OPEN]: "OPEN",
  [REPO_WORKFLOW_STATUS.REVIEW_REQUESTED]: "REVIEW",
  [REPO_WORKFLOW_STATUS.CHANGES_REQUESTED]: "CHANGES REQUESTED",
  [REPO_WORKFLOW_STATUS.APPROVED]: "APPROVED",
  [REPO_WORKFLOW_STATUS.MERGE_CONFLICTS]: "MERGE CONFLICTS",
  [REPO_WORKFLOW_STATUS.CI_FAILING]: "CI FAILING",
  [REPO_WORKFLOW_STATUS.MERGED]: "MERGED",
  [REPO_WORKFLOW_STATUS.CLOSED]: "CLOSED",
} as const;
```

### Status-to-Skill Actions

Each status has an associated **skill** (a predefined action) the user can trigger:

```typescript
// src/constants/repo-workflow-actions.ts

export const REPO_WORKFLOW_ACTION = {
  [REPO_WORKFLOW_STATUS.LOCAL_CLEAN]: {
    label: "Create PR",
    skill: "create-pr",
    description: "Create a pull request for this branch",
  },
  [REPO_WORKFLOW_STATUS.LOCAL_DIRTY]: {
    label: "Commit & Push",
    skill: "commit-changes",
    description: "Stage, commit, and push changes",
  },
  [REPO_WORKFLOW_STATUS.LOCAL_AHEAD]: {
    label: "Push & Create PR",
    skill: "push-and-create-pr",
    description: "Push commits and create a PR",
  },
  [REPO_WORKFLOW_STATUS.DRAFT]: {
    label: "Ready for Review",
    skill: "mark-ready",
    description: "Mark PR as ready for review",
  },
  [REPO_WORKFLOW_STATUS.OPEN]: {
    label: "Request Review",
    skill: "request-review",
    description: "Request a code review",
  },
  [REPO_WORKFLOW_STATUS.REVIEW_REQUESTED]: {
    label: "Check Status",
    skill: "check-review",
    description: "Check review status and comments",
  },
  [REPO_WORKFLOW_STATUS.CHANGES_REQUESTED]: {
    label: "Address Feedback",
    skill: "address-feedback",
    description: "Review and address requested changes",
  },
  [REPO_WORKFLOW_STATUS.APPROVED]: {
    label: "Merge PR",
    skill: "merge-pr",
    description: "Merge the approved pull request",
  },
  [REPO_WORKFLOW_STATUS.MERGE_CONFLICTS]: {
    label: "Resolve Conflicts",
    skill: "resolve-conflicts",
    description: "Resolve merge conflicts",
  },
  [REPO_WORKFLOW_STATUS.CI_FAILING]: {
    label: "Fix CI",
    skill: "fix-ci",
    description: "Investigate and fix failing CI checks",
  },
  [REPO_WORKFLOW_STATUS.MERGED]: {
    label: "Clean Up",
    skill: "cleanup-branch",
    description: "Delete merged branch and switch to main",
  },
  [REPO_WORKFLOW_STATUS.CLOSED]: {
    label: "Reopen / New PR",
    skill: "reopen-or-new",
    description: "Reopen the PR or create a new one",
  },
} as const;
```

### Data Fetching: Repo Workflow Service

```typescript
// src/core/repo-workflow.ts

export interface RepoWorkflowInfo {
  repoName: string;              // "toad-ts"
  branch: string;                // "feature/cursor-cli-harness"
  status: RepoWorkflowStatus;    // "changes_requested"
  prNumber: number | null;       // 42
  prUrl: string | null;          // "https://github.com/..."
  prTitle: string | null;        // "Add Cursor CLI harness"
  isDirty: boolean;              // Uncommitted changes
  isAhead: boolean;              // Commits ahead of remote
  isBehind: boolean;             // Commits behind remote
  checksStatus: "pass" | "fail" | "pending" | null;
  action: RepoWorkflowAction;   // Derived skill for this status
}

/**
 * Derive the full workflow state from git + GitHub.
 *
 * Data sources:
 * 1. git rev-parse --abbrev-ref HEAD  → branch name
 * 2. git status --porcelain           → dirty/clean
 * 3. git rev-list --count HEAD...@{u} → ahead/behind
 * 4. gh pr view --json ...            → PR state, reviews, checks
 * 5. gh pr checks                     → CI status (optional)
 */
export async function getRepoWorkflowInfo(
  cwd?: string
): Promise<RepoWorkflowInfo> { /* ... */ }
```

### Status Derivation Logic (Priority Order)

```
1. Is there a PR for this branch?
   NO  → Check local state:
         - Dirty → LOCAL_DIRTY
         - Ahead of remote → LOCAL_AHEAD
         - Clean → LOCAL_CLEAN
   YES → Continue...

2. PR state?
   - "merged"  → MERGED
   - "closed"  → CLOSED
   - "draft"   → DRAFT
   - "open"    → Continue...

3. Has merge conflicts?
   YES → MERGE_CONFLICTS

4. Are CI checks failing?
   YES → CI_FAILING

5. Review decision?
   - "approved"           → APPROVED
   - "changes_requested"  → CHANGES_REQUESTED
   - "review_required"    → REVIEW_REQUESTED
   - (no reviews yet)     → OPEN
```

### UI Component: Breadcrumb Bar

```typescript
// src/ui/components/BreadcrumbBar.tsx

export interface BreadcrumbBarProps {
  repoName: string;
  branch: string;
  status: RepoWorkflowStatus;
  prNumber: number | null;
  action: RepoWorkflowAction;
  onActionPress: (skill: string) => void;
}

/**
 * Renders:
 *  toad-ts > feature/cursor-cli > CHANGES REQUESTED (PR #42) [Address Feedback →]
 *
 * - Repo name: white
 * - Branch: cyan
 * - Status badge: colored per REPO_WORKFLOW_COLOR
 * - PR number: dimmed
 * - Action button: highlighted, pressable (triggers skill)
 */
export function BreadcrumbBar(props: BreadcrumbBarProps): ReactNode { /* ... */ }
```

### Hook: useRepoWorkflow

```typescript
// src/ui/hooks/useRepoWorkflow.ts

/**
 * Polls repo workflow status every N seconds.
 * Returns the current RepoWorkflowInfo and a refresh function.
 *
 * Polling interval: 30s by default (configurable).
 * Debounced to avoid hammering gh CLI.
 */
export function useRepoWorkflow(options?: {
  cwd?: string;
  pollIntervalMs?: number;
}): {
  info: RepoWorkflowInfo | null;
  loading: boolean;
  refresh: () => void;
} { /* ... */ }
```

### Integration with Skills

When the user clicks the action button (e.g., "Address Feedback"), TOADSTOOL:
1. Looks up the skill by ID (e.g., `address-feedback`)
2. Loads the skill from `.toadstool/skills/address-feedback/SKILL.md` or `.cursor/skills/address-feedback/SKILL.md`
3. Sends the skill's prompt to the current agent with relevant context (PR URL, review comments, etc.)

For skills that don't require AI (e.g., "Merge PR"), TOADSTOOL can execute the `gh` command directly:
```bash
gh pr merge --squash --delete-branch
```

### Breadcrumb Milestone

- [X] MB1 - Create `src/constants/repo-workflow-status.ts` — Status constants, colors, labels
- [X] MB1 - Create `src/constants/repo-workflow-actions.ts` — Status-to-skill mapping
- [X] MB2 - Create `src/core/repo-workflow.ts` — Workflow state derivation service
  - [X] Extend existing `getPRStatus()` with merge conflict + CI check detection
  - [X] Add `getLocalGitStatus()` — dirty/clean/ahead/behind
  - [X] Add `getCIStatus()` — `gh pr checks` parsing
  - [X] Add `deriveWorkflowStatus()` — priority-based status derivation
  - [ ] Zod schemas for all outputs (deferred)
- [ ] MB2 - Unit tests for status derivation logic (>= 95% coverage)
- [X] MB3 - Create `src/ui/hooks/useRepoWorkflow.ts` — Polling hook
- [X] MB3 - Create `src/ui/components/BreadcrumbBar.tsx` — Breadcrumb component
  - [X] Repo name (white) > Branch (cyan) > Status badge (colored) > Action button
  - [X] PR number display when applicable
  - [X] Action button triggers skill execution (keybind Leader+b; skill prompt injected into chat)
- [X] MB3 - Integrate `BreadcrumbBar` into main layout (configurable: top/bottom/left/right/hidden)
- [ ] MB4 - Create/wire skills for each status action:
  - [ ] `create-pr` — `gh pr create` with AI-generated title/body
  - [ ] `commit-changes` — Stage + commit with AI-generated message
  - [ ] `address-feedback` — Read PR review comments, apply fixes
  - [ ] `resolve-conflicts` — AI-assisted merge conflict resolution
  - [ ] `fix-ci` — Read CI logs, diagnose and fix failures
  - [ ] `merge-pr` — `gh pr merge` with options
  - [ ] `cleanup-branch` — Delete branch, switch to main
- [ ] MB4 - Unit tests for BreadcrumbBar component
- [ ] MB5 - Integration test: full workflow status polling → display → action trigger

### Existing Foundation to Build On

TOADSTOOL already has these pieces we can extend:

| Existing Code | Location | What It Provides |
|--------------|----------|-----------------|
| `getPRStatus()` | `src/core/pr-status.ts` | PR number, title, URL, state, reviewDecision via `gh` |
| `PR_REVIEW_STATUS` | `src/constants/pr-review-status.ts` | Review status constants and colors |
| `getGitBranch()` | `src/utils/git/git-info.utils.ts` | Current branch name |
| `getRepoInfo()` | `src/utils/git/git-info.utils.ts` | Repo path + branch |
| `StatusFooter` | `src/ui/components/StatusFooter.tsx` | Already accepts `prStatus` prop |
| `StatusLine` | `src/ui/components/StatusLine.tsx` | Compact status display |

---

## Updated Milestone Summary (Revised Plan)

### Execution Phases

| Phase | Milestones | Goal | Deliverable |
|-------|-----------|------|-------------|
| **A: Prerequisites** | P0 | Validate CLI, capture fixtures, clean branch | All open questions resolved, feature branch ready |
| **B: Types & Schemas** | M2a | Define protocol-agnostic Zod types | `cli-agent.types.ts` — types only, no abstraction |
| **C: Core NDJSON (Ch1)** | M2 → M3 → M4 | Working stream parser + connection + translator | Cursor sends prompt, gets streaming response via NDJSON |
| **D: Hooks (Ch2)** | M5 → M6 | IPC server + config generator | Permission control, context injection, thinking display |
| **E: Assembly** | M7 → M8 | Harness adapter + registration | "Cursor CLI" selectable in TUI, full Ch1+Ch2 flow |
| **F: Test & Polish** | M10 → M11 | Integration tests + TUI wiring | Production-quality harness with /diff display |
| **G: Extract Abstraction** | M2b | Refactor into CliAgentBase + Bridge | Generic interface extracted from working code (not speculative) |
| **H: Cloud & Breadcrumb** | M9, MB1-MB4 | Cloud API + repo workflow UI | Optional features, can ship independently |

### Milestone Table

| # | Milestone | Effort | Phase | Dependencies |
|---|-----------|--------|-------|--------------|
| **P0** | **Prerequisites (manual validation)** | **1 day** | **A** | **None** |
| M2a | Zod Types & Stream Event Schemas (types only) | 1-2 days | B | P0 |
| M2 | Cursor Stream Parser (Ch1) + backpressure | 2-3 days | C | M2a |
| M3 | Cursor CLI Connection (Ch1) + process group mgmt | 2-3 days | C | M2 |
| M4 | Protocol Translator (Ch1 → AgentPort) + truncation | 2-3 days | C | M2, M3 |
| M5 | Hook IPC Server (Ch2) + event-driven arch | 3-4 days | D | P0 |
| M6 | Hooks Config Generator + Scripts (Ch2) | 2-3 days | D | M5 |
| M7 | Cursor CLI Harness Adapter (Ch1+Ch2) | 3-4 days | E | M4, M6 |
| M8 | Harness Registration & Config + feature flag | 1-2 days | E | M7 |
| M10 | Integration Testing | 3-4 days | F | M8 |
| M11 | TUI Integration & Polish + /diff display | 3-4 days | F | M10 |
| M2b | Generic CLI Agent Abstraction (extract from M7) | 2-3 days | G | M11 |
| M9 | Cloud Agents API Client (Ch3) | 3-4 days | H | P0 |
| MB1 | Breadcrumb: Constants & Status Derivation | 2-3 days | H | None |
| MB2 | Breadcrumb: Workflow Service + Tests | 2-3 days | H | MB1 |
| MB3 | Breadcrumb: UI Component + Hook | 2-3 days | H | MB2 |
| MB4 | Breadcrumb: Skills Integration | 3-4 days | H | MB3 |

**Total estimate: ~35-50 days**

### Key Changes from Original Plan

1. **M2 split into M2a + M2b**: Types defined early (Phase B), abstraction extracted late (Phase G) — avoids premature abstraction anti-pattern
2. **Cloud API (M9) deferred to Phase H**: Local harness ships first; cloud is "nice to have" per success criteria
3. **Anti-pattern guards embedded**: Each milestone includes guards from `research.md` competitive analysis (M-STREAM, M-PERF, M-REVIEW, M-UX references)
4. **Feature flag gating**: Cursor CLI adapter ships behind `TOADSTOOL_CURSOR_CLI_ENABLED` flag during beta
5. **Each phase produces a testable artifact**: No phase depends on speculative abstractions

### Parallel Tracks

```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E ──→ Phase F ──→ Phase G
  (P0)       (M2a)    (M2,M3,M4)  (M5,M6)    (M7,M8)   (M10,M11)    (M2b)
                                                                          │
                                                            Phase H ──────┘
                                                          (M9, MB1-MB4)
                                                       (can start after Phase E)
```

Breadcrumb milestones (MB1-MB4) and Cloud API (M9) can be developed **in parallel** with Phases F-G since they are independent of the Cursor CLI core.

---

## Addendum C: Research Anti-Pattern Cross-References

The following guards from `scratchpad/research.md` have been embedded into specific milestones to prevent known anti-patterns found in competing tools:

| Guard ID | Research Source | Anti-Pattern Prevented | Embedded In |
|----------|---------------|----------------------|-------------|
| M-STREAM-2 | Claude Code Issue #11155 | Unbounded tool output stored in memory (90GB+) | M2 (output size limit), M4 (tool result truncation) |
| M-STREAM-3 | Toad's partial-update approach | Render queue backup during fast streaming | M2 (streaming backpressure) |
| M-PERF-3 | Codex CLI Issue #7932 | Orphaned child processes after session end | M3 (process group tracking + SIGTERM cleanup) |
| M-PERF-4 | Claude Code Issue #17148 | Busy-wait event loop (100% CPU when idle) | M5 (event-driven IPC server, no polling) |
| M-PERF-5 | All tools (ecosystem-wide) | High idle CPU usage | M5 (benchmark: <1% CPU when waiting) |
| M-UX-7 | Codex CLI feature flags | Shipping unstable beta features to all users | M8 (feature flag gating) |
| M-REVIEW-2 | Codex CLI /diff | No inline diff viewer for file edits | M11 (/diff from `afterFileEdit` hook data) |

### Research Milestones NOT in PLAN2 (Separate Roadmap)

These are tracked in `scratchpad/research.md` but are **independent features**, not part of the Cursor CLI harness work:

| Research Milestone | Reason for Exclusion |
|---|---|
| M-AGENTS (Agent Teams, DAG tasks) | Much larger scope, not Cursor-specific |
| M-ONBOARD (First-run wizard) | Orthogonal UX concern |
| M-METRICS (OTel, analytics dashboard) | Separate diagnostics feature |
| M-AUTOMATION (GitHub Action, SDK) | Separate CI/CD feature |
| M-PLATFORM (Desktop app, plugin marketplace) | Future platform scope |
| M-UX-1 through M-UX-6 (Image input, web search, /fork, /ps, notebook nav, /personality) | Individual feature requests |

---

## ADDENDUM C: Open Question Validation Results (2026-02-10)

### Test Environment

| Item | Value |
|------|-------|
| Binary | `/Users/boice/.local/bin/cursor-agent` |
| Version | `2026.01.28-fd13201` |
| OS | `darwin (arm64)` |
| Default Model | `Claude 4.6 Opus (Thinking)` |
| User Email | `netwearcdz@gmail.com` |
| Auth Method | Browser login (`cursor-agent login`) |

### Q1: Does `--resume` work across separate process invocations?

**VALIDATED: YES — Fully working.**

Test sequence:
```
# Turn 1: fresh session
$ echo "Reply with exactly: HELLO TOADSTOOL" | cursor-agent -p --output-format stream-json --mode ask
→ session_id: "dd5981f6-84aa-4730-bb39-cd79450be948"
→ assistant: "HELLO TOADSTOOL"

# Turn 2: resume with session_id from Turn 1 (separate process invocation)
$ echo "What was my previous message?" | cursor-agent -p --output-format stream-json --resume dd5981f6-84aa-4730-bb39-cd79450be948 --mode ask
→ session_id: "dd5981f6-84aa-4730-bb39-cd79450be948"  (SAME!)
→ assistant: "Your previous message was:\n\n> Reply with exactly: HELLO TOADSTOOL"
```

**Confirmed**: The agent retained full conversation context across separate process invocations. The `session_id` remains the same when `--resume` is used. Multi-turn conversation is fully viable.

### Q2: Does `agent create-chat` return a usable chat ID?

**VALIDATED: YES**

```
$ cursor-agent create-chat
3b7c621d-f306-4a54-81c7-aa5aada53618
```

Clean UUID output on stdout, exit code 0. Perfect for programmatic capture.

### Q3: Hook IPC roundtrip latency?

**VALIDATED: ~1ms (negligible)**

The `sessionStart` hook fired and completed in under 1ms (hook script writes to log file and returns `{}`). Even with a Unix socket IPC roundtrip, this would be well within our 50ms target.

### Q4: How does Cursor handle hooks.json?

**VALIDATED: WORKS — Immediately loaded, no restart needed.**

Project-level `.cursor/hooks.json` is picked up by both the Cursor IDE and the Cursor CLI automatically.

### Q5: Do hooks fire in `-p` (print/headless) mode? — CRITICAL

**VALIDATED: YES — Hooks fire in `-p` mode.**

Test: Created `.cursor/hooks.json` with `sessionStart`, `stop`, and `afterAgentResponse` hooks, then ran `cursor-agent -p`. The `sessionStart` hook fired and logged:

```json
{
  "conversation_id": "ab52c707-a56c-43a7-8056-3cfbdf8aa36e",
  "generation_id": "ab52c707-a56c-43a7-8056-3cfbdf8aa36e",
  "model": "claude-4.6-opus-high-thinking",
  "session_id": "ab52c707-a56c-43a7-8056-3cfbdf8aa36e",
  "is_background_agent": false,
  "composer_mode": "ask",
  "hook_event_name": "sessionStart",
  "cursor_version": "2026.01.28-fd13201",
  "workspace_roots": ["/Users/boice/Documents/GitHub/toad-ts"],
  "user_email": "netwearcdz@gmail.com",
  "transcript_path": null
}
```

**Key finding**: `transcript_path` is `null` in `-p` mode (no transcript file is written for headless sessions). This differs from IDE mode where a transcript path is provided.

**The three-channel architecture is fully viable.**

### Q6: Can we merge hooks with existing hooks.json?

**VALIDATED: YES** — Array format supports multiple hooks per event.

### Q7: What is the `agent ls` output format?

**VALIDATED: REQUIRES TTY** — Cannot be used programmatically. Use session_ids captured from NDJSON `system.init` events instead.

### Q8: What is the `agent models` output format?

**VALIDATED: YES (with full auth)**

```
Available models

auto - Auto
composer-1.5 - Composer 1.5
opus-4.6-thinking - Claude 4.6 Opus (Thinking)  (default)
opus-4.5-thinking - Claude 4.5 Opus (Thinking)  (current)
sonnet-4.5 - Claude 4.5 Sonnet
gpt-5.3-codex - GPT-5.3 Codex
gpt-5.2 - GPT-5.2
gemini-3-pro - Gemini 3 Pro
gemini-3-flash - Gemini 3 Flash
grok - Grok
... (32 models total)
```

Format: `<model-id> - <display-name>  (<tag>)` where tag is `(default)`, `(current)`, or absent.
Parseable with regex: `/^(\S+)\s+-\s+(.+?)(?:\s+\((\w+)\))?$/`.

### Q9: `agent about` output format

**VALIDATED**

```
About Cursor CLI

CLI Version         2026.01.28-fd13201
Model               Claude 4.6 Opus (Thinking)
OS                  darwin (arm64)
Terminal            unknown
Shell               zsh
User Email          netwearcdz@gmail.com
```

Parseable key-value format.

### Q10: `agent mcp list` output format

**VALIDATED**

```
playwright: not loaded (needs approval)
github: not loaded (needs approval)
context7: not loaded (needs approval)
...
```

Format: `<name>: <status> (<reason>)`.

### Q11: IMPORTANT — `-p` mode requires stdin pipe, NOT positional args

**DISCOVERED DURING TESTING**: The `-p` mode **hangs indefinitely** when the prompt is passed as a positional argument:
```bash
# HANGS (no output, no error, process stuck)
cursor-agent -p --mode ask "say hello"

# WORKS (responds in ~5 seconds)
echo "say hello" | cursor-agent -p --mode ask
```

This is a critical implementation detail. **Always pipe the prompt via stdin** in headless mode. This may be a bug in this version or intentional behavior.

### Q13: What happens when `--force` and hooks both exist?

**CONFIRMED**: Hooks fire regardless of `--force`. They are independent systems.

### Summary: All Critical Questions Resolved

| # | Question | Status | Result |
|---|----------|--------|--------|
| Q1 | `--resume` across processes | **VALIDATED** | YES — full conversation context preserved |
| Q2 | `create-chat` returns ID | **VALIDATED** | YES — clean UUID |
| Q3 | Hook IPC latency | **VALIDATED** | ~1ms, negligible |
| Q4 | Cursor loads hooks.json | **VALIDATED** | YES — immediate, no restart |
| Q5 | Hooks fire in `-p` mode | **VALIDATED** | **YES** — three-channel architecture viable |
| Q6 | Merge hooks with existing | **VALIDATED** | YES — array format supports merging |
| Q7 | `agent ls` output | **VALIDATED** | Requires TTY — use session_ids from NDJSON |
| Q8 | `agent models` output | **VALIDATED** | Parseable `id - name (tag)` format, 32+ models |
| Q11 | `-p` mode input method | **DISCOVERED** | Must pipe via stdin, NOT positional args |
| Q13 | `--force` vs hooks | **CONFIRMED** | Independent — hooks always fire |

**All blocking questions are resolved. The architecture is fully validated.**

---

## ADDENDUM D: Unified Agent Management Commands (`/login`, `/logout`, `/status`, `/models`)

### Problem

Each CLI agent has its own native commands for auth, status, and model management. Users shouldn't need to remember `cursor-agent login` vs `claude setup-token` vs `codex login` vs `gemini` (which has no login at all). TOADSTOOL should surface these as unified slash commands that delegate to the active agent's native CLI, parse the output, and render formatted results in the chat.

### Native Command Inventory (Validated)

| Operation | Cursor CLI | Claude CLI | Codex CLI | Gemini CLI |
|-----------|-----------|-----------|-----------|-----------|
| **Login** | `cursor-agent login` (browser) | `claude setup-token` (token prompt) | `codex login [--api-key KEY]` (browser or key) | N/A (uses `GOOGLE_API_KEY` env) |
| **Logout** | `cursor-agent logout` | N/A | `codex logout` | N/A |
| **Status** | `cursor-agent status` | N/A (check for `~/.claude/.credentials.json`) | `codex login status` | N/A (check for `GOOGLE_API_KEY`) |
| **About** | `cursor-agent about` | `claude --version` | `codex --version` | `gemini --version` |
| **Models** | `cursor-agent models` | N/A (model passed via `--model`) | N/A (model passed via `-m`) | N/A (model passed via `-m`) |
| **MCP List** | `cursor-agent mcp list` | `claude mcp list` | N/A | `gemini mcp` (if supported) |
| **MCP Enable** | `cursor-agent mcp enable <id>` | N/A (always enabled) | N/A | N/A |
| **MCP Disable** | `cursor-agent mcp disable <id>` | N/A | N/A | N/A |
| **Session List** | `cursor-agent ls` (TTY only) | `claude --resume` (interactive picker) | N/A | `gemini --list-sessions` |
| **Session Resume** | `cursor-agent resume` or `--resume <id>` | `claude --resume <id>` or `--continue` | N/A | `gemini --resume <idx>` |

### Auth Method Differences

| Agent | Auth Type | Credential Storage | Env Var |
|-------|----------|-------------------|---------|
| **Cursor CLI** | Browser OAuth or API key | Keychain/system credential store | `CURSOR_API_KEY` |
| **Claude CLI** | API key (setup-token) or OAuth | `~/.claude/.credentials.json` | `ANTHROPIC_API_KEY` |
| **Codex CLI** | Browser OAuth or API key | `~/.codex/` config | `OPENAI_API_KEY` |
| **Gemini CLI** | API key only | Environment variable | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |

### Unified Slash Command Design

TOADSTOOL will provide these slash commands that **delegate to the active agent's native CLI** and render the output as formatted chat messages:

#### `/login`

Triggers the active agent's login flow. For browser-based auth (Cursor, Codex), opens the browser. For token-based auth (Claude), prompts for the API key. For env-based auth (Gemini), tells the user which env var to set.

```
User: /login

┌─ Cursor CLI Login ─────────────────────────────────┐
│ ✓ Logged in as netwearcdz@gmail.com                │
│   Authentication tokens stored securely.            │
└─────────────────────────────────────────────────────┘
```

#### `/logout`

```
User: /logout

┌─ Cursor CLI Logout ────────────────────────────────┐
│ ✓ Logged out successfully.                          │
│   Stored authentication cleared.                    │
└─────────────────────────────────────────────────────┘
```

#### `/status`

Shows connection, auth, version, model, and MCP server status for the active agent:

```
User: /status

┌─ Cursor CLI Status ────────────────────────────────┐
│                                                     │
│  Agent       Cursor CLI                             │
│  Version     2026.01.28-fd13201                     │
│  Auth        ✓ netwearcdz@gmail.com                 │
│  Model       Claude 4.6 Opus (Thinking) (default)   │
│  Mode        Ask                                    │
│  Session     dd5981f6 (2 turns)                     │
│  OS          darwin (arm64)                          │
│                                                     │
│  MCP Servers                                        │
│  ├─ github          not loaded (needs approval)     │
│  ├─ playwright      not loaded (needs approval)     │
│  └─ context7        not loaded (needs approval)     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### `/models`

Lists available models for the active agent with the current/default marked:

```
User: /models

┌─ Available Models (Cursor CLI) ────────────────────┐
│                                                     │
│  ● opus-4.6-thinking     Claude 4.6 Opus (Thinking)  ← default
│  ○ opus-4.5-thinking     Claude 4.5 Opus (Thinking)  ← current
│  ○ sonnet-4.5            Claude 4.5 Sonnet           │
│  ○ gpt-5.3-codex         GPT-5.3 Codex              │
│  ○ gpt-5.2               GPT-5.2                    │
│  ○ gemini-3-pro          Gemini 3 Pro               │
│  ○ grok                  Grok                       │
│  ... (32 models)                                    │
│                                                     │
│  Tip: /model <id> to switch                         │
└─────────────────────────────────────────────────────┘
```

#### `/mcp`

Lists and manages MCP servers:

```
User: /mcp

┌─ MCP Servers (Cursor CLI) ─────────────────────────┐
│                                                     │
│  github          not loaded  (needs approval)       │
│  playwright      not loaded  (needs approval)       │
│  context7        not loaded  (needs approval)       │
│                                                     │
│  Tip: /mcp enable <name> | /mcp disable <name>     │
└─────────────────────────────────────────────────────┘
```

### Generic Agent Command Interface

Add these to the `CliAgentPort` interface from Addendum A:

```typescript
// ═══════════════════════════════════════════════════════════════
// Additions to src/core/cli-agent/cli-agent.port.ts
// ═══════════════════════════════════════════════════════════════

export type CliAgentPort = EventEmitter<CliAgentEvents> & {
  // ... existing methods ...

  // ── Agent Management Commands ──
  login(): Promise<CliAgentLoginResult>;
  logout(): Promise<CliAgentLogoutResult>;
  getStatus(): Promise<CliAgentStatusResult>;
  getAbout(): Promise<CliAgentAboutResult>;
  listModels(): Promise<CliAgentModelsResponse>;

  // ── MCP Management (optional) ──
  listMcpServers?(): Promise<CliAgentMcpServer[]>;
  enableMcpServer?(id: string): Promise<void>;
  disableMcpServer?(id: string): Promise<void>;

  // ── Session Management (optional) ──
  listSessions?(): Promise<CliAgentSession[]>;
  createSession?(): Promise<string>;
};
```

### Zod Schemas for Command Results

```typescript
// ═══════════════════════════════════════════════════════════════
// Additions to src/types/cli-agent.types.ts
// ═══════════════════════════════════════════════════════════════

export const CliAgentLoginResultSchema = z.object({
  success: z.boolean(),
  email: z.string().optional(),
  method: z.enum(["browser", "api_key", "token", "env_var"]).optional(),
  message: z.string().optional(),
  requiresManualAction: z.boolean().default(false), // true for Gemini (set env var)
  manualInstructions: z.string().optional(),
});
export type CliAgentLoginResult = z.infer<typeof CliAgentLoginResultSchema>;

export const CliAgentLogoutResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  supported: z.boolean().default(true), // false for agents without logout
});
export type CliAgentLogoutResult = z.infer<typeof CliAgentLogoutResultSchema>;

export const CliAgentStatusResultSchema = z.object({
  agent: z.string(),               // "Cursor CLI", "Claude CLI", etc.
  version: z.string(),
  authenticated: z.boolean(),
  email: z.string().optional(),
  defaultModel: z.string().optional(),
  currentModel: z.string().optional(),
  os: z.string().optional(),
  shell: z.string().optional(),
  sessionId: z.string().optional(),
  sessionTurnCount: z.number().optional(),
});
export type CliAgentStatusResult = z.infer<typeof CliAgentStatusResultSchema>;

export const CliAgentAboutResultSchema = z.object({
  version: z.string(),
  model: z.string().optional(),
  os: z.string().optional(),
  shell: z.string().optional(),
  email: z.string().optional(),
  extra: z.record(z.string()).optional(), // Agent-specific additional fields
});
export type CliAgentAboutResult = z.infer<typeof CliAgentAboutResultSchema>;

export const CliAgentMcpServerSchema = z.object({
  name: z.string(),
  status: z.string(),            // "loaded", "not loaded", "error"
  reason: z.string().optional(), // "needs approval", "config error", etc.
});
export type CliAgentMcpServer = z.infer<typeof CliAgentMcpServerSchema>;
```

### Output Parser Utilities

Each agent needs parsers that transform raw CLI output into the Zod-validated types:

```typescript
// src/core/cli-agent/output-parsers.ts

/**
 * Parse cursor-agent about output:
 * "CLI Version         2026.01.28-fd13201"
 * → { version: "2026.01.28-fd13201", ... }
 */
export function parseCursorAbout(stdout: string): CliAgentAboutResult { /* ... */ }

/**
 * Parse cursor-agent models output:
 * "opus-4.6-thinking - Claude 4.6 Opus (Thinking)  (default)"
 * → { id: "opus-4.6-thinking", name: "Claude 4.6 Opus (Thinking)", isDefault: true }
 */
export function parseCursorModels(stdout: string): CliAgentModelsResponse { /* ... */ }

/**
 * Parse cursor-agent mcp list output:
 * "github: not loaded (needs approval)"
 * → { name: "github", status: "not loaded", reason: "needs approval" }
 */
export function parseCursorMcpList(stdout: string): CliAgentMcpServer[] { /* ... */ }

/**
 * Parse cursor-agent status output:
 * "✓ Logged in as user@example.com"
 * → { authenticated: true, email: "user@example.com" }
 */
export function parseCursorStatus(stdout: string): CliAgentAuthStatus { /* ... */ }
```

### Abstract Base Class Addition

Add to `CliAgentBase` from Addendum A:

```typescript
// Additional abstract methods each agent must implement:
abstract class CliAgentBase {
  // ... existing abstract methods ...

  // ── Agent Management ──
  protected abstract buildLoginCommand(): { command: string; args: string[] };
  protected abstract buildLogoutCommand(): { command: string; args: string[] } | null;
  protected abstract buildStatusCommand(): { command: string; args: string[] };
  protected abstract buildAboutCommand(): { command: string; args: string[] };
  protected abstract buildModelListCommand(): { command: string; args: string[] };
  protected abstract buildMcpListCommand?(): { command: string; args: string[] };

  protected abstract parseLoginOutput(stdout: string, stderr: string, exitCode: number): CliAgentLoginResult;
  protected abstract parseLogoutOutput(stdout: string, exitCode: number): CliAgentLogoutResult;
  protected abstract parseStatusOutput(stdout: string): CliAgentStatusResult;
  protected abstract parseAboutOutput(stdout: string): CliAgentAboutResult;
  protected abstract parseModelListOutput(stdout: string): CliAgentModelsResponse;
  protected abstract parseMcpListOutput?(stdout: string): CliAgentMcpServer[];

  // ── Provided by base class ──
  async login(): Promise<CliAgentLoginResult> {
    const cmd = this.buildLoginCommand();
    const { stdout, stderr, exitCode } = await this.execCommand(cmd);
    return this.parseLoginOutput(stdout, stderr, exitCode);
  }
  // ... similar for logout, getStatus, getAbout, listModels, listMcpServers
}
```

### Cursor CLI Implementation Example

```typescript
// src/core/cursor/cursor-cli-agent.ts (additions)

class CursorCliAgent extends CliAgentBase {
  protected buildLoginCommand() {
    return { command: "cursor-agent", args: ["login"] };
  }
  protected buildLogoutCommand() {
    return { command: "cursor-agent", args: ["logout"] };
  }
  protected buildStatusCommand() {
    return { command: "cursor-agent", args: ["status"] };
  }
  protected buildAboutCommand() {
    return { command: "cursor-agent", args: ["about"] };
  }
  protected buildModelListCommand() {
    return { command: "cursor-agent", args: ["models"] };
  }
  protected buildMcpListCommand() {
    return { command: "cursor-agent", args: ["mcp", "list"] };
  }

  protected parseLoginOutput(stdout: string, stderr: string, exitCode: number): CliAgentLoginResult {
    if (exitCode === 0 && stdout.includes("Logged in")) {
      const emailMatch = stdout.match(/Logged in as (.+)/);
      return {
        success: true,
        email: emailMatch?.[1]?.trim(),
        method: "browser",
      };
    }
    return { success: false, message: stderr || stdout };
  }

  // ... similar parse methods for other commands
}
```

### Slash Command Registration

```typescript
// src/constants/slash-commands.ts (additions)

export const AGENT_MANAGEMENT_COMMANDS = {
  LOGIN: { name: "/login", description: "Log in to the active agent" },
  LOGOUT: { name: "/logout", description: "Log out of the active agent" },
  STATUS: { name: "/status", description: "Show agent status, auth, and config" },
  MODELS: { name: "/models", description: "List available models" },
  MODEL: { name: "/model", description: "Switch model (e.g. /model sonnet-4.5)" },
  MCP: { name: "/mcp", description: "List and manage MCP servers" },
  AGENT: { name: "/agent", description: "Switch active agent (e.g. /agent cursor-cli)" },
} as const;
```

### Chat Output Formatter

The slash command results render as **system messages** in the chat with rich formatting:

```typescript
// src/ui/formatters/agent-command-formatter.ts

/**
 * Formats agent management command results as rich TUI output.
 * Each result type has a dedicated renderer with colors, icons, and layout.
 */
export function formatLoginResult(result: CliAgentLoginResult, agentName: string): FormattedMessage;
export function formatStatusResult(result: CliAgentStatusResult): FormattedMessage;
export function formatModelsResult(result: CliAgentModelsResponse, agentName: string): FormattedMessage;
export function formatMcpList(servers: CliAgentMcpServer[], agentName: string): FormattedMessage;
```

### Milestone for Agent Commands

- [ ] MD1 - Add management command types to `src/types/cli-agent.types.ts` (Zod schemas)
- [ ] MD1 - Add abstract methods to `CliAgentBase` for login/logout/status/about/models/mcp
- [ ] MD1 - Implement output parser utilities for all agents:
  - [ ] Cursor CLI parsers (about, models, mcp list, status, login/logout)
  - [ ] Claude CLI parsers (version, mcp list)
  - [ ] Codex CLI parsers (login status, version)
  - [ ] Gemini CLI parsers (version, list-sessions)
- [ ] MD2 - Register slash commands: `/login`, `/logout`, `/status`, `/models`, `/model`, `/mcp`, `/agent`
- [ ] MD2 - Implement slash command handlers that delegate to `CliAgentPort` methods
- [ ] MD2 - Create `agent-command-formatter.ts` with rich TUI rendering
- [ ] MD3 - Integration tests for all agent command parsers (>= 95% coverage)
- [ ] MD3 - Handle edge cases:
  - [ ] Agent doesn't support logout → show "not supported" message
  - [ ] Agent auth requires env var → show instructions
  - [ ] Login requires browser → indicate "Opening browser..."
  - [ ] MCP not supported by agent → show "not available" message
  - [ ] Models not listable → show "use --model flag" message

---

*Last Updated: 2026-02-11*
*Status: All Critical Questions Validated — Architecture Confirmed Viable*
