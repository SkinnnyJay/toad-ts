# TOAD Message Flow and Formatting Implementation Guide

## TOAD's Message Flow Architecture for Formatting

### 1. **Message Interception Pipeline**

TOAD intercepts Claude messages through a multi-stage pipeline:

```
Claude Process → stdout → JSON-RPC Parser → ACP Agent → Message Router → UI Widgets
```

**Key Components:**
- `acp/agent.py:_run_agent()` - Reads stdout line by line (lines 447-545)
- `jsonrpc.py` - Parses JSON-RPC protocol messages
- `acp/agent.py:rpc_session_update()` - Routes message types (lines 199-278)
- `acp/messages.py` - Defines internal message types

### 2. **Message Type Handling**

TOAD handles different message types with specific formatting:

- **agent_message_chunk**: Streamed text content → `AgentResponse` widget with Markdown
- **agent_thought_chunk**: Thinking content → `AgentThought` widget (collapsible)
- **tool_call**: Tool invocations → `ToolCall` widget with structured display
- **plan**: Planning steps → `Plan` widget with status indicators
- **tool_call_update**: Updates to existing tool calls with diff visualization

### 3. **Streaming Markdown Implementation**

The `AgentResponse` widget (`widgets/agent_response.py`):
- Extends Textual's `Markdown` widget
- Uses `MarkdownStream` for incremental updates
- Maintains internal buffer for partial content
- Renders on each `append_fragment()` call

```python
# From agent_response.py
class AgentResponse(Markdown):
    def __init__(self, markdown: str | None = None) -> None:
        super().__init__(markdown)
        self._stream: MarkdownStream | None = None

    async def append_fragment(self, fragment: str) -> None:
        self.loading = False
        await self.stream.write(fragment)
```

### 4. **Message Processing Flow in Conversation Widget**

The `conversation.py` widget orchestrates the entire display:

1. **Message Reception** (lines 899-905):
   - `on_acp_update()` - Handles agent message chunks
   - `on_acp_agent_thinking()` - Handles thinking chunks
   - Posts to appropriate widget

2. **Widget Management** (lines 625-645):
   - `post_agent_response()` - Creates or updates response widget
   - `post_agent_thought()` - Creates or updates thought widget
   - Maintains single active stream per type

3. **Tool Call Handling** (lines 943-963):
   - Creates `ToolCall` widgets for new tool invocations
   - Updates existing tool call widgets with progress
   - Handles permission requests with interactive dialogs

### 5. **Formatting Pipeline**

1. Raw text comes from Claude via JSON-RPC
2. Text fragments are aggregated in widgets
3. Markdown parsing happens in real-time
4. Syntax highlighting applied to code blocks
5. ANSI escape sequences processed separately by `ansi/_stream_parser.py`

## TOADSTOOL TypeScript Implementation

### 1. **Core Message Processing**

```typescript
// Message types matching ACP protocol
interface ACPMessage {
  sessionUpdate: 'agent_message_chunk' | 'agent_thought_chunk' | 'tool_call' | 'plan';
  content?: { type: string; text: string };
  toolCallId?: string;
  entries?: PlanEntry[];
}

// Message interceptor
class MessageInterceptor {
  private process: ChildProcess;
  private parser: JSONRPCParser;

  async intercept(): AsyncGenerator<ACPMessage> {
    const stdout = this.process.stdout;
    for await (const line of readline(stdout)) {
      const message = this.parser.parse(line);
      yield this.transformMessage(message);
    }
  }

  private transformMessage(raw: JSONRPCMessage): ACPMessage {
    // Transform JSON-RPC to internal format
    if (raw.method === 'session/update') {
      return raw.params as ACPMessage;
    }
    // Handle other message types...
  }
}
```

### 2. **Streaming Markdown Renderer**

```typescript
// Streaming markdown component using Ink
import { Box, Text } from 'ink';
import Markdown from 'ink-markdown';

class StreamingMarkdown {
  private buffer: string[] = [];
  private markdown: MarkdownParser;

  appendFragment(fragment: string): void {
    this.buffer.push(fragment);
    this.render();
  }

  render(): ReactElement {
    const content = this.buffer.join('');
    return <Markdown>{content}</Markdown>;
  }
}

// Usage in React component
const AgentResponse: FC<{stream: MessageStream}> = ({ stream }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    stream.on('fragment', (fragment) => {
      setContent(prev => prev + fragment);
    });
  }, [stream]);

  return <Markdown>{content}</Markdown>;
};
```

### 3. **Message Router & Formatter**

```typescript
class MessageFormatter {
  format(message: ACPMessage): FormattedMessage {
    switch (message.sessionUpdate) {
      case 'agent_message_chunk':
        return {
          type: 'markdown',
          content: this.formatMarkdown(message.content.text),
          stream: true
        };

      case 'agent_thought_chunk':
        return {
          type: 'thought',
          content: message.content.text,
          stream: true,
          collapsible: true
        };

      case 'tool_call':
        return {
          type: 'tool',
          content: this.formatToolCall(message),
          stream: false
        };

      case 'plan':
        return {
          type: 'plan',
          content: this.formatPlan(message.entries),
          stream: false
        };
    }
  }

  private formatMarkdown(text: string): string {
    // Apply syntax highlighting, code blocks, etc.
    return markdownIt.render(text);
  }

  private formatToolCall(message: ACPMessage): ToolCallDisplay {
    return {
      id: message.toolCallId,
      title: message.title || 'Tool Call',
      status: message.status || 'pending',
      content: message.content
    };
  }
}
```

### 4. **State Management with Zustand**

