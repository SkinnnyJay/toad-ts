# Ink Component Packages - Installation Guide

## Current Packages
We already have:
- ✅ `ink` (^5.0.1) - Core framework
- ✅ `@inkjs/ui` (^2.0.0) - Basic UI components
- ✅ `ink-testing-library` (^4.0.0) - Testing utilities

## Packages to Install

### Phase 1: Essential Components (Install First)

These are critical for core functionality and performance:

```bash
npm install ink-virtual-list ink-select-input ink-text-input ink-spinner ink-divider ink-table
```

**Package Details:**

1. **`ink-virtual-list`**
   - Purpose: Virtualized list for 1000+ messages (performance critical)
   - Use: MessageList component
   - Version: Latest
   - Size: ~50KB

2. **`ink-select-input`**
   - Purpose: Dropdown/select with keyboard navigation
   - Use: Agent selection, mode selection
   - Version: Latest (^5.0.0)
   - Size: ~30KB

3. **`ink-text-input`**
   - Purpose: Enhanced text input with history
   - Use: Replace InputWithAutocomplete
   - Version: Latest (^5.0.1)
   - Size: ~25KB

4. **`ink-spinner`**
   - Purpose: Loading spinners (30+ styles)
   - Use: Connection status, loading states
   - Version: Latest (^5.0.0)
   - Size: ~20KB

5. **`ink-divider`**
   - Purpose: Visual separators between sections
   - Use: Sidebar sections, message separation
   - Version: Latest (^3.0.0)
   - Size: ~10KB

6. **`ink-table`**
   - Purpose: Formatted tables with columns
   - Use: Tool call results, file listings, plan tasks
   - Version: Latest (^3.0.0)
   - Size: ~15KB

**Total Phase 1 Size**: ~150KB

---

### Phase 2: Visual Polish (Install Second)

These enhance visual appearance and UX:

```bash
npm install ink-big-text ink-titled-box ink-progress-bar ink-syntax-highlight ink-link
```

**Package Details:**

7. **`ink-big-text`**
   - Purpose: Large ASCII art text (like figlet)
   - Use: App banner, section headers
   - Version: Latest (^2.0.0)
   - Size: ~40KB (includes figlet fonts)

8. **`ink-titled-box`**
   - Purpose: Box with title border
   - Use: Code blocks, message containers, sidebar sections
   - Version: Latest
   - Size: ~15KB

9. **`ink-progress-bar`**
   - Purpose: Progress bars for long operations
   - Use: File uploads, plan execution, batch operations
   - Version: Latest (^3.0.0)
   - Size: ~10KB

10. **`ink-syntax-highlight`**
    - Purpose: Syntax highlighting for code blocks
    - Use: Code blocks in messages, file previews
    - Version: Latest
    - Size: ~50KB (includes highlighting engine)

11. **`ink-link`**
    - Purpose: Clickable links in terminal
    - Use: File paths, URLs, resource links
    - Version: Latest
    - Size: ~5KB

**Total Phase 2 Size**: ~120KB

---

### Phase 3: Advanced Features (Install Third)

These add advanced functionality:

```bash
npm install ink-quicksearch-input ink-multi-select ink-task-list ink-markdown ink-form
```

**Package Details:**

12. **`ink-quicksearch-input`**
    - Purpose: Fast quicksearch-like navigation (VS Code command palette style)
    - Use: Command palette, file search, agent selection
    - Version: Latest
    - Size: ~30KB

13. **`ink-multi-select`**
    - Purpose: Select one or more values from a list
    - Use: File selection, batch operations, settings
    - Version: Latest
    - Size: ~25KB

14. **`ink-task-list`**
    - Purpose: Task list with checkboxes
    - Use: Plan tasks, todo lists, progress tracking
    - Version: Latest
    - Size: ~20KB

15. **`ink-markdown`**
    - Purpose: Render syntax highlighted Markdown
    - Use: Message content, documentation, help text
    - Version: Latest
    - Size: ~80KB (includes markdown parser + highlighter)

16. **`ink-form`**
    - Purpose: Form component with validation
    - Use: Settings forms, configuration, agent setup
    - Version: Latest
    - Size: ~40KB

