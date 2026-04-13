# BankBI UI Redesign — Design Spec
**Date:** 2026-04-13  
**Status:** Approved  
**Stack:** Next.js 15 · Tailwind CSS · shadcn/ui · ECharts · Radix UI

---

## 1. Goals

- Remove monotonous design — varied typography weight, spacing, and subtle colour use
- Fintech-grade premium look (Stripe / modern banking aesthetics)
- Full dark **and** light theme — both first-class, OS preference respected
- Fully responsive — mobile, tablet, desktop
- Correct shadcn/ui usage — no duplicate hand-rolled primitives
- All data from the live database — no hardcoded demo values

---

## 2. Implementation Phases

| Phase | Scope | Files |
|---|---|---|
| **1 — Tokens** | `globals.css`, `tailwind.config.ts`, fonts in `layout.tsx` | 3 files |
| **2 — Shadcn cleanup** | Install missing components, delete duplicates, create `components.json` | ~8 files |
| **3 — Core components** | Sidebar, TopBar, KPICard, ChartCard, DataTable, Badge | 6 files |
| **4 — Page polish** | Executive, Pivot, Branch, Customer (priority), then remaining pages | 4–13 files |

---

## 3. Phase 1 — Design Token System

### 3.1 Color Palette

#### Dark mode (`:root` — default)
```css
/* Backgrounds */
--bg-base:        #0F172A;   /* slate-900 */
--bg-surface:     #1E293B;   /* slate-800 */
--bg-card:        #1E293B;   /* slate-800 */
--bg-card-hover:  #334155;   /* slate-700 */
--bg-input:       #0F172A;   /* slate-900 */

/* Borders */
--border:         rgba(148,163,184,0.10);  /* slate-400/10 */
--border-strong:  rgba(148,163,184,0.20);  /* slate-400/20 */

/* Text */
--text-primary:   #F1F5F9;   /* slate-100 */
--text-secondary: #94A3B8;   /* slate-400 */
--text-muted:     #475569;   /* slate-600 */

/* Primary accent — indigo */
--accent-blue:       #6366F1;
--accent-blue-dim:   rgba(99,102,241,0.12);

/* Secondary accent — emerald (positive / growth) */
--accent-green:      #10B981;
--accent-green-dim:  rgba(16,185,129,0.12);

/* Semantic — negative / loss */
--accent-red:        #F43F5E;
--accent-red-dim:    rgba(244,63,94,0.10);

/* Semantic — warning / neutral */
--accent-amber:      #F59E0B;
--accent-amber-dim:  rgba(245,158,11,0.10);

/* Analysis — pivot / advanced */
--accent-purple:     #8B5CF6;
--accent-purple-dim: rgba(139,92,246,0.10);

/* EAB / balance data */
--accent-teal:       #14B8A6;
--accent-teal-dim:   rgba(20,184,166,0.10);

/* Layout */
--sidebar-w:      220px;
--sidebar-w-collapsed: 56px;
--radius:         12px;
--radius-sm:      8px;
--radius-lg:      16px;

/* Charts */
--chart-grid:            rgba(148,163,184,0.08);
--chart-axis:            #64748B;
--chart-tooltip-bg:      rgba(15,23,42,0.95);
--chart-tooltip-border:  rgba(148,163,184,0.15);
--chart-glow:            0 8px 32px rgba(0,0,0,0.24);
```

#### Light mode (`[data-theme="light"]`)
```css
--bg-base:        #F8FAFC;   /* slate-50 */
--bg-surface:     #FFFFFF;
--bg-card:        #FFFFFF;
--bg-card-hover:  #F1F5F9;   /* slate-100 */
--bg-input:       #F1F5F9;

--border:         rgba(15,23,42,0.08);
--border-strong:  rgba(15,23,42,0.16);

--text-primary:   #0F172A;   /* slate-900 */
--text-secondary: #475569;   /* slate-600 */
--text-muted:     #94A3B8;   /* slate-400 */

/* Accent dims lightened for light bg */
--accent-blue-dim:   rgba(99,102,241,0.08);
--accent-green-dim:  rgba(16,185,129,0.08);
--accent-red-dim:    rgba(244,63,94,0.07);
--accent-amber-dim:  rgba(245,158,11,0.08);
--accent-purple-dim: rgba(139,92,246,0.08);
--accent-teal-dim:   rgba(20,184,166,0.08);

--chart-grid:           rgba(15,23,42,0.06);
--chart-axis:           #94A3B8;
--chart-tooltip-bg:     rgba(255,255,255,0.97);
--chart-tooltip-border: rgba(15,23,42,0.10);
--chart-glow:           0 4px 16px rgba(15,23,42,0.08);
```

