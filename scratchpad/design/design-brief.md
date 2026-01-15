# TOAD Terminal UI Design Brief

## One-Screen Design Brief

### Problem
Developers need a unified, keyboard-first terminal interface for AI coding agents that feels premium, efficient, and works across diverse terminal environments (16-color, 256-color, true-color).

### User
**Primary**: Power users who live in the terminal, prefer keyboard navigation, and work with AI coding assistants daily.

**Job to be Done**: Quickly switch between AI providers, maintain conversation context, and get code suggestions with syntax highlighting—all without leaving the terminal.

### Success Metrics
- **Activation**: User sends first message within 30 seconds
- **Efficiency**: Average time to send message < 5 seconds
- **Retention**: 80% of users return within 7 days
- **Performance**: Streaming latency < 100ms, no UI jank

### Constraints

**Technical**:
- Terminal color support varies (16/256/true-color)
- Fixed-width monospace fonts
- Limited animation support
- No mouse interaction
- Screen size varies (80x24 minimum)

**Brand**:
- TOAD brand: Playful but professional
- Emoji usage: 🐸 for user, 🤖 for AI
- Color: Cyan as primary (terminal-friendly)

**Accessibility**:
- WCAG AA contrast ratios
- Screen reader support
- Reduced motion support
- Keyboard-only navigation

**Content**:
- Markdown support (code blocks, lists, links)
- Syntax highlighting (Shiki)
- Timestamps (relative or absolute)
- Provider names (Claude, OpenAI)

### Risks

1. **Terminal Compatibility**: Some terminals don't support true-color or box-drawing characters
   - **Mitigation**: Progressive enhancement, fallback to ASCII borders

2. **Performance**: Long conversations may lag
   - **Mitigation**: Virtual scrolling, message pagination

3. **Information Density**: Too much info overwhelms, too little feels sparse
   - **Mitigation**: Collapsible sections, configurable verbosity

4. **Color Accessibility**: Low-contrast terminals or colorblind users
   - **Mitigation**: High-contrast mode, semantic indicators beyond color

### Recommended Direction

**"Minimal Premium"** — Clean, information-dense interface with subtle polish. Focus on:
- Clear visual hierarchy
- Efficient keyboard navigation
- Progressive enhancement for terminal capabilities
- Fast, responsive interactions

---

## Variant Set

### Variant 1: Safe (MVP)

**Layout**: Simple vertical stack, basic borders, minimal styling

**Typography**: Single weight, standard terminal colors

**Motion**: Text-based spinners only, no animations

**Token Notes**: 16-color palette only, ASCII borders

**Accessibility**: High contrast, semantic text

**Engineering Asks**:
- **MVP**: Basic Ink components, no virtual scrolling
- **Strong**: Add syntax highlighting, input history
- **Iconic**: Virtual scrolling, smooth animations

**Why This Wins**: Fastest to ship, works everywhere, zero compatibility issues

**Risk**: May feel too basic, lacks polish

---

### Variant 2: Bold (Recommended)

**Layout**: Rounded borders, subtle shadows (via color), clear sections

**Typography**: Bold headings, dimmed secondary text, code blocks with background

**Motion**: Smooth streaming, subtle cursor animations, connection spinner

**Token Notes**: 256-color palette with true-color fallback, Unicode box-drawing

**Accessibility**: Color + semantic indicators, reduced motion support

**Engineering Asks**:
- **MVP**: Color detection, 256-color support, basic animations
- **Strong**: True-color support, syntax highlighting, virtual scrolling
- **Iconic**: Smooth streaming animations, connection status animations

**Why This Wins**: Best balance of polish and compatibility, feels premium without being flashy

**Risk**: Some terminals may not render Unicode borders correctly

---

### Variant 3: Wildcard

**Layout**: Split-screen with sidebar (sessions list), tabbed interface

**Typography**: Multiple weights, custom color schemes, theme support

