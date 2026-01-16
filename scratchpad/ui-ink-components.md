# Ink Useful Components - Implementation Guide

## Purpose
This document catalogs useful Ink ecosystem components that can enhance TOAD's UI to match the sophisticated design seen in inspiration files. These components provide rich, polished terminal UI elements that go beyond basic `Box` and `Text` primitives.

## Current State
- ✅ Using: `ink` (5.0.1), `@inkjs/ui` (2.0.0)
- ❌ Missing: Many specialized components that could enhance UX

## Useful Components from Ink Ecosystem

### Core Input Components

#### 1. `ink-text-input`
**Package**: `ink-text-input`  
**Purpose**: Enhanced text input with history, completions, and multi-line support  
**Use Case**: Replace custom `InputWithAutocomplete` with more robust solution  
**Install**: `npm install ink-text-input`

```typescript
import TextInput from 'ink-text-input';

<TextInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  placeholder="Type your message..."
  showCursor={true}
/>
```

**Benefits**:
- Built-in cursor management
- Better handling of special keys
- History support
- Multi-line editing

#### 2. `ink-select-input`
**Package**: `ink-select-input`  
**Purpose**: Dropdown/select lists with keyboard navigation  
**Use Case**: Agent selection, mode selection, command palette  
**Install**: `npm install ink-select-input`

```typescript
import SelectInput from 'ink-select-input';

<SelectInput
  items={[
    { label: 'Claude', value: 'claude' },
    { label: 'OpenAI', value: 'openai' },
  ]}
  onSelect={handleSelect}
  initialIndex={0}
/>
```

**Benefits**:
- Arrow key navigation
- Visual highlighting
- Search/filter support
- Better than custom implementation

#### 3. `ink-quicksearch-input`
**Package**: `ink-quicksearch-input`  
**Purpose**: Fast, quicksearch-like navigation (like VS Code command palette)  
**Use Case**: Command palette, file search, agent selection  
**Install**: `npm install ink-quicksearch-input`

```typescript
import QuickSearchInput from 'ink-quicksearch-input';

<QuickSearchInput
  items={commands}
  onSelect={handleCommand}
  limit={10}
/>
```

**Benefits**:
- Fuzzy search
- Fast navigation
- Perfect for command palettes
- Matches modern IDE UX

#### 4. `ink-confirm-input`
**Package**: `ink-confirm-input`  
**Purpose**: Yes/No confirmation dialogs  
**Use Case**: Tool call approvals, plan confirmations, destructive actions  
**Install**: `npm install ink-confirm-input`

```typescript
import ConfirmInput from 'ink-confirm-input';

<ConfirmInput
  message="Approve tool call?"
  onConfirm={() => handleApprove()}
  onCancel={() => handleCancel()}
/>
```

**Benefits**:
- Standardized confirmation UX
- Clear visual feedback
- Keyboard shortcuts (Y/N)

### Visual Enhancement Components

#### 5. `ink-spinner`
**Package**: `ink-spinner`  
**Purpose**: Loading spinners with multiple styles  
**Use Case**: Connection status, loading states, async operations  
**Install**: `npm install ink-spinner`

```typescript
import Spinner from 'ink-spinner';

<Box>
  <Spinner type="dots" />
  <Text> Connecting...</Text>
</Box>
```

**Available Types**: `dots`, `dots2`, `dots3`, `dots4`, `dots5`, `dots6`, `dots7`, `dots8`, `dots9`, `dots10`, `dots11`, `dots12`, `line`, `line2`, `pipe`, `simpleDots`, `simpleDotsScrolling`, `star`, `star2`, `flip`, `hamburger`, `growVertical`, `growHorizontal`, `balloon`, `balloon2`, `noise`, `bounce`, `boxBounce`, `triangle`, `arc`, `circle`, `squareCorners`, `circleQuarters`, `circleHalves`, `squish`, `toggle`, `toggle2`, `toggle3`, `toggle4`, `toggle5`, `toggle6`, `toggle7`, `toggle8`, `toggle9`, `toggle10`, `toggle11`, `toggle12`, `toggle13`, `arrow`, `arrow2`, `arrow3`, `pointer`, `pointer2`, `pointer3`, `pointer4`, `pointer5`, `weather`, `christmas`, `grenade`, `point`, `layer`, `betaWave`, `fingerDance`, `fistBump`, `soccerHeader`, `mindblown`, `speaker`, `orangePulse`, `bluePulse`, `orangeBluePulse`, `timeTravel`, `aesthetic`

**Benefits**:
- Professional loading indicators
- Multiple styles for different contexts
- Better than custom spinner