#### Theme initialisation (OS preference → no flash)
In `app/layout.tsx` `<head>`, inline script:
```html
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    var saved = localStorage.getItem('bankbi-theme');
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = saved || preferred;
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
` }} />
```

### 3.2 Typography

#### Fonts (keep existing, swap body only)
```
--font-sans:    'Inter'              → body text, labels, table data
--font-display: 'Plus Jakarta Sans' → headings, KPI labels, page titles  
--font-mono:    'JetBrains Mono'    → numeric cells, amounts, code
```

Load Inter in `layout.tsx` alongside existing fonts.

#### Type Scale (Tailwind config extensions)
```js
fontSize: {
  '3xs': ['8px',  { lineHeight: '11px' }],
  '2xs': ['10px', { lineHeight: '14px' }],   // text-2xs → captions, badges
  'xs':  ['10px', { lineHeight: '14px' }],   // text-xs  → table cells, metadata
  'sm':  ['12px', { lineHeight: '18px' }],   // text-sm  → body, labels, sidebar
  'base':['14px', { lineHeight: '20px' }],   // text-base → card titles, buttons
  'lg':  ['18px', { lineHeight: '26px' }],   // text-lg  → section headers
  'xl':  ['22px', { lineHeight: '30px' }],   // text-xl  → KPI values
  '2xl': ['28px', { lineHeight: '36px' }],   // text-2xl → spotlight KPIs
  '3xl': ['36px', { lineHeight: '44px' }],   // text-3xl → hero numbers
}
```

### 3.3 Spacing & Radius
```js
borderRadius: {
  'sm':  '6px',
  DEFAULT:'10px',
  'lg':  '14px',
  'xl':  '16px',
  '2xl': '20px',
  'full':'9999px',
}
```
All spacing uses **8px grid** — prefer `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).

---

## 4. Phase 2 — Shadcn/ui Cleanup

### 4.1 Create `components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 4.2 Add missing shadcn components
```bash
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add tooltip
```

### 4.3 Delete custom duplicates after adding shadcn equivalents

| Delete | Reason |
|---|---|
| `components/ui/Pill.tsx` | Replaced by shadcn `Badge` with custom colour variants |
| `components/ui/Select.tsx` | Replaced by shadcn `Select` (Radix UI, proper a11y) |
| Inline `Table/TableHead/TableRow/TableCell/TableBody/TableHeader` in `DataTable.tsx` | Replaced by shadcn `Table` imports |

### 4.4 Update all import sites
- `Pill` → `Badge` (update variant prop to className pattern)
- `Select` (headlessui) → shadcn `Select` (update all dashboard filter selects)
- Inline table elements → shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

---

## 5. Phase 3 — Core Component Redesign

### 5.1 Sidebar (`components/layout/Sidebar.tsx`)

**Visual design:**
- Width: 220px expanded, 56px collapsed (icon rail)
- Background: `bg-bg-surface` + very subtle right border (`border-r border-border`)
- No heavy shadows — the border-right provides the separation
- Logo area: 56px tall, `font-display font-bold text-base`
- Live indicator: 8px green pulse dot + "Live data" text (hides when collapsed)

**Navigation items:**
- Height: 36px per item
- Padding: `px-3`
- Icon: 16px, `text-text-muted` inactive → `text-accent-blue` active
- Label: `text-sm font-medium`
- Active state: `bg-accent-blue-dim rounded-lg` + left 2px indigo border
- Hover: `bg-bg-card-hover rounded-lg` transition 150ms

**Section headers:**
- `text-xs font-semibold tracking-widest text-text-muted uppercase`
- 20px top margin

**Collapse button:**
- Bottom of sidebar, 36px, chevron icon rotates on collapse
- Collapsed: show icon-only with Tooltip (shadcn) on hover showing label

**Responsive:**
- Desktop (lg+): fixed left sidebar, pushes content
- Mobile (<lg): off-canvas drawer, overlay backdrop, triggered by TopBar hamburger

### 5.2 TopBar (`components/layout/TopBar.tsx`)

**Visual design:**
- Height: 56px
- Background: `bg-bg-surface/90 backdrop-blur-md`
- Bottom border: `border-b border-border`
- Sticky `top-0 z-[90]`

**Left zone:** Page title (`text-base font-semibold`) + subtitle (`text-xs text-muted`)

**Centre zone (period selector):**
- Pills: `ALL · 1D · WTD · MTD · QTD · YTD · FY · Custom`
- Inactive: `text-sm text-text-muted hover:text-text-primary`
- Active: `bg-accent-blue text-white rounded-lg px-3 py-1 text-sm font-medium`
- On mobile: horizontal scroll, no wrap

**Right zone:**
- Filter toggle button (shadcn `Button` outline variant)
- Theme toggle (shadcn `Switch`)
- User avatar dropdown (shadcn `DropdownMenu`)

