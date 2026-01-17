# TOAD UI/UX Implementation Guide

## Purpose
This guide ensures the TypeScript implementation of TOAD (toad-ts) matches the original Python TOAD's sophisticated terminal UI design. The original TOAD sets the gold standard for terminal AI interfaces with its rich visual design, advanced features, and exceptional user experience.

## Related Documents
- **[Ink Useful Components Guide](./ui-ink-components.md)** - Comprehensive catalog of Ink ecosystem components that can enhance TOAD's UI, including installation instructions, use cases, and migration strategies.

## Original TOAD Visual Identity

### Core Design Principles
1. **Modern Terminal Aesthetics**: Dark theme with high contrast, color-coded sections
2. **Information Density**: Maximizes screen real estate without clutter
3. **Context Awareness**: UI adapts to current task with context-sensitive elements
4. **Smooth Interactions**: Fluid animations, streaming text, responsive controls
5. **Professional Polish**: Clean borders, consistent spacing, thoughtful typography

### Color Palette
```
Background:     #000000 (pure black) or terminal default
Primary Text:   #FFFFFF (white)
Dim Text:       #808080 (gray)
User Messages:  #00BFFF (cyan/light blue)
Assistant:      #90EE90 (light green)
System:         #FFD700 (gold/yellow)
Code Blocks:    #2F4F4F (dark slate gray background)
Code Syntax:    Language-specific highlighting
Borders:        #404040 (dark gray)
Highlights:     #FF6B6B (coral for errors)
Success:        #4CAF50 (green)
Warning:        #FFA726 (orange)
```

## Critical UI Components

### 1. Application Layout - TWO-COLUMN DESIGN
```
┌──────────────────────────────────────────────────────────────────┐
│                    TOAD - Terminal Orchestration                 │  <- ASCII Banner/Title
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│   LEFT NAV     │              MAIN CONTENT AREA                 │
│                │                                                 │
│ ▼ Files        │  [USER]                                        │
│   ├─ src/      │  Message content here...                       │
│   │  ├─ app.ts │                                                 │
│   │  └─ ui/    │  [ASSISTANT]                                   │
│   └─ test/     │  ┌─────────────────────────────────┐          │
│                │  │ ```python                       │          │
│ ▼ Plan         │  │ def hello():                    │          │
│   ├─ Task 1 ✓  │  │     print("world")               │          │
│   ├─ Task 2 ⟳  │  │ ```                              │          │
│   └─ Task 3 ○  │  └─────────────────────────────────┘          │
│                │                                                 │
│ ▼ Context      │  Table example:                                │
│   ├─ @file1    │  ┌───────┬───────┬───────┐                    │
│   └─ @file2    │  │ Col 1 │ Col 2 │ Col 3 │                    │
│                │  ├───────┼───────┼───────┤                    │
│ ▼ Sessions     │  │ Data  │ Data  │ Data  │                    │
│   ├─ Current   │  └───────┴───────┴───────┘                    │
│   └─ History   │                                                 │
│                ├─────────────────────────────────────────────────┤
│                │  > Type your message... (@ for files)          │
├────────────────┴─────────────────────────────────────────────────┤
│ ^C Exit │ ^P Commands │ ^O Settings │ Tab Complete │ F1 Help    │
│ Status: Connected │ Agent: Claude │ Mode: Auto │ Tasks: 2/3     │
└──────────────────────────────────────────────────────────────────┘

LEFT SIDEBAR (25% width):
- Tab strip with icon-only tabs (default focus on Files) and in-pane bold headers; content scrolls within sidebar.
- Collapsible accordion sections
- File tree with syntax icons
- Plan/task tracker with status
- Context files attached
- Session management

MAIN CONTENT (75% width):
- Streaming conversation
- Rich markdown rendering
- Code blocks with syntax highlighting
- Tables, lists, all markdown features
- Smooth scrolling
```

### 2. Left Sidebar Navigation
- Use a top tab strip (icon-only: Files 📁, Plan 📋, Context 📎, Sessions 🕑, Sub-agents 🤖); Files tab selected by default.
- Each tab pane begins with a bold text header matching the tab name; pane content scrolls inside the sidebar, not the main layout.
- Accordion-style collapsible sections remain for nested content where applicable.
```typescript
interface SidebarSection {
  id: string;
  title: string;
  icon: string; // ▼ expanded, ▶ collapsed
  expanded: boolean;
  content: SidebarContent;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  icon?: string; // File type icons (📄, 📁, 🔧, etc.)
  selected?: boolean;
}

interface PlanTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  icon: '○' | '⟳' | '✓';
  subtasks?: PlanTask[];
}
```

