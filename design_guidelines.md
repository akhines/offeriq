# Design Guidelines: Real Estate Deal Underwriting App

## Design Approach

**System Selected**: Material Design with SaaS refinements - optimized for data-dense professional tools that require clarity, efficiency, and trust.

**Core Principles**:
- Information hierarchy over decoration
- Scannable data presentation
- Professional credibility through restraint
- Clear visual separation between input and output zones

---

## Typography System

**Font Family**: Inter (primary), Roboto Mono (numerical data)
- Headers: Inter 600-700 weight
- Body text: Inter 400-500 weight
- Numbers/calculations: Roboto Mono 400-500 weight

**Scale**:
- Page title: text-3xl font-semibold
- Section headers: text-xl font-semibold
- Card titles: text-base font-medium
- Labels: text-sm font-medium
- Body text: text-base
- Helper text: text-sm
- Calculated outputs: text-lg font-mono

---

## Layout Architecture

**Spacing System**: Use Tailwind units of 2, 4, 6, 8, and 16
- Component padding: p-6
- Card spacing: space-y-4
- Section gaps: gap-8
- Input margins: mb-4
- Tight groups: space-y-2

**Grid Structure**:
```
Desktop (lg+): Two-column layout
- Left column: 60% width (max-w-3xl)
- Right column: 40% width (sticky positioning)
- Gap between: gap-8

Mobile: Single column stack
- Interview questions first
- Outputs panel below (sticky bottom bar for key metrics)
```

**Container Management**:
- Main wrapper: max-w-7xl mx-auto px-6
- Question cards: full width within left column
- Output panels: full width within right column, sticky top-4

---

## Component Library

### Question Cards
**Structure**:
- Card container with subtle border and rounded corners
- Internal padding: p-6
- Question label: text-base font-medium mb-2
- Input field below with full width
- Helper text: text-sm mt-1
- Computed output (if exists): small badge or inline text below input
- AI button (if applicable): positioned top-right of card
- AI output area: collapsible section with distinct background, mt-4, p-4

**Input Fields**:
- Height: h-10 for text/number inputs
- Textarea: min-h-24
- Border radius: rounded-lg
- Focus states: prominent ring treatment
- Number inputs: Roboto Mono font
- Select dropdowns: full width, h-10
- Boolean toggles: switch component (not checkbox)
- Scale inputs (0-10): slider with numeric display

### Output Panels (Right Column)

**Underwriting Outputs Panel**:
- Card format with header
- Metrics displayed as key-value pairs
- Numbers: text-2xl font-mono font-semibold
- Labels: text-sm uppercase tracking-wide
- Grid layout for metrics: grid grid-cols-2 gap-4
- Risk flags: alert-style badges with icons

**Assignment Fee Slider Panel**:
- Dedicated card below outputs
- Large slider with value display
- Current value: text-3xl font-mono font-bold
- Range labels: text-sm at ends
- Impact display: show before/after values in two columns

**AI Negotiation Plan Panel**:
- Expandable/collapsible card (default collapsed until generated)
- Structured sections with clear headers
- Bullet points for actionable items
- Distinct visual treatment for different recommendation types (motivations, questions, scripts)

### Navigation & Actions

**Primary Actions**:
- Large, prominent buttons: px-6 py-3 text-base font-medium rounded-lg
- AI generation buttons: positioned consistently (top-right of relevant sections)
- Export buttons: grouped in header or footer

**Secondary Actions**:
- Smaller buttons: px-4 py-2 text-sm
- Link-style actions for less critical features

### Loading & Feedback States

**AI Loading**:
- Spinner with message in AI output areas
- Skeleton loaders for computed values
- Disabled state on buttons during processing

**Validation**:
- Inline error messages below inputs: text-sm
- Success confirmations: toast notifications top-right
- Warning badges for risk flags

---

## Layout Patterns

### Header
- Application title: left-aligned, text-2xl font-bold
- Quick stats or deal name: center or right
- Export/reset actions: far right
- Height: h-16, fixed or sticky
- Bottom border for separation

### Main Content Area
- Two-column grid on desktop with fixed proportions
- Left column scrollable with question cards
- Right column sticky with outputs always visible
- Mobile: stack with sticky summary bar

### Question Card Pattern
```
[Card Container]
  [Question Label + Help Icon]
  [Input Field]
  [Helper/Validation Text]
  [Computed Value Display (if applicable)]
  [AI Button (if applicable) - aligned right]
  [Collapsible AI Output Area]
```

### Footer
- Minimal height: h-12
- Attribution or help links: text-sm

---

## Data Visualization

**Numerical Displays**:
- Currency: prefix with $, use font-mono, include commas
- Percentages: suffix with %, one decimal place
- Square footage: include "sqft" label
- Age/years: append "years" or "yr"

**Metric Cards**:
- Icon or label at top
- Large number: text-3xl font-mono
- Descriptor below: text-sm
- Comparison values in smaller text below (delta/change)

**Risk Indicators**:
- Badge style with icon
- Clear severity levels through visual weight (not just color)
- Positioned near relevant metrics

---

## Interaction Patterns

**Progressive Disclosure**:
- Conditional questions appear smoothly (transition)
- AI outputs collapse/expand with animation
- Complex calculations hidden until relevant inputs filled

**Real-time Feedback**:
- Calculations update immediately on input change
- Slider shows live preview of offer changes
- Validation appears on blur, not on every keystroke

**Copy/Export**:
- One-click copy with confirmation toast
- Export generates JSON download automatically
- Summary format optimized for readability

---

## Accessibility Implementation

- Form labels always visible (not placeholder-only)
- Focus indicators consistent across all interactive elements
- Sufficient contrast for all text (especially on computed values)
- Keyboard navigation for entire form flow
- ARIA labels for icon-only buttons
- Screen reader announcements for dynamic calculations

---

## Responsive Behavior

**Breakpoints**:
- Mobile (base): Single column, sticky summary bar
- Tablet (md: 768px): Begin side-by-side, compressed
- Desktop (lg: 1024px): Full two-column layout
- Wide (xl: 1280px): Maximum width constraint, centered

**Mobile Optimizations**:
- Larger touch targets (min 44px)
- Simplified slider interface
- Collapsible sections default to collapsed
- Sticky bottom bar shows key metrics (investorBuyPrice, sellerOffer)
- Full-width inputs and buttons

---

## Images

This application does not require hero images or decorative photography. Focus is on clean data presentation and functional UI elements. Use icons from Heroicons for:
- Question type indicators
- Risk flags and alerts
- AI status indicators
- Action buttons (export, copy, reset)
- Navigation elements