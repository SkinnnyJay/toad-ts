# TOAD Terminal UI Design System

## Design Philosophy

**Simplicity with Richness**: Minimal interface that feels premium and professional. Every element serves a purpose.

**Terminal-First**: Respect terminal constraints while pushing boundaries. Support 16-color, 256-color, and true-color terminals.

**Keyboard-First**: Every interaction optimized for keyboard. No mouse dependencies.

**Information Density**: Balance readability with information density. Power users need efficiency.

**Progressive Enhancement**: Graceful degradation from true-color → 256-color → 16-color terminals.

---

## Color System

### Base Palette

Terminal colors map to ANSI escape codes. We support three modes:

#### 16-Color Mode (Fallback)
```typescript
const colors16 = {
  // Primary
  primary: 'cyan',        // ANSI 14
  primaryBright: 'cyanBright', // ANSI 14 (bold)
  
  // Semantic
  success: 'green',       // ANSI 2
  warning: 'yellow',      // ANSI 3
  error: 'red',          // ANSI 1
  info: 'blue',          // ANSI 4
  
  // Neutral
  text: 'white',         // ANSI 15
  textDim: 'gray',       // ANSI 8
  textMuted: 'blackBright', // ANSI 7
  bg: 'black',           // ANSI 0
  bgElevated: 'blackBright', // ANSI 7
  
  // Borders
  border: 'gray',        // ANSI 8
  borderBright: 'white', // ANSI 15
};
```

#### 256-Color Mode (Enhanced)
```typescript
const colors256 = {
  // Primary - Cyan variants
  primary: '#00BCD4',      // Bright cyan
  primaryDim: '#00838F',   // Darker cyan
  primaryBright: '#4DD0E1', // Lighter cyan
  
  // Semantic
  success: '#4CAF50',      // Green
  warning: '#FF9800',      // Orange
  error: '#F44336',        // Red
  info: '#2196F3',         // Blue
  
  // Neutral grays
  text: '#FFFFFF',         // White
  textDim: '#9E9E9E',      // Medium gray
  textMuted: '#616161',    // Dark gray
  bg: '#000000',           // Black
  bgElevated: '#1E1E1E',   // Dark gray
  
  // Accents
  accent: '#9C27B0',       // Purple
  accentDim: '#7B1FA2',   // Darker purple
};
```

#### True-Color Mode (Premium)
```typescript
const colorsTrue = {
  // Primary - TOAD brand cyan
  primary: '#00D9FF',      // Vibrant cyan
  primaryDim: '#0099B8',   // Deeper cyan
  primaryBright: '#33E0FF', // Light cyan
  primaryGlow: '#66E7FF',  // Subtle glow
  
  // Semantic with better contrast
  success: '#52E757',      // Bright green
  warning: '#FFB84D',      // Warm orange
  error: '#FF6B6B',        // Soft red
  info: '#4DABF7',         // Sky blue
  
  // Neutral with subtle warmth
  text: '#F8F9FA',         // Off-white
  textDim: '#ADB5BD',      // Cool gray
  textMuted: '#6C757D',    // Medium gray
  bg: '#0D1117',           // GitHub dark
  bgElevated: '#161B22',   // Elevated surface
  
  // Accents
  accent: '#A855F7',       // Purple
  accentDim: '#9333EA',    // Darker purple
  highlight: '#FFD700',    // Gold for emphasis
};
```

### Color Detection Strategy

```typescript
// Detect terminal color support
function detectColorSupport(): '16' | '256' | 'true' {
  const term = process.env.TERM || '';
  const colorTerm = process.env.COLORTERM || '';
  
  if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    return 'true';
  }
  if (term.includes('256') || term.includes('xterm')) {
    return '256';
  }
  return '16';
}
```

### Usage Tokens

