---
title: TOAD TypeScript - UI Implementation Roadmap
date: 2026-01-16
author: UI Design Review
status: approved
lastUpdated: 2026-01-16
description: Prioritized action plan for UI parity implementation
---

# TOAD TypeScript - UI Implementation Roadmap

## Current vs. Target State

### Visual Comparison Matrix

| Component | Current State | Target State | Gap | Priority |
|-----------|--------------|--------------|-----|----------|
| **Layout** | Two-column exists | Banner + Sidebar (25%) + Main (75%) + Footer | Banner placement, proportions | P0 |
| **Colors** | Basic Ink colors | TOAD palette (exact hex codes) | Color constants need update | P0 |
| **MessageItem** | Role badges + timestamps | Enhanced badges, proper spacing, code blocks | Code block styling, spacing | P0 |
| **Sidebar** | Basic structure | File tree, accordion sections, icons | File tree, accordion, context files | P0 |
| **StatusFooter** | Basic shortcuts | Context-sensitive shortcuts, status row | Dynamic shortcuts, better layout | P0 |
| **AgentSelect** | Simple list | Grid/card layout with quick-select | Grid layout, visual cards | P1 |
| **PromptEditor** | Basic input | Multiline, @ mentions, fuzzy search | @ mentions, file search | P0 |
| **Streaming** | Basic rendering | Block-level markdown streaming | Incremental parsing, optimization | P0 |
| **Command Palette** | None | Ctrl+P overlay with search | Full implementation | P1 |
| **Code Blocks** | Basic border | Syntax highlighting, line numbers | Syntax highlighting, labels | P0 |

---

## Phase 1: Foundation (Days 1-3)

### Task 1.1: Install Phase 1 Packages
**Priority**: P0 - Critical
**Effort**: 1 hour
**Dependencies**: None

```bash
npm install \
  ink-virtual-list \
  ink-select-input \
  ink-text-input \
  ink-spinner \
  ink-divider \
  ink-table
```

**Acceptance Criteria**:
- [ ] All packages install without conflicts
- [ ] TypeScript types available
- [ ] No breaking changes to existing code

---

### Task 1.2: Update Color System
**Priority**: P0 - Critical
**Effort**: 2 hours
**Dependencies**: Task 1.1

**Files to Update**:
- `src/constants/colors.ts` - Add TOAD palette hex codes
- `src/ui/theme.ts` - Extend with full token system

**Changes**:
```typescript
// src/constants/colors.ts
export const COLOR = {
  // TOAD palette (exact hex codes)
  BACKGROUND: "#000000",
  TEXT_PRIMARY: "#FFFFFF",
  TEXT_DIM: "#808080",
  USER: "#00BFFF",        // cyan
  ASSISTANT: "#90EE90",   // light green
  SYSTEM: "#FFD700",      // gold
  CODE_BG: "#2F4F4F",    // dark slate gray
  BORDER: "#404040",      // dark gray
  ERROR: "#FF6B6B",       // coral
  SUCCESS: "#4CAF50",     // green
  WARNING: "#FFA726",     // orange
  // ... existing colors for compatibility
} as const;
```

**Acceptance Criteria**:
- [ ] All components use new color constants
- [ ] Visual matches TOAD palette
- [ ] No regressions in existing UI

---

### Task 1.3: Enhance MessageItem
**Priority**: P0 - Critical
**Effort**: 4 hours
**Dependencies**: Task 1.2

**Changes**:
1. Improve role badge styling (bold, uppercase, proper colors)
2. Add proper spacing (1-unit margin between messages)
3. Enhance code block rendering (round border, language label, syntax highlighting)
4. Add timestamp formatting (right-aligned, dimmed)

**Files to Update**:
- `src/ui/components/MessageItem.tsx`

**Acceptance Criteria**:
- [ ] Role badges match TOAD style
- [ ] Code blocks have round borders and language labels
- [ ] Spacing is consistent (1-unit margins)
- [ ] Timestamps are properly formatted

---

### Task 1.4: Refine StatusFooter
**Priority**: P0 - Critical
**Effort**: 3 hours
**Dependencies**: Task 1.2

**Changes**:
1. Add context-sensitive shortcuts (change based on focus)
2. Improve layout (two rows: shortcuts, status)
3. Add proper spacing and borders
4. Show task progress when available

**Files to Update**:
- `src/ui/components/StatusFooter.tsx`
- `src/ui/components/App.tsx` (pass context)

**Acceptance Criteria**:
- [ ] Shortcuts change based on current focus
- [ ] Two-row layout with proper spacing
- [ ] Status information displays correctly
- [ ] Borders and colors match TOAD style

