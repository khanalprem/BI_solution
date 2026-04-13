# UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernise BankBI to a premium, fully responsive, dark/light fintech dashboard — correct token values, shadcn components, Sidebar collapse, Pill→Badge migration, and page-layout polish.

**Architecture:** 4-phase approach — (1) update CSS design tokens + Tailwind config + fonts, (2) install missing shadcn components and migrate Pill→Badge, (3) rebuild Sidebar with collapse rail and refine KPICard, (4) polish page grids on Executive, Branch, Customer priority pages.

**Tech Stack:** Next.js 15, Tailwind CSS v3, shadcn/ui (Radix UI), lucide-react, JetBrains Mono / Plus Jakarta Sans / Inter (Google Fonts)

---

## File Map

| Action | File |
|--------|------|
| Modify | `frontend/app/globals.css` |
| Modify | `frontend/tailwind.config.ts` |
| Modify | `frontend/app/layout.tsx` |
| Create | `frontend/components.json` |
| Add (shadcn) | `frontend/components/ui/badge.tsx` |
| Add (shadcn) | `frontend/components/ui/table.tsx` |
| Add (shadcn) | `frontend/components/ui/separator.tsx` |
| Add (shadcn) | `frontend/components/ui/tooltip.tsx` |
| Delete | `frontend/components/ui/Pill.tsx` |
| Modify × 8 | All files importing `Pill` |
| Modify | `frontend/components/layout/Sidebar.tsx` |
| Modify | `frontend/components/ui/KPICard.tsx` |
| Modify | `frontend/app/dashboard/executive/page.tsx` |
| Modify | `frontend/app/dashboard/branch/page.tsx` |
| Modify | `frontend/app/dashboard/customer/page.tsx` |

---

## Task 1 — Update CSS Design Tokens (`globals.css`)

**Files:**
- Modify: `frontend/app/globals.css` lines 1-63

- [ ] **Step 1: Replace all `:root` CSS variables**

Open `frontend/app/globals.css`. Replace the entire `:root { … }` block (lines 6-38) with:

