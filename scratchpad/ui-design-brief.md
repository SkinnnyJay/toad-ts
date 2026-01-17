---
title: TOAD TypeScript - UI Design Brief & Implementation Plan
date: 2026-01-16
author: UI Design Review
status: approved
lastUpdated: 2026-01-16
description: Comprehensive design analysis and implementation roadmap for TOAD UI parity
---

# TOAD TypeScript - UI Design Brief & Implementation Plan

## Executive Summary

**Current State**: Foundation exists (two-column layout, basic components) but significant gaps remain for TOAD/OpenCode visual parity.

**Goal**: Achieve visual and interaction parity with original TOAD while maintaining TypeScript/Ink architecture.

**Timeline**: 2-3 weeks for complete UI parity sprint.

**Priority**: P0 - Critical for user experience and differentiation.

---

## A) One-Screen Design Brief

### Problem Statement
The current UI lacks the polish, information density, and interaction patterns that make TOAD exceptional. Users expect:
- Rich visual hierarchy with clear role indicators
- Smooth streaming markdown with syntax highlighting
- Context-aware shortcuts and status information
- Professional terminal aesthetics matching original TOAD

### Target User
**Primary**: Developers using AI coding assistants in terminal environments
**Job-to-be-done**: Fast, context-rich AI coding sessions with clear visual feedback and control

### Success Metrics
1. **Visual Parity**: Side-by-side comparison shows 90%+ visual similarity to original TOAD
2. **Performance**: Streaming renders at 60fps, <10ms display lag behind tokens
3. **Usability**: All keyboard shortcuts work, file mentions complete in <500ms
4. **Polish**: Zero visual artifacts, consistent spacing, proper borders

### Constraints
- **Technical**: Ink/React limitations (no CSS, limited layout options)
- **Platform**: Terminal environments vary (256-color minimum, UTF-8 required)
- **Performance**: Must handle 1000+ messages without lag
- **Compatibility**: macOS/Linux/Windows terminal support

### Risks
1. **Performance**: Streaming markdown parsing could cause jank
   - *Mitigation*: Block-level parsing, debouncing, virtual scrolling
2. **Terminal Compatibility**: Some terminals lack features
   - *Mitigation*: Graceful degradation, feature detection
3. **Package Dependencies**: Ink ecosystem packages may conflict
   - *Mitigation*: Phase-by-phase installation, test each package

### Recommended Direction
**Variant: "Strong"** - Full TOAD parity with performance optimizations
- Complete visual redesign matching TOAD palette
- Streaming markdown with block-level parsing
- Full sidebar with file tree and accordion sections
- Context-sensitive shortcuts and status footer
- Agent selection grid with visual cards

---

## B) Variant Set

### Variant 1: Safe (MVP Polish)
**Layout**: Current two-column, enhanced spacing
**Motion**: Minimal (typing indicators only)
**Token Notes**: Use existing COLOR constants, add spacing scale
**Accessibility**: Basic keyboard navigation
**Engineering Asks**:
- **MVP**: Color palette alignment, role badge polish, basic status footer
- **Effort**: 2-3 days
- **Risk**: Low

### Variant 2: Strong (Recommended) ⭐
**Layout**: Full TOAD layout with banner, sidebar (25%), main (75%), footer
**Motion**: Smooth streaming, typing indicators, loading spinners
**Token Notes**: Complete TOAD palette, spacing scale, border styles, typography scale
**Accessibility**: Full keyboard navigation, focus indicators, screen reader hints
**Engineering Asks**:
- **MVP**: Phase 1-2 packages, color system, basic streaming
- **Strong**: Full sidebar, file tree, command palette, streaming markdown
- **Iconic**: Animations, virtual scrolling, advanced shortcuts
- **Effort**: 2-3 weeks
- **Risk**: Medium (performance optimization needed)