---

## Phase 2: Core Features (Days 4-8)

### Task 2.1: Implement Sidebar File Tree
**Priority**: P0 - Critical
**Effort**: 6 hours
**Dependencies**: Task 1.1 (ink-virtual-list)

**Changes**:
1. Add file tree component with directory structure
2. Implement expand/collapse for directories
3. Add file type icons
4. Handle file selection

**Files to Create**:
- `src/ui/components/FileTree.tsx`

**Files to Update**:
- `src/ui/components/Sidebar.tsx`

**Acceptance Criteria**:
- [ ] File tree displays project structure
- [ ] Directories expand/collapse with arrow keys
- [ ] Files show type icons
- [ ] Selection works correctly

---

### Task 2.2: Sidebar Accordion Sections
**Priority**: P0 - Critical
**Effort**: 4 hours
**Dependencies**: Task 2.1

**Changes**:
1. Convert sidebar sections to accordion (expand/collapse)
2. Add visual indicators (▼ expanded, ▶ collapsed)
3. Implement keyboard navigation
4. Add context files section

**Files to Update**:
- `src/ui/components/Sidebar.tsx`

**Acceptance Criteria**:
- [ ] Sections toggle with Space/Enter
- [ ] Visual indicators show state
- [ ] Keyboard navigation works
- [ ] Context files display correctly

---

### Task 2.3: Streaming Markdown Renderer
**Priority**: P0 - Critical
**Effort**: 8 hours
**Dependencies**: Task 1.1

**Changes**:
1. Implement block-level parsing (from `ui-toad-fix.md`)
2. Add incremental parsing (only parse new content)
3. Implement minimal widget replacement
4. Add token buffering (5ms debounce)

**Files to Create**:
- `src/ui/components/MarkdownStreamer.tsx`
- `src/ui/components/MarkdownRenderer.tsx`

**Files to Update**:
- `src/ui/components/MessageItem.tsx` (use new renderer)

**Acceptance Criteria**:
- [ ] Streaming is smooth (60fps target)
- [ ] Display lag < 10ms behind tokens
- [ ] Parse time < 1ms per update
- [ ] All markdown elements render correctly

---

### Task 2.4: Prompt Editor with @ Mentions
**Priority**: P0 - Critical
**Effort**: 6 hours
**Dependencies**: Task 1.1 (ink-text-input), Task 2.1

**Changes**:
1. Convert to multiline editor
2. Add @ trigger for file mentions
3. Implement fuzzy file search
4. Respect .gitignore
5. Show autocomplete suggestions

**Files to Create**:
- `src/ui/components/FileSuggest.tsx`

**Files to Update**:
- `src/ui/components/InputWithAutocomplete.tsx` (or create PromptEditor.tsx)

**Acceptance Criteria**:
- [ ] Multiline input works
- [ ] @ triggers file suggestions
- [ ] Fuzzy search finds files quickly
- [ ] .gitignore is respected
- [ ] Autocomplete displays correctly

---

## Phase 3: Advanced Features (Days 9-12)

### Task 3.1: Agent Selection Grid
**Priority**: P1 - High
**Effort**: 4 hours
**Dependencies**: Task 1.1 (ink-select-input)

**Changes**:
1. Convert from list to grid layout
2. Add visual cards with borders
3. Implement quick-select (numbers 1-9)
4. Show agent status indicators

**Files to Update**:
- `src/ui/components/AgentSelect.tsx`

**Acceptance Criteria**:
- [ ] Grid layout displays correctly
- [ ] Cards have proper borders and spacing
- [ ] Quick-select works (1-9 keys)
- [ ] Status indicators show correctly

---

### Task 3.2: Command Palette (Ctrl+P)
**Priority**: P1 - High
**Effort**: 6 hours
**Dependencies**: Task 1.1 (ink-quicksearch-input)

**Changes**:
1. Create command palette overlay
2. Implement search/filter
3. Add keyboard navigation
4. Execute commands on selection

**Files to Create**:
- `src/ui/components/CommandPalette.tsx`

**Files to Update**:
- `src/ui/components/App.tsx` (add Ctrl+P handler)

**Acceptance Criteria**:
- [ ] Ctrl+P opens palette
- [ ] Search filters commands
- [ ] Arrow keys navigate
- [ ] Enter executes command
- [ ] Escape closes palette

---

### Task 3.3: Code Block Syntax Highlighting
**Priority**: P0 - Critical
**Effort**: 4 hours
**Dependencies**: Task 1.1 (ink-syntax-highlight or shiki)