**Responsive:**
- Mobile: hide period selector behind a "Period" dropdown button
- Tablet: show MTD/QTD/YTD/Custom only
- Desktop: show all

### 5.3 KPICard (`components/ui/KPICard.tsx`)

**Structure:**
```
┌────────────────────────────────────────┐
│ TOTAL AMOUNT              [sparkline]  │  ← text-xs uppercase text-muted
│                                        │
│ Rs. 142.3Cr                            │  ← text-2xl font-bold font-display
│                                        │
│ ↑ 12.4%  vs prev period               │  ← Badge green/red + text-xs muted
└────────────────────────────────────────┘
```

**Design tokens:**
- Card: `bg-bg-card rounded-xl border border-border shadow-sm`
- Hover: `hover:border-border-strong hover:shadow-md transition-all duration-200`
- Left accent bar: `border-l-2 border-accent-blue` (primary KPIs only)
- Sparkline: 48px wide × 28px tall, positioned top-right, no axes
- Change badge: shadcn `Badge` — green if positive, red if negative, amber if neutral
- No icon box — cleaner without it

**Variants:**
- `default` — standard card
- `spotlight` — larger value (`text-3xl`), gradient number colour (indigo→blue)
- `compact` — smaller padding, `text-xl` value, used in dense grids

### 5.4 ChartCard (`components/ui/ChartCard.tsx`)

**Structure:**
```
┌─────────────────────────────────────────┐
│ Transaction Trend     [Bar] [Line]  ⋮   │  ← text-base title, controls right
│ Rs. 142Cr total · Feb 2024              │  ← text-xs text-muted subtitle
├─────────────────────────────────────────┤
│                                         │
│  [ECharts area / bar / line chart]      │
│                                         │
└─────────────────────────────────────────┘
```

**Chart style defaults (applied to all ECharts instances):**
- Grid lines: `rgba(148,163,184,0.08)` horizontal only
- Axis labels: `text-xs text-muted` (`#64748B`)
- No axis border lines
- Tooltip: glass effect — `bg-bg-surface/95 backdrop-blur border border-border rounded-xl shadow-lg`
- Animation: 400ms ease-out on mount, bars grow from bottom, lines draw left→right
- Colour order: indigo → emerald → amber → teal → rose → violet

**Responsive:** Chart height `h-[200px] sm:h-[260px] lg:h-[300px]`

### 5.5 DataTable wrapper (`components/ui/DataTable.tsx`)

Replace hand-rolled `Table/TableHead/TableRow/TableCell` with shadcn `Table` components.

**Header:**
- `text-base font-semibold` title + `text-xs text-muted` subtitle
- Actions slot top-right

**Table:**
- shadcn `TableHeader` sticky: `sticky top-0 bg-bg-surface z-10`
- shadcn `TableHead`: `text-xs font-semibold text-muted uppercase tracking-wide`
- shadcn `TableRow` hover: `hover:bg-bg-card-hover transition-colors`
- Amount columns: `font-mono text-xs text-right`
- Empty state: centred illustration + message

### 5.6 Badge (replaces Pill)

shadcn `Badge` with custom className variants via `cn()`:
```typescript
const badgeVariants = {
  green:  'bg-accent-green-dim  text-accent-green  border-transparent',
  red:    'bg-accent-red-dim    text-accent-red    border-transparent',
  amber:  'bg-accent-amber-dim  text-accent-amber  border-transparent',
  blue:   'bg-accent-blue-dim   text-accent-blue   border-transparent',
  purple: 'bg-accent-purple-dim text-accent-purple border-transparent',
  teal:   'bg-accent-teal-dim   text-accent-teal   border-transparent',
  muted:  'bg-bg-input          text-text-muted    border-transparent',
}
```
All usages of `<Pill variant="...">` → `<Badge className={badgeVariants['...']}>`.

---

## 6. Phase 4 — Page Layout Polish

Priority order: Executive → Pivot → Branch → Customer → remaining.

### 6.1 Grid System (all pages)
```
Mobile  (<640px):  1 column, full width cards, stacked
Tablet  (640–1024):2 column grid for KPI cards, full-width charts
Desktop (>1024px): 4–5 column KPI row, 2–3 column chart grid
```

Standard page wrapper:
```tsx
<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
```

KPI row:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
```

Chart grid:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* or lg:grid-cols-3 for 3-up charts */}
```

### 6.2 Executive page specifics
- Top: 4–5 KPI spotlight cards (total amount, count, CR amt, DR amt, net flow)
- Middle: 2-column — trend line chart (left) + by-branch bar chart (right)
- Below: province table + channel distribution (2-column on desktop)
- Removed: Risk Monitor + Alerts panels (no DB source — already cleaned)