**Implementation with ink-tree-select:**
```typescript
import TreeSelect from 'ink-tree-select';
import { Box, Text } from 'ink';

const Sidebar = () => {
  return (
    <Box
      width="25%"
      flexDirection="column"
      borderStyle="single"
      borderRight={true}
      borderTop={false}
      borderBottom={false}
      borderLeft={false}
    >
      {/* File System Accordion */}
      <AccordionSection title="Files" icon="▼">
        <TreeSelect
          tree={fileTree}
          onSelect={handleFileSelect}
          indicator="›"
          indentSize={2}
        />
      </AccordionSection>

      {/* Plan/Tasks Accordion */}
      <AccordionSection title="Plan" icon="▼">
        {tasks.map(task => (
          <Box key={task.id} paddingLeft={1}>
            <Text color={getTaskColor(task.status)}>
              {task.icon} {task.title}
            </Text>
          </Box>
        ))}
      </AccordionSection>

      {/* Context Files */}
      <AccordionSection title="Context" icon="▼">
        {contextFiles.map(file => (
          <Box key={file.path} paddingLeft={1}>
            <Text dimColor>@ {file.name}</Text>
          </Box>
        ))}
      </AccordionSection>

      {/* Session History */}
      <AccordionSection title="Sessions" icon="▶">
        <SessionList sessions={sessions} />
      </AccordionSection>
    </Box>
  );
};
```

### 3. Agent Selection Screen
**Original Design:**
- Grid layout showing available agents
- Each agent card displays: Name, Description, Status indicator
- Navigate with arrow keys, select with Space
- Visual highlighting of selected agent
- Quick launch shortcuts for frequently used agents

**Implementation Requirements:**
```typescript
interface AgentCard {
  id: AgentId;
  name: string;
  description: string;
  status: 'available' | 'loading' | 'error';
  lastUsed?: Date;
  icon?: string; // Optional emoji or symbol
}

// Visual styling
const AgentCardStyle = {
  border: 'single',
  borderColor: 'gray',
  padding: 1,
  width: 30,
  height: 6,
  selectedBorderColor: 'cyan',
  selectedBackground: '#0A0A0A'
};
```

### 3. Message Display
**Requirements:**
- Clear role indicators: `[USER]`, `[ASSISTANT]`, `[SYSTEM]`
- Proper spacing between messages
- Support for multiple content types per message
- Collapsible long outputs
- Timestamp display (subtle, right-aligned)

**Code Block Rendering:**
```typescript
interface CodeBlock {
  language: string;
  content: string;
  filename?: string;
  startLine?: number;
}

// Must include:
// - Language label in top-left corner
// - Syntax highlighting (use chalk or similar)
// - Line numbers for long blocks
// - Copy button indicator (keyboard shortcut)
// - Border with rounded corners
```

### 4. Markdown Streaming
**Critical Features:**
- Real-time rendering as content streams
- Proper table formatting with borders
- Nested list indentation
- Bold/italic text support
- Link highlighting (even if not clickable)
- Horizontal rules
- Blockquotes with left border