```typescript
interface ConversationState {
  messages: Message[];
  activeStream: StreamingMessage | null;
  activeThought: StreamingMessage | null;

  appendToStream: (fragment: string) => void;
  appendToThought: (fragment: string) => void;
  completeStream: () => void;
  completeThought: () => void;
  addMessage: (message: Message) => void;
  updateToolCall: (id: string, update: ToolCallUpdate) => void;
}

const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  activeStream: null,
  activeThought: null,

  appendToStream: (fragment) =>
    set((state) => ({
      activeStream: {
        ...state.activeStream,
        content: state.activeStream.content + fragment
      }
    })),

  appendToThought: (fragment) =>
    set((state) => ({
      activeThought: {
        ...state.activeThought,
        content: state.activeThought.content + fragment
      }
    })),

  completeStream: () =>
    set((state) => ({
      messages: [...state.messages, state.activeStream],
      activeStream: null
    })),

  updateToolCall: (id, update) =>
    set((state) => ({
      messages: state.messages.map(msg =>
        msg.type === 'tool' && msg.id === id
          ? { ...msg, ...update }
          : msg
      )
    }))
}));
```

### 5. **UI Components with Ink**

```typescript
// Main conversation display
const ConversationView: FC = () => {
  const { messages, activeStream, activeThought } = useConversationStore();

  return (
    <Box flexDirection="column">
      {messages.map(msg => (
        <MessageBlock key={msg.id} message={msg} />
      ))}
      {activeThought && (
        <ThoughtBlock message={activeThought} collapsible />
      )}
      {activeStream && (
        <StreamingBlock message={activeStream} />
      )}
    </Box>
  );
};

// Individual message rendering
const MessageBlock: FC<{message: Message}> = ({ message }) => {
  switch (message.type) {
    case 'markdown':
      return <MarkdownRenderer content={message.content} />;
    case 'tool':
      return <ToolCallRenderer tool={message.tool} />;
    case 'thought':
      return <ThoughtRenderer content={message.content} />;
    case 'plan':
      return <PlanRenderer entries={message.entries} />;
  }
};

// Tool call renderer with status
const ToolCallRenderer: FC<{tool: ToolCall}> = ({ tool }) => {
  const statusColor = {
    pending: 'yellow',
    running: 'blue',
    completed: 'green',
    failed: 'red'
  }[tool.status];

  return (
    <Box flexDirection="column" borderStyle="round">
      <Box>
        <Text color={statusColor}>●</Text>
        <Text> {tool.title}</Text>
      </Box>
      {tool.content && (
        <Box paddingLeft={2}>
          <Text>{tool.content}</Text>
        </Box>
      )}
    </Box>
  );
};
```

### 6. **ANSI and Terminal Output Processing**

```typescript
// ANSI escape sequence parser
class ANSIParser {
  private patterns: Map<string, RegExp> = new Map([
    ['color', /\x1b\[(\d+)m/g],
    ['cursor', /\x1b\[(\d+);(\d+)H/g],
    ['clear', /\x1b\[2J/g]
  ]);

  parse(text: string): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    let lastIndex = 0;

    for (const [type, pattern] of this.patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({
            type: 'text',
            content: text.slice(lastIndex, match.index)
          });
        }
        segments.push({
          type,
          content: match[0],
          params: match.slice(1)
        });
        lastIndex = pattern.lastIndex;
      }
    }

    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return segments;
  }
}

// Terminal output component
const TerminalOutput: FC<{output: string}> = ({ output }) => {
  const parser = useMemo(() => new ANSIParser(), []);
  const segments = parser.parse(output);

  return (
    <Box flexDirection="column">
      {segments.map((segment, i) => (
        <Text key={i} color={segment.color}>
          {segment.content}
        </Text>
      ))}
    </Box>
  );
};
```

### 7. **Permission Request Handling**

```typescript
interface PermissionRequest {
  toolCallId: string;
  title: string;
  options: PermissionOption[];
  content?: ToolCallContent[];
}

const PermissionDialog: FC<{request: PermissionRequest}> = ({ request }) => {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    if (key.downArrow) setSelected(s => Math.min(request.options.length - 1, s + 1));
    if (key.return) {
      // Send permission response
      sendPermissionResponse(request.toolCallId, request.options[selected].id);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round">
      <Text bold>{request.title}</Text>
      {request.content?.map((content, i) => (
        <ContentRenderer key={i} content={content} />
      ))}
      <Box flexDirection="column" marginTop={1}>
        {request.options.map((option, i) => (
          <Text key={option.id} color={i === selected ? 'green' : 'white'}>
            {i === selected ? '▶ ' : '  '}{option.name}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
```

### 8. **Key Implementation Details**

**Streaming Updates:**
- Buffer partial markdown content in memory
- Render on each fragment arrival using React state
- Maintain cursor position during updates
- Debounce rapid updates to prevent flicker

**Syntax Highlighting:**
- Use `highlight.js` or `prism` for code blocks
- Apply ANSI colors for terminal output
- Support language detection and inline code
- Cache highlighted results for performance

**Performance Optimization:**
- Virtualize long message lists with `react-window`
- Debounce rapid updates (16ms minimum)
- Cache rendered markdown to avoid re-parsing
- Use React.memo for message components

**Error Handling:**
- Gracefully handle malformed JSON with fallback display
- Show partial content on stream interruption
- Maintain conversation state on reconnect
- Display error boundaries for component failures

**Message Aggregation:**
- Combine rapid sequential chunks
- Buffer incomplete markdown blocks
- Handle multi-line code blocks correctly
- Preserve formatting across chunk boundaries

This architecture provides real-time streaming, proper markdown formatting, and efficient state management while maintaining compatibility with the ACP protocol. The TypeScript implementation closely mirrors TOAD's Python architecture but uses React/Ink patterns for the UI layer.