**Motion**: Full animations, transitions, progress indicators

**Token Notes**: True-color only, custom themes, gradient support

**Accessibility**: Theme system includes high-contrast, dark/light modes

**Engineering Asks**:
- **MVP**: Basic split layout, theme system
- **Strong**: Full animations, custom themes, sidebar
- **Iconic**: Smooth transitions, gradient backgrounds, advanced layouts

**Why This Wins**: Most flexible, most visually impressive, future-proof

**Risk**: May not work on older terminals, higher complexity, longer development time

---

## Interaction Spec

### Key Transitions

#### Message Streaming
- **Duration**: Real-time (no delay)
- **Easing**: None (character-by-character)
- **Indicator**: Rotating dots (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏)
- **Reduced Motion**: Static cursor (▊)

#### Connection Status
- **Duration**: 250ms per frame
- **Easing**: Linear
- **Indicator**: Rotating spinner (◐◓◑◒)
- **Reduced Motion**: Static icon

#### Input Focus
- **Duration**: Instant
- **Easing**: None
- **Indicator**: Border changes from single to double, color changes
- **Reduced Motion**: Same, no animation

#### Provider Switch
- **Duration**: 200ms fade
- **Easing**: Ease-out
- **Indicator**: Status bar updates, provider name changes
- **Reduced Motion**: Instant switch

### Hover/Focus Behavior

**Terminal Limitation**: No true hover state. Use focus instead.

- **Input Area**: Double border + primary color on focus
- **Status Bar**: Not focusable (info only)
- **Messages**: Not focusable (read-only)
- **Provider Selector**: Highlighted option on focus

### Reduced Motion Behavior

```typescript
const prefersReducedMotion = 
  process.env.NO_ANIMATION === '1' || 
  process.env.TERM_PROGRAM === 'Apple_Terminal';

if (prefersReducedMotion) {
  // Use static indicators
  streamingIndicator = '▊';
  connectionSpinner = '●';
  // Disable all animations
}
```

---

## Handoff Pack

### Component List

| Component | Variants | States | Props |
|-----------|----------|--------|-------|
| **App** | - | idle, connecting, streaming, error | provider, sessionId, workingDir |
| **Chat** | - | idle, streaming | messages, isStreaming |
| **MessageList** | - | scrolling, at-top, at-bottom | messages, isStreaming |
| **Message** | user, assistant, system, error | default, streaming, error | role, content, timestamp, isStreaming |
| **InputArea** | - | idle, typing, focused, disabled | value, onChange, onSubmit, disabled |
| **StatusBar** | - | disconnected, connecting, connected, error | connectionStatus, provider, sessionId |
| **ProviderSelector** | - | open, focused, selected | onSelect |

### Token List

#### Colors
```typescript
// See design-system.md for full token list
primary, primaryDim, primaryBright
success, warning, error, info
text, textDim, textMuted
bg, bgElevated
border, borderBright
```

#### Typography
```typescript
// Sizes (line heights)
xs: 1, sm: 1, base: 1, lg: 2, xl: 3

// Weights
normal, bold, dim

// Styles
italic, underline
```

#### Spacing
```typescript
// Horizontal (characters)
xs: 1, sm: 2, md: 4, lg: 8, xl: 16

// Vertical (lines)
line: 1, section: 2, block: 4
```

#### Borders
```typescript
single, double, rounded, thick
```

### Redlines

#### Message Component
- **Padding**: 1 char horizontal, 1 line vertical between messages
- **Border**: Single border, rounded corners
- **Header**: Icon + role + timestamp, aligned per role
- **Content**: 2 char indent for assistant, right-aligned for user
- **Code Blocks**: 4 char horizontal padding, 1 line vertical padding

#### Input Area
- **Height**: Minimum 3 lines, maximum 5 lines
- **Border**: Single (idle), double (focused), error color (error)
- **Padding**: 1 char horizontal, 1 line vertical
- **Placeholder**: Dimmed text, disappears on focus

