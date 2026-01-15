# TOAD Component Specifications

## Component Architecture

```
src/ui/
├── components/
│   ├── App.tsx              # Root container
│   ├── Chat.tsx             # Chat panel wrapper
│   ├── MessageList.tsx      # Scrollable message container
│   ├── Message.tsx          # Individual message
│   ├── InputArea.tsx        # Multi-line input
│   ├── StatusBar.tsx        # Status bar
│   └── ProviderSelector.tsx # Provider selection (modal)
├── hooks/
│   ├── useColorSupport.ts   # Terminal color detection
│   ├── useKeyboard.ts       # Keyboard shortcuts
│   ├── useScroll.ts         # Scroll management
│   └── useInputHistory.ts   # Input history
├── styles/
│   ├── colors.ts            # Color system
│   ├── typography.ts        # Typography tokens
│   └── spacing.ts           # Spacing tokens
└── utils/
    ├── formatMessage.ts     # Markdown formatting
    ├── syntaxHighlight.ts   # Code highlighting
    └── terminal.ts          # Terminal utilities
```

---

## 1. App Component

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🐸 TOAD                                    Ctrl+P: Switch  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  You (10:30 AM)                                        │ │
│  │  Create a TypeScript function to reverse a string      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Claude (10:30 AM)                                     │ │
│  │  Here's a TypeScript function:                         │ │
│  │                                                         │ │
│  │  ```typescript                                          │ │
│  │  function reverseString(s: string): string {           │ │
│  │    return s.split('').reverse().join('');              │ │
│  │  }                                                      │ │
│  │  ```                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Scrollable area continues...]                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  > Type your message...                                     │
│                                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  ● Connected | Claude | Session: abc123 | 42 tokens         │
│  Ctrl+P: Switch  Ctrl+N: New  Ctrl+L: Clear  Ctrl+C: Quit  │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/ui/components/App.tsx
import React, { useEffect } from 'react';
import { Box } from 'ink';
import { useAppStore } from '@/store/app-store';
import { Chat } from './Chat';
import { InputArea } from './InputArea';
import { StatusBar } from './StatusBar';
import { useKeyboard } from '@/ui/hooks/useKeyboard';
import { useColorSupport } from '@/ui/hooks/useColorSupport';

export interface AppProps {
  provider?: 'claude' | 'openai';
  sessionId?: string;
  workingDir?: string;
}

export const App: React.FC<AppProps> = ({ 
  provider, 
  sessionId, 
  workingDir 
}) => {
  const { 
    connectionStatus, 
    currentProvider,
    initialize,
    switchProvider,
    newSession,
    quit 
  } = useAppStore();
  
  const colorSupport = useColorSupport();
  
  useKeyboard({
    'ctrl+p': () => switchProvider(),
    'ctrl+n': () => newSession(),
    'ctrl+c': () => quit(),
    'ctrl+l': () => console.clear(),
  });
  
  useEffect(() => {
    initialize({ provider, sessionId, workingDir });
  }, []);
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Main chat area */}
      <Box flexGrow={1} flexDirection="column">
        <Chat />
      </Box>
      
      {/* Input area */}
      <Box>
        <InputArea />
      </Box>
      
      {/* Status bar */}
      <Box>
        <StatusBar />
      </Box>
    </Box>
  );
};
```

### States

| State | Visual Indicator | Behavior |
|-------|-----------------|----------|
| `idle` | Normal UI | Ready for input |
| `connecting` | Yellow spinner in status | Disable input |
| `streaming` | Streaming dots in message | Disable input, show cursor |
| `error` | Red error message | Show retry option |

---

## 2. Chat Component

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [Message 1]                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🐸 You (10:30 AM)                                     │ │
│  │  Create a function...                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Message 2]                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🤖 Claude (10:30 AM)                                  │ │
│  │  Here's the function:                                  │ │
│  │  ```typescript                                          │ │
│  │  function example() { }                               │ │
│  │  ```                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Message 3 - Streaming]                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🤖 Claude (10:31 AM)                                  │ │
│  │  Let me explain...⠋                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/ui/components/Chat.tsx
import React, { useEffect, useRef } from 'react';
import { Box } from 'ink';
import { useAppStore } from '@/store/app-store';
import { MessageList } from './MessageList';
import { useScroll } from '@/ui/hooks/useScroll';

export const Chat: React.FC = () => {
  const { messages, isStreaming } = useAppStore();
  const scrollRef = useRef<{ scrollToBottom: () => void }>(null);
  
  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToBottom();
    }
  }, [messages.length, isStreaming]);
  
  return (
    <Box 
      flexDirection="column" 
      flexGrow={1}
      paddingX={1}
      overflow="hidden"
    >
      <MessageList 
        ref={scrollRef}
        messages={messages}
        isStreaming={isStreaming}
      />
    </Box>
  );
};
```