```typescript
export const colorTokens = {
  // Text
  textPrimary: 'text',
  textSecondary: 'textDim',
  textTertiary: 'textMuted',
  
  // Backgrounds
  bgBase: 'bg',
  bgElevated: 'bgElevated',
  bgHover: 'bgElevated',
  
  // Borders
  borderDefault: 'border',
  borderFocus: 'primary',
  borderError: 'error',
  
  // Interactive
  link: 'primary',
  linkHover: 'primaryBright',
  buttonPrimary: 'primary',
  buttonSecondary: 'border',
  
  // Status
  statusSuccess: 'success',
  statusWarning: 'warning',
  statusError: 'error',
  statusInfo: 'info',
  
  // Code
  codeBg: 'bgElevated',
  codeText: 'text',
  codeKeyword: 'primary',
  codeString: 'success',
  codeComment: 'textMuted',
};
```

---

## Typography System

### Font Constraints

Terminals use **monospace fonts**. Character width is fixed, height varies.

### Type Scale

```typescript
export const typography = {
  // Sizes (character-based)
  xs: 1,      // 1 line height
  sm: 1,      // 1 line height
  base: 1,    // 1 line height (default)
  lg: 2,      // 2 line height (tall)
  xl: 3,      // 3 line height (very tall)
  
  // Weights (via ANSI codes)
  normal: 'normal',     // No bold
  bold: 'bold',         // ANSI bold
  dim: 'dim',           // ANSI dim
  
  // Styles
  italic: 'italic',     // ANSI italic (if supported)
  underline: 'underline', // ANSI underline
};
```

### Text Styles

```typescript
export const textStyles = {
  // Headings
  h1: { bold: true, color: 'primary' },
  h2: { bold: true, color: 'text' },
  h3: { bold: true, color: 'textDim' },
  
  // Body
  body: { color: 'text' },
  bodyDim: { color: 'textDim' },
  bodyMuted: { color: 'textMuted' },
  
  // Code
  code: { color: 'primary', bg: 'codeBg' },
  codeBlock: { color: 'codeText', bg: 'codeBg' },
  
  // Interactive
  link: { color: 'link', underline: true },
  button: { bold: true, color: 'text' },
  
  // Status
  success: { color: 'success' },
  warning: { color: 'warning' },
  error: { color: 'error' },
  info: { color: 'info' },
};
```

---

## Spacing System

Terminal spacing is **character-based**, not pixel-based.

```typescript
export const spacing = {
  // Horizontal (characters)
  xs: 1,    // 1 char
  sm: 2,    // 2 chars
  md: 4,    // 4 chars
  lg: 8,    // 8 chars
  xl: 16,   // 16 chars
  
  // Vertical (lines)
  line: 1,  // 1 line
  section: 2, // 2 lines
  block: 4,   // 4 lines
};
```

### Layout Units

```typescript
export const layout = {
  // Container padding
  containerPadding: spacing.md, // 4 chars
  
  // Component spacing
  componentGap: spacing.sm,      // 2 chars
  
  // Border width
  borderWidth: 1,                 // 1 char (visual)
  
  // Status bar height
  statusBarHeight: 1,             // 1 line
  
  // Input area height
  inputMinHeight: 3,              // 3 lines (multi-line)
};
```

---

## Border System

Terminals support box-drawing characters (Unicode box-drawing).

```typescript
export const borders = {
  // Styles
  single: {
    top: '─',
    bottom: '─',
    left: '│',
    right: '│',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
  },
  double: {
    top: '═',
    bottom: '═',
    left: '║',
    right: '║',
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
  },
  rounded: {
    top: '─',
    bottom: '─',
    left: '│',
    right: '│',
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
  },
  thick: {
    top: '━',
    bottom: '━',
    left: '┃',
    right: '┃',
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
  },
};
```

### Border Usage

```typescript
export const borderUsage = {
  // Containers
  container: 'single',
  panel: 'single',
  card: 'rounded',
  
  // Focus states
  focus: 'double',
  error: 'single', // with error color
  
  // Status
  statusBar: 'single',
  input: 'single',
};
```

---

## Component Specifications

### 1. App Container

**Purpose**: Root layout container