#### 6. `ink-progress-bar`
**Package**: `ink-progress-bar`  
**Purpose**: Progress bars for long-running operations  
**Use Case**: File uploads, plan execution, batch operations  
**Install**: `npm install ink-progress-bar`

```typescript
import ProgressBar from 'ink-progress-bar';

<ProgressBar
  percent={75}
  left={0}
  right={0}
  character="█"
  width={50}
/>
```

**Benefits**:
- Visual progress feedback
- Customizable appearance
- Better UX for long operations

#### 7. `ink-divider`
**Package**: `ink-divider`  
**Purpose**: Visual separators between sections  
**Use Case**: Separating message sections, sidebar sections, status areas  
**Install**: `npm install ink-divider`

```typescript
import Divider from 'ink-divider';

<Divider title="Messages" />
<Divider title="Files" />
```

**Benefits**:
- Clean visual separation
- Consistent styling
- Title support

#### 8. `ink-table`
**Package**: `ink-table`  
**Purpose**: Formatted tables with columns and rows  
**Use Case**: Displaying tool call results, file listings, plan tasks  
**Install**: `npm install ink-table`

```typescript
import Table from 'ink-table';

<Table
  data={[
    { name: 'Task 1', status: '✓', time: '2s' },
    { name: 'Task 2', status: '⟳', time: '...' },
  ]}
  columns={['name', 'status', 'time']}
/>
```

**Benefits**:
- Proper column alignment
- Clean formatting
- Better than manual spacing

#### 9. `ink-titled-box`
**Package**: `ink-titled-box`  
**Purpose**: Box with a title border  
**Use Case**: Code blocks, message containers, sidebar sections  
**Install**: `npm install ink-titled-box`

```typescript
import TitledBox from 'ink-titled-box';

<TitledBox title="Code Block" borderStyle="single">
  <Text>{code}</Text>
</TitledBox>
```

**Benefits**:
- Professional bordered sections
- Clear visual hierarchy
- Matches inspiration UI style

### Text & Typography Components

#### 10. `ink-big-text`
**Package**: `ink-big-text`  
**Purpose**: Large ASCII art text (like figlet)  
**Use Case**: App banner, section headers, welcome screen  
**Install**: `npm install ink-big-text`

```typescript
import BigText from 'ink-big-text';

<BigText
  text="TOAD"
  font="ANSI Shadow"
  colors={['cyan', 'magenta']}
/>
```

**Available Fonts**: `3d`, `3x5`, `5lineoblique`, `acrobatic`, `alligator`, `alligator2`, `alpha`, `alphabet`, `arrows`, `avatar`, `banner`, `banner3-D`, `banner3`, `banner4`, `barbwire`, `basic`, `bell`, `big`, `bigchief`, `binary`, `block`, `bubble`, `bulbhead`, `calgphy2`, `caligraphy`, `catwalk`, `chunky`, `coinstak`, `colossal`, `computer`, `contessa`, `contrast`, `cosmic`, `cosmike`, `crawford`, `crawford2`, `crazy`, `cricket`, `cursive`, `cyberlarge`, `cybermedium`, `cybersmall`, `diamond`, `digital`, `doh`, `doom`, `dotmatrix`, `drpepper`, `eftichess`, `eftifont`, `eftipiti`, `eftirobot`, `eftitalic`, `eftiwall`, `eftiwater`, `epic`, `fender`, `fourtops`, `fraktur`, `fuzzy`, `goofy`, `gothic`, `graceful`, `gradient`, `graffiti`, `hex`, `hieroglyphs`, `hollywood`, `invita`, `isometric1`, `isometric2`, `isometric3`, `isometric4`, `italic`, `ivrit`, `jazmine`, `jerusalem`, `katakana`, `kban`, `keyboard`, `knob`, `l4me`, `larry3d`, `lcd`, `lean`, `letters`, `linux`, `lockergnome`, `madrid`, `marquee`, `maxfour`, `mike`, `mini`, `mirror`, `mnemonic`, `modular`, `morse`, `moscow`, `muzzle`, `nancyj-fancy`, `nancyj-underlined`, `nancyj`, `nipples`, `ntgreek`, `o8`, `ogre`, `oldbanner`, `os2`, `pawp`, `peaks`, `pebbles`, `pepper`, `poison`, `puffy`, `pyramid`, `rectangles`, `relief`, `relief2`, `rev`, `roman`, `rot13`, `rotated`, `rounded`, `rowancap`, `rozzo`, `runic`, `runyc`, `sblood`, `script`, `serifcap`, `shadow`, `short`, `slant`, `slide`, `slscript`, `small`, `smisome1`, `smkeyboard`, `smscript`, `smshadow`, `smslant`, `smtengwar`, `speed`, `stampatello`, `standard`, `starwars`, `stellar`, `stop`, `straight`, `stronger`, `sub-zero`, `swan`, `tanja`, `tengwar`, `term`, `test1`, `thick`, `thin`, `threepoint`, `ticks`, `ticksslant`, `tiles`, `tinker-toy`, `tombstone`, `trek`, `tsalagi`, `tubular`, `twisted`, `twopoint`, `univers`, `usaflag`, `wavy`, `weird`, `wetletter`, `whimsy`, `wow`