### Variant 3: Wildcard (Future Enhancement)
**Layout**: Three-panel (files | chat | diff), collapsible sections
**Motion**: Rich animations, transitions, micro-interactions
**Token Notes**: Extended palette, theme system, dark/light modes
**Accessibility**: Full ARIA support, custom terminal themes
**Engineering Asks**:
- **Effort**: 4-6 weeks
- **Risk**: High (complexity, terminal compatibility)

---

## C) Interaction Spec

### Key Transitions

#### Message Streaming
- **Duration**: Real-time (no artificial delay)
- **Easing**: None (character-by-character)
- **Debounce**: 5ms for block parsing
- **Visual**: Cursor indicator during streaming, dimmed when complete

#### Sidebar Accordion
- **Duration**: Instant (terminal limitations)
- **Visual**: `▼` expanded, `▶` collapsed
- **Interaction**: Space/Enter to toggle, arrow keys to navigate

#### Agent Selection
- **Duration**: Instant highlight change
- **Visual**: Border color change (gray → cyan), background highlight
- **Interaction**: Arrow keys navigate, Enter selects, numbers 1-9 quick-select

#### Command Palette (Ctrl+P)
- **Duration**: Instant open/close
- **Visual**: Overlay box with search input, filtered results
- **Interaction**: Type to filter, arrow keys navigate, Enter executes

### Hover/Focus Behavior
- **Focus Indicators**: Cyan border/background for focused elements
- **Hover**: Not applicable (terminal environment)
- **Active States**: Dimmed text for disabled, bold for active

### Reduced Motion
- **Respect**: `prefers-reduced-motion` via environment variable
- **Fallback**: Instant transitions, no animations
- **Implementation**: Check `TOADSTOOL_REDUCED_MOTION` env var

---

## D) Handoff Pack

### Component List & Variants

#### 1. AsciiBanner
**Variants**: Default (with text art)
**Props**: None
**States**: Loading, Loaded, Error (fallback to text)
**Tokens**: `palette.background`, `palette.border`

#### 2. Sidebar
**Variants**: Default (25% width), Collapsed (hidden)
**Props**: `width`, `sections` (Files, Plan, Context, Sessions)
**States**: Expanded sections, Collapsed sections
**Tokens**: `spacing.sidebar.padding`, `border.sidebar`

#### 3. FileTree (Sidebar Section)
**Variants**: Default, Selected file
**Props**: `tree` (FileTreeNode[]), `onSelect`
**States**: Expanded directory, Collapsed directory, Selected file
**Tokens**: `color.file.icon`, `color.file.selected`

#### 4. MessageItem
**Variants**: User, Assistant, System
**Props**: `message` (Message)
**States**: Streaming, Complete, Error
**Tokens**: `color.role.user`, `color.role.assistant`, `spacing.message.margin`

#### 5. CodeBlock
**Variants**: Default, With line numbers, Collapsed
**Props**: `code`, `language`, `filename?`
**States**: Expanded, Collapsed, Copying
**Tokens**: `color.code.background`, `color.code.border`, `spacing.code.padding`

#### 6. PromptEditor
**Variants**: Single-line, Multiline
**Props**: `value`, `onChange`, `onSubmit`, `placeholder`
**States**: Normal, File suggestions visible, Command palette visible
**Tokens**: `spacing.input.padding`, `border.input`

#### 7. AgentSelect
**Variants**: List (current), Grid (target)
**Props**: `agents`, `onSelect`
**States**: Normal, Selected, Loading
**Tokens**: `color.agent.selected`, `spacing.agent.card`

#### 8. StatusFooter
**Variants**: Default, Context-sensitive shortcuts
**Props**: `status`, `agent`, `mode`, `shortcuts`, `taskProgress`
**States**: Normal, Error, Loading
**Tokens**: `spacing.footer.padding`, `border.footer`

### Token List