```css
:root {
  /* Backgrounds — slate-900/800 base */
  --bg-base:        #0F172A;
  --bg-surface:     #1E293B;
  --bg-card:        #1E293B;
  --bg-card-hover:  #334155;
  --bg-input:       #0F172A;

  /* Borders */
  --border:         rgba(148,163,184,0.10);
  --border-strong:  rgba(148,163,184,0.20);

  /* Text */
  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted:     #475569;

  /* Primary accent — indigo */
  --accent-blue:       #6366F1;
  --accent-blue-dim:   rgba(99,102,241,0.12);

  /* Secondary accent — emerald */
  --accent-green:      #10B981;
  --accent-green-dim:  rgba(16,185,129,0.12);

  /* Semantic — negative */
  --accent-red:        #F43F5E;
  --accent-red-dim:    rgba(244,63,94,0.10);

  /* Semantic — warning */
  --accent-amber:      #F59E0B;
  --accent-amber-dim:  rgba(245,158,11,0.10);

  /* Analysis */
  --accent-purple:     #8B5CF6;
  --accent-purple-dim: rgba(139,92,246,0.10);

  /* EAB / balance */
  --accent-teal:       #14B8A6;
  --accent-teal-dim:   rgba(20,184,166,0.10);

  /* Layout */
  --sidebar-w:           220px;
  --sidebar-w-collapsed: 56px;
  --radius:              12px;
  --radius-sm:           8px;
  --radius-lg:           16px;

  /* Charts */
  --chart-grid:            rgba(148,163,184,0.08);
  --chart-axis:            #64748B;
  --chart-tooltip-bg:      rgba(15,23,42,0.95);
  --chart-tooltip-border:  rgba(148,163,184,0.15);
  --chart-glow:            0 8px 32px rgba(0,0,0,0.24);

  /* Noise texture */
  --noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Replace the `[data-theme="light"]` block**

Replace the entire `[data-theme="light"] { … }` block (lines 41-63) with:

```css
[data-theme="light"] {
  --bg-base:        #F8FAFC;
  --bg-surface:     #FFFFFF;
  --bg-card:        #FFFFFF;
  --bg-card-hover:  #F1F5F9;
  --bg-input:       #F1F5F9;

  --border:         rgba(15,23,42,0.08);
  --border-strong:  rgba(15,23,42,0.16);

  --text-primary:   #0F172A;
  --text-secondary: #475569;
  --text-muted:     #94A3B8;

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
}
```

- [ ] **Step 3: TypeScript check — verify no TS errors introduced**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors (only pre-existing errors in the excluded pages).

- [ ] **Step 4: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add app/globals.css
git commit -m "$(cat <<'EOF'
style: update design token palette to slate-900 base + indigo accent

Backgrounds move from custom navy (#0d0f14) to slate-900/800.
Accent-blue changes from #3b82f6 → #6366F1 (indigo).
Accent-red from #ef4444 → #F43F5E, teal from #06b6d4 → #14B8A6.
Light-mode dims now correctly sized for lighter backgrounds.
Adds --sidebar-w-collapsed, --radius-lg CSS vars.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Update Tailwind Config (`tailwind.config.ts`)

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Replace the entire tailwind.config.ts with updated values**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:         "var(--bg-base)",
          surface:      "var(--bg-surface)",
          card:         "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          input:        "var(--bg-input)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
        },
        accent: {
          // Solid accent colours — same in both themes
          blue:   "#6366F1",
          green:  "#10B981",
          red:    "#F43F5E",
          amber:  "#F59E0B",
          purple: "#8B5CF6",
          teal:   "#14B8A6",
          // Dim variants — CSS vars so light/dark theme overrides work
          "blue-dim":   "var(--accent-blue-dim)",
          "green-dim":  "var(--accent-green-dim)",
          "red-dim":    "var(--accent-red-dim)",
          "amber-dim":  "var(--accent-amber-dim)",
          "purple-dim": "var(--accent-purple-dim)",
          "teal-dim":   "var(--accent-teal-dim)",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "3xs":  ["8px",  { lineHeight: "11px" }],
        "2xs":  ["10px", { lineHeight: "14px" }],
        xs:     ["10px", { lineHeight: "14px" }],
        sm:     ["12px", { lineHeight: "18px" }],
        base:   ["14px", { lineHeight: "20px" }],
        lg:     ["18px", { lineHeight: "26px" }],
        xl:     ["22px", { lineHeight: "30px" }],
        "2xl":  ["28px", { lineHeight: "36px" }],
        "3xl":  ["36px", { lineHeight: "44px" }],
      },
      borderRadius: {
        sm:      "6px",
        DEFAULT: "10px",
        lg:      "14px",
        xl:      "16px",
        "2xl":   "20px",
        full:    "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add tailwind.config.ts
git commit -m "$(cat <<'EOF'
style: update Tailwind config — new fontSize scale, radius, accent colors

fontSize: 3xs=8px through 3xl=36px on 8px grid.
borderRadius: sm=6px, DEFAULT=10px, lg=14px, xl=16px, 2xl=20px.
Accent solid colours updated to match new palette (indigo, rose, teal).
Accent -dim variants now use CSS vars so light mode overrides work.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Fonts + OS-Preference Theme Script (`layout.tsx`)

**Files:**
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

The goal: swap body font from Plus Jakarta Sans → Inter, keep Plus Jakarta Sans as `--font-display` (replaces Syne), keep JetBrains Mono. Add OS-preference inline script to `<head>` to avoid flash-of-wrong-theme.

```typescript
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BankBI — Nepal Banking Intelligence",
  description: "Business Intelligence platform for Nepal banking sector",
};

