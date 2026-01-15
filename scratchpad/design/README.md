# TOAD Design Documentation

This directory contains the complete design system and component specifications for the TOAD Terminal UI.

## Documents

### 📋 [Design Brief](./design-brief.md)
**Start here!** Overview of the design direction, variants, interaction specs, and handoff information.

- Problem statement and user needs
- Three design variants (Safe, Bold, Wildcard)
- Interaction specifications
- Component list and tokens
- QA checklist

### 🎨 [Design System](./design-system.md)
Complete design system with colors, typography, spacing, borders, and component architecture.

- Color system (16/256/true-color support)
- Typography tokens
- Spacing system (character-based)
- Border system (Unicode box-drawing)
- Component architecture
- Accessibility guidelines

### 🧩 [Component Specifications](./component-specs.md)
Detailed specifications for each UI component with visual layouts and implementation code.

- App container
- Chat panel
- Message list
- Message component
- Input area
- Status bar
- Provider selector
- Component states matrix
- Implementation priority

## Quick Reference

### Color Tokens
```typescript
// Primary
primary, primaryDim, primaryBright

// Semantic
success, warning, error, info

// Neutral
text, textDim, textMuted, bg, bgElevated

// Borders
border, borderBright
```

### Spacing
```typescript
// Horizontal (characters)
xs: 1, sm: 2, md: 4, lg: 8, xl: 16

// Vertical (lines)
line: 1, section: 2, block: 4
```

### Keyboard Shortcuts
```
Enter          Send message
Shift+Enter    New line
Up/Down        Input history
Ctrl+P         Switch provider
Ctrl+N         New session
Ctrl+L         Clear screen
Escape         Cancel request
Ctrl+C         Quit
```

### Component Structure
```
src/ui/
├── components/    # React/Ink components
├── hooks/        # Custom React hooks
├── styles/       # Design tokens
└── utils/        # Formatting utilities
```

## Design Principles

1. **Simplicity with Richness**: Minimal UI that feels premium
2. **Terminal-First**: Respect terminal constraints while pushing boundaries
3. **Keyboard-First**: Every interaction optimized for keyboard
4. **Information Density**: Balance readability with efficiency
5. **Progressive Enhancement**: Graceful degradation across terminal capabilities

## Implementation Status

- ✅ Design system defined
- ✅ Component specs created
- ✅ Color system with 16/256/true-color support
- ⏳ Components implementation (in progress)
- ⏳ State management integration
- ⏳ Streaming support
- ⏳ Syntax highlighting

## Next Steps

1. Review design documents
2. Implement core components (App, StatusBar, InputArea)
3. Add message formatting and syntax highlighting
4. Integrate with Zustand store
5. Test across terminal environments

## Questions?

Refer to the [Design Brief](./design-brief.md) for overview and handoff information, or [Component Specs](./component-specs.md) for detailed implementation details.