#### Status Bar
- **Height**: 1 line
- **Border**: Single, top border only
- **Padding**: 1 char horizontal
- **Layout**: Left (status), Right (shortcuts), space-between

### Implementation Notes

#### React + Ink + @inkjs/ui + Tailwind (N/A for terminal)

**Terminal-Specific**:
- Use `Box` for layout (flexbox)
- Use `Text` for text (with color props)
- Use `TextInput` from `@inkjs/ui` for input
- Use `Select` from `@inkjs/ui` for dropdowns
- Use `chalk` for colors (ANSI codes)

**State Management**:
- Zustand store for app state
- React hooks for component state
- Custom hooks for keyboard, scroll, history

**Styling**:
- No CSS, use Ink props
- Colors via `chalk` or `color` prop
- Spacing via `paddingX`, `paddingY`, `marginX`, `marginY`
- Borders via `borderStyle`, `borderColor`

**Code Example**:
```typescript
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

<Box flexDirection="column" paddingX={2}>
  <Text color="primary" bold>Heading</Text>
  <TextInput value={value} onChange={setValue} />
</Box>
```

---

## QA Checklist

### Pixel Checks
- [ ] Borders align correctly (no gaps)
- [ ] Text doesn't overflow containers
- [ ] Spacing is consistent (character-based)
- [ ] Colors render correctly in 16/256/true-color modes
- [ ] Unicode characters render (box-drawing, emoji)

### State Checks
- [ ] All component states render correctly
- [ ] Transitions between states are smooth
- [ ] Error states are clear and actionable
- [ ] Loading states show appropriate indicators

### Motion Checks
- [ ] Streaming animation is smooth
- [ ] Connection spinner rotates correctly
- [ ] Reduced motion is respected
- [ ] No flickering on re-renders

### Keyboard Checks
- [ ] All shortcuts work as documented
- [ ] Focus management is correct
- [ ] Tab order is logical
- [ ] Escape cancels appropriately

### Responsiveness
- [ ] Works on 80x24 terminal (minimum)
- [ ] Handles terminal resize gracefully
- [ ] Long messages wrap correctly
- [ ] Virtual scrolling works for 100+ messages

### Accessibility
- [ ] High contrast mode works
- [ ] Screen reader compatible (semantic text)
- [ ] Colorblind-friendly (not just color)
- [ ] Keyboard-only navigation works

### Performance
- [ ] No lag with 50+ messages
- [ ] Streaming updates smoothly (< 100ms latency)
- [ ] No memory leaks on long sessions
- [ ] Fast startup (< 500ms)

### Terminal Compatibility
- [ ] iTerm2 (macOS)
- [ ] Terminal.app (macOS)
- [ ] Alacritty
- [ ] Windows Terminal
- [ ] Linux terminals (xterm, gnome-terminal)

---

## Design System Files

1. **`docs/design-system.md`** - Complete design system (colors, typography, spacing, borders)
2. **`docs/component-specs.md`** - Detailed component specifications
3. **`docs/design-brief.md`** - This file (overview and handoff)

## Next Steps

1. **Review & Approve**: Review design system and component specs
2. **Implement Core**: Start with App, StatusBar, InputArea (MVP)
3. **Add Features**: Message formatting, syntax highlighting, virtual scrolling
4. **Test & Refine**: Test across terminals, gather feedback, iterate
5. **Document**: Update README with screenshots, usage examples

---

## Questions?

If anything is unclear or needs adjustment:
- Color palette too vibrant? → Adjust in `design-system.md`
- Component too complex? → Simplify in `component-specs.md`
- Missing states? → Add to component matrix
- Terminal compatibility concerns? → Add fallbacks

**Remember**: Terminal UIs are constrained but powerful. Focus on clarity, efficiency, and keyboard-first interactions.
