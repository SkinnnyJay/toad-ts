# TOADSTOOL User Stories

This document catalogs all user stories for the TOADSTOOL CLI application, organized by feature area. Each story includes testability assessment and test recommendations.

---

## 🚀 Application Launch & Initialization

### US-001: Launch CLI without arguments
**As a** user  
**I want to** launch TOADSTOOL without any arguments  
**So that** I can be prompted to select an agent interactively

**Acceptance Criteria:**
- CLI starts and displays agent selection UI
- User can select from available agents
- After selection, main chat interface appears

**Testability:** ✅ **E2E Test**  
**Test Type:** Integration test with mock harness  
**Test File:** `__tests__/e2e/cli-launch.e2e.test.ts`

---

### US-002: Launch CLI with provider flag
**As a** user  
**I want to** launch TOADSTOOL with `-p claude` flag  
**So that** I can skip agent selection and go directly to Claude

**Acceptance Criteria:**
- CLI starts directly with Claude agent
- No agent selection prompt appears
- Chat interface loads immediately

**Testability:** ✅ **E2E Test**  
**Test Type:** Integration test  
**Test File:** `__tests__/e2e/cli-launch.e2e.test.ts`

---

### US-003: Launch CLI in specific directory
**As a** user  
**I want to** launch TOADSTOOL with a directory path  
**So that** the agent has context from that directory

**Acceptance Criteria:**
- CLI starts in the specified directory
- Agent's working directory is set correctly
- File operations are scoped to that directory

**Testability:** ✅ **E2E Test**  
**Test Type:** Integration test  
**Test File:** `__tests__/e2e/cli-launch.e2e.test.ts`

---

## 🔄 Agent Management

### US-004: Select agent from list
**As a** user  
**I want to** select an agent from a list of available agents  
**So that** I can choose which AI provider to use

**Acceptance Criteria:**
- Agent selection UI displays all available agents
- User can navigate with keyboard (arrow keys)
- Selection is confirmed with Enter
- Selected agent becomes active

**Testability:** ✅ **Unit + Integration**  
**Test Type:** 
- Unit: `__tests__/unit/ui/agent-select.unit.test.ts` (already exists)
- Integration: `__tests__/integration/ui/agent-selection.integration.test.ts`

---

### US-005: Switch agent mid-session (Ctrl+P)
**As a** user  
**I want to** press Ctrl+P to switch agents  
**So that** I can change providers without restarting

**Acceptance Criteria:**
- Agent selection UI appears when Ctrl+P is pressed
- Current session is preserved
- New agent becomes active after selection
- Messages from previous agent remain visible

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test with keyboard simulation  
**Test File:** `__tests__/integration/ui/agent-switching.integration.test.ts`

---

### US-006: View agent connection status
**As a** user  
**I want to** see the connection status of my agent  
**So that** I know if the agent is ready to receive messages

**Acceptance Criteria:**
- Status bar displays connection status (disconnected/connecting/connected)
- Status updates in real-time
- Visual indicator (color/icon) shows current state

**Testability:** ✅ **Unit + Integration**  
**Test Type:** 
- Unit: `__tests__/unit/ui/status-line.unit.test.ts`
- Integration: `__tests__/integration/ui/connection-status.integration.test.ts`

---

## 💬 Messaging & Chat

### US-007: Send a message
**As a** user  
**I want to** type a message and press Enter  
**So that** I can send it to the agent

**Acceptance Criteria:**
- Message appears in chat history immediately
- Message is sent to agent
- User input is cleared after sending

**Testability:** ✅ **Unit + Integration**  
**Test Type:** 
- Unit: `__tests__/unit/ui/chat-components.unit.test.ts` (already exists)
- Integration: `__tests__/integration/ui/messaging.integration.test.ts`

---

### US-008: Receive streaming response
**As a** user  
**I want to** see agent responses stream in real-time  
**So that** I can read responses as they're generated

**Acceptance Criteria:**
- Response appears character-by-character
- No flickering or jank during streaming
- Streaming indicator shows while response is in progress
- Response completes cleanly

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test with mock streaming  
**Test File:** `__tests__/integration/core/session-stream.integration.test.ts` (already exists)

---

### US-009: View message history
**As a** user  
**I want to** see all previous messages in the conversation  
**So that** I can reference earlier parts of the conversation

**Acceptance Criteria:**
- All messages are displayed in chronological order
- User and agent messages are visually distinct
- Messages are scrollable if they exceed screen height
- Timestamps are shown (if enabled)

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with the OpenTUI test renderer  
**Test File:** `__tests__/unit/ui/message-list.unit.test.ts`

---

### US-010: Multi-line message input
**As a** user  
**I want to** press Shift+Enter to create a new line  
**So that** I can write longer, formatted messages

**Acceptance Criteria:**
- Shift+Enter creates a new line in input
- Enter alone sends the message
- Multi-line messages are preserved when sent

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with stdin simulation  
**Test File:** `__tests__/unit/ui/chat-components.unit.test.ts` (extend existing)

---