**Layout**:
```
┌─────────────────────────────────────────┐
│  Header (optional, 1 line)              │
├─────────────────────────────────────────┤
│                                          │
│  Main Content Area (flex: 1)             │
│  - Chat Panel                            │
│  - Message List                          │
│                                          │
├─────────────────────────────────────────┤
│  Input Area (3-5 lines)                  │
├─────────────────────────────────────────┤
│  Status Bar (1 line)                     │
└─────────────────────────────────────────┘
```

**Props**:
```typescript
interface AppProps {
  provider?: 'claude' | 'openai';
  sessionId?: string;
  workingDir?: string;
}
```

**States**:
- `idle`: Ready for input
- `connecting`: Establishing connection
- `streaming`: Receiving response
- `error`: Error state

---

### 2. Chat Panel

**Purpose**: Main conversation area

**Layout**:
```
┌─────────────────────────────────────────┐
│  [Scrollable Message List]              │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  You (10:30 AM)                    │ │
│  │  Create a function to...           │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  Claude (10:30 AM)                 │ │
│  │  Here's the function:               │ │
│  │  ```typescript                      │ │
│  │  function reverse(s: string) {     │ │
│  │    return s.split('').reverse()...  │ │
│  │  }                                  │ │
│  │  ```                                │ │
│  └───────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

**Features**:
- Auto-scroll to bottom on new messages
- Manual scroll with arrow keys
- Virtual scrolling for long conversations
- Syntax highlighting for code blocks

**Props**:
```typescript
interface ChatPanelProps {
  messages: Message[];
  isStreaming: boolean;
  onScroll?: (direction: 'up' | 'down') => void;
}
```

---

### 3. Message Component

**Purpose**: Individual message display

**Layout**:
```
┌─────────────────────────────────────────┐
│  🐸 You (10:30 AM)                      │
├─────────────────────────────────────────┤
│  Message content here...                 │
│  Can span multiple lines                 │
│                                          │
│  Code blocks:                            │
│  ┌───────────────────────────────────┐ │
│  │ ```typescript                      │ │
│  │ function example() { }             │ │
│  │ ```                                │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Variants**:
- `user`: User message (right-aligned, primary color)
- `assistant`: AI response (left-aligned, default color)
- `system`: System message (centered, muted color)
- `error`: Error message (left-aligned, error color)

**Props**:
```typescript
interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  provider?: 'claude' | 'openai';
}
```

**States**:
- `default`: Rendered message
- `streaming`: Partial content, showing cursor
- `error`: Error state with retry option

---

### 4. Input Area

**Purpose**: Multi-line text input

**Layout**:
```
┌─────────────────────────────────────────┐
│  > Type your message...                 │
│                                          │
│  [Multi-line input area]                │
│  Supports:                               │
│  - Shift+Enter for new line              │
│  - Up/Down for history                   │
│  - Tab for completion                    │
│                                          │
└─────────────────────────────────────────┘
```

**Features**:
- Multi-line input (3-5 lines visible)
- Input history (↑/↓ keys)
- Auto-completion (Tab)
- Character count
- Send on Enter (Shift+Enter for newline)

**Props**:
```typescript
interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}
```

**States**:
- `idle`: Ready for input
- `typing`: User is typing
- `disabled`: Cannot input (streaming/error)
- `focus`: Input focused (highlighted border)

---

### 5. Status Bar

**Purpose**: System status and shortcuts

**Layout**:
```
┌─────────────────────────────────────────┐
│  ● Connected | Claude | Session: abc123 │
│  Ctrl+P: Switch  Ctrl+N: New  Ctrl+C: Quit│
└─────────────────────────────────────────┘
```

**Sections**:
- **Left**: Connection status, provider, session ID
- **Right**: Keyboard shortcuts

**Props**:
```typescript
interface StatusBarProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  provider?: 'claude' | 'openai';
  sessionId?: string;
  shortcuts?: Shortcut[];
}
```

**Status Colors**:
- `disconnected`: Gray
- `connecting`: Yellow (blinking)
- `connected`: Green
- `error`: Red

---

## Interaction Patterns

### Keyboard Shortcuts