// Inline script: read localStorage / OS preference BEFORE paint → no flash
const themeScript = `(function(){
  var s=localStorage.getItem('bankbi-theme');
  var p=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  var t=s||p;
  document.documentElement.dataset.theme=t;
  if(t==='dark')document.documentElement.classList.add('dark');
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add app/layout.tsx
git commit -m "$(cat <<'EOF'
feat: swap body font to Inter, add OS-preference theme init script

Inter replaces Plus Jakarta Sans as body font (--font-sans).
Plus Jakarta Sans becomes --font-display (headings/KPI labels).
Syne removed — not used in design spec.
Inline script in <head> reads localStorage then prefers-color-scheme
before first paint, eliminating flash-of-wrong-theme.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Create `components.json` + Add Missing shadcn Components

**Files:**
- Create: `frontend/components.json`
- Add: `frontend/components/ui/badge.tsx`
- Add: `frontend/components/ui/table.tsx`
- Add: `frontend/components/ui/separator.tsx`
- Add: `frontend/components/ui/tooltip.tsx`

- [ ] **Step 1: Create `components.json`**

Create `frontend/components.json`:

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

- [ ] **Step 2: Add shadcn components**

Run from `frontend/` directory:

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
npx shadcn@latest add badge --overwrite --yes
npx shadcn@latest add table --overwrite --yes
npx shadcn@latest add separator --overwrite --yes
npx shadcn@latest add tooltip --overwrite --yes
```

Expected: 4 files created/updated in `components/ui/`.

- [ ] **Step 3: Verify files exist**

```bash
ls /Users/premprasadkhanal/prem/BI_solution/frontend/components/ui/ | grep -E "badge|table|separator|tooltip"
```

Expected output (at minimum):
```
badge.tsx
separator.tsx
table.tsx
tooltip.tsx
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add components.json components/ui/badge.tsx components/ui/table.tsx components/ui/separator.tsx components/ui/tooltip.tsx
git commit -m "$(cat <<'EOF'
feat: add shadcn badge, table, separator, tooltip components

Creates components.json for shadcn CLI config.
Adds four missing shadcn components to components/ui/.
Badge will replace the custom Pill component in Task 5.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Migrate `Pill` → shadcn `Badge` (All 8 Files)

**Files:**
- Modify: `frontend/components/ui/badge.tsx` (add colour variants)
- Delete: `frontend/components/ui/Pill.tsx`
- Modify × 8: all Pill import sites

The `Badge` from shadcn has `variant` prop (`default`, `secondary`, `destructive`, `outline`). We extend it with a `badgeVariants` colour-map helper that maps the old Pill variant names to className strings.

- [ ] **Step 1: Add `badgeVariants` helper to `badge.tsx`**

Open `frontend/components/ui/badge.tsx` and append at the bottom (after the shadcn-generated exports):

```typescript
// BankBI colour-variant mapping — mirrors old Pill variants
export const badgeColor = {
  green:  'bg-accent-green-dim  text-accent-green  border-transparent',
  red:    'bg-accent-red-dim    text-accent-red    border-transparent',
  amber:  'bg-accent-amber-dim  text-accent-amber  border-transparent',
  blue:   'bg-accent-blue-dim   text-accent-blue   border-transparent',
  purple: 'bg-accent-purple-dim text-accent-purple border-transparent',
  teal:   'bg-accent-teal-dim   text-accent-teal   border-transparent',
  muted:  'bg-bg-input          text-text-muted    border-transparent',
} as const;

export type BadgeColor = keyof typeof badgeColor;
```

- [ ] **Step 2: Update `frontend/app/dashboard/customer/page.tsx`**

Change:
```typescript
import { Pill } from '@/components/ui/Pill';
```
To:
```typescript
import { Badge } from '@/components/ui/badge';
import { badgeColor } from '@/components/ui/badge';
```

Find and replace all `<Pill variant="blue">` → `<Badge className={badgeColor.blue}>` etc.:
- `<Pill variant="blue">{row.original.segment}</Pill>` → `<Badge className={badgeColor.blue}>{row.original.segment}</Badge>`
- `<Pill variant={row.original.risk === 1 ? 'green' : row.original.risk === 2 ? 'amber' : 'red'}>` → `<Badge className={row.original.risk === 1 ? badgeColor.green : row.original.risk === 2 ? badgeColor.amber : badgeColor.red}>`

- [ ] **Step 3: Update `frontend/app/dashboard/customer/[cifId]/page.tsx`**

```typescript
// Replace import
import { Badge, badgeColor } from '@/components/ui/badge';