**Streaming Implementation (Based on Will McGugan's Optimization):**
```typescript
interface StreamingMarkdownRenderer {
  // Core optimizations from original TOAD
  blockLevelParsing: true;      // Parse only top-level blocks
  incrementalParsing: true;     // Parse only changed content
  minimalReplacement: true;     // Update only affected widgets
  tokenBuffering: true;         // Buffer between producer/consumer

  // Performance targets
  parseTime: '<1ms';            // Per update
  displayLag: '<10ms';          // Behind incoming tokens
}

class MarkdownStreamer {
  private blocks: MarkdownBlock[] = [];
  private lastBlockIndex: number = -1;
  private buffer: string = '';
  private parseTimeout: NodeJS.Timeout | null = null;

  // Optimization 1: Block-level parsing
  private parseBlocks(content: string): MarkdownBlock[] {
    // Split into top-level blocks (paragraphs, code, lists, etc.)
    // Only the last block can change during streaming
    const blocks = this.splitIntoBlocks(content);
    return blocks.map(b => this.parseBlock(b));
  }

  // Optimization 2: Minimal widget replacement
  private updateDisplay(newBlocks: MarkdownBlock[]) {
    // Compare with existing blocks
    for (let i = 0; i < newBlocks.length - 1; i++) {
      if (!this.blocksEqual(this.blocks[i], newBlocks[i])) {
        this.replaceBlock(i, newBlocks[i]);
      }
    }
    // Always update last block (it's being streamed)
    this.replaceBlock(newBlocks.length - 1, newBlocks[newBlocks.length - 1]);
  }

  // Optimization 3: Incremental parsing
  private parseIncremental(newContent: string) {
    const lastBlockStart = this.findLastBlockStart(this.buffer);
    const newPart = newContent.slice(this.buffer.length);

    // Only parse the new/changed content
    const changedBlock = this.buffer.slice(lastBlockStart) + newPart;
    const parsedBlock = this.parseBlock(changedBlock);

    // Update only the last block
    this.blocks[this.blocks.length - 1] = parsedBlock;
    this.buffer = newContent;
  }

  // Optimization 4: Token buffer management
  public addTokens(tokens: string) {
    this.buffer += tokens;

    // Debounce parsing for performance
    if (this.parseTimeout) clearTimeout(this.parseTimeout);
    this.parseTimeout = setTimeout(() => {
      this.parseIncremental(this.buffer);
      this.updateDisplay(this.blocks);
    }, 5); // 5ms debounce
  }
}
```

**Block Type Transitions:**
```typescript
// Handle dynamic block type changes during streaming
// Example: A line starting with "- " transforms paragraph into list
const handleBlockTransition = (
  currentBlock: MarkdownBlock,
  newContent: string
): MarkdownBlock => {
  const indicators = {
    list: /^[-*+]\s/,
    code: /^```/,
    heading: /^#{1,6}\s/,
    table: /^\|/,
  };

  for (const [type, pattern] of Object.entries(indicators)) {
    if (pattern.test(newContent)) {
      return transformBlock(currentBlock, type);
    }
  }
  return currentBlock;
};
```

### 5. Prompt Editor
**Features to Implement:**
```typescript
interface PromptEditor {
  // Core editing
  multilineSupport: true;
  syntaxHighlighting: true; // For markdown
  autoIndentation: true;

  // Navigation
  cursorMovement: 'keyboard' | 'mouse';
  textSelection: true;

  // Operations
  clipboard: ['cut', 'copy', 'paste'];
  undo/redo: true;

  // File integration
  fuzzyFileSearch: '@'; // Trigger character
  gitignoreRespect: true;

  // Visual
  lineNumbers: boolean; // For multiline
  scrollbar: boolean; // For long content
}
```

### 6. Status Footer
**Always Display:**
```
┌─────────────────────────────────────────────────────┐
│ ^C Exit | ^P Command | ^O Settings | Tab Complete   │
│ Status: Connected | Agent: Claude | Mode: Auto      │
│ Session: abc123 | Tasks: 3/10 | Memory: 124MB       │
└─────────────────────────────────────────────────────┘
```

**Context-Sensitive Keys:**
- Change based on current focus (editor vs list vs selection)
- Show most relevant 4-5 shortcuts
- Use consistent formatting: `^X` for Ctrl+X

### 7. Command Palette (Ctrl+P)
**Design:**
```
┌──────────────────────────────┐
│ > search commands...         │
├──────────────────────────────┤
│ › Clear conversation         │
│ › Change mode                │
│ › Export chat                │
│ › Settings                   │
│ › Switch agent               │
└──────────────────────────────┘
```

## Implementation Framework

### Phase 1: Core Visual Alignment
1. **Update MessageItem.tsx:**
   ```typescript
   // Add proper role badges
   const RoleBadge = ({ role }: { role: string }) => (
     <Text bold color={getRoleColor(role)}>
       [{role.toUpperCase()}]
     </Text>
   );

   // Add code block styling
   const CodeBlock = ({ block }: { block: CodeContent }) => (
     <Box borderStyle="round" borderColor="gray" padding={1}>
       <Text dimColor>{block.language}</Text>
       <SyntaxHighlight language={block.language}>
         {block.content}
       </SyntaxHighlight>
     </Box>
   );
   ```

2. **Update StatusLine.tsx:**
   ```typescript
   // Add context-sensitive shortcuts
   const shortcuts = getContextShortcuts(currentFocus);

   return (
     <Box flexDirection="column" borderStyle="single" borderColor="gray">
       <Box flexDirection="row" gap={1}>
         {shortcuts.map(s => (
           <Text key={s.key}>
             <Text bold color="cyan">{s.key}</Text>
             <Text> {s.label}</Text>
           </Text>
         ))}
       </Box>
       <Box flexDirection="row" gap={2}>
         {/* Status indicators */}
       </Box>
     </Box>
   );
   ```

### Phase 2: Advanced Features
1. **Implement Streaming Markdown Renderer:**
   - Use `markdown-it` or `marked` with streaming adapter
   - Custom renderer for terminal output
   - Stream-compatible chunking with block-level parsing
   - Implement the 4 optimizations from Will McGugan's approach:
     * Block-level parsing (only parse top-level blocks)
     * Minimal widget replacement (update only changed blocks)
     * Incremental parsing (parse only new content)
     * Token buffering (5ms debounce for performance)
   - Target: <1ms parse time per update, <10ms display lag

2. **Add File Integration:**
   - Fuzzy finder component
   - @ trigger in input
   - .gitignore parsing

3. **Shell Integration:**
   - Detect shell commands
   - Preserve ANSI colors
   - Support interactive mode

### Phase 3: Polish & Performance
1. **Animations:**
   - Smooth scrolling
   - Typing indicators
   - Loading spinners

2. **Performance:**
   - Virtual scrolling for long conversations
   - Debounced updates
   - Efficient re-renders

## Component Architecture & Implementation

### Main App.tsx Layout Structure
```typescript
import { Box } from 'ink';
import { AsciiBanner } from './components/AsciiBanner';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { StatusFooter } from './components/StatusFooter';

