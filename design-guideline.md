## Core Design Philosophy

### Primary Style: GitHub/Linear/Vercel Inspired

- Clean, minimalist interface with focus on functionality
- Monospace fonts for code/configuration elements
- High information density without feeling cluttered
- Dark mode as primary (with light mode option)
- Subtle animations for feedback, not decoration

## Navigation

- Fixed sidebar (collapsible) with icon + text
- Breadcrumb navigation for deep configuration editing
- Command palette (Cmd+K) for power users

## Cards/Panels

- Subtle border with slight shadow
- Hover: border brightens slightly
- No rounded corners OR very subtle (2-4px)

## Buttons

- Use the `Button` component from `@/components/ui/button`
- Use the `Button` component from `@/components/ui/button`

## Data Tables

- Compact rows with good data density
- Sticky headers
- Hover states for rows
- Inline actions on hover
- Sort indicators

## Code/Configuration Blocks

- Syntax highlighting
- Line numbers
- Copy button on hover
- Diff view for changes

## Spreadsheet Preview

- Monaco Editor style for data grids
- Zebra striping for rows
- Column headers with sort capability
- Cell selection with keyboard navigation
- Highlighted changes in green/red

## Interaction Patterns

### Feedback

- Loading skeletons instead of spinners
- Progress bars for long operations
- Toast notifications (top-right, auto-dismiss)
- Inline validation messages

### Animations

- Quick and functional (200-300ms)
- Slide transitions for panels
- Fade for modals
- Spring animations for drag-drop

## Reference Inspirations

### Primary References:

- Linear - For the command palette and keyboard shortcuts
- Vercel Dashboard - For the clean, technical aesthetic
- GitHub - For code-focused components
- Supabase - For data table design
- Railway - For the dark theme and gradient accents

### Avoid:

- Overly playful or colorful designs (like Notion)
- Enterprise heavy (like Salesforce)


### Use

- shadcn/ui
- tailwindcss