### Features

- **Virtual Scrolling**: Only render visible messages
- **Auto-scroll**: Scroll to bottom on new messages
- **Manual Scroll**: Arrow keys to navigate history
- **Streaming Support**: Real-time updates during streaming

---

## 3. MessageList Component

### Implementation

```typescript
// src/ui/components/MessageList.tsx
import React, { forwardRef, useImperativeHandle } from 'react';
import { Box } from 'ink';
import { Message } from './Message';
import type { Message as MessageType } from '@/types/domain';

export interface MessageListProps {
  messages: MessageType[];
  isStreaming: boolean;
}

export interface MessageListHandle {
  scrollToBottom: () => void;
  scrollUp: () => void;
  scrollDown: () => void;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  ({ messages, isStreaming }, ref) => {
    const [scrollOffset, setScrollOffset] = React.useState(0);
    
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => setScrollOffset(0),
      scrollUp: () => setScrollOffset(prev => Math.min(prev + 1, messages.length - 1)),
      scrollDown: () => setScrollOffset(prev => Math.max(prev - 1, 0)),
    }));
    
    // Calculate visible messages (simple implementation)
    const visibleMessages = messages.slice(-10 - scrollOffset).slice(0, 10);
    
    return (
      <Box flexDirection="column" flexGrow={1}>
        {visibleMessages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === visibleMessages.length - 1}
          />
        ))}
      </Box>
    );
  }
);
```

---

## 4. Message Component

### Visual Variants

#### User Message
```
┌─────────────────────────────────────────────────────────────┐
│  🐸 You (10:30 AM)                                          │
├─────────────────────────────────────────────────────────────┤
│  Create a TypeScript function to reverse a string           │
└─────────────────────────────────────────────────────────────┘
```

#### Assistant Message
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Claude (10:30 AM)                                       │
├─────────────────────────────────────────────────────────────┤
│  Here's a TypeScript function:                              │
│                                                              │
│  ```typescript                                               │
│  function reverseString(s: string): string {                │
│    return s.split('').reverse().join('');                   │
│  }                                                           │
│  ```                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### Streaming Message
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Claude (10:31 AM)                                       │
├─────────────────────────────────────────────────────────────┤
│  Let me explain how this function works...⠋                │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/ui/components/Message.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { format } from 'date-fns';
import { formatMessage } from '@/ui/utils/formatMessage';
import type { Message as MessageType } from '@/types/domain';
import { useColorSupport } from '@/ui/hooks/useColorSupport';

export interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
}