export function App() {
  return (
    <Box flexDirection="column" height="100%">
      {/* ASCII Banner */}
      <AsciiBanner />

      {/* Main Layout: Two Columns */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left Sidebar - 25% width */}
        <Sidebar
          width="25%"
          fileTree={fileTree}
          plan={currentPlan}
          contextFiles={contextFiles}
          sessions={sessions}
          onFileSelect={handleFileSelect}
          onTaskClick={handleTaskClick}
        />

        {/* Main Content - 75% width */}
        <MainContent
          width="75%"
          messages={messages}
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
        />
      </Box>

      {/* Status Footer - Full Width */}
      <StatusFooter
        status={connectionStatus}
        agent={currentAgent}
        mode={mode}
        shortcuts={contextShortcuts}
        taskProgress={taskProgress}
      />
    </Box>
  );
}
```

### Component-Specific Guidelines

#### AsciiBanner.tsx (NEW)
```typescript
import figlet from 'figlet';
import gradient from 'gradient-string';
import { Box, Text } from 'ink';

export const AsciiBanner = () => {
  const banner = gradient.rainbow(
    figlet.textSync('TOAD', {
      font: 'ANSI Shadow',
      horizontalLayout: 'fitted'
    })
  );

  return (
    <Box borderStyle="double" borderColor="cyan" padding={1}>
      <Text>{banner}</Text>
      <Text dimColor> Terminal Orchestration for AI Development</Text>
    </Box>
  );
};
```

#### Sidebar.tsx (NEW)
```typescript
import { Box } from 'ink';
import { FileTree } from './FileTree';
import { PlanAccordion } from './PlanAccordion';
import { ContextFiles } from './ContextFiles';
import { SessionHistory } from './SessionHistory';

export const Sidebar = ({ width, ...props }) => {
  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="single"
      borderRight={true}
      borderTop={false}
      borderBottom={false}
      borderLeft={false}
      paddingRight={1}
    >
      <FileTree {...props} />
      <PlanAccordion {...props} />
      <ContextFiles {...props} />
      <SessionHistory {...props} />
    </Box>
  );
};
```

#### MainContent.tsx (NEW)
```typescript
import { Box } from 'ink';
import { MessageList } from './MessageList';
import { PromptEditor } from './PromptEditor';
import { MarkdownRenderer } from './MarkdownRenderer';

