---
title: TOAD TypeScript - Design Tokens Reference
date: 2026-01-16
author: UI Design Review
status: approved
lastUpdated: 2026-01-16
description: Complete design token system for TOAD UI implementation
---

# TOAD TypeScript - Design Tokens Reference

## Color Palette (TOAD Exact)

```typescript
// src/ui/theme.ts
export const palette = {
  // Base colors
  background: "#000000",    // Pure black
  text: {
    primary: "#FFFFFF",     // White
    dim: "#808080",         // Gray
  },
  
  // Role colors
  role: {
    user: "#00BFFF",        // Cyan / Light blue
    assistant: "#90EE90",    // Light green
    system: "#FFD700",      // Gold / Yellow
  },
  
  // Code blocks
  code: {
    background: "#2F4F4F",  // Dark slate gray
    border: "#404040",      // Dark gray
    text: "#90EE90",        // Light green (same as assistant)
  },
  
  // UI elements
  border: "#404040",        // Dark gray
  highlight: "#00BFFF",    // Cyan (for selections)
  
  // Status colors
  error: "#FF6B6B",         // Coral
  success: "#4CAF50",      // Green
  warning: "#FFA726",      // Orange
} as const;
```

## Spacing Scale (2-space base unit)

```typescript
export const spacing = {
  // Base units (characters)
  xs: 1,    // 2 chars
  sm: 2,    // 4 chars
  md: 3,    // 6 chars
  lg: 4,    // 8 chars
  xl: 6,    // 12 chars
  
  // Component-specific
  sidebar: {
    padding: 1,      // 2 chars
    sectionGap: 1,   // 2 chars between sections
    itemPadding: 1,  // 2 chars for items
  },
  message: {
    margin: 1,       // 2 chars between messages
    padding: 1,      // 2 chars content padding
    indent: 2,       // 4 chars for nested content
  },
  code: {
    padding: 1,      // 2 chars inside code block
    margin: 1,       // 2 chars outside code block
  },
  input: {
    padding: 1,      // 2 chars
    margin: 1,       // 2 chars
  },
  footer: {
    padding: 1,      // 2 chars
    rowGap: 0,       // No gap between rows
  },
  banner: {
    padding: 1,      // 2 chars
  },
} as const;
```

## Border Styles

```typescript
export const border = {
  // Standard border
  style: "single",
  color: "#404040",
  
  // Component-specific
  sidebar: {
    style: "single",
    color: "#404040",
    right: true,     // Only right border
  },
  code: {
    style: "round",  // Rounded corners
    color: "#404040",
  },
  footer: {
    style: "single",
    color: "#404040",
    top: true,       // Top border only
  },
  message: {
    style: "single",
    color: "#404040",
  },
} as const;
```

## Typography

```typescript
export const typography = {
  // Role badges
  role: {
    weight: "bold",
    transform: "uppercase",
    colors: {
      user: "#00BFFF",
      assistant: "#90EE90",
      system: "#FFD700",
    },
  },
  
  // Timestamps
  timestamp: {
    color: "dim",    // Use dimColor prop
    alignment: "right",
  },
  
  // Code blocks
  code: {
    language: {
      color: "dim",
      position: "top-left",
    },
    text: {
      color: "#90EE90",
      preserveWhitespace: true,
    },
  },
  
  // File tree
  fileTree: {
    directory: {
      icon: "📁",
      color: "default",
    },
    file: {
      icon: "📄",
      color: "default",
    },
    selected: {
      color: "#00BFFF",  // Cyan highlight
    },
  },
} as const;
```

## Layout Proportions

```typescript
export const layout = {
  // Sidebar
  sidebar: {
    width: "25%",        // 25% of terminal width
    minWidth: 20,        // Minimum 20 characters
    maxWidth: 40,        // Maximum 40 characters
  },
  
  // Main content
  main: {
    width: "75%",        // 75% of terminal width
    padding: 2,          // 4 characters padding
  },
  
  // Banner
  banner: {
    height: "auto",
    padding: 1,          // 2 characters
    border: false,       // No border (or optional)
  },
  
  // Footer
  footer: {
    height: "auto",
    minHeight: 2,        // Minimum 2 rows
    padding: 1,         // 2 characters
  },
  
  // Agent selection
  agentSelect: {
    grid: {
      columns: 3,       // 3 columns
      gap: 2,           // 4 characters between cards
    },
    card: {
      width: 30,        // 30 characters
      height: 6,        // 6 rows
      padding: 1,       // 2 characters
    },
  },
} as const;
```

## Component States

### MessageItem States
```typescript
export const messageStates = {
  streaming: {
    indicator: "▋",     // Cursor indicator
    color: "dim",
  },
  complete: {
    indicator: null,
    color: "default",
  },
  error: {
    indicator: "✗",
    color: "#FF6B6B",
  },
} as const;
```

### Sidebar Section States
```typescript
export const sidebarStates = {
  expanded: {
    icon: "▼",
    color: "default",
  },
  collapsed: {
    icon: "▶",
    color: "dim",
  },
  selected: {
    background: "#0A0A0A",  // Very dark gray
    border: "#00BFFF",      // Cyan
  },
} as const;
```

