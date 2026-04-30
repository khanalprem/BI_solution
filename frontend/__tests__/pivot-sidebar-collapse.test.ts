import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadExpandedSections,
  saveExpandedSections,
  STORAGE_KEY,
  type SidebarSectionId,
} from '@/app/dashboard/pivot/sidebarCollapseState';

describe('loadExpandedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default {dimensions} when key is missing', () => {
    const result = loadExpandedSections();
    expect(result.has('dimensions')).toBe(true);
    expect(result.has('measures')).toBe(false);
    expect(result.has('comparisons')).toBe(false);
  });

  it('returns the default when value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const result = loadExpandedSections();
    expect([...result]).toEqual(['dimensions']);
  });

  it('returns the default when value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ measures: true }));
    const result = loadExpandedSections();
    expect([...result]).toEqual(['dimensions']);
  });

  it('parses a valid array of known section ids', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'comparisons']));
    const result = loadExpandedSections();
    expect(result.has('measures')).toBe(true);
    expect(result.has('comparisons')).toBe(true);
    expect(result.has('dimensions')).toBe(false);
  });

  it('honors an explicitly empty array (user collapsed everything)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    expect([...loadExpandedSections()]).toEqual([]);
  });

  it('drops unknown ids defensively', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'bogus', 42]));
    const result = loadExpandedSections();
    expect([...result]).toEqual(['measures']);
  });
});

describe('saveExpandedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes the set as a JSON array of ids in canonical order', () => {
    saveExpandedSections(new Set<SidebarSectionId>(['comparisons', 'dimensions']));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(['dimensions', 'comparisons']),
    );
  });

  it('round-trips through loadExpandedSections', () => {
    const before = new Set<SidebarSectionId>(['dimensions', 'comparisons']);
    saveExpandedSections(before);
    const after = loadExpandedSections();
    expect(after.has('dimensions')).toBe(true);
    expect(after.has('comparisons')).toBe(true);
    expect(after.has('measures')).toBe(false);
  });

  it('writes an empty array when the set is empty', () => {
    saveExpandedSections(new Set());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });
});