**Benefits**:
- Professional ASCII art
- Multiple font options
- Color support
- Better than manual figlet integration

#### 11. `ink-ascii`
**Package**: `ink-ascii`  
**Purpose**: More font choices for ASCII art (based on Figlet)  
**Use Case**: Alternative to `ink-big-text` with more fonts  
**Install**: `npm install ink-ascii`

```typescript
import Ascii from 'ink-ascii';

<Ascii
  text="TOAD"
  font="ANSI Shadow"
  colors={['cyan']}
/>
```

**Benefits**:
- Even more font options
- Figlet-based
- Good alternative to `ink-big-text`

#### 12. `ink-gradient`
**Package**: `ink-gradient`  
**Purpose**: Gradient colors for text  
**Use Case**: App banner, highlights, status indicators  
**Install**: `npm install ink-gradient`

```typescript
import Gradient from 'ink-gradient';

<Gradient name="rainbow">
  <Text>TOAD - Terminal Orchestration</Text>
</Gradient>
```

**Available Gradients**: `atlas`, `cristal`, `teen`, `mind`, `morning`, `vice`, `passion`, `fruit`, `instagram`, `retro`, `summer`, `rainbow`, `pastel`

**Benefits**:
- Beautiful gradient effects
- Multiple preset gradients
- Professional appearance

#### 13. `ink-link`
**Package**: `ink-link`  
**Purpose**: Clickable links in terminal (if supported)  
**Use Case**: File paths, URLs, resource links  
**Install**: `npm install ink-link`

```typescript
import Link from 'ink-link';

<Link url="https://example.com">
  <Text>Click me</Text>
</Link>
```

**Benefits**:
- Clickable links in modern terminals
- Better UX for file paths
- Professional touch

### Code & Content Components

#### 14. `ink-syntax-highlight`
**Package**: `ink-syntax-highlight`  
**Purpose**: Syntax highlighting for code blocks  
**Use Case**: Code blocks in messages, file previews  
**Install**: `npm install ink-syntax-highlight`

```typescript
import SyntaxHighlight from 'ink-syntax-highlight';

<SyntaxHighlight
  code={code}
  language="typescript"
  theme="monokai"
/>
```

**Benefits**:
- Proper syntax highlighting
- Multiple themes
- Better than plain text

#### 15. `ink-markdown`
**Package**: `ink-markdown`  
**Purpose**: Render syntax highlighted Markdown  
**Use Case**: Message content, documentation, help text  
**Install**: `npm install ink-markdown`

```typescript
import Markdown from 'ink-markdown';

<Markdown>
  {markdownContent}
</Markdown>
```

**Benefits**:
- Full markdown support
- Syntax highlighting
- Tables, lists, etc.
- Could replace custom markdown rendering

### Layout & Navigation Components

#### 16. `ink-tab`
**Package**: `ink-tab`  
**Purpose**: Tab navigation interface  
**Use Case**: Settings tabs, view switcher, mode selector  
**Install**: `npm install ink-tab`

```typescript
import Tab from 'ink-tab';

<Tab
  tabs={['Chat', 'Files', 'Plan', 'Settings']}
  onChange={handleTabChange}
/>
```

**Benefits**:
- Standard tab interface
- Keyboard navigation
- Visual feedback

#### 17. `ink-multi-select`
**Package**: `ink-multi-select`  
**Purpose**: Select one or more values from a list  
**Use Case**: File selection, batch operations, settings  
**Install**: `npm install ink-multi-select`

```typescript
import MultiSelect from 'ink-multi-select';

<MultiSelect
  items={files}
  onSelect={handleSelect}
  selected={selectedFiles}
/>
```

**Benefits**:
- Multi-selection support
- Better than custom implementation
- Standard UX patterns

#### 18. `ink-scroll-view`
**Package**: `ink-scroll-view`  
**Purpose**: Scroll container for content  
**Use Case**: Message list, file tree, long content  
**Install**: `npm install ink-scroll-view`