### 6.3 Pivot page specifics
- Sidebar controls: dimension picker + measure picker + period toggles
- Main area: pivot table with Excel-style two-tier headers
- Responsive: controls collapse to a drawer on mobile

### 6.4 Branch & Customer pages
- Standard: KPI row → charts row (2-col) → sortable table
- Branch detail: KPI row → 4-chart grid (trend, GL, channel, daily) → raw table

---

## 7. UX Enhancements

### Skeleton loaders
- Every data section shows `DashboardSkeleton` while loading
- KPI cards: `Skeleton` at fixed height matching final card height
- Tables: 5-row skeleton with shimmer
- Charts: rectangular skeleton with chart icon

### Empty states
- Tables with 0 rows: centred icon (from lucide-react) + message + optional CTA
- "No data for the selected filters" with a reset button

### Transitions
- All colour/shadow transitions: `duration-200 ease-in-out`
- Page enter: subtle `fadeInUp` (already defined in globals.css, keep)
- Number change: CSS counter animation for KPI values (existing `kpi-value-pop`)

### Focus & hover states
- All interactive elements: `focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:outline-none`
- Buttons: clear hover bg change
- Table rows: `hover:bg-bg-card-hover`
- Sidebar items: `hover:bg-bg-card-hover`

---

## 8. Responsiveness Summary

| Breakpoint | Sidebar | KPI Grid | Chart Grid | TopBar |
|---|---|---|---|---|
| Mobile <640 | Hidden (drawer) | 2-col | 1-col | Hamburger + title |
| Tablet 640–1024 | Hidden (drawer) | 3-col | 1-col | Compact period |
| Desktop >1024 | Fixed 220px | 4–5-col | 2–3-col | Full |
| Collapsed sidebar | Fixed 56px rail | Same as desktop | Same | Same |

---

## 9. Dark / Light Mode

- **Default:** OS preference via `prefers-color-scheme` (detected in inline script, no flash)
- **Override:** User toggle in TopBar persisted to `localStorage('bankbi-theme')`
- **Strategy:** `data-theme="light"` / `data-theme="dark"` on `<html>` element
- **Tailwind:** `darkMode: ["class", '[data-theme="dark"]']` (keep existing)
- Both modes use same CSS var names — only values change in `[data-theme="light"]`

---

## 10. Component Usage Rules (Golden Rules update)

Added to `CLAUDE.md`:
- **Never** create a custom `Badge`, `Table`, `Select`, `Separator`, or `Tooltip` — use shadcn
- **Always** use `cn()` from `@/lib/utils` for conditional class merging
- **Never** use inline `style={{}}` for colours that have a CSS variable — use Tailwind token class
- **Always** use shadcn `Skeleton` for loading states, never spinners
- `Pill` is deleted — always use shadcn `Badge` with `badgeVariants`

---

## 11. Files Changed Summary

| File | Action |
|---|---|
| `app/globals.css` | New token values (all CSS vars) + OS theme init |
| `app/layout.tsx` | Add Inter font + OS-preference inline script |
| `tailwind.config.ts` | Updated font sizes, new radius scale, keep all colour tokens |
| `components.json` | Create (shadcn config) |
| `components/ui/badge.tsx` | Add (shadcn) |
| `components/ui/table.tsx` | Add (shadcn) |
| `components/ui/select.tsx` | Replace headlessui with shadcn |
| `components/ui/separator.tsx` | Add (shadcn) |
| `components/ui/tooltip.tsx` | Add (shadcn) |
| `components/ui/Pill.tsx` | **Delete** |
| `components/ui/KPICard.tsx` | Redesign (keep custom, update tokens + remove icon box) |
| `components/ui/ChartCard.tsx` | Redesign (new chart defaults, better header) |
| `components/ui/DataTable.tsx` | Use shadcn Table inside |
| `components/layout/Sidebar.tsx` | Redesign (collapsible rail, tooltips, new active states) |
| `components/layout/TopBar.tsx` | Redesign (56px, compact period pills, OS theme toggle) |
| All pages using `<Pill>` | Update to `<Badge className={badgeVariants[...]}>`  |
| All pages using `<Select>` | Update to shadcn `<Select>` API |
| `app/dashboard/executive/page.tsx` | Layout polish (grid, spacing) |
| `app/dashboard/pivot/page.tsx` | Layout polish (sidebar controls, table headers) |
| `app/dashboard/branch/page.tsx` | Layout polish |
| `app/dashboard/customer/page.tsx` | Layout polish |
| `CLAUDE.md` | Add shadcn component rules section |

---

## 12. Out of Scope

- New pages or new API endpoints
- Recharts → ECharts migration (already on ECharts)
- Animation library (Framer Motion) — use CSS transitions only
- Icon library change — stay with lucide-react
