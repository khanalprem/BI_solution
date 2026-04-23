# Readability Tune-up — Color Contrast & Font Sizing

**Date:** 2026-04-23
**Scope:** Frontend theme tokens only. No component-level rewrites.
**Goal:** Make long-form data reading in the BI dashboard comfortable in both light and dark themes, while preserving the visual identity.

---

## Problem

Two concrete readability gaps in the current theme:

1. **`text-muted` fails WCAG AA contrast** in both themes. It is used for column headers, axis labels, timestamps, empty-cell em-dashes, and secondary metadata — so the low contrast hurts every data-dense screen.

    | Token | Theme | Current value | Contrast on base bg |
    |---|---|---|---|
    | `--text-muted` | Light | `#94A3B8` on `#F8FAFC` | **~2.8:1** (fails AA) |
    | `--text-muted` | Dark  | `#475569` on `#0F172A` | **~3.3:1** (fails AA) |

2. **Small base font sizes** for a data-heavy app. Body is `13px`, tables use `text-xs` (`10px`), headers often use `text-[11px]` — fine for brief glances, tiring for the hours BI users actually spend on these pages. Financial industry dashboards (Bloomberg, Stripe, Linear) standardize on 12px as the minimum for numeric cells.

## Non-goals

- No change to accent colors (indigo, green, red, amber, purple, teal).
- No change to backgrounds, borders, shadows, gradients, or layout spacing.
- No component-level refactors beyond swapping `text-muted → text-secondary` on table headers where `text-muted` is misused as the primary header color.
- No WCAG AAA push for all tokens — target AA (4.5:1) for body, allow AA Large (3:1) for purely decorative muted text.

---

## Changes

### 1. Color tokens — `frontend/app/globals.css`

**Dark theme (`:root`)**
```css
--text-secondary: #CBD5E1;   /* was #94A3B8 — ~12:1, crisper secondary labels */
--text-muted:     #94A3B8;   /* was #475569 — ~7.5:1, passes AA with margin  */
```

**Light theme (`[data-theme="light"]`)**
```css
--text-secondary: #334155;   /* was #475569 — ~10.4:1                       */
--text-muted:     #64748B;   /* was #94A3B8 — ~4.8:1, passes AA             */
```

Hierarchy preserved: `text-primary` (strongest) > `text-secondary` > `text-muted`.

### 2. Body font size — `frontend/app/globals.css`

```css
body {
  font-size: 14px;  /* was 13px */
  line-height: 1.55; /* was 1.5 — small breathing-room bump */
}
```

### 3. Font size scale — `frontend/tailwind.config.ts`

| Scale  | Before (size/lh) | After (size/lh) |
|--------|------------------|-----------------|
| `3xs`  | 8 / 11           | **9 / 13**      |
| `2xs`  | 10 / 14          | **11 / 15**     |
| `xs`   | 10 / 14          | **12 / 16**     |
| `sm`   | 12 / 18          | **13 / 19**     |
| `base` | 14 / 20          | 14 / **21**     |
| `lg`   | 18 / 26          | unchanged       |
| `xl`   | 22 / 30          | unchanged       |
| `2xl`  | 28 / 36          | unchanged       |
| `3xl`  | 36 / 44          | unchanged       |

### 4. Numeric font tuning — `frontend/app/globals.css`

```css
.font-mono {
  font-family: var(--font-mono), monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

Rationale: tabular-nums aligns digit columns (critical for NPR amounts); `-0.01em` tracking offsets the width gain from 10px→12px so tables don't get appreciably wider.

### 5. Table header contrast fix

Current convention (per `CLAUDE.md`) is `text-muted` for table headers. With the new `text-muted` contrast ratio this is acceptable but still weak. Change the common header pattern from `text-muted` → `text-secondary` where used on `<th>` elements.

Search pattern to fix:
```
text-muted uppercase
text-[11px]... text-muted
```

This is a tactical scan — only `<th>` / header cells. Body `text-muted` usages (em-dash placeholders, axis labels, metadata) stay as-is because the new muted value is now readable.

---

## Files touched

| File | What changes |
|---|---|
| `frontend/app/globals.css` | `--text-secondary` + `--text-muted` in both theme blocks; `body` font-size/line-height; `.font-mono` rule |
| `frontend/tailwind.config.ts` | `theme.extend.fontSize` object (5 scales updated) |
| `frontend/components/**/*.tsx` | Table header `text-muted` → `text-secondary` (scoped, only `<th>` / header-pattern uses) |
| `CLAUDE.md` | "Styling" section — update font-size conventions and color token values |

No changes to: Rails backend, routes, stored procedures, API contracts, or test files.

---

## Expected impact

**Readability wins**
- Light-theme `text-muted` becomes actually readable (2.8:1 → 4.8:1).
- All body text grows ~7% (13 → 14px) — noticeable on first glance, invisible after 30 seconds.
- Numeric cells grow 20% (10 → 12px) — this is the biggest single improvement for pivot-analysis users.
- Column-aligned digits via tabular-nums make scanning rows materially faster.

**Density cost**
- Pivot table: ~1-2 fewer rows per screen before scroll.
- KPI card row: unchanged (sizes `lg` and above untouched).
- Sidebar / nav: unchanged.

**Risk**
- Low. Token-level change; no component surgery. Visual regressions possible on pages that hard-coded pixel sizes matching the old scale — `grep`-able up front.
- Places that use `text-[11px]` or `text-[10px]` directly (bypassing the scale) are unaffected — they continue to work, but we may want a follow-up pass to move them onto the scale for consistency.

---

## Verification plan

1. `cd frontend && npx tsc --noEmit` — zero new errors (ignore pre-existing errors in `board/`, `branch/`, `customer/`, `executive/`).
2. `cd frontend && npm test` — vitest passes.
3. `cd backend && bundle exec rspec` — RSpec unaffected but run per Golden Rule 5.
4. Visual spot-check in both themes:
   - `/dashboard/pivot` — densest table; check column-width stability and row-count change.
   - `/dashboard/executive` — KPI cards and chart axes use `text-muted`.
   - `/dashboard/segmentation` — multi-column numeric grid with RFM sort.
   - `/dashboard/skills` — documentation text at body size.
5. Contrast spot-check — browser devtools → accessibility → contrast ratio on a `text-muted` element in each theme. Must read ≥ 4.5:1.

---

## Rollback

Single revert of the commit restores every token and size. No data-model changes; no migrations; no API breaking changes.