export const MainContent = ({ width, messages, onSubmit, isStreaming }) => {
  return (
    <Box
      width={width}
      flexDirection="column"
      paddingX={2}
    >
      {/* Scrollable Message Area */}
      <Box flexGrow={1} overflowY="scroll">
        <MessageList messages={messages}>
          {(message) => (
            <MarkdownRenderer
              content={message.content}
              streaming={isStreaming && isLastMessage(message)}
            />
          )}
        </MessageList>
      </Box>

      {/* Input Area */}
      <Box borderStyle="single" borderColor="gray" marginTop={1}>
        <PromptEditor
          onSubmit={onSubmit}
          placeholder="Type your message... (@ for files, / for commands)"
          multiline={true}
          showLineNumbers={false}
        />
      </Box>
    </Box>
  );
};
```

#### Chat.tsx (REFACTOR)
- Split into MainContent.tsx and sub-components
- Move state management to App.tsx or custom hook
- Focus on orchestration rather than rendering

#### MessageItem.tsx (ENHANCE)
```typescript
import { Box, Text } from 'ink';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeBlock } from './CodeBlock';
import chalk from 'chalk';

const roleColors = {
  user: 'cyan',
  assistant: 'green',
  system: 'yellow',
};

export const MessageItem = ({ message }) => {
  const roleColor = roleColors[message.role] || 'white';

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Role Badge with Timestamp */}
      <Box gap={1}>
        <Text bold color={roleColor}>
          [{message.role.toUpperCase()}]
        </Text>
        <Text dimColor>
          {formatTime(message.timestamp)}
        </Text>
      </Box>

      {/* Message Content with Rich Formatting */}
      <Box paddingLeft={2} marginTop={1}>
        <MarkdownRenderer content={message.content} />
      </Box>
    </Box>
  );
};
```

#### Input.tsx → PromptEditor.tsx (RENAME & ENHANCE)
```typescript
import { TextInput } from 'ink-text-input';
import { FileSuggest } from './FileSuggest';
import { CommandPalette } from './CommandPalette';

export const PromptEditor = ({ onSubmit, multiline = true }) => {
  const [value, setValue] = useState('');
  const [showFileSuggest, setShowFileSuggest] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const handleChange = (newValue: string) => {
    setValue(newValue);

    // Trigger file suggestions on @
    if (newValue.endsWith('@')) {
      setShowFileSuggest(true);
    }

    // Trigger command palette on /
    if (newValue.startsWith('/')) {
      setShowCommands(true);
    }
  };

  return (
    <Box flexDirection="column">
      <TextInput
        value={value}
        onChange={handleChange}
        onSubmit={() => {
          onSubmit(value);
          setValue('');
        }}
        placeholder="Type your message..."
        showCursor
        multiline={multiline}
      />

      {showFileSuggest && (
        <FileSuggest onSelect={handleFileSelect} />
      )}

      {showCommands && (
        <CommandPalette onSelect={handleCommand} />
      )}
    </Box>
  );
};
```

#### StatusFooter.tsx (NEW)
```typescript
import { Box, Text } from 'ink';
import figures from 'figures';

