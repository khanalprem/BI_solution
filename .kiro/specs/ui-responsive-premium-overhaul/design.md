# UI Responsive Premium Overhaul — Bugfix Design

## Overview

The BankBI dashboard has three categories of visual/layout bugs: (1) the layout is not responsive — the sidebar margin is always applied, there is no mobile hamburger trigger, and controls/grids overflow on narrow viewports; (2) CSS design-token values for accent colors and their dim variants do not match the style guide, and the light theme inherits incorrect values; (3) dashboard page spacing, font configuration, and ECharts tooltip theming are inconsistent with the style guide. The fix strategy is to correct CSS custom properties at the source (`globals.css`), add responsive Tailwind breakpoints to layout and grid components, expose a hamburger button for mobile sidebar toggling, and ensure ECharts resolves theme-aware CSS variables at render time.

## Glossary

- **Bug_Condition (C)**: Any of the 11 identified defect conditions — viewport below `lg` with sidebar margin applied, missing hamburger button, overflowing controls, incorrect CSS variable values, hardcoded ECharts colors, wrong spacing/font.
- **Property (P)**: The correct visual/layout behavior as specified in the style guide and requirements 2.1–2.11.
- **Preservation**: All existing desktop (≥ 1024px) layout behavior, dark-theme blue accent values, filter/table interactions, chart rendering in dark mode, sidebar navigation, and period picker logic must remain unchanged.
- **`globals.css`**: The CSS file at `frontend/app/globals.css` that defines all design tokens (CSS custom properties) for both dark and light themes.
- **`DashboardLayout`**: The layout component at `frontend/app/dashboard/layout.tsx` that renders the Sidebar + main content area.
- **`Sidebar`**: The navigation component at `frontend/components/layout/Sidebar.tsx` that is fixed-position and hidden via `-translate-x-full` on mobile.
- **`TopBar`**: The header component at `frontend/components/layout/TopBar.tsx` containing period picker, filters button, theme toggle.
- **`PremiumCharts`**: The ECharts wrapper components at `frontend/components/ui/PremiumCharts.tsx` that use a `theme()` helper with `css()` fallbacks.

## Bug Details

### Bug Condition

The bugs manifest across three categories: (A) when the viewport is below the `lg` breakpoint (< 1024px) and responsive layout adaptations are missing; (B) when CSS custom property values in `globals.css` do not match the style guide; (C) when dashboard pages use incorrect spacing/font values.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { viewport: number, theme: 'dark' | 'light', page: string }
  OUTPUT: boolean

  // Category A: Responsiveness bugs
  IF input.viewport < 1024
    RETURN TRUE  // sidebar margin not removed, no hamburger, controls overflow
  END IF

  // Category B: Theme token bugs
  IF cssVar('--accent-green') != '#10b981'
     OR cssVar('--accent-red') != '#ef4444'
     OR cssVar('--accent-amber') != '#f59e0b'
     OR cssVar('--accent-purple') != '#8b5cf6'
     OR cssVar('--accent-teal') != '#06b6d4'
    RETURN TRUE
  END IF

  IF input.theme == 'light'
     AND lightThemeBlock does NOT redeclare accent dim variables
    RETURN TRUE
  END IF

  // Category C: Spacing/font bugs
  IF pageContentPadding != '16px 20px' OR pageContentGap != '14px'
    RETURN TRUE
  END IF

  IF bodyFontFamily != 'Inter' OR bodyFontSize != '13px'
    RETURN TRUE
  END IF

  RETURN FALSE