```typescript
// src/ui/theme.ts (extend existing)

export const tokens = {
  // Colors (TOAD palette)
  color: {
    background: "#000000",
    text: {
      primary: "#FFFFFF",
      dim: "#808080",
    },
    role: {
      user: "#00BFFF",      // cyan
      assistant: "#90EE90", // light green
      system: "#FFD700",    // gold
    },
    code: {
      background: "#2F4F4F", // dark slate gray
      border: "#404040",     // dark gray
      text: "#90EE90",       // light green
    },
    border: "#404040",
    error: "#FF6B6B",        // coral
    success: "#4CAF50",      // green
    warning: "#FFA726",      // orange
    highlight: "#00BFFF",    // cyan
  },
  
  // Spacing (2-space base unit)
  spacing: {
    xs: 1,    // 2 chars
    sm: 2,    // 4 chars
    md: 3,    // 6 chars
    lg: 4,    // 8 chars
    xl: 6,    // 12 chars
    sidebar: {
      padding: 1,
      sectionGap: 1,
    },
    message: {
      margin: 1,
      padding: 1,
    },
    code: {
      padding: 1,
      margin: 1,
    },
    input: {
      padding: 1,
    },
    footer: {
      padding: 1,
      rowGap: 0,
    },
  },
  
  // Borders
  border: {
    style: "single",
    color: "#404040",
    sidebar: {
      right: true,
      style: "single",
    },
    code: {
      style: "round",
      color: "#404040",
    },
    footer: {
      top: true,
      style: "single",
    },
  },
  
  // Typography
  typography: {
    role: {
      weight: "bold",
      case: "uppercase",
    },
    timestamp: {
      color: "dim",
      size: "default",
    },
    code: {
      language: {
        color: "dim",
        size: "default",
      },
    },
  },
  
  // Layout
  layout: {
    sidebar: {
      width: "25%",
    },
    main: {
      width: "75%",
    },
    banner: {
      height: "auto",
      padding: 1,
    },
    footer: {
      height: "auto",
      minHeight: 2,
    },
  },
};
```

### Redlines (Critical Spacing/Alignment)

1. **Sidebar**: 25% width, right border only, 1-unit padding
2. **Message Items**: 1-unit margin between messages, 1-unit left padding for content
3. **Code Blocks**: Round border, 1-unit padding, language label in top-left
4. **Status Footer**: Two rows (shortcuts, status), 1-unit padding, top border
5. **Role Badges**: Bold, uppercase, color-coded, followed by dimmed timestamp

### Implementation Notes

#### React + Ink + shadcn + Tailwind
- **Note**: Ink doesn't support Tailwind or shadcn (web-only)
- **Use**: Ink's `Box`, `Text`, `useInput` primitives
- **Styling**: Inline props (`color`, `borderStyle`, `padding`)
- **Layout**: Flexbox via `flexDirection`, `width`, `height`

#### Package Integration
```typescript
// Phase 1 packages (install first)
import VirtualList from 'ink-virtual-list';      // MessageList
import SelectInput from 'ink-select-input';     // Agent selection
import TextInput from 'ink-text-input';          // Prompt editor
import Spinner from 'ink-spinner';               // Loading states
import Divider from 'ink-divider';               // Section separators
import Table from 'ink-table';                    // Tables in messages

// Phase 2 packages (visual polish)
import BigText from 'ink-big-text';              // Banner (alternative)
import TitledBox from 'ink-titled-box';          // Code blocks
import ProgressBar from 'ink-progress-bar';      // Progress indicators
import SyntaxHighlight from 'ink-syntax-highlight'; // Code highlighting
import Link from 'ink-link';                     // Clickable links
```

#### Streaming Markdown Implementation
```typescript
// Block-level parsing (from ui-toad-fix.md)
class MarkdownStreamer {
  private blocks: MarkdownBlock[] = [];
  private buffer: string = '';
  private parseTimeout: NodeJS.Timeout | null = null;
  
  addTokens(tokens: string) {
    this.buffer += tokens;
    if (this.parseTimeout) clearTimeout(this.parseTimeout);
    this.parseTimeout = setTimeout(() => {
      this.parseIncremental(this.buffer);
      this.updateDisplay(this.blocks);
    }, 5); // 5ms debounce
  }
}
```