### US-011: Navigate input history (↑/↓)
**As a** user  
**I want to** press ↑/↓ to navigate previous messages  
**So that** I can reuse or modify previous inputs

**Acceptance Criteria:**
- ↑ shows previous message in input
- ↓ shows next message in input
- History wraps at beginning/end
- Current input is preserved if not sent

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with stdin simulation  
**Test File:** `__tests__/unit/ui/input-history.unit.test.ts`

---

## 📝 Slash Commands

### US-012: Execute /help command
**As a** user  
**I want to** type `/help` to see available commands  
**So that** I can discover what commands are available

**Acceptance Criteria:**
- `/help` displays list of available commands
- Help text appears as a system message
- Commands are clearly documented

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test (already exists)  
**Test File:** `__tests__/unit/ui/chat-components.unit.test.ts` (already tested)

---

### US-013: Execute /clear command
**As a** user  
**I want to** type `/clear` to clear all messages  
**So that** I can start fresh without creating a new session

**Acceptance Criteria:**
- `/clear` removes all messages from current session
- Session remains active
- Confirmation message is shown

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test (already exists)  
**Test File:** `__tests__/unit/ui/chat-components.unit.test.ts` (already tested)

---

### US-014: Execute /mode command
**As a** user  
**I want to** type `/mode read-only` to change session mode  
**So that** I can control what the agent is allowed to do

**Acceptance Criteria:**
- `/mode <mode>` changes session mode
- Valid modes: `read-only`, `auto`, `full-access`
- Mode change is reflected in status bar
- Invalid mode shows error message

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test (already exists)  
**Test File:** `__tests__/unit/ui/chat-components.unit.test.ts` (already tested)

---

### US-015: Execute /plan command
**As a** user  
**I want to** type `/plan <description>` to create a plan  
**So that** the agent can break down a task into steps

**Acceptance Criteria:**
- `/plan <description>` creates a new plan
- Plan is stored in session
- Plan panel displays the plan
- Plan can be approved/denied

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test (already exists)  
**Test File:** `__tests__/unit/ui/chat-components.unit.test.ts` (already tested)

---

## 💾 Session Management

### US-016: Create new session (Ctrl+N)
**As a** user  
**I want to** press Ctrl+N to create a new session  
**So that** I can start a fresh conversation

**Acceptance Criteria:**
- New session is created
- Previous session is saved
- Chat interface resets to empty state
- Session ID is displayed in status bar

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/session-management.integration.test.ts`

---

### US-017: Switch between sessions
**As a** user  
**I want to** switch between multiple sessions  
**So that** I can work on different conversations

**Acceptance Criteria:**
- Session list shows all active sessions
- User can select a session to switch to
- Messages from selected session are displayed
- Current session is highlighted

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/session-management.integration.test.ts`

---

### US-018: Session persistence across restarts
**As a** user  
**I want to** have my sessions saved automatically  
**So that** I can resume conversations after restarting the CLI

**Acceptance Criteria:**
- Sessions are saved to disk automatically
- Sessions are loaded on startup
- All messages are restored
- Session state (mode, agent) is preserved

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test with file system  
**Test File:** `__tests__/integration/store/session-persistence.integration.test.ts` (already exists)

---

## ⌨️ Keyboard Shortcuts

### US-019: Clear screen (Ctrl+L)
**As a** user  
**I want to** press Ctrl+L to clear the screen  
**So that** I can have a clean view

**Acceptance Criteria:**
- Screen is cleared
- Messages remain in history
- Input remains focused

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with keyboard simulation  
**Test File:** `__tests__/unit/ui/keyboard-shortcuts.unit.test.ts`

---

### US-020: Cancel request (Escape)
**As a** user  
**I want to** press Escape to cancel a pending request  
**So that** I can stop a long-running operation

**Acceptance Criteria:**
- Pending request is cancelled
- Agent stops processing
- User can send a new message
- Cancellation is indicated in UI

**Testability:** ✅ **Integration Test**  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/request-cancellation.integration.test.ts`

---

### US-021: Exit application (Ctrl+C)
**As a** user  
**I want to** press Ctrl+C to exit the application  
**So that** I can close TOADSTOOL cleanly

**Acceptance Criteria:**
- Application exits cleanly
- Sessions are saved before exit
- No error messages on exit
- Process terminates successfully

**Testability:** ✅ **E2E Test**  
**Test Type:** E2E test  
**Test File:** `__tests__/e2e/cli-exit.e2e.test.ts`

---

## 🎨 UI Features

### US-022: View markdown-formatted responses
**As a** user  
**I want to** see agent responses with markdown formatting  
**So that** I can read code blocks, lists, and formatted text

**Acceptance Criteria:**
- Markdown is rendered correctly
- Code blocks have syntax highlighting
- Lists are formatted properly
- Links are clickable (if supported)

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with markdown samples  
**Test File:** `__tests__/unit/ui/markdown-rendering.unit.test.ts`

---

### US-023: View code blocks with syntax highlighting
**As a** user  
**I want to** see code blocks with syntax highlighting  
**So that** I can read code more easily

**Acceptance Criteria:**
- Code blocks are identified by language
- Syntax highlighting is applied
- Code is properly indented
- Language label is shown

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test with code samples  
**Test File:** `__tests__/unit/ui/code-block.unit.test.ts`

---

### US-024: View timestamps on messages
**As a** user  
**I want to** see timestamps on messages  
**So that** I can track when messages were sent

**Acceptance Criteria:**
- Timestamps are displayed (if enabled)
- Format is readable (e.g., "10:30 AM")
- Timestamps are accurate

**Testability:** ✅ **Unit Test**  
**Test Type:** Unit test  
**Test File:** `__tests__/unit/ui/message-timestamps.unit.test.ts`

---

## 🔧 Session Modes

### US-025: Read-only mode prevents modifications
**As a** user  
**I want to** set session to read-only mode  
**So that** the agent cannot modify files or execute commands

**Acceptance Criteria:**
- Agent cannot write files in read-only mode
- Agent cannot execute commands in read-only mode
- User is notified if agent attempts restricted action
- Input is disabled or shows read-only indicator

**Testability:** ⚠️ **Partial** (when tool system is implemented)  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/session-modes.integration.test.ts`