### Agent Selection States
```typescript
export const agentStates = {
  normal: {
    border: "#404040",
    background: "transparent",
  },
  selected: {
    border: "#00BFFF",      // Cyan
    background: "#0A0A0A",  // Very dark gray
  },
  loading: {
    border: "#FFA726",      // Orange
    background: "transparent",
  },
  error: {
    border: "#FF6B6B",      // Coral
    background: "transparent",
  },
} as const;
```

## Animation & Motion

```typescript
export const motion = {
  // Streaming
  streaming: {
    debounce: 5,        // 5ms debounce for parsing
    targetFPS: 60,      // Target 60fps
    maxLag: 10,         // Max 10ms display lag
  },
  
  // Transitions (terminal limitations)
  transitions: {
    instant: true,      // All transitions instant
    reducedMotion: true, // Respect reduced motion
  },
  
  // Loading indicators
  spinner: {
    type: "dots12",     // Ink spinner type
    color: "#00BFFF",   // Cyan
  },
} as const;
```

## Keyboard Shortcuts

```typescript
export const shortcuts = {
  // Global
  exit: "^C",           // Ctrl+C
  commands: "^P",       // Ctrl+P (command palette)
  help: "F1",          // F1 key
  focus: "Tab",        // Tab key
  
  // Context-sensitive (editor)
  editor: {
    cut: "^X",
    copy: "^C",
    paste: "^V",
    complete: "Tab",
  },
  
  // Context-sensitive (conversation)
  conversation: {
    navigate: "↑↓",
    interact: "Enter",
    copy: "C",
    search: "/",
  },
  
  // Sidebar
  sidebar: {
    toggle: "Space",
    expand: "Enter",
    navigate: "↑↓",
  },
  
  // Agent selection
  agentSelect: {
    navigate: "↑↓",
    select: "Enter",
    quickSelect: "1-9",  // Numbers 1-9
  },
} as const;
```

## File Type Icons

```typescript
export const fileIcons = {
  // Directories
  directory: "📁",
  directoryOpen: "📂",
  
  // Common files
  typescript: "📘",
  javascript: "📜",
  json: "📋",
  markdown: "📝",
  css: "🎨",
  html: "🌐",
  python: "🐍",
  rust: "🦀",
  go: "🐹",
  
  // Config files
  git: "🔧",
  config: "⚙️",
  lock: "🔒",
  
  // Default
  file: "📄",
} as const;
```

## Status Indicators

```typescript
export const statusIndicators = {
  // Connection status
  connection: {
    connected: {
      icon: "●",
      color: "#4CAF50",    // Green
    },
    connecting: {
      icon: "⟳",
      color: "#FFA726",   // Orange
    },
    error: {
      icon: "✗",
      color: "#FF6B6B",   // Coral
    },
    disconnected: {
      icon: "○",
      color: "#808080",   // Gray
    },
  },
  
  // Task status
  task: {
    pending: {
      icon: "○",
      color: "#808080",
    },
    inProgress: {
      icon: "⟳",
      color: "#FFA726",
    },
    completed: {
      icon: "✓",
      color: "#4CAF50",
    },
    failed: {
      icon: "✗",
      color: "#FF6B6B",
    },
  },
} as const;
```

## Usage Examples

### MessageItem with Tokens
```typescript
import { Box, Text } from 'ink';
import { palette, spacing, border, typography } from '@/ui/theme';

<Box 
  flexDirection="column" 
  marginY={spacing.message.margin}
  paddingLeft={spacing.message.padding}
>
  {/* Role badge */}
  <Box gap={spacing.xs}>
    <Text 
      bold 
      color={typography.role.colors[message.role]}
    >
      [{message.role.toUpperCase()}]
    </Text>
    <Text dimColor>
      {formatTime(message.timestamp)}
    </Text>
  </Box>
  
  {/* Content */}
  <Box paddingLeft={spacing.message.indent}>
    {renderContent(message.content)}
  </Box>
</Box>
```

### Code Block with Tokens
```typescript
<Box
  borderStyle={border.code.style}
  borderColor={border.code.color}
  padding={spacing.code.padding}
  marginY={spacing.code.margin}
>
  {/* Language label */}
  {language && (
    <Text color={typography.code.language.color} dimColor>
      {language}
    </Text>
  )}
  
  {/* Code content */}
  <Text color={palette.code.text}>
    {code}
  </Text>
</Box>
```

### Sidebar with Tokens
```typescript
<Box
  width={layout.sidebar.width}
  flexDirection="column"
  borderStyle={border.sidebar.style}
  borderColor={border.sidebar.color}
  borderRight={border.sidebar.right}
  paddingX={spacing.sidebar.padding}
  paddingY={spacing.sidebar.padding}
  gap={spacing.sidebar.sectionGap}
>
  {/* Sections */}
</Box>
```

---

## Implementation Checklist

- [ ] Create `src/ui/theme.ts` with all tokens
- [ ] Update `src/constants/colors.ts` with TOAD palette
- [ ] Update all components to use tokens
- [ ] Verify visual parity with TOAD
- [ ] Document any deviations
- [ ] Test on multiple terminals
- [ ] Update design system documentation

---

**Status**: Ready for implementation
**Last Updated**: 2026-01-16
