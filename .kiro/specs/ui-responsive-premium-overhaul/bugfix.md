# Bugfix Requirements Document

## Introduction

The BankBI dashboard platform has multiple UI defects spanning three categories: (1) the layout is not fully responsive — the sidebar offset is always applied even when the sidebar is hidden on mobile/tablet, there is no hamburger menu to open the sidebar on small screens, and grids/controls overflow on narrow viewports; (2) several CSS design-token values in `globals.css` do not match the style guide, and the light theme does not properly update the accent-color dim variables, causing theme-switching inconsistencies; (3) the dashboard pages do not consistently follow the style guide's spacing, typography, and premium surface treatments. These issues degrade usability on mobile/tablet devices and produce a visually inconsistent experience when toggling between dark and light themes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the viewport width is below the `lg` breakpoint (< 1024px) THEN the main content area still applies `ml-[220px]`, pushing content off-screen to the right because the sidebar is hidden via `-translate-x-full` but the margin remains.

1.2 WHEN the viewport width is below the `lg` breakpoint THEN there is no hamburger/menu button visible to the user, so the mobile sidebar (which has toggle logic via `isOpen` state) can never be opened.

1.3 WHEN the TopBar period picker is rendered on a narrow viewport (< 768px) THEN the row of 9+ period buttons plus date picker, filter button, export button, and theme toggle overflow horizontally without proper wrapping or scrolling, causing content to be clipped or extend beyond the screen.

1.4 WHEN the AdvancedFilters quick filter bar is rendered on a narrow viewport THEN the filter selects with fixed `min-w-[220px]`, `min-w-[240px]`, `min-w-[190px]`, and `min-w-[160px]` cause horizontal overflow because they do not shrink or stack on small screens.

1.5 WHEN the KPI card grid is rendered on viewports between `md` (768px) and `xl` (1280px) THEN the grid jumps from `grid-cols-2` directly to `grid-cols-3` to `grid-cols-6`, leaving no intermediate step (e.g., 4 columns on `lg`), resulting in cards that are either too wide or too narrow at certain breakpoints.

1.6 WHEN the globals.css dark theme (`:root`) is active THEN `--accent-green` is `#16a34a`, `--accent-red` is `#e11d48`, `--accent-amber` is `#d97706`, `--accent-purple` is `#7c3aed`, and `--accent-teal` is `#0284c7`, which do not match the style guide values of `#10b981`, `#ef4444`, `#f59e0b`, `#8b5cf6`, and `#06b6d4` respectively.

1.7 WHEN the globals.css dark theme dim variables are defined THEN `--accent-green-dim`, `--accent-red-dim`, `--accent-amber-dim`, `--accent-purple-dim`, and `--accent-teal-dim` use rgba values based on the incorrect accent colors (e.g., `rgba(22,163,74,0.12)` instead of `rgba(16,185,129,0.12)`), causing mismatched tints.

1.8 WHEN the light theme (`[data-theme="light"]`) is active THEN the accent color base values (`--accent-green`, `--accent-red`, `--accent-amber`, `--accent-purple`, `--accent-teal`) are not redeclared, so they inherit the incorrect dark-theme values, and the dim variables also carry the wrong rgba base colors.

1.9 WHEN ECharts components (ProvinceBarChart, ProvinceRadarChart) render tooltips THEN they use hardcoded color strings (e.g., `'#1a1e2e'` for tooltip background) via the `css()` fallback instead of always resolving CSS variables, so in light theme the tooltips appear with dark backgrounds.

1.10 WHEN dashboard pages render their content area THEN they use Tailwind classes like `p-5` and `gap-3.5` instead of the style guide's specified `padding: '16px 20px'` and `gap: 14px`, resulting in inconsistent spacing.

1.11 WHEN the root layout loads fonts THEN it imports `Plus_Jakarta_Sans`, `Syne`, and `JetBrains_Mono` but does not import `Inter`, which the style guide specifies as the base font at 13px — the actual base font is Plus Jakarta Sans at 12px.

### Expected Behavior (Correct)

2.1 WHEN the viewport width is below the `lg` breakpoint THEN the main content area SHALL remove the `ml-[220px]` offset (use `ml-0`) so content fills the full viewport width, and SHALL apply `ml-[220px]` only at `lg:` and above.

