/**
 * Bug Condition Exploration Test
 *
 * This test encodes the EXPECTED (correct) behavior for the UI responsive
 * and design token bugs. It reads source files as strings and checks for
 * the correct Tailwind classes and CSS variable values.
 *
 * EXPECTED: This test FAILS on unfixed code — failure confirms the bugs exist.
 * After the fix is applied, this test should PASS.
 *
 * Validates: Requirements 1.1, 1.2, 1.6, 1.7, 1.8, 1.10, 1.11
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

/**
 * Extract a CSS block by its selector from a CSS file string.
 * Returns the content between the opening { and closing } for the first
 * match of the given selector.
 */
function extractCSSBlock(css: string, selector: string): string {
  // Escape special regex chars in selector
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's');
  const match = css.match(regex);
  return match ? match[1] : '';
}

// ── Source file contents (read once) ──

const globalsCss = readSource('app/globals.css');
const dashboardLayout = readSource('app/dashboard/layout.tsx');
const topBar = readSource('components/layout/TopBar.tsx');
const executivePage = readSource('app/dashboard/executive/page.tsx');

// ── Extract CSS blocks ──

const rootBlock = extractCSSBlock(globalsCss, ':root');
const lightBlock = extractCSSBlock(globalsCss, '[data-theme="light"]');

// ── Category A: Responsiveness ──

describe('Category A: Responsiveness', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * Bug 1.1: DashboardLayout main element should use `ml-0 lg:ml-[220px]`
   * but currently only uses `ml-[220px]` (no responsive prefix).
   */
  it('DashboardLayout main element should have responsive margin classes (ml-0 lg:ml-[220px])', () => {
    fc.assert(
      fc.property(fc.constant(dashboardLayout), (source) => {
        // The main element should contain ml-0 for mobile
        expect(source).toContain('ml-0');
        // The main element should contain lg:ml-[220px] for desktop
        expect(source).toContain('lg:ml-[220px]');
      }),
      { numRuns: 1 }
    );
  });

  /**
   * **Validates: Requirements 1.2**
   *
   * Bug 1.2: A hamburger/menu button should exist in TopBar for mobile viewports.
   * Currently no such button exists.
   */
  it('TopBar should contain a hamburger/menu button for mobile viewports', () => {
    fc.assert(
      fc.property(fc.constant(topBar), (source) => {
        // Should have a Menu icon import or a hamburger button element
        const hasMenuIcon = source.includes('Menu') && source.includes('lucide-react');
        const hasHamburgerButton = /onToggleSidebar/.test(source) && /lg:hidden/.test(source);
        expect(hasMenuIcon && hasHamburgerButton).toBe(true);
      }),
      { numRuns: 1 }
    );
  });
});

// ── Category B: CSS Tokens ──

describe('Category B: CSS Design Tokens', () => {
  /**
   * **Validates: Requirements 1.6**
   *
   * Bug 1.6: :root accent color values should match the style guide.
   */
  const expectedAccentColors: [string, string][] = [
    ['--accent-green', '#10b981'],
    ['--accent-red', '#ef4444'],
    ['--accent-amber', '#f59e0b'],
    ['--accent-purple', '#8b5cf6'],
    ['--accent-teal', '#06b6d4'],
  ];

  it(':root accent colors should match style guide values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedAccentColors),
        ([varName, expectedValue]) => {
          const regex = new RegExp(`${varName}:\\s*${expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
          expect(rootBlock).toMatch(regex);
        }
      ),
      { numRuns: expectedAccentColors.length }
    );
  });

  /**
   * **Validates: Requirements 1.7**
   *
   * Bug 1.7: :root dim variable rgba values should use correct base colors.
   */
  const expectedDimValues: [string, string][] = [
    ['--accent-green-dim', 'rgba(16,185,129,0.12)'],
    ['--accent-red-dim', 'rgba(239,68,68,0.10)'],
    ['--accent-amber-dim', 'rgba(245,158,11,0.10)'],
    ['--accent-purple-dim', 'rgba(139,92,246,0.10)'],
    ['--accent-teal-dim', 'rgba(6,182,212,0.10)'],
  ];

  it(':root dim variables should use correct rgba base colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedDimValues),
        ([varName, expectedValue]) => {
          // Normalize spaces in rgba for matching
          const normalizedExpected = expectedValue.replace(/\s+/g, '');
          const normalizedBlock = rootBlock.replace(/\s+/g, '');
          const pattern = `${varName}:${normalizedExpected}`;
          expect(normalizedBlock).toContain(pattern);
        }
      ),
      { numRuns: expectedDimValues.length }
    );
  });

  /**
   * **Validates: Requirements 1.8**
   *
   * Bug 1.8: [data-theme="light"] block should redeclare accent dim variables
   * with correct base colors.
   */
  const expectedLightDimValues: [string, string][] = [
    ['--accent-green-dim', 'rgba(16,185,129,'],
    ['--accent-red-dim', 'rgba(239,68,68,'],
    ['--accent-amber-dim', 'rgba(245,158,11,'],
    ['--accent-purple-dim', 'rgba(139,92,246,'],
    ['--accent-teal-dim', 'rgba(6,182,212,'],
  ];

  it('[data-theme="light"] should redeclare accent dim variables with correct base colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedLightDimValues),
        ([varName, expectedRgbaPrefix]) => {
          const normalizedBlock = lightBlock.replace(/\s+/g, '');
          const normalizedPrefix = expectedRgbaPrefix.replace(/\s+/g, '');
          const pattern = `${varName}:${normalizedPrefix}`;
          expect(normalizedBlock).toContain(pattern);
        }
      ),
      { numRuns: expectedLightDimValues.length }
    );
  });
});


// ── Category C: Spacing ──

describe('Category C: Spacing & Typography', () => {
  /**
   * **Validates: Requirements 1.10**
   *
   * Bug 1.10: Executive page content wrapper should use `px-5 py-4 gap-[14px]`
   * but currently uses `p-5 gap-3.5`.
   */
  it('Executive page content wrapper should use px-5 py-4 gap-[14px] classes', () => {
    fc.assert(
      fc.property(fc.constant(executivePage), (source) => {
        // Should contain the correct spacing classes
        expect(source).toContain('px-5');
        expect(source).toContain('py-4');
        expect(source).toContain('gap-[14px]');
      }),
      { numRuns: 1 }
    );
  });

  /**
   * **Validates: Requirements 1.11**
   *
   * Bug 1.11: globals.css body font-size should be 13px (currently 12px).
   */
  it('globals.css body font-size should be 13px', () => {
    fc.assert(
      fc.property(fc.constant(globalsCss), (css) => {
        // Extract the body block
        const bodyBlock = extractCSSBlock(css, 'body');
        expect(bodyBlock).toContain('font-size: 13px');
      }),
      { numRuns: 1 }
    );
  });
});