END FUNCTION
```

### Examples

- **1.1 Sidebar margin**: On a 375px-wide mobile viewport, the main content has `ml-[220px]` applied, pushing it 220px off-screen to the right. Expected: `ml-0` on mobile, `ml-[220px]` on desktop.
- **1.6 Accent green**: `--accent-green` is `#16a34a` (Tailwind green-600) but the style guide specifies `#10b981` (Tailwind emerald-500). This causes KPI card borders, legend dots, and change badges to render in the wrong shade of green.
- **1.8 Light theme dims**: Switching to light theme, `--accent-green-dim` remains `rgba(22,163,74,0.12)` (based on `#16a34a`) instead of updating to `rgba(16,185,129,0.08)` (based on `#10b981`), producing a visually jarring tint mismatch.
- **1.9 ECharts tooltips**: In light theme, `ProvinceBarChart` tooltip background resolves to `#1a1e2e` (the dark fallback) because `css('--chart-tooltip-bg', '#1a1e2e')` is called once at mount time and the CSS variable resolves correctly, but the hardcoded fallback is used during SSR or if the variable is empty.
- **1.10 Spacing**: Executive dashboard uses `p-5` (20px all sides) and `gap-3.5` (14px) — the padding should be `px-5 py-4` (20px horizontal, 16px vertical) per the style guide's `padding: '16px 20px'`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop layout (≥ 1024px): Sidebar visible at 220px, main content offset by `ml-[220px]`
- Blue accent color (`--accent-blue: #3b82f6`) and blue-dim — already correct, must not change
- All filter interactions: AdvancedFilters draft/apply workflow, filter pills, data stats
- All chart rendering in dark theme: tooltip styling, grid lines, axis labels, glow effects, premium surface treatments
- TopBar period picker logic: period selection, date range calculation, filter state updates
- KPICard visual treatment: left border accent, glassmorphism surface, hover states, spark bars
- Sidebar navigation: routing, active state highlighting, user dropdown, sign-out
- AdvancedDataTable: sorting, filtering, pagination, column visibility

**Scope:**
All inputs that do NOT involve the 11 identified bug conditions should be completely unaffected by this fix. This includes:
- Desktop viewport interactions (≥ 1024px layout)
- Dark theme blue accent rendering
- All JavaScript logic (data fetching, state management, routing)
- Chart data processing and series configuration

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

1. **Missing responsive breakpoints in `DashboardLayout`**: The `main` element uses `ml-[220px]` unconditionally. It needs `ml-0 lg:ml-[220px]` to remove the offset on mobile.

2. **No hamburger trigger exposed**: `Sidebar.tsx` has `isOpen` state and a backdrop overlay, but no external button sets `isOpen = true`. A hamburger button must be added (likely in TopBar or DashboardLayout) that calls a shared toggle function.

3. **TopBar controls not wrapping**: The controls `div` uses `flex-wrap` but the period picker's many buttons plus other controls still overflow because there's no `overflow-x-auto` or responsive stacking.

4. **AdvancedFilters fixed min-widths**: The filter selects use `min-w-[220px]` etc. which prevent shrinking on mobile. These need responsive adjustments.

5. **Incorrect CSS variable values in `:root`**: Five accent colors were set to different shades than the style guide specifies. Simple value replacement fixes this.

6. **Dim variables use wrong rgba base**: The dim variables' rgba values are derived from the incorrect accent colors. Updating them to match the correct base colors fixes this.

7. **Light theme missing accent redeclarations**: The `[data-theme="light"]` block doesn't redeclare accent dim variables with correct base colors. Adding the correct dim overrides fixes this.

8. **ECharts `css()` fallbacks are dark-only**: The `css()` helper returns hardcoded dark-theme fallbacks. The fallbacks should be neutral or the function should always resolve the CSS variable at render time (which it does when `window` is available). The real issue is that the `theme()` function in `PremiumCharts.tsx` is called inside `useEChart` which runs in `useEffect` — by that time `window` is available, so CSS variables should resolve. The `ProvinceBarChart` and `ProvinceRadarChart` in `executive/page.tsx` have their own local `css()` calls that also resolve at render time. The fix is to ensure the light theme CSS variables are correctly defined (covered by point 7).

9. **Dashboard page spacing**: Pages use `p-5` (20px all sides) instead of `px-5 py-4` (20px horizontal, 16px vertical) and `gap-3.5` (14px) which is actually correct for gap but the vertical padding is wrong.

10. **Font mismatch**: The app imports `Plus_Jakarta_Sans` as `--font-sans` but the style guide says `Inter`. Either Inter should be imported, or the style guide should be updated. Given that Plus Jakarta Sans is already configured and used throughout, and the style guide is a reference document, the pragmatic fix is to confirm Plus Jakarta Sans as the intended font and update the base font size to 13px.

## Correctness Properties

Property 1: Bug Condition — Responsive Layout Adapts Below lg Breakpoint