2.2 WHEN the viewport width is below the `lg` breakpoint THEN a hamburger/menu button SHALL be visible in the TopBar (or a fixed position) that toggles the sidebar open/closed, and the sidebar SHALL overlay the content with a backdrop when open on mobile.

2.3 WHEN the TopBar period picker is rendered on a narrow viewport (< 768px) THEN the controls SHALL wrap onto multiple lines or use horizontal scrolling so that all buttons remain accessible without clipping or horizontal page overflow.

2.4 WHEN the AdvancedFilters quick filter bar is rendered on a narrow viewport THEN the filter selects SHALL stack vertically or use responsive min-widths that allow them to shrink, preventing horizontal overflow.

2.5 WHEN the KPI card grid is rendered THEN it SHALL use a responsive grid progression (e.g., `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`) so cards are appropriately sized at every breakpoint.

2.6 WHEN the globals.css dark theme (`:root`) is active THEN `--accent-green` SHALL be `#10b981`, `--accent-red` SHALL be `#ef4444`, `--accent-amber` SHALL be `#f59e0b`, `--accent-purple` SHALL be `#8b5cf6`, and `--accent-teal` SHALL be `#06b6d4`, matching the style guide.

2.7 WHEN the globals.css dark theme dim variables are defined THEN `--accent-green-dim` SHALL be `rgba(16,185,129,0.12)`, `--accent-red-dim` SHALL be `rgba(239,68,68,0.10)`, `--accent-amber-dim` SHALL be `rgba(245,158,11,0.10)`, `--accent-purple-dim` SHALL be `rgba(139,92,246,0.10)`, and `--accent-teal-dim` SHALL be `rgba(6,182,212,0.10)`, matching the style guide.

2.8 WHEN the light theme (`[data-theme="light"]`) is active THEN the light theme block SHALL redeclare the accent dim variables using the correct base colors (matching the style guide values), ensuring consistent tinting in light mode.

2.9 WHEN ECharts components render tooltips in light theme THEN the tooltip background, border, and text colors SHALL resolve from CSS variables (`--chart-tooltip-bg`, `--chart-tooltip-border`, `--text-primary`) so they adapt correctly to the active theme.

2.10 WHEN dashboard pages render their content area THEN they SHALL use `padding: 16px 20px` and `gap: 14px` (via inline styles or equivalent Tailwind classes `px-5 py-4 gap-[14px]`) to match the style guide specification.

2.11 WHEN the root layout loads fonts THEN it SHALL include `Inter` as the primary sans-serif font (or the existing Plus Jakarta Sans SHALL be confirmed as the intended replacement), and the base font size SHALL be set to `13px` as specified in the style guide.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the viewport width is at or above the `lg` breakpoint (≥ 1024px) THEN the sidebar SHALL CONTINUE TO be visible at 220px width with the main content offset by `ml-[220px]`, exactly as it does today.

3.2 WHEN the dark theme is active and accent colors are used in Tailwind classes (e.g., `text-accent-blue`, `bg-accent-blue-dim`) THEN the blue accent (`#3b82f6`) and blue-dim SHALL CONTINUE TO render identically since those values are already correct.

3.3 WHEN the AdvancedFilters advanced panel is opened THEN the draft/apply workflow, filter pill display, data stats section, and all filter select options SHALL CONTINUE TO function identically.

3.4 WHEN charts (Recharts and ECharts) render in dark theme THEN the existing tooltip styling, grid lines, axis labels, glow effects, and premium chart surface treatments SHALL CONTINUE TO render as they do today.

3.5 WHEN the TopBar period picker buttons are clicked THEN the period selection, date range calculation, and filter state updates SHALL CONTINUE TO work identically.

3.6 WHEN the KPICard component renders with sparkline bars, change badges, and accent-color icon backgrounds THEN the visual treatment (left border accent, glassmorphism surface, hover states) SHALL CONTINUE TO render correctly.

3.7 WHEN the sidebar navigation items are clicked THEN routing, active state highlighting, user dropdown menu, and sign-out functionality SHALL CONTINUE TO work identically.

3.8 WHEN the AdvancedDataTable renders with sorting, filtering, and pagination THEN all table interactions SHALL CONTINUE TO function identically.