---

## E) QA Checklist

### Pixel Checks
- [ ] Sidebar is exactly 25% width (test on 80, 120, 160 char terminals)
- [ ] Code blocks have round borders with 1-unit padding
- [ ] Role badges are bold, uppercase, color-coded
- [ ] Timestamps are right-aligned, dimmed
- [ ] Status footer has two rows with proper spacing

### State Checks
- [ ] MessageItem shows streaming indicator during streaming
- [ ] Code blocks collapse/expand correctly
- [ ] Sidebar sections toggle with Space/Enter
- [ ] Agent selection highlights correctly
- [ ] Command palette opens/closes with Ctrl+P

### Motion Checks
- [ ] Streaming text appears smoothly (no jank)
- [ ] Loading spinners animate correctly
- [ ] Focus indicators change instantly
- [ ] Reduced motion mode disables animations

### Keyboard Checks
- [ ] All shortcuts work (Ctrl+C, Ctrl+P, Tab, F1)
- [ ] Arrow keys navigate agent selection
- [ ] Arrow keys navigate command palette
- [ ] Enter selects/executes
- [ ] Escape closes modals/overlays

### Responsiveness
- [ ] Layout adapts to terminal width (min 80 chars)
- [ ] Sidebar collapses on narrow terminals (< 100 chars)
- [ ] Code blocks wrap correctly
- [ ] Tables render in narrow terminals

---

## Implementation Priority

### Week 1: Foundation
1. **Install Phase 1 packages** (ink-virtual-list, ink-select-input, etc.)
2. **Update color system** (align with TOAD palette)
3. **Enhance MessageItem** (role badges, timestamps, code blocks)
4. **Refine StatusFooter** (context-sensitive shortcuts)

### Week 2: Core Features
5. **Implement Sidebar** (file tree, accordion sections)
6. **Streaming markdown renderer** (block-level parsing)
7. **Prompt editor** (multiline, @ mentions, fuzzy search)
8. **Agent selection grid** (card layout, quick-select)

### Week 3: Polish
9. **Command palette** (Ctrl+P, search, execution)
10. **Virtual scrolling** (performance for 1000+ messages)
11. **Visual regression tests** (screenshot comparisons)
12. **Terminal compatibility** (test on iTerm2, Windows Terminal, Alacritty)

---

## Design Decisions

### 1. Color System
**Decision**: Use exact TOAD palette from `ui-toad-fix.md`
**Rationale**: Visual parity requires exact color matching
**Implementation**: Update `src/ui/theme.ts` and `src/constants/colors.ts`

### 2. Layout Proportions
**Decision**: 25% sidebar, 75% main content
**Rationale**: Matches original TOAD, optimal information density
**Implementation**: Use Ink `width` prop with percentage strings

### 3. Streaming Performance
**Decision**: Block-level parsing with 5ms debounce
**Rationale**: Balances smoothness with performance
**Implementation**: Custom `MarkdownStreamer` class (see handoff pack)

### 4. Package Strategy
**Decision**: Phase-by-phase installation (Phase 1 → 2 → 3)
**Rationale**: Reduces risk, allows incremental testing
**Implementation**: Follow `ui-packages-to-install.md` sequence

### 5. Terminal Compatibility
**Decision**: Support 256-color terminals minimum
**Rationale**: Broad compatibility without sacrificing quality
**Implementation**: Feature detection, graceful degradation

---

## Next Steps

1. **Review this brief** with engineering team
2. **Approve variant selection** (recommend "Strong")
3. **Install Phase 1 packages** and verify compatibility
4. **Begin Week 1 tasks** (color system, MessageItem, StatusFooter)
5. **Daily standups** to track progress and blockers

---

**Status**: Ready for implementation
**Owner**: UI/UX Team + Engineering
**Timeline**: 2-3 weeks
**Dependencies**: None (can start immediately)