```typescript
export const shortcuts = {
  // Navigation
  send: 'Enter',
  newline: 'Shift+Enter',
  historyUp: 'Up',
  historyDown: 'Down',
  
  // Actions
  switchProvider: 'Ctrl+P',
  newSession: 'Ctrl+N',
  clearScreen: 'Ctrl+L',
  cancelRequest: 'Escape',
  quit: 'Ctrl+C',
  
  // Scrolling
  scrollUp: 'Ctrl+Up',
  scrollDown: 'Ctrl+Down',
  scrollTop: 'Ctrl+Home',
  scrollBottom: 'Ctrl+End',
  
  // Input
  clearInput: 'Ctrl+U',
  completeInput: 'Tab',
};
```

### Focus Management

```typescript
// Focus order:
// 1. Input area (default)
// 2. Message list (when scrolling)
// 3. Status bar (info only, not focusable)
```

### Loading States

```typescript
// Streaming indicator
const streamingIndicator = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  interval: 100, // ms
};

// Connection spinner
const connectionSpinner = {
  frames: ['◐', '◓', '◑', '◒'],
  interval: 250, // ms
};
```

---

## Animation & Motion

Terminals have limited animation support. Use:

1. **Text-based spinners**: Unicode characters that rotate
2. **Color transitions**: Fade between colors (if supported)
3. **Blinking**: ANSI blink code (use sparingly)
4. **Progressive rendering**: Stream content character-by-character

### Motion Principles

- **Fast**: Animations should be < 200ms
- **Subtle**: Don't distract from content
- **Purposeful**: Every animation serves a function
- **Accessible**: Respect `NO_COLOR` and reduced motion preferences

---

## Accessibility

### Color Contrast

Ensure WCAG AA compliance:
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Screen Readers

- Use semantic text, not just symbols
- Announce status changes
- Provide text alternatives for icons

### Reduced Motion

```typescript
// Check for reduced motion preference
const prefersReducedMotion = process.env.NO_ANIMATION === '1' || 
  process.env.TERM_PROGRAM === 'Apple_Terminal'; // Some terminals don't support animation
```

---

## Implementation Notes

### Ink Component Patterns

```typescript
// Example: Message component
import { Box, Text } from 'ink';
import { useMemo } from 'react';

export const Message: React.FC<MessageProps> = ({ role, content, timestamp }) => {
  const formattedTime = useMemo(() => 
    format(timestamp, 'h:mm a'), [timestamp]
  );
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={role === 'user' ? 'primary' : 'text'}>
          {role === 'user' ? '🐸' : '🤖'} {role} ({formattedTime})
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
};
```

### Color Helper

```typescript
import chalk from 'chalk';

export function getColor(colorSupport: '16' | '256' | 'true') {
  const colors = colorSupport === 'true' ? colorsTrue : 
                 colorSupport === '256' ? colors256 : colors16;
  
  return {
    text: (text: string) => chalk.hex(colors.text)(text),
    primary: (text: string) => chalk.hex(colors.primary)(text),
    // ... etc
  };
}
```

---

## QA Checklist

### Visual
- [ ] Colors render correctly in 16/256/true-color modes
- [ ] Borders align properly (no gaps)
- [ ] Text doesn't overflow containers
- [ ] Spacing is consistent
- [ ] Icons/symbols render correctly

### Functional
- [ ] All keyboard shortcuts work
- [ ] Focus management is correct
- [ ] Scrolling works smoothly
- [ ] Input history works
- [ ] Multi-line input works

### Performance
- [ ] Long conversations don't lag
- [ ] Streaming updates smoothly
- [ ] No flickering on re-renders

### Accessibility
- [ ] High contrast mode works
- [ ] Screen reader compatible
- [ ] Reduced motion respected
- [ ] Keyboard-only navigation works

---

## Next Steps

1. **Implement color detection utility**
2. **Create base component library** (Box, Text wrappers with design tokens)
3. **Build core components** (App, Chat, Message, Input, StatusBar)
4. **Add state management** (Zustand store integration)
5. **Implement streaming** (real-time message updates)
6. **Add syntax highlighting** (Shiki integration)
7. **Test across terminals** (iTerm2, Terminal.app, Alacritty, Windows Terminal)