export const StatusFooter = ({ status, agent, mode, shortcuts, taskProgress }) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray">
      {/* Shortcuts Row */}
      <Box gap={2} paddingX={1}>
        {shortcuts.map(({ key, label }) => (
          <Text key={key}>
            <Text bold color="cyan">{key}</Text>
            <Text> {label}</Text>
          </Text>
        ))}
      </Box>

      {/* Status Row */}
      <Box gap={2} paddingX={1} borderTop borderColor="gray">
        <Text>
          Status: <Text color={getStatusColor(status)}>{status}</Text>
        </Text>
        <Text>Agent: {agent}</Text>
        <Text>Mode: {mode}</Text>
        {taskProgress && (
          <Text>
            Tasks: {taskProgress.completed}/{taskProgress.total}
          </Text>
        )}
      </Box>
    </Box>
  );
};
```

#### MessageList.tsx (ENHANCE)
- Add virtual scrolling for performance
- Implement message grouping by time
- Add search functionality (Ctrl+F)
- Support message reactions/annotations

#### AgentSelect.tsx (REDESIGN)
- Convert to grid layout using Box with flexWrap
- Add visual cards with borders
- Show agent capabilities/features
- Implement keyboard navigation (arrows + numbers)

## Testing Requirements

### Visual Regression Tests
```typescript
// Test each component's visual output
describe('Visual Consistency', () => {
  test('MessageItem renders like original TOAD');
  test('Code blocks have proper syntax highlighting');
  test('Status line shows correct shortcuts');
});
```

### Interaction Tests
```typescript
// Test keyboard navigation
describe('Keyboard Navigation', () => {
  test('Arrow keys navigate agent selection');
  test('Tab completion works in prompt editor');
  test('Ctrl+P opens command palette');
});
```

## Implementation Priority Order

### Phase 1: Visual Foundation (Week 1)
1. **Color Scheme & Typography**
   - [ ] Update all components to use proper color palette
   - [ ] Implement consistent text styling (bold, dim, italic)
   - [ ] Add proper spacing and padding

2. **Message Display**
   - [ ] Implement role badges `[USER]`, `[ASSISTANT]`, `[SYSTEM]`
   - [ ] Add syntax-highlighted code blocks with borders
   - [ ] Fix message spacing and layout

3. **Status Footer**
   - [ ] Create context-sensitive footer with shortcuts
   - [ ] Add connection status indicators
   - [ ] Show session information

### Phase 2: Core Features (Week 2)
4. **Streaming Markdown**
   - [ ] Implement block-level parsing
   - [ ] Add incremental updates
   - [ ] Support all markdown elements (tables, lists, etc.)

5. **Enhanced Input**
   - [ ] Convert Input.tsx to PromptEditor.tsx
   - [ ] Add multiline support
   - [ ] Implement basic text navigation

6. **Agent Selection**
   - [ ] Convert to grid layout
   - [ ] Add visual polish (borders, highlights)
   - [ ] Implement keyboard navigation

### Phase 3: Advanced Features (Week 3)
7. **File Integration**
   - [ ] Add @ mention trigger
   - [ ] Implement fuzzy file search
   - [ ] Parse and respect .gitignore

8. **Command Palette**
   - [ ] Create Ctrl+P command palette
   - [ ] Add command search
   - [ ] Implement command execution

9. **Shell Integration**
   - [ ] Detect and handle shell commands
   - [ ] Preserve ANSI colors
   - [ ] Add interactive mode support

### Phase 4: Polish (Week 4)
10. **Performance**
    - [ ] Add virtual scrolling for long conversations
    - [ ] Optimize re-renders
    - [ ] Profile and fix bottlenecks

11. **Keyboard Navigation**
    - [ ] Add cursor-based block navigation
    - [ ] Implement all shortcuts
    - [ ] Add vim-style bindings (optional)

12. **Export & Clipboard**
    - [ ] Add conversation export
    - [ ] Implement clipboard operations
    - [ ] Create share functionality

## Migration Checklist

- [ ] Update color scheme to match original
- [ ] Implement proper message role badges
- [ ] Add syntax-highlighted code blocks
- [ ] Create footer with context shortcuts
- [ ] Implement command palette
- [ ] Add markdown streaming renderer
- [ ] Create prompt editor with @ mentions
- [ ] Add file fuzzy search
- [ ] Implement shell integration
- [ ] Add cursor-based navigation
- [ ] Create agent grid selection
- [ ] Add loading and error states
- [ ] Implement keyboard shortcuts
- [ ] Add export functionality
- [ ] Test on multiple terminals
- [ ] Add ASCII banner/branding

## Terminal Compatibility

### Recommended Terminals (from original)
1. **Ghostty** - Full features, best performance
2. **iTerm2** - Good macOS alternative
3. **Windows Terminal** - Windows support
4. **Alacritty** - Fast, GPU-accelerated

### Required Terminal Features
- 256 color support minimum
- UTF-8 character support
- Mouse event support
- ANSI escape sequences
- Reasonable performance for redraws

## Code Examples

### Proper Message Rendering
```typescript
const MessageItem = ({ message }: Props) => {
  return (
    <Box flexDirection="column" marginY={1}>
      {/* Role Badge */}
      <Box marginBottom={1}>
        <Text bold color={getRoleColor(message.role)}>
          [{message.role.toUpperCase()}]
        </Text>
        <Text dimColor> • {formatTime(message.timestamp)}</Text>
      </Box>

      {/* Content Blocks */}
      {message.content.map(block => (
        <ContentBlock key={block.id} block={block} />
      ))}
    </Box>
  );
};
```

### Syntax Highlighting Implementation
```typescript
import highlight from 'cli-highlight';