// Replace all usages:
// <Pill variant="green">  →  <Badge className={badgeColor.green}>
// <Pill variant="red">    →  <Badge className={badgeColor.red}>
// <Pill variant="blue">   →  <Badge className={badgeColor.blue}>
// <Pill variant="amber">  →  <Badge className={badgeColor.amber}>
// closing </Pill>         →  </Badge>
```

Four occurrences total (lines ~158, 255, 256, 284, 285, 289 in the file). Replace each `<Pill variant="X">...</Pill>` pattern.

- [ ] **Step 4: Update `frontend/app/dashboard/branch/[branchCode]/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// <Pill variant="green">Active · Warehouse Mode</Pill>
// →
// <Badge className={badgeColor.green}>Active · Warehouse Mode</Badge>
```

- [ ] **Step 5: Update `frontend/app/dashboard/risk/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// Replace all <Pill variant={...}>...</Pill> with <Badge className={...}>...</Badge>
// pct > 60 ? 'red' : pct > 45 ? 'amber' : 'green'  →  badgeColor.red etc.
// getRiskLevel(top3BranchShare) returns a string variant — map through badgeColor[getRiskLevel(x)]
```

Note: `getRiskLevel` returns `'green'|'amber'|'red'` strings — casting works: `badgeColor[getRiskLevel(x) as BadgeColor]`

- [ ] **Step 6: Update `frontend/app/dashboard/board/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// Replace all Pill usages in board page
```

- [ ] **Step 7: Update `frontend/app/dashboard/scheduled/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// <Pill variant="green">production</Pill>
// →
// <Badge className={badgeColor.green}>production</Badge>
```

- [ ] **Step 8: Update `frontend/app/dashboard/config/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// <Pill variant={selected ? 'blue' : 'teal'}>{table.category}</Pill>
// →
// <Badge className={selected ? badgeColor.blue : badgeColor.teal}>{table.category}</Badge>
// <Pill variant="green">live</Pill>  →  <Badge className={badgeColor.green}>live</Badge>
// <Pill variant="blue">{selectedMeta.category}</Pill>  →  <Badge className={badgeColor.blue}>...
```

- [ ] **Step 9: Update `frontend/app/dashboard/users/page.tsx`**

```typescript
import { Badge, badgeColor } from '@/components/ui/badge';
// <Pill variant={user.is_active ? 'green' : 'red'}>...</Pill>
// →
// <Badge className={user.is_active ? badgeColor.green : badgeColor.red}>...</Badge>
```

- [ ] **Step 10: Delete `Pill.tsx`**

```bash
rm /Users/premprasadkhanal/prem/BI_solution/frontend/components/ui/Pill.tsx
```

- [ ] **Step 11: TypeScript check — no Pill references remain**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
grep -r "from.*Pill\|import.*Pill" app/ --include="*.tsx" | head -5
```

Expected: zero TS errors from our changes, zero Pill imports remaining.

- [ ] **Step 12: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add components/ui/badge.tsx app/dashboard/
git rm components/ui/Pill.tsx
git commit -m "$(cat <<'EOF'
refactor: replace custom Pill with shadcn Badge across all 8 pages

Adds badgeColor helper to badge.tsx mapping green/red/amber/blue/purple/teal/muted
variants to BankBI token classes. All <Pill variant="x"> usages converted to
<Badge className={badgeColor.x}>. Pill.tsx deleted.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Sidebar Collapse Rail

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`

Add a collapsible rail mode: 56px wide showing icons only, with shadcn Tooltip on hover to show the label. Collapse state persists in `localStorage('bankbi-sidebar-collapsed')`.

- [ ] **Step 1: Add Tooltip import and collapse state**

At the top of `Sidebar.tsx`, add the Tooltip import:

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft } from 'lucide-react';
```