```typescript
import ScrollView from 'ink-scroll-view';

<ScrollView>
  {messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
</ScrollView>
```

**Benefits**:
- Proper scrolling
- Performance optimized
- Better than manual scrolling

#### 19. `ink-scroll-list`
**Package**: `ink-scroll-list`  
**Purpose**: Scrollable list component  
**Use Case**: Message list, file list, search results  
**Install**: `npm install ink-scroll-list`

```typescript
import ScrollList from 'ink-scroll-list';

<ScrollList
  items={items}
  renderItem={(item) => <ItemComponent item={item} />}
/>
```

**Benefits**:
- Optimized list rendering
- Virtual scrolling support
- Better performance

#### 20. `ink-virtual-list`
**Package**: `ink-virtual-list`  
**Purpose**: Virtualized list that renders only visible items  
**Use Case**: Large message lists (1000+ messages), file trees  
**Install**: `npm install ink-virtual-list`

```typescript
import VirtualList from 'ink-virtual-list';

<VirtualList
  items={messages}
  itemHeight={3}
  height={20}
  renderItem={(item) => <MessageItem message={item} />}
/>
```

**Benefits**:
- Performance for large lists
- Only renders visible items
- Essential for 1000+ messages
- Matches performance requirements

### Form & Data Components

#### 21. `ink-form`
**Package**: `ink-form`  
**Purpose**: Form component with validation  
**Use Case**: Settings forms, configuration, agent setup  
**Install**: `npm install ink-form`

```typescript
import Form from 'ink-form';

<Form
  form={{
    title: 'Settings',
    sections: [
      {
        title: 'Connection',
        fields: [
          { name: 'apiKey', label: 'API Key', type: 'string' },
        ],
      },
    ],
  }}
  onSubmit={handleSubmit}
/>
```

**Benefits**:
- Structured forms
- Validation support
- Better UX than custom forms

#### 22. `ink-task-list`
**Package**: `ink-task-list`  
**Purpose**: Task list with checkboxes  
**Use Case**: Plan tasks, todo lists, progress tracking  
**Install**: `npm install ink-task-list`

```typescript
import TaskList from 'ink-task-list';

<TaskList
  tasks={[
    { label: 'Task 1', status: 'success' },
    { label: 'Task 2', status: 'pending' },
  ]}
/>
```

**Benefits**:
- Visual task tracking
- Status indicators
- Perfect for plan UI

### Advanced Components

#### 23. `ink-chart`
**Package**: `ink-chart`  
**Purpose**: Sparkline and bar charts  
**Use Case**: Performance metrics, progress visualization  
**Install**: `npm install ink-chart`

```typescript
import Chart from 'ink-chart';

<Chart
  data={[1, 2, 3, 4, 5]}
  type="sparkline"
/>
```

**Benefits**:
- Data visualization
- Performance metrics
- Professional charts

#### 24. `ink-stepper`
**Package**: `ink-stepper`  
**Purpose**: Step-by-step wizard interface  
**Use Case**: Onboarding, setup wizard, multi-step forms  
**Install**: `npm install ink-stepper`

```typescript
import Stepper from 'ink-stepper';

<Stepper
  steps={['Setup', 'Configure', 'Complete']}
  currentStep={currentStep}
/>
```

**Benefits**:
- Multi-step workflows
- Progress indication
- Better UX for complex flows

#### 25. `ink-picture`
**Package**: `ink-picture`  
**Purpose**: Display images in terminal (ASCII art conversion)  
**Use Case**: Icons, logos, visual elements  
**Install**: `npm install ink-picture`

```typescript
import Picture from 'ink-picture';

<Picture
  url="./logo.png"
  width={50}
/>
```

**Benefits**:
- Visual elements
- ASCII art conversion
- Icons and logos

### Utility Components

#### 26. `ink-color-pipe`
**Package**: `ink-color-pipe`  
**Purpose**: Create color text with simpler style strings  
**Use Case**: Simplified color styling  
**Install**: `npm install ink-color-pipe`

```typescript
import ColorPipe from 'ink-color-pipe';

<ColorPipe>
  <Text>{"{red}Error{/red} {green}Success{/green}"}</Text>
</ColorPipe>
```

**Benefits**:
- Simpler color syntax
- Template-like strings
- Easier styling

#### 27. `ink-spawn`
**Package**: `ink-spawn`  
**Purpose**: Spawn child processes and display output  
**Use Case**: Command execution, tool output, process monitoring  
**Install**: `npm install ink-spawn`

```typescript
import Spawn from 'ink-spawn';

<Spawn
  command="npm"
  args={['test']}
  onExit={(code) => console.log(`Exited with ${code}`)}
/>
```

