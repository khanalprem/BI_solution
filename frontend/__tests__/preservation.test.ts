/**
 * Preservation Property Tests
 *
 * These tests capture the CURRENT baseline behavior that MUST be preserved
 * after the bugfix is applied. They read source files as strings and verify
 * structural patterns that should remain unchanged.
 *
 * EXPECTED: These tests PASS on unfixed code — they establish the baseline.
 * After the fix is applied, these tests must STILL PASS (no regressions).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ── Helpers ──

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function extractCSSBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's');
  const match = css.match(regex);
  return match ? match[1] : '';
}

// ── Source file contents (read once) ──

const globalsCss = readSource('app/globals.css');
const dashboardLayout = readSource('app/dashboard/layout.tsx');
const sidebarSource = readSource('components/layout/Sidebar.tsx');
const topBarSource = readSource('components/layout/TopBar.tsx');
const advancedFiltersSource = readSource('components/ui/AdvancedFilters.tsx');
const kpiCardSource = readSource('components/ui/KPICard.tsx');

const rootBlock = extractCSSBlock(globalsCss, ':root');

// ── Preservation: Desktop Layout (Requirement 3.1) ──

describe('Preservation: Desktop Layout', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * DashboardLayout must contain `ml-[220px]` in the source — the desktop
   * sidebar offset. This class must be present (possibly with a responsive
   * prefix like `lg:ml-[220px]`) both before and after the fix.
   */
  it('DashboardLayout source contains ml-[220px] desktop offset', () => {
    fc.assert(
      fc.property(fc.constant(dashboardLayout), (source) => {
        expect(source).toContain('ml-[220px]');
      }),
      { numRuns: 1 }
    );
  });
});

// ── Preservation: Blue Accent Unchanged (Requirement 3.2) ──

describe('Preservation: Blue Accent CSS Variables', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * The blue accent color and its dim variant are already correct and must
   * not change during the fix.
   */
  it(':root contains --accent-blue: #3b82f6 unchanged', () => {
    fc.assert(
      fc.property(fc.constant(rootBlock), (block) => {
        expect(block).toMatch(/--accent-blue:\s*#3b82f6/);
      }),
      { numRuns: 1 }
    );
  });

  it(':root contains --accent-blue-dim: rgba(59,130,246,0.12) unchanged', () => {
    fc.assert(
      fc.property(fc.constant(rootBlock), (block) => {
        const normalized = block.replace(/\s+/g, '');
        expect(normalized).toContain('--accent-blue-dim:rgba(59,130,246,0.12)');
      }),
      { numRuns: 1 }
    );
  });
});


// ── Preservation: Sidebar Navigation (Requirement 3.7) ──

describe('Preservation: Sidebar Navigation Routes', () => {
  /**
   * **Validates: Requirements 3.7**
   *
   * All navigation route hrefs must be present in Sidebar.tsx. These routes
   * must remain unchanged after the fix.
   */
  const expectedRoutes = [
    '/dashboard/executive',
    '/dashboard/skills',
    '/dashboard/financial',
    '/dashboard/branch',
    '/dashboard/customer',
    '/dashboard/employer',
    '/dashboard/risk',
    '/dashboard/digital',
    '/dashboard/kpi',
    '/dashboard/pivot',
    '/dashboard/board',
    '/dashboard/scheduled',
    '/dashboard/config',
    '/dashboard/users',
  ];

  it('Sidebar.tsx contains all navigation route hrefs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedRoutes),
        (route) => {
          expect(sidebarSource).toContain(route);
        }
      ),
      { numRuns: expectedRoutes.length }
    );
  });
});

// ── Preservation: TopBar Period Options (Requirement 3.5) ──

describe('Preservation: TopBar Period Picker', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * All period options must be present in TopBar.tsx. The period picker
   * logic must remain unchanged after the fix.
   */
  const expectedPeriods = ['ALL', '1D', 'WTD', 'MTD', 'QTD', 'YTD', 'PYTD', 'FY', 'CUSTOM'];

  it('TopBar.tsx contains all period options', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedPeriods),
        (period) => {
          expect(topBarSource).toContain(period);
        }
      ),
      { numRuns: expectedPeriods.length }
    );
  });
});

// ── Preservation: AdvancedFilters Draft/Apply Workflow (Requirement 3.3) ──

describe('Preservation: AdvancedFilters Workflow', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * The draft/apply workflow functions must be present in AdvancedFilters.tsx.
   * These interactions must remain unchanged after the fix.
   */
  const expectedFunctions = ['handleApply', 'handleClear', 'hasPendingChanges'];

  it('AdvancedFilters.tsx contains draft/apply workflow functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedFunctions),
        (fnName) => {
          expect(advancedFiltersSource).toContain(fnName);
        }
      ),
      { numRuns: expectedFunctions.length }
    );
  });
});

// ── Preservation: KPICard Accent Map (Requirement 3.6) ──

describe('Preservation: KPICard Accent Colors', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * KPICard.tsx must contain accent map entries for all 6 accent colors.
   * The visual treatment must remain unchanged after the fix.
   */
  const expectedAccentKeys = [
    'var(--accent-blue-dim)',
    'var(--accent-green-dim)',
    'var(--accent-red-dim)',
    'var(--accent-amber-dim)',
    'var(--accent-purple-dim)',
    'var(--accent-teal-dim)',
  ];

  it('KPICard.tsx contains accent map entries for all 6 accent colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedAccentKeys),
        (accentKey) => {
          expect(kpiCardSource).toContain(accentKey);
        }
      ),
      { numRuns: expectedAccentKeys.length }
    );
  });
});

// ── Preservation: Chart CSS Classes (Requirement 3.4) ──

describe('Preservation: Chart CSS Classes in globals.css', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * Chart-related CSS classes must be preserved in globals.css. These
   * premium surface treatments and glow effects must remain unchanged.
   */
  const expectedCSSClasses = [
    '.premium-tooltip',
    '.premium-tooltip-label',
    '.premium-tooltip-item',
    '.premium-tooltip-dot',
    '.premium-tooltip-name',
    '.premium-tooltip-value',
    '.premium-chart-surface',
    '.chart-glow-blue',
    '.chart-glow-green',
    '.chart-glow-purple',
    '.chart-glow-amber',
  ];

  it('globals.css contains all chart-related CSS classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedCSSClasses),
        (cssClass) => {
          expect(globalsCss).toContain(cssClass);
        }
      ),
      { numRuns: expectedCSSClasses.length }
    );
  });
});