**Changes**:
1. Integrate syntax highlighting (use existing shiki)
2. Add language detection
3. Style code blocks with proper colors
4. Add line numbers for long blocks

**Files to Update**:
- `src/ui/components/MessageItem.tsx` (code block rendering)

**Acceptance Criteria**:
- [ ] Syntax highlighting works for common languages
- [ ] Language is detected automatically
- [ ] Colors match TOAD style
- [ ] Line numbers show for long blocks

---

## Phase 4: Polish & Performance (Days 13-15)

### Task 4.1: Virtual Scrolling for Messages
**Priority**: P1 - High
**Effort**: 6 hours
**Dependencies**: Task 1.1 (ink-virtual-list)

**Changes**:
1. Implement virtual scrolling for MessageList
2. Only render visible messages
3. Maintain scroll position
4. Handle streaming messages correctly

**Files to Update**:
- `src/ui/components/MessageList.tsx`

**Acceptance Criteria**:
- [ ] 1000+ messages render without lag
- [ ] Scroll position maintained
- [ ] Streaming messages visible
- [ ] Performance targets met

---

### Task 4.2: Visual Regression Tests
**Priority**: P1 - High
**Effort**: 4 hours
**Dependencies**: All previous tasks

**Changes**:
1. Create screenshot comparison tests
2. Test on multiple terminal sizes
3. Test all component states
4. Document visual changes

**Files to Create**:
- `__tests__/visual/` directory
- Screenshot comparison utilities

**Acceptance Criteria**:
- [ ] Screenshots captured for key components
- [ ] Comparisons work correctly
- [ ] Tests run in CI
- [ ] Visual changes documented

---

### Task 4.3: Terminal Compatibility Testing
**Priority**: P1 - High
**Effort**: 4 hours
**Dependencies**: All previous tasks

**Changes**:
1. Test on iTerm2 (macOS)
2. Test on Windows Terminal
3. Test on Alacritty
4. Test on basic terminals (256-color)
5. Document compatibility issues

**Acceptance Criteria**:
- [ ] Works on all target terminals
- [ ] Graceful degradation for missing features
- [ ] Compatibility documented
- [ ] Known issues listed

---

## Package Installation Sequence

### Phase 1 Packages (Install First)
```bash
npm install \
  ink-virtual-list \
  ink-select-input \
  ink-text-input \
  ink-spinner \
  ink-divider \
  ink-table
```

### Phase 2 Packages (After Phase 1 Complete)
```bash
npm install \
  ink-big-text \
  ink-titled-box \
  ink-progress-bar \
  ink-syntax-highlight \
  ink-link
```

### Phase 3 Packages (Optional, After Phase 2)
```bash
npm install \
  ink-quicksearch-input \
  ink-multi-select \
  ink-task-list \
  ink-markdown \
  ink-form
```

---

## Risk Mitigation

### Risk 1: Package Conflicts
**Mitigation**: Install phase-by-phase, test after each phase
**Contingency**: Use alternative packages or custom implementations

### Risk 2: Performance Issues
**Mitigation**: Profile early, use virtual scrolling, optimize rendering
**Contingency**: Reduce features, increase debounce times

### Risk 3: Terminal Compatibility
**Mitigation**: Test on multiple terminals, use feature detection
**Contingency**: Graceful degradation, compatibility mode

### Risk 4: Timeline Overrun
**Mitigation**: Prioritize P0 tasks, defer P1 tasks if needed
**Contingency**: Ship MVP polish, iterate post-launch

---

## Success Criteria

### Must Have (P0)
- [ ] Visual parity with TOAD (90%+ similarity)
- [ ] All keyboard shortcuts work
- [ ] Streaming markdown renders smoothly
- [ ] File tree and sidebar functional
- [ ] Status footer shows context-sensitive shortcuts

### Should Have (P1)
- [ ] Agent selection grid
- [ ] Command palette
- [ ] Virtual scrolling for 1000+ messages
- [ ] Syntax highlighting for code blocks

### Nice to Have (P2)
- [ ] Advanced animations
- [ ] Theme system
- [ ] Custom terminal themes
- [ ] Rich content types (images, audio)

---

## Daily Standup Template

**Yesterday**:
- Completed: [tasks]
- Blockers: [issues]

**Today**:
- Plan: [tasks]
- Dependencies: [waiting on]

**Risks**:
- [any concerns]

---

**Status**: Ready for execution
**Owner**: Engineering Team
**Timeline**: 15 days (3 weeks)
**Next Action**: Install Phase 1 packages and begin Task 1.2