_For any_ viewport width below 1024px, the main content area SHALL have zero left margin (no sidebar offset), a hamburger button SHALL be visible to toggle the sidebar, and all controls (TopBar, filters) SHALL be accessible without horizontal overflow.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition — CSS Design Tokens Match Style Guide

_For any_ theme (dark or light), the accent color CSS custom properties SHALL match the style guide values (`--accent-green: #10b981`, `--accent-red: #ef4444`, `--accent-amber: #f59e0b`, `--accent-purple: #8b5cf6`, `--accent-teal: #06b6d4`), and the dim variants SHALL use rgba values derived from these correct base colors.

**Validates: Requirements 2.6, 2.7, 2.8**

Property 3: Bug Condition — Dashboard Spacing and Typography Match Style Guide

_For any_ dashboard page content area, the padding SHALL be `16px 20px` (py-4 px-5) and the gap SHALL be `14px` (gap-[14px]), and the base font size SHALL be `13px`.

**Validates: Requirements 2.10, 2.11**

Property 4: Preservation — Desktop Layout Unchanged

_For any_ viewport width at or above 1024px, the sidebar SHALL remain visible at 220px width with the main content offset by `ml-[220px]`, and all existing visual treatments, interactions, and chart rendering SHALL produce the same result as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/app/globals.css`

**Specific Changes**:
1. **Fix accent color values in `:root`**: Change `--accent-green` from `#16a34a` to `#10b981`, `--accent-red` from `#e11d48` to `#ef4444`, `--accent-amber` from `#d97706` to `#f59e0b`, `--accent-purple` from `#7c3aed` to `#8b5cf6`, `--accent-teal` from `#0284c7` to `#06b6d4`.
2. **Fix dim variable rgba values in `:root`**: Update `--accent-green-dim` to `rgba(16,185,129,0.12)`, `--accent-red-dim` to `rgba(239,68,68,0.10)`, `--accent-amber-dim` to `rgba(245,158,11,0.10)`, `--accent-purple-dim` to `rgba(139,92,246,0.10)`, `--accent-teal-dim` to `rgba(6,182,212,0.10)`.
3. **Add accent dim overrides to `[data-theme="light"]`**: Ensure the light theme block redeclares dim variables with correct rgba base colors and appropriate light-theme opacity.
4. **Update base font size**: Change `font-size: 12px` to `font-size: 13px` on `body`.

**File**: `frontend/app/dashboard/layout.tsx`

**Specific Changes**:
1. **Responsive sidebar offset**: Change `ml-[220px]` to `ml-0 lg:ml-[220px]` on the `<main>` element.
2. **Pass sidebar toggle to children**: Lift `isOpen`/`setIsOpen` state up or use a shared context/callback so the hamburger button can toggle the sidebar.

**File**: `frontend/components/layout/Sidebar.tsx`

**Specific Changes**:
1. **Accept external open/close control**: Add props or use a shared mechanism (e.g., callback prop, context) so the sidebar can be opened from outside (hamburger button).
2. **Expose hamburger trigger**: Either export a trigger button component or accept an `isOpen`/`onToggle` prop pair.

**File**: `frontend/components/layout/TopBar.tsx`

**Specific Changes**:
1. **Add hamburger button**: Render a `Menu` icon button visible only below `lg` breakpoint that triggers the sidebar toggle.
2. **Responsive controls**: Add `overflow-x-auto` or responsive stacking to the controls row so period picker buttons don't overflow on narrow viewports.

**File**: `frontend/components/ui/AdvancedFilters.tsx`

**Specific Changes**:
1. **Responsive filter widths**: Change fixed `min-w-[220px]` etc. to responsive values (e.g., `min-w-0 w-full sm:min-w-[220px]`) so filters stack on mobile.

**File**: `frontend/components/ui/FilterBar.tsx`

**Specific Changes**:
1. **Responsive wrapping**: Ensure the filter bar container allows vertical stacking on narrow viewports.

**File**: `frontend/app/dashboard/executive/page.tsx`

**Specific Changes**:
1. **Fix content padding**: Change `p-5` to `px-5 py-4` and `gap-3.5` to `gap-[14px]`.
2. **Fix KPI grid breakpoints**: Change `grid-cols-2 md:grid-cols-3 xl:grid-cols-6` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`.

**File**: `frontend/app/dashboard/branch/page.tsx`

**Specific Changes**:
1. **Fix content padding**: Change `p-5` to `px-5 py-4` and `gap-3.5` to `gap-[14px]`.
2. **Fix KPI grid breakpoints**: Add intermediate breakpoint (e.g., `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).