const SyntaxHighlight = ({ code, language }: Props) => {
  const highlighted = highlight(code, { language });
  return <Text>{highlighted}</Text>;
};
```

### Context-Sensitive Footer
```typescript
const getContextShortcuts = (context: UIContext): Shortcut[] => {
  switch (context.focus) {
    case 'editor':
      return [
        { key: '^X', label: 'Cut' },
        { key: '^C', label: 'Copy' },
        { key: '^V', label: 'Paste' },
        { key: 'Tab', label: 'Complete' },
      ];
    case 'conversation':
      return [
        { key: '↑↓', label: 'Navigate' },
        { key: 'Enter', label: 'Interact' },
        { key: 'C', label: 'Copy' },
        { key: '/', label: 'Search' },
      ];
    default:
      return [
        { key: '^P', label: 'Commands' },
        { key: '^C', label: 'Exit' },
        { key: 'Tab', label: 'Focus' },
      ];
  }
};
```

## Success Metrics

The implementation is successful when:
1. Side-by-side comparison shows visual parity with original TOAD
2. All keyboard shortcuts work as documented
3. Markdown rendering is smooth and accurate
4. File integration with @ works seamlessly
5. Performance remains smooth with 1000+ messages
6. Works correctly on recommended terminals
7. User feedback indicates feature parity

## Recommended Libraries & Tools

### Essential NPM Packages for Rich Terminal UI
```json
{
  "dependencies": {
    // Core UI Framework
    "ink": "^4.4.1",                  // React for CLIs
    "react": "^18.2.0",               // React core

    // ASCII Art & Fonts
    "figlet": "^1.7.0",               // ASCII art text banners
    "ascii-art": "^2.8.5",            // Full ASCII art suite
    "cfonts": "^3.2.0",               // Colorful console fonts
    "gradient-string": "^2.0.2",      // Gradient colors for text

    // Markdown Processing & Rendering
    "markdown-it": "^14.0.0",         // Streaming-friendly parser
    "marked": "^11.1.1",              // Alternative markdown parser
    "marked-terminal": "^6.2.0",      // Terminal renderer for marked
    "cli-highlight": "^2.1.11",       // Syntax highlighting for code blocks
    "highlight.js": "^11.9.0",        // Language detection & highlighting
    "prismjs": "^1.29.0",             // Alternative syntax highlighter

    // Terminal UI Components
    "ink-tree-select": "^1.1.1",      // Tree view for file system
    "ink-select-input": "^5.0.0",     // Select lists
    "ink-text-input": "^5.0.1",       // Text input component
    "ink-spinner": "^5.0.0",          // Loading spinners
    "ink-progress-bar": "^3.0.0",     // Progress indicators
    "ink-table": "^3.0.0",            // Table rendering
    "ink-divider": "^3.0.0",          // Visual separators
    "ink-big-text": "^2.0.0",         // Large ASCII text

    // Terminal Styling & Enhancements
    "chalk": "^5.3.0",                // Terminal text styling
    "boxen": "^7.1.1",                // Boxes with borders
    "cli-boxes": "^3.0.0",            // Box drawing characters
    "terminal-link": "^3.0.0",        // Clickable links in terminal
    "ansi-escapes": "^6.2.0",         // Terminal control sequences
    "strip-ansi": "^7.1.0",           // Remove ANSI codes
    "wrap-ansi": "^9.0.0",            // Word wrap with ANSI support

    // Animation & Loading
    "ora": "^8.0.1",                  // Elegant terminal spinners
    "cli-spinners": "^2.9.2",         // Spinner definitions
    "log-update": "^6.0.0",           // Update terminal output in-place
    "cli-progress": "^3.12.0",        // Progress bars
    "listr2": "^8.0.1",               // Terminal task lists

    // Icons & Symbols
    "figures": "^6.0.1",              // Unicode symbols
    "node-emoji": "^2.1.3",           // Emoji support
    "cli-icons": "^1.0.0",            // File type icons

    // File System & Navigation
    "fast-glob": "^3.3.2",            // Fast file globbing
    "fuse.js": "^7.0.0",              // Fuzzy search
    "ignore": "^5.3.0",               // .gitignore parsing
    "chokidar": "^3.5.3",             // File system watcher
    "directory-tree": "^3.5.1",       // Directory structure parsing

    // Tables & Data Display
    "cli-table3": "^0.6.3",           // Advanced table rendering
    "columnify": "^1.6.0",            // Column-based output
    "easy-table": "^1.2.0",           // Simple table formatting

    // Layout & Positioning
    "term-size": "^3.0.2",            // Terminal dimensions
    "cli-width": "^4.1.0",            // Terminal width detection
    "string-width": "^6.1.0",         // String display width

    // Performance & Optimization
    "throttle-debounce": "^5.0.0",   // Stream debouncing
    "p-queue": "^8.0.1",              // Promise queue for async ops
    "react-window": "^1.8.10",        // Virtual scrolling

    // Clipboard & System
    "clipboardy": "^4.0.0",           // Cross-platform clipboard
    "open": "^10.0.3",                // Open files/URLs

    // Utilities
    "date-fns": "^3.2.0",             // Date formatting
    "pretty-bytes": "^6.1.1",         // Byte size formatting
    "ms": "^2.1.3",                   // Time formatting
  }
}
```

### Component-Specific Package Usage

#### ASCII Banner (App Header)
```typescript
import figlet from 'figlet';
import gradient from 'gradient-string';
import cfonts from 'cfonts';