**Total Phase 3 Size**: ~195KB

---

### Phase 4: Nice-to-Have (Optional)

These add polish but aren't essential:

```bash
npm install ink-gradient ink-chart ink-stepper ink-tab
```

**Package Details:**

17. **`ink-gradient`**
    - Purpose: Gradient colors for text
    - Use: App banner, highlights, status indicators
    - Version: Latest
    - Size: ~15KB

18. **`ink-chart`**
    - Purpose: Sparkline and bar charts
    - Use: Performance metrics, progress visualization
    - Version: Latest
    - Size: ~30KB

19. **`ink-stepper`**
    - Purpose: Step-by-step wizard interface
    - Use: Onboarding, setup wizard, multi-step forms
    - Version: Latest
    - Size: ~20KB

20. **`ink-tab`**
    - Purpose: Tab navigation interface
    - Use: Settings tabs, view switcher, mode selector
    - Version: Latest
    - Size: ~15KB

**Total Phase 4 Size**: ~80KB

---

## Complete Installation Commands

### All at Once (Not Recommended - Install in Phases)
```bash
npm install \
  ink-virtual-list \
  ink-select-input \
  ink-text-input \
  ink-spinner \
  ink-divider \
  ink-table \
  ink-big-text \
  ink-titled-box \
  ink-progress-bar \
  ink-syntax-highlight \
  ink-link \
  ink-quicksearch-input \
  ink-multi-select \
  ink-task-list \
  ink-markdown \
  ink-form \
  ink-gradient \
  ink-chart \
  ink-stepper \
  ink-tab
```

### Recommended: Phase-by-Phase Installation

**Phase 1 (Essential):**
```bash
npm install ink-virtual-list ink-select-input ink-text-input ink-spinner ink-divider ink-table
```

**Phase 2 (Visual Polish):**
```bash
npm install ink-big-text ink-titled-box ink-progress-bar ink-syntax-highlight ink-link
```

**Phase 3 (Advanced):**
```bash
npm install ink-quicksearch-input ink-multi-select ink-task-list ink-markdown ink-form
```

**Phase 4 (Optional):**
```bash
npm install ink-gradient ink-chart ink-stepper ink-tab
```

---

## Package Size Summary

| Phase | Packages | Total Size | Priority |
|-------|----------|------------|----------|
| Phase 1 | 6 | ~150KB | **Critical** |
| Phase 2 | 5 | ~120KB | **High** |
| Phase 3 | 5 | ~195KB | Medium |
| Phase 4 | 4 | ~80KB | Low |
| **Total** | **20** | **~545KB** | - |

---

## Alternative Packages (If Needed)

### If `ink-big-text` doesn't work:
- **`ink-ascii`** - Alternative with more fonts
  ```bash
  npm install ink-ascii
  ```

### If `ink-syntax-highlight` doesn't work:
- We already have `shiki` (^1.14.1) - Can use directly
- Or use `ink-markdown` which includes highlighting

### If `ink-markdown` is too heavy:
- We already have `marked` (^14.1.0) and `marked-terminal` (^7.1.0)
- Can continue using these with custom rendering

---

## TypeScript Types

Most packages include TypeScript types. If any are missing, check:
- `@types/ink-*` packages
- Or the package's own types

---

## Version Compatibility

All packages should be compatible with:
- `ink` ^5.0.1 (we have)
- `react` ^18.0.0 (we have)
- Node.js >=20.0.0 (we require)

---

## Installation Verification

After installing, verify with:

```bash
# Check installed packages
npm list | grep ink

# Or check package.json
cat package.json | grep ink
```

---

## Next Steps After Installation

1. **Phase 1**: Start with `ink-virtual-list` for MessageList (biggest performance win)
2. **Phase 1**: Replace `InputWithAutocomplete` with `ink-text-input`
3. **Phase 1**: Replace custom agent select with `ink-select-input`
4. **Phase 2**: Add `ink-big-text` to AsciiBanner
5. **Phase 2**: Add `ink-titled-box` to code blocks
6. Continue with remaining components...

See `scratchpad/ui-ink-components.md` for detailed implementation examples.

---

**Last Updated**: 2026-01-14  
**Status**: Ready for Installation