**Benefits**:
- Process execution
- Output streaming
- Better than manual exec

## Recommended Implementation Priority

### Phase 1: Essential Components (Immediate)
1. **`ink-virtual-list`** - Critical for performance with large message lists
2. **`ink-select-input`** - Replace custom agent selection
3. **`ink-text-input`** - Enhanced input with better UX
4. **`ink-spinner`** - Professional loading indicators
5. **`ink-divider`** - Visual separation
6. **`ink-table`** - Better data display

### Phase 2: Visual Polish (Short-term)
7. **`ink-big-text`** or **`ink-ascii`** - App banner
8. **`ink-titled-box`** - Bordered sections
9. **`ink-progress-bar`** - Progress feedback
10. **`ink-syntax-highlight`** - Code blocks
11. **`ink-link`** - Clickable links

### Phase 3: Advanced Features (Medium-term)
12. **`ink-quicksearch-input`** - Command palette
13. **`ink-multi-select`** - Batch operations
14. **`ink-task-list`** - Plan UI
15. **`ink-markdown`** - Full markdown support
16. **`ink-form`** - Settings forms

### Phase 4: Nice-to-Have (Long-term)
17. **`ink-gradient`** - Visual effects
18. **`ink-chart`** - Metrics visualization
19. **`ink-stepper`** - Onboarding
20. **`ink-tab`** - Tab navigation

## Installation Commands

```bash
# Phase 1 - Essential
npm install ink-virtual-list ink-select-input ink-text-input ink-spinner ink-divider ink-table

# Phase 2 - Visual Polish
npm install ink-big-text ink-titled-box ink-progress-bar ink-syntax-highlight ink-link

# Phase 3 - Advanced
npm install ink-quicksearch-input ink-multi-select ink-task-list ink-markdown ink-form

# Phase 4 - Nice-to-Have
npm install ink-gradient ink-chart ink-stepper ink-tab
```

## Alignment with Inspiration UI

### From Inspiration Files Analysis:
- **Two-column layout** → `ink-titled-box` for sidebar sections
- **File tree** → `ink-scroll-list` or `ink-virtual-list` for large trees
- **Plan/task tracking** → `ink-task-list` for visual task status
- **Code blocks** → `ink-syntax-highlight` for proper highlighting
- **Tables** → `ink-table` for formatted data
- **Status indicators** → `ink-spinner`, `ink-progress-bar`
- **Borders/sections** → `ink-titled-box`, `ink-divider`
- **Command palette** → `ink-quicksearch-input`
- **ASCII banner** → `ink-big-text` or `ink-ascii`

## Migration Strategy

### Step 1: Replace Core Components
- Replace `InputWithAutocomplete` with `ink-text-input`
- Replace custom agent select with `ink-select-input`
- Add `ink-virtual-list` to `MessageList`

### Step 2: Add Visual Enhancements
- Add `ink-big-text` to `AsciiBanner`
- Add `ink-titled-box` to code blocks
- Add `ink-divider` to sections
- Add `ink-spinner` to loading states

### Step 3: Enhance Features
- Add `ink-quicksearch-input` for command palette
- Add `ink-task-list` to `PlanPanel`
- Add `ink-table` for tool call results
- Add `ink-syntax-highlight` to code blocks

### Step 4: Polish
- Add `ink-gradient` to banner
- Add `ink-progress-bar` for long operations
- Add `ink-link` for file paths
- Add `ink-markdown` for full markdown support

## Testing Considerations

All components should be tested with `ink-testing-library`:

```typescript
import { render } from 'ink-testing-library';
import { MyComponent } from './MyComponent';

test('renders correctly', () => {
  const { lastFrame } = render(<MyComponent />);
  expect(lastFrame()).toContain('Expected text');
});
```

## Performance Notes

- **`ink-virtual-list`** is essential for 1000+ messages
- **`ink-scroll-list`** provides better performance than manual scrolling
- Use `Static` component from Ink core for completed messages (already using)
- Throttle updates for streaming content

## References

- [Ink Useful Components](https://github.com/vadimdemedes/ink?tab=readme-ov-file#useful-components)
- [@inkjs/ui Documentation](https://github.com/vadimdemedes/ink-ui)
- [Ink Examples](https://github.com/vadimdemedes/ink/tree/master/examples)

## Next Steps

1. Review this document with team
2. Prioritize components based on current UI gaps
3. Install Phase 1 components
4. Create migration plan for each component
5. Update components one by one
6. Test thoroughly with `ink-testing-library`
7. Update UI documentation

---

**Last Updated**: 2026-01-14  
**Status**: Draft - Ready for Review