// Option 1: Figlet with gradient
const banner = gradient.rainbow(
  figlet.textSync('TOAD', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
  })
);

// Option 2: cfonts for more options
cfonts.say('TOAD', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'transparent',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
  gradient: ['cyan', 'magenta'],
  independentGradient: false,
  transitionGradient: true,
});
```

#### Markdown Rendering with Streaming
```typescript
import MarkdownIt from 'markdown-it';
import highlightjs from 'highlight.js';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked for terminal
marked.setOptions({
  renderer: new TerminalRenderer({
    code: (code, lang) => {
      return highlightjs.highlight(code, { language: lang }).value;
    },
    blockquote: (quote) => {
      return chalk.gray('│ ') + quote;
    },
    table: (header, body) => {
      // Use cli-table3 for proper table rendering
      return renderTable(header, body);
    }
  })
});

// Stream processing
class MarkdownStream {
  private md = new MarkdownIt({
    highlight: (str, lang) => {
      if (lang && highlightjs.getLanguage(lang)) {
        return highlightjs.highlight(str, { language: lang }).value;
      }
      return '';
    }
  });

  process(chunk: string): string {
    // Implement block-level parsing as described earlier
    return this.md.render(chunk);
  }
}
```

#### File Tree with Icons
```typescript
import { TreeSelect } from 'ink-tree-select';
import emoji from 'node-emoji';

const fileIcons = {
  '.ts': '📘',
  '.tsx': '⚛️',
  '.js': '📜',
  '.json': '📋',
  '.md': '📝',
  '.css': '🎨',
  '.html': '🌐',
  '.git': '🔧',
  'folder': '📁',
  'folder-open': '📂',
};

const getFileIcon = (filename: string, isDir: boolean): string => {
  if (isDir) return fileIcons['folder'];
  const ext = path.extname(filename);
  return fileIcons[ext] || '📄';
};
```

#### Animated Loading States
```typescript
import ora from 'ora';
import { Spinner } from 'ink-spinner';
import cliSpinners from 'cli-spinners';

// For non-React contexts
const spinner = ora({
  text: 'Loading AI response...',
  spinner: cliSpinners.dots12,
  color: 'cyan',
}).start();

// For React/Ink components
<Box>
  <Spinner type="dots12" />
  <Text> Thinking...</Text>
</Box>
```

#### Rich Tables
```typescript
import Table from 'cli-table3';

const table = new Table({
  head: ['Task', 'Status', 'Progress'],
  style: {
    head: ['cyan'],
    border: ['gray'],
  },
  chars: {
    'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
    'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
    'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
    'right': '│', 'right-mid': '┤', 'middle': '│'
  }
});

table.push(
  ['Parse markdown', '✓', '100%'],
  ['Render tables', '⟳', '60%'],
  ['Add syntax highlighting', '○', '0%']
);
```

## Resources

- Original TOAD: https://github.com/batrachianai/toad
- Blog with Screenshots: https://willmcgugan.github.io/toad-released/
- Streaming Markdown Article: https://willmcgugan.github.io/streaming-markdown/
- Ink Documentation: https://github.com/vadimdemedes/ink
- Terminal UI Best Practices: https://clig.dev/

## Notes for Implementers

1. **Start with visual basics** - Get colors and spacing right first
2. **Test on multiple terminals** - Ensure compatibility
3. **Profile performance early** - Terminal UIs can be slow
4. **Use original TOAD** - Install and use it to understand the feel
5. **Iterate on feedback** - Show users progress frequently

This guide should be treated as the source of truth for UI implementation. Any deviation should be discussed and documented.