---

### US-026: Auto mode requests permission
**As a** user  
**I want to** use auto mode  
**So that** the agent asks before performing destructive operations

**Acceptance Criteria:**
- Agent requests permission for file writes
- Agent requests permission for command execution
- User can approve or deny each request
- Approved operations proceed

**Testability:** ⚠️ **Partial** (when tool system is implemented)  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/session-modes.integration.test.ts`

---

### US-027: Full-access mode allows all operations
**As a** user  
**I want to** use full-access mode  
**So that** the agent can perform operations without asking

**Acceptance Criteria:**
- Agent can write files without asking
- Agent can execute commands without asking
- All operations proceed automatically
- Mode is clearly indicated in UI

**Testability:** ⚠️ **Partial** (when tool system is implemented)  
**Test Type:** Integration test  
**Test File:** `__tests__/integration/ui/session-modes.integration.test.ts`

---

## 🛠️ Tool Calls (Planned)

### US-028: View tool call status
**As a** user  
**I want to** see the status of tool calls  
**So that** I can track what the agent is doing

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/tool-calls.integration.test.ts`

---

### US-029: Approve/deny tool calls
**As a** user  
**I want to** approve or deny tool calls  
**So that** I can control what the agent does

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/tool-approval.integration.test.ts`

---

### US-030: View tool call results
**As a** user  
**I want to** see the results of tool calls  
**So that** I can understand what the agent did

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/tool-results.integration.test.ts`

---

## 📋 Plan Management (Planned)

### US-031: View agent plan
**As a** user  
**I want to** see the agent's plan before execution  
**So that** I can review what it will do

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/plan-display.integration.test.ts`

---

### US-032: Approve/deny plan
**As a** user  
**I want to** approve or deny the agent's plan  
**So that** I can control execution

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/plan-approval.integration.test.ts`

---

### US-033: Track plan progress
**As a** user  
**I want to** see the progress of plan execution  
**So that** I can monitor what's happening

**Testability:** ⚠️ **Not Yet Implemented**  
**Test Type:** Integration test (when implemented)  
**Test File:** `__tests__/integration/ui/plan-progress.integration.test.ts`

---

## 📊 Test Coverage Summary

| Status | Count | Test Type |
|--------|-------|-----------|
| ✅ **Testable Now** | 24 | Unit/Integration/E2E |
| ⚠️ **Partial** | 3 | Integration (when tool system ready) |
| ⚠️ **Not Yet Implemented** | 6 | Integration (when features implemented) |
| **Total** | **33** | |

---

## 🧪 Recommended Test Implementation Order

### Phase 1: Core Functionality (High Priority)
1. US-007: Send a message
2. US-008: Receive streaming response
3. US-004: Select agent from list
4. US-005: Switch agent mid-session
5. US-016: Create new session

### Phase 2: User Experience (Medium Priority)
6. US-009: View message history
7. US-010: Multi-line message input
8. US-011: Navigate input history
9. US-019: Clear screen
10. US-022: View markdown-formatted responses

### Phase 3: Advanced Features (Lower Priority)
11. US-017: Switch between sessions
12. US-018: Session persistence
13. US-020: Cancel request
14. US-023: View code blocks
15. US-024: View timestamps

### Phase 4: Future Features (When Implemented)
16. US-025-027: Session modes (when tool system ready)
17. US-028-030: Tool calls (when implemented)
18. US-031-033: Plan management (when implemented)

---

## 📝 Notes

- **E2E Tests**: Require full CLI execution, may need Playwright or similar for terminal automation
- **Integration Tests**: Use mock harnesses to avoid requiring real agent CLIs
- **Unit Tests**: Use the OpenTUI test renderer helpers for UI components
- **Test Data**: Use fixtures and factories for consistent test data
- **Mocking**: Mock ACP agents and file system operations for reliable tests

---

*Last Updated: 2026-01-14*  
*Status: Active*