**Files**: All other dashboard pages (`financial/page.tsx`, `branch/[branchCode]/page.tsx`, etc.)

**Specific Changes**:
1. **Fix content padding**: Change `p-5` to `px-5 py-4` and `gap-3.5` to `gap-[14px]` consistently.

**File**: `frontend/app/layout.tsx`

**Specific Changes**:
1. **Font decision**: Either import `Inter` from `next/font/google` as the primary sans-serif, or confirm Plus Jakarta Sans as the intended replacement and update the style guide reference. Given the app is already built around Plus Jakarta Sans, the pragmatic approach is to keep it and update the base font size to 13px in `globals.css`.

**File**: `frontend/components/ui/PremiumCharts.tsx`

**Specific Changes**:
1. **Theme-aware ECharts**: The `theme()` helper already resolves CSS variables via `css()`. The primary fix is ensuring the CSS variables are correctly defined in both themes (handled by `globals.css` fixes). No code changes needed in this file if the CSS variables are correct.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that inspect CSS custom property values, computed styles at various viewport widths, and DOM element presence. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Accent Color Mismatch Test**: Read `globals.css` and assert `--accent-green` equals `#10b981` (will fail on unfixed code — currently `#16a34a`)
2. **Dim Variable Mismatch Test**: Assert `--accent-green-dim` equals `rgba(16,185,129,0.12)` (will fail on unfixed code — currently `rgba(22,163,74,0.12)`)
3. **Light Theme Dim Test**: Switch to light theme and assert dim variables are redeclared (will fail on unfixed code — no redeclaration)
4. **Mobile Layout Test**: At viewport < 1024px, assert main element has `ml-0` (will fail on unfixed code — has `ml-[220px]`)
5. **Hamburger Button Test**: At viewport < 1024px, assert a hamburger/menu button is present (will fail on unfixed code — no button exists)
6. **Spacing Test**: Assert dashboard content wrapper has `py-4 px-5` padding (will fail on unfixed code — has `p-5`)

**Expected Counterexamples**:
- CSS variable values don't match style guide specifications
- Mobile viewport shows content pushed off-screen by sidebar margin
- No hamburger button element found in DOM on mobile

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderWithFix(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderOriginal(input) = renderWithFix(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many viewport widths and theme combinations automatically
- It catches edge cases at breakpoint boundaries that manual tests might miss
- It provides strong guarantees that desktop layout behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code first for desktop viewports and dark theme, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Desktop Layout Preservation**: For all viewports ≥ 1024px, verify main content has `ml-[220px]` and sidebar is visible — same as original
2. **Blue Accent Preservation**: Verify `--accent-blue` remains `#3b82f6` and `--accent-blue-dim` remains `rgba(59,130,246,0.12)` — unchanged
3. **Chart Dark Theme Preservation**: Verify ECharts tooltip config resolves to dark theme colors when dark theme is active — same as original
4. **Filter Interaction Preservation**: Verify AdvancedFilters draft/apply workflow produces same state transitions — same as original

### Unit Tests

- Test CSS variable values in `:root` match style guide for all 5 corrected accent colors
- Test CSS variable values in `[data-theme="light"]` include dim variable overrides
- Test `DashboardLayout` renders `ml-0 lg:ml-[220px]` on main element
- Test hamburger button renders below lg breakpoint and toggles sidebar
- Test TopBar controls don't overflow at 375px viewport width
- Test KPI grid uses correct breakpoint progression

### Property-Based Tests

- Generate random viewport widths (320–2560px) and verify layout responds correctly at each breakpoint boundary
- Generate random theme switches and verify all accent CSS variables resolve to style guide values
- Generate random dashboard page renders and verify padding/gap matches style guide

### Integration Tests

- Test full page render at mobile viewport: sidebar hidden, hamburger visible, content fills width
- Test theme toggle: switch dark → light → dark and verify all accent colors and dims are correct
- Test responsive filter bar: at 375px viewport, filters stack vertically without overflow