export const Message: React.FC<MessageProps> = ({ message, isStreaming }) => {
  const colorSupport = useColorSupport();
  const colors = getColors(colorSupport);
  
  const formattedTime = format(message.timestamp, 'h:mm a');
  const roleConfig = {
    user: { icon: '🐸', color: colors.primary, align: 'right' as const },
    assistant: { icon: '🤖', color: colors.text, align: 'left' as const },
    system: { icon: 'ℹ️', color: colors.textMuted, align: 'center' as const },
  };
  
  const config = roleConfig[message.role];
  
  return (
    <Box 
      flexDirection="column" 
      marginBottom={1}
      paddingX={1}
    >
      {/* Header */}
      <Box justifyContent={config.align === 'right' ? 'flex-end' : 'flex-start'}>
        <Text color={config.color}>
          {config.icon} {message.role === 'user' ? 'You' : message.provider} ({formattedTime})
        </Text>
      </Box>
      
      {/* Content */}
      <Box 
        paddingLeft={config.align === 'right' ? 0 : 2}
        paddingRight={config.align === 'right' ? 2 : 0}
      >
        <Box flexDirection="column">
          {formatMessage(message.content, { 
            isStreaming,
            syntaxHighlight: true,
          })}
          {isStreaming && (
            <Text color={colors.primary}>⠋</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
```

### Message Formatting

```typescript
// src/ui/utils/formatMessage.ts
import { Text } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { highlightCode } from './syntaxHighlight';

marked.use(markedTerminal());

export function formatMessage(
  content: string,
  options: { isStreaming?: boolean; syntaxHighlight?: boolean } = {}
): React.ReactNode {
  // Parse markdown
  const tokens = marked.lexer(content);
  
  // Convert to Ink components
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'paragraph':
        return <Text key={index}>{token.text}</Text>;
      
      case 'code':
        if (options.syntaxHighlight) {
          return (
            <Box key={index} flexDirection="column" marginY={1}>
              {highlightCode(token.text, token.lang || 'text')}
            </Box>
          );
        }
        return (
          <Box key={index} flexDirection="column" marginY={1}>
            <Text>{token.text}</Text>
          </Box>
        );
      
      case 'list':
        return (
          <Box key={index} flexDirection="column" marginY={1}>
            {token.items.map((item, i) => (
              <Text key={i}>• {item.text}</Text>
            ))}
          </Box>
        );
      
      default:
        return <Text key={index}>{String(token)}</Text>;
    }
  });
}
```

---

## 5. InputArea Component

### Visual States

#### Idle
```
┌─────────────────────────────────────────────────────────────┐
│  > Type your message... (Press Enter to send)               │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Typing
```
┌─────────────────────────────────────────────────────────────┐
│  > Type your message...                                      │
│  Create a function that...                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Focused
```
╔═════════════════════════════════════════════════════════════╗
║  > Type your message...                                      ║
║  Create a function that...                                  ║
║                                                              ║
╚═════════════════════════════════════════════════════════════╝
```

#### Disabled (Streaming)
```
┌─────────────────────────────────────────────────────────────┐
│  > Waiting for response... (Press Escape to cancel)         │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/ui/components/InputArea.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useAppStore } from '@/store/app-store';
import { useInputHistory } from '@/ui/hooks/useInputHistory';
import { useColorSupport } from '@/ui/hooks/useColorSupport';

export const InputArea: React.FC = () => {
  const { sendMessage, isStreaming, connectionStatus } = useAppStore();
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const { history, navigateHistory, resetIndex } = useInputHistory();
  const colorSupport = useColorSupport();
  const colors = getColors(colorSupport);
  
  const disabled = isStreaming || connectionStatus !== 'connected';
  
  const handleSubmit = useCallback(() => {
    if (value.trim() && !disabled) {
      sendMessage(value);
      setValue('');
      resetIndex();
    }
  }, [value, disabled, sendMessage, resetIndex]);
  
  useInput((input, key) => {
    if (key.upArrow) {
      const prev = navigateHistory('up');
      if (prev) setValue(prev);
    } else if (key.downArrow) {
      const next = navigateHistory('down');
      if (next) setValue(next);
      else setValue('');
    } else if (key.escape && isStreaming) {
      // Cancel request
    }
  });
  
  const borderStyle = isFocused && !disabled ? 'double' : 'single';
  const borderColor = isFocused ? colors.primary : colors.border;
  
  return (
    <Box 
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={1}
      minHeight={3}
    >
      <Box marginBottom={1}>
        <Text color={disabled ? colors.textMuted : colors.textDim}>
          {disabled 
            ? '> Waiting for response... (Press Escape to cancel)'
            : '> Type your message... (Press Enter to send, Shift+Enter for newline)'
          }
        </Text>
      </Box>
      
      {!disabled && (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder=""
          focus={isFocused}
        />
      )}
      
      {!disabled && value.length > 0 && (
        <Box marginTop={1}>
          <Text color={colors.textMuted}>
            {value.length} characters
          </Text>
        </Box>
      )}
    </Box>
  );
};
```

### Features

- **Multi-line Input**: Shift+Enter for newlines
- **History Navigation**: Up/Down arrows
- **Auto-completion**: Tab key (future)
- **Character Count**: Show while typing
- **Focus Management**: Visual focus indicator

---

## 6. StatusBar Component

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ● Connected | Claude | Session: abc123 | 42 tokens         │
│  Ctrl+P: Switch  Ctrl+N: New  Ctrl+L: Clear  Ctrl+C: Quit │
└─────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Status | Icon | Color | Animation |
|--------|------|-------|-----------|
| `disconnected` | ○ | Gray | None |
| `connecting` | ◐ | Yellow | Rotating |
| `connected` | ● | Green | None |
| `error` | ✕ | Red | Blinking |

### Implementation

```typescript
// src/ui/components/StatusBar.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '@/store/app-store';
import { useColorSupport } from '@/ui/hooks/useColorSupport';