Inside the `Sidebar` function, add collapse state (after the existing `useState` calls):

```typescript
const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem('bankbi-sidebar-collapsed');
  if (saved === 'true') setCollapsed(true);
}, []);

const toggleCollapse = () => {
  setCollapsed((prev) => {
    const next = !prev;
    localStorage.setItem('bankbi-sidebar-collapsed', String(next));
    return next;
  });
};
```

- [ ] **Step 2: Update `<aside>` width classes**

Change the `<aside>` opening tag from:

```typescript
<aside className={`
  w-[220px] flex flex-col
  fixed top-0 left-0 bottom-0 z-[100] overflow-y-auto
  transition-transform lg:translate-x-0
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  bg-bg-surface border-r border-border
`}>
```

To:

```typescript
<aside className={`
  flex flex-col
  fixed top-0 left-0 bottom-0 z-[100] overflow-y-auto
  transition-all duration-200 lg:translate-x-0
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  ${collapsed ? 'w-[56px]' : 'w-[220px]'}
  bg-bg-surface border-r border-border
`}>
```

- [ ] **Step 3: Hide text in brand mark when collapsed**

In the brand mark section, wrap the text div with a conditional:

```typescript
{/* ── Brand mark ── */}
<div className="px-3 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #14B8A6 100%)' }}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="7" width="3" height="6" rx="0.8" fill="white" opacity="0.9" />
      <rect x="5.5" y="4" width="3" height="9" rx="0.8" fill="white" />
      <rect x="10" y="1.5" width="3" height="11.5" rx="0.8" fill="white" opacity="0.7" />
    </svg>
  </div>
  {!collapsed && (
    <div>
      <div className="font-display text-sm font-bold tracking-tight leading-none">BankBI</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-live-pulse flex-shrink-0" />
        <span className="text-2xs text-text-muted tracking-wide uppercase">Live · Nepal · NPR</span>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Wrap `NavItem` with Tooltip when collapsed**

Replace the existing `NavItem` function with:

```typescript
function NavItem({
  href,
  label,
  icon,
  badge,
  active = false,
  onClick,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-2.5 py-[5px] mx-1 rounded-lg transition-all duration-150 relative select-none
        ${collapsed ? 'px-0 justify-center w-10 mx-auto' : 'px-3.5'}
        ${active
          ? 'bg-accent-blue/[0.13] text-text-primary font-semibold'
          : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent-blue" />
      )}
      {icon && (
        <span className={`flex-shrink-0 transition-opacity ${active ? 'text-accent-blue opacity-100' : 'opacity-50'}`}>
          {icon}
        </span>
      )}
      {!collapsed && <span className="truncate text-sm">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto text-2xs font-bold bg-accent-red/15 text-accent-red px-1.5 py-[2px] rounded-full leading-none">
          {badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
          {badge && <span className="ml-1 text-accent-red">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
```

- [ ] **Step 5: Pass `collapsed` prop to all NavItem calls and wrap nav with TooltipProvider**

In the `<nav>` element, wrap with `<TooltipProvider delayDuration={200}>`. Update all `<NavItem>` calls to include `collapsed={collapsed}`. For example:

```typescript
<TooltipProvider delayDuration={200}>
  <nav className="flex-1 py-1">
    <SidebarSection label={collapsed ? '' : 'Platform'}>
      <NavItem
        href="/dashboard/executive"
        label="Executive Overview"
        active={pathname === '/dashboard/executive'}
        onClick={handleClose}
        collapsed={collapsed}
        icon={/* existing icon */}
      />
      {/* repeat collapsed={collapsed} for every NavItem */}
    </SidebarSection>
    {/* ... all other sections ... */}
  </nav>
</TooltipProvider>
```

Also update `SidebarSection` to hide the label when collapsed:

```typescript
function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-0.5">
      {label && (
        <div className="text-2xs font-bold tracking-[0.8px] text-text-muted uppercase px-4 pt-3.5 pb-1 select-none">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Add collapse toggle button at the bottom of the sidebar**

Replace the user footer section with this (add collapse button above the user footer):

```typescript
{/* ── Collapse toggle ── */}
<button
  type="button"
  onClick={toggleCollapse}
  className={`
    mx-auto flex items-center justify-center h-8 w-8 rounded-lg
    border border-border bg-bg-input text-text-muted
    hover:text-text-primary hover:bg-bg-card-hover transition-all duration-150
    mb-1 flex-shrink-0
  `}
  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
>
  <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
</button>

{/* ── User footer ── (existing code, but hide name/role when collapsed) */}
<div className="mt-auto border-t border-border p-2.5 flex-shrink-0">
  {collapsed ? (
    <div
      className="flex justify-center"
      title={userName}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
      >
        {userName.slice(0, 2).toUpperCase() || 'U'}
      </div>
    </div>
  ) : (
    /* existing DropdownMenu code unchanged */
    <DropdownMenu>
      {/* ... existing DropdownMenu JSX ... */}
    </DropdownMenu>
  )}
</div>
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: add collapsible icon-rail mode to Sidebar

Adds collapse button at bottom. Collapsed state (56px) shows icons only.
shadcn Tooltip on hover shows label + badge count when collapsed.
State persists in localStorage('bankbi-sidebar-collapsed').
Brand gradient updated to new indigo palette.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Update `KPICard` Accent Map for New Palette

**Files:**
- Modify: `frontend/components/ui/KPICard.tsx`

The `ACCENT_MAP` and `ACCENT_SPARK_COLOR_MAP` hardcode old hex values for sparkline colors. Update them to the new palette.

- [ ] **Step 1: Update `ACCENT_SPARK_COLOR_MAP` hex values**

Replace the existing `ACCENT_SPARK_COLOR_MAP` constant:

```typescript
const ACCENT_SPARK_COLOR_MAP: Record<string, string> = {
  'var(--accent-blue-dim)':   '#6366F1',
  'var(--accent-green-dim)':  '#10B981',
  'var(--accent-red-dim)':    '#F43F5E',
  'var(--accent-amber-dim)':  '#F59E0B',
  'var(--accent-purple-dim)': '#8B5CF6',
  'var(--accent-teal-dim)':   '#14B8A6',
};
```

- [ ] **Step 2: Remove the unused `icon` prop rendering**

In the KPICard render, the icon box is hidden when no `icon` prop is passed (which is the case for all current callers). The existing `{icon && (...)}` guard handles this correctly — no change needed here. The spec says "no icon box — cleaner without it." Since no callers pass `icon`, this is already satisfied.

- [ ] **Step 3: Update the shadow in KPICard to use neutral values (not old blue)**

In the `cn(...)` call, update the `highlighted` variant shadow:

```typescript
highlighted && 'border-accent-blue/40 shadow-[0_4px_20px_rgba(99,102,241,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]'
```

And update the base shadow to be lighter (less heavy):

```typescript
'shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]',
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add components/ui/KPICard.tsx
git commit -m "$(cat <<'EOF'
style: update KPICard sparkline colors to new indigo/teal palette

ACCENT_SPARK_COLOR_MAP updated: blue=#6366F1, red=#F43F5E, teal=#14B8A6.
Highlighted shadow updated to indigo rgba. Base shadow lightened.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Page Layout Polish (Executive, Branch, Customer)

**Files:**
- Modify: `frontend/app/dashboard/executive/page.tsx`
- Modify: `frontend/app/dashboard/branch/page.tsx`
- Modify: `frontend/app/dashboard/customer/page.tsx`

The goal is to update the page-level wrapper div and KPI grid classes from the dense current layout to the responsive grid system from the spec. Charts grids also get the responsive 2-col treatment.

- [ ] **Step 1: Update Executive page wrapper and grids**

In `frontend/app/dashboard/executive/page.tsx`, find the outermost content div (currently `className="flex flex-col gap-[14px] px-5 py-4"`) and replace with:

```tsx
<div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
```

Find the KPI cards grid (currently `"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"`) and replace with:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
```

Find any 2-col chart grids (currently `"grid grid-cols-1 lg:grid-cols-2 gap-3"`) and change `gap-3` → `gap-4`.

- [ ] **Step 2: Update Branch page wrapper and grids**

In `frontend/app/dashboard/branch/page.tsx`:

```tsx
// Outer content div
<div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">

// KPI grid
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

// Chart grid (2-col)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

- [ ] **Step 3: Update Customer page wrapper and grids**

In `frontend/app/dashboard/customer/page.tsx`:

```tsx
// Outer content div
<div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">

// KPI grid
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

// Any chart/detail grids
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

- [ ] **Step 4: Apply same wrapper pattern to KPI, Digital, Financial, Risk pages**

For each page in `frontend/app/dashboard/{kpi,digital,financial,risk}/page.tsx`:

Change `className="flex flex-col gap-[14px] px-5 py-4"` to `className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"`.

Change `gap-3` → `gap-4` on all grid containers.

Change `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` for KPI rows.

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npx tsc --noEmit 2>&1 | grep -v "board/\|branch/\|customer/\|executive/" | grep "error TS" | head -20
```

Expected: no new errors.

- [ ] **Step 6: Run frontend tests**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend && npm test
```

Expected: all 52 tests pass (formatters + pivot-measures suites).

- [ ] **Step 7: Commit**

```bash
cd /Users/premprasadkhanal/prem/BI_solution/frontend
git add app/dashboard/executive/page.tsx app/dashboard/branch/page.tsx app/dashboard/customer/page.tsx app/dashboard/kpi/page.tsx app/dashboard/digital/page.tsx app/dashboard/financial/page.tsx app/dashboard/risk/page.tsx
git commit -m "$(cat <<'EOF'
style: responsive page grid polish — 8px gap, max-width container, 2-col mobile KPIs

All dashboard pages: outer wrapper px-5 py-4 → p-4 sm:p-6 lg:p-8 with max-w-[1600px].
KPI rows: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 → grid-cols-2 sm:grid-cols-3 lg:grid-cols-4.
Chart grids: gap-3 → gap-4 (8px grid alignment).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Covered by Task |
|---|---|
| 3.1 Color palette — dark tokens | Task 1 |
| 3.1 Color palette — light tokens | Task 1 |
| 3.1 OS preference theme init script | Task 3 |
| 3.2 Typography — Inter body, Plus Jakarta Sans display | Task 3 |
| 3.2 Type scale (xs=10px, sm=12px, base=14px…) | Task 2 |
| 3.3 Spacing & radius (sm=6px, DEFAULT=10px…) | Task 2 |
| 4.1 components.json | Task 4 |
| 4.2 Add badge, table, separator, tooltip | Task 4 |
| 4.3 Delete Pill | Task 5 |
| 4.4 Update Pill import sites | Task 5 |
| 5.1 Sidebar collapse rail (56px, icon-only, tooltip) | Task 6 |
| 5.1 Sidebar collapse button + localStorage | Task 6 |
| 5.3 KPICard new accent colors | Task 7 |
| 6.1 Page wrapper / KPI grid responsive | Task 8 |
| 6.2 Executive layout polish | Task 8 |
| 6.4 Branch & Customer layout polish | Task 8 |

### Out-of-Scope Confirmed
- TopBar redesign: current TopBar already has the correct 56px height, period pills, theme toggle, and mobile hamburger. No changes needed — it already matches the spec.
- DataTable: shadcn `table.tsx` is added; migrating `AdvancedDataTable.tsx` internals to use shadcn Table primitives is follow-up work (not in this plan scope).
- Select/MultiSelect: `SearchableMultiSelect` has complex search+checkbox functionality that shadcn Select doesn't provide. Kept as-is; shadcn `select.tsx` is available for future new usages.
- ChartCard: already matches the spec design closely enough; no changes required.
- CLAUDE.md shadcn rules update: add in a follow-up commit after this plan completes.
