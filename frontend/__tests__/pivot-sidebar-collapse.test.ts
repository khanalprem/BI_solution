import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCollapsedSections,
  saveCollapsedSections,
  hasStoredCollapseState,
  defaultExpanded,
  STORAGE_KEY,
  type SidebarSectionId,
} from '@/app/dashboard/pivot/sidebarCollapseState';

describe('loadCollapsedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty set when key is missing', () => {
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('returns empty set when value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('returns empty set when value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ measures: true }));
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('parses a valid array of known section ids', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'comparisons']));
    const result = loadCollapsedSections();
    expect(result.has('measures')).toBe(true);
    expect(result.has('comparisons')).toBe(true);
    expect(result.has('dimensions')).toBe(false);
  });

  it('drops unknown ids defensively', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'bogus', 42]));
    const result = loadCollapsedSections();
    expect([...result]).toEqual(['measures']);
  });
});

describe('saveCollapsedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes the set as a JSON array of ids', () => {
    saveCollapsedSections(new Set<SidebarSectionId>(['measures']));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['measures']));
  });

  it('round-trips through loadCollapsedSections', () => {
    const before = new Set<SidebarSectionId>(['dimensions', 'comparisons']);
    saveCollapsedSections(before);
    const after = loadCollapsedSections();
    expect(after.has('dimensions')).toBe(true);
    expect(after.has('comparisons')).toBe(true);
    expect(after.has('measures')).toBe(false);
  });

  it('writes an empty array when the set is empty', () => {
    saveCollapsedSections(new Set());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });
});

describe('hasStoredCollapseState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when the key has never been written', () => {
    expect(hasStoredCollapseState()).toBe(false);
  });

  it('returns true after saveCollapsedSections is called, even with empty set', () => {
    saveCollapsedSections(new Set());
    expect(hasStoredCollapseState()).toBe(true);
  });

  it('returns true when the key exists even if the value is malformed', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    expect(hasStoredCollapseState()).toBe(true);
  });
});

describe('defaultExpanded', () => {
  it('returns true for dimensions regardless of selection', () => {
    expect(defaultExpanded('dimensions', false)).toBe(true);
    expect(defaultExpanded('dimensions', true)).toBe(true);
  });

  it('returns hasSelection for measures', () => {
    expect(defaultExpanded('measures', false)).toBe(false);
    expect(defaultExpanded('measures', true)).toBe(true);
  });

  it('returns hasSelection for comparisons', () => {
    expect(defaultExpanded('comparisons', false)).toBe(false);
    expect(defaultExpanded('comparisons', true)).toBe(true);
  });
});