export const StatusBar: React.FC = () => {
  const { 
    connectionStatus, 
    currentProvider, 
    currentSessionId,
    tokenCount 
  } = useAppStore();
  const colorSupport = useColorSupport();
  const colors = getColors(colorSupport);
  
  const statusConfig = {
    disconnected: { icon: '○', color: colors.textMuted, label: 'Disconnected' },
    connecting: { icon: '◐', color: colors.warning, label: 'Connecting' },
    connected: { icon: '●', color: colors.success, label: 'Connected' },
    error: { icon: '✕', color: colors.error, label: 'Error' },
  };
  
  const status = statusConfig[connectionStatus];
  
  const shortcuts = [
    { key: 'Ctrl+P', action: 'Switch' },
    { key: 'Ctrl+N', action: 'New' },
    { key: 'Ctrl+L', action: 'Clear' },
    { key: 'Ctrl+C', action: 'Quit' },
  ];
  
  return (
    <Box 
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
      justifyContent="space-between"
      height={1}
    >
      {/* Left: Status info */}
      <Box>
        <Text color={status.color}>
          {status.icon} {status.label}
        </Text>
        {currentProvider && (
          <>
            <Text color={colors.textMuted}> | </Text>
            <Text color={colors.text}>{currentProvider}</Text>
          </>
        )}
        {currentSessionId && (
          <>
            <Text color={colors.textMuted}> | </Text>
            <Text color={colors.textDim}>Session: {currentSessionId.slice(0, 8)}</Text>
          </>
        )}
        {tokenCount !== undefined && (
          <>
            <Text color={colors.textMuted}> | </Text>
            <Text color={colors.textDim}>{tokenCount} tokens</Text>
          </>
        )}
      </Box>
      
      {/* Right: Shortcuts */}
      <Box>
        {shortcuts.map((shortcut, index) => (
          <React.Fragment key={shortcut.key}>
            {index > 0 && <Text color={colors.textMuted}>  </Text>}
            <Text color={colors.textDim}>
              {shortcut.key}: {shortcut.action}
            </Text>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};
```

---

## 7. ProviderSelector Component

### Visual Layout (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    Select AI Provider                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  > Claude (Anthropic)                                   │ │
│  │    OpenAI (OpenAI)                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Press Enter to select, Escape to cancel                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/ui/components/ProviderSelector.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { useAppStore } from '@/store/app-store';

const providers = [
  { label: 'Claude (Anthropic)', value: 'claude' },
  { label: 'OpenAI (OpenAI)', value: 'openai' },
];

export const ProviderSelector: React.FC<{ onSelect: (provider: string) => void }> = ({ 
  onSelect 
}) => {
  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      height="100%"
    >
      <Box flexDirection="column" width={50}>
        <Box marginBottom={2} justifyContent="center">
          <Text bold color="primary">Select AI Provider</Text>
        </Box>
        
        <Select
          options={providers}
          onChange={onSelect}
        />
        
        <Box marginTop={2} justifyContent="center">
          <Text color="textMuted" dimColor>
            Press Enter to select, Escape to cancel
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
```

---

## Component States Matrix

| Component | Default | Hover | Focus | Active | Disabled | Loading | Error |
|-----------|---------|-------|-------|--------|----------|---------|-------|
| **App** | Normal | - | - | - | - | Connecting | Error |
| **Chat** | Idle | - | - | - | - | Streaming | - |
| **Message** | Rendered | - | - | - | - | Streaming | Error |
| **InputArea** | Idle | - | Focused | - | Disabled | - | - |
| **StatusBar** | Connected | - | - | - | - | Connecting | Error |
| **ProviderSelector** | Open | - | Focused | Selected | - | - | - |

---

## Implementation Priority

### Phase 1: Core (MVP)
1. ✅ App container
2. ✅ StatusBar
3. ✅ InputArea (basic)
4. ✅ Message (basic, no syntax highlighting)
5. ✅ MessageList (simple, no virtual scrolling)

### Phase 2: Enhanced
6. ✅ Chat with auto-scroll
7. ✅ Message formatting (markdown)
8. ✅ Input history
9. ✅ Provider selector

### Phase 3: Premium
10. ✅ Syntax highlighting
11. ✅ Virtual scrolling
12. ✅ Streaming animations
13. ✅ Keyboard shortcuts
14. ✅ Color detection

---

## Testing Strategy

### Unit Tests
- Component rendering
- Props handling
- State transitions

### Integration Tests
- Component interactions
- Keyboard shortcuts
- Scroll behavior

### E2E Tests
- Full user flows
- Terminal compatibility
- Performance with long conversations
