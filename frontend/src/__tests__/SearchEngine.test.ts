import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  toCompactText,
  matchesSearch,
  calculateSearchScore,
  filterAndRankRecords,
} from '../lib/search/search-engine';

describe('EVOLIX Search Engine Utility Tests', () => {
  describe('normalizeSearchText & toCompactText', () => {
    it('normalizes case, accents, and trims leading/trailing spaces', () => {
      expect(normalizeSearchText('  GRADE   9 ')).toBe('grade 9');
      expect(normalizeSearchText('gRaDe 9')).toBe('grade 9');
      expect(normalizeSearchText('GRADE-9')).toBe('grade 9');
      expect(normalizeSearchText('GRADE_9')).toBe('grade 9');
      expect(normalizeSearchText('GRADE/9')).toBe('grade 9');
    });

    it('produces compact alphanumeric-only representation', () => {
      expect(toCompactText('Grade-9')).toBe('grade9');
      expect(toCompactText('  GRADE   9 ')).toBe('grade9');
      expect(toCompactText('Class 10-A')).toBe('class10a');
    });
  });

  describe('matchesSearch & Token-based AND filtering', () => {
    it('matches Grade 9 across case variations', () => {
      const fields = ['Grade 9', 'GRADE-9', 'Secondary'];
      expect(matchesSearch(fields, 'Grade 9')).toBe(true);
      expect(matchesSearch(fields, 'grade 9')).toBe(true);
      expect(matchesSearch(fields, 'GRADE 9')).toBe(true);
      expect(matchesSearch(fields, 'gRaDe 9')).toBe(true);
    });

    it('matches separator variations: grade9, GRADE-9, GRADE_9', () => {
      const fields = ['Grade 9', 'CLS-9'];
      expect(matchesSearch(fields, 'grade9')).toBe(true);
      expect(matchesSearch(fields, 'GRADE-9')).toBe(true);
      expect(matchesSearch(fields, 'GRADE_9')).toBe(true);
    });

    it('supports Class <-> Grade terminology alias', () => {
      expect(matchesSearch(['Grade 9', 'G9'], 'Class 9')).toBe(true);
      expect(matchesSearch(['Class 9', 'C9'], 'Grade 9')).toBe(true);
    });

    it('does NOT match Grade 1, Grade 2, Grade 3 when searching Grade 9 (fixes all-grades bug)', () => {
      expect(matchesSearch(['Grade 1', 'G1'], 'Grade 9')).toBe(false);
      expect(matchesSearch(['Grade 2', 'G2'], 'Grade 9')).toBe(false);
      expect(matchesSearch(['Grade 3', 'G3'], 'Grade 9')).toBe(false);
      expect(matchesSearch(['Grade 4', 'G4'], 'Grade 9')).toBe(false);
    });

    it('matches when query tokens span multiple fields (e.g. name + level + section)', () => {
      const fields = ['Grade 9', 'G9', 'Secondary', 'Section A'];
      expect(matchesSearch(fields, 'grade 9 secondary')).toBe(true);
      expect(matchesSearch(fields, 'grade 9 section a')).toBe(true);
      expect(matchesSearch(fields, 'grade 9 primary')).toBe(false);
    });
  });

  describe('calculateSearchScore & Relevance Ranking', () => {
    it('ranks exact name match higher than prefix or partial matches', () => {
      const exactScore = calculateSearchScore('Grade 9', 'G9', [], 'Grade 9');
      const prefixScore = calculateSearchScore('Grade 90', 'G90', [], 'Grade 9');
      const partialScore = calculateSearchScore('Secondary Grade 9 Extended', 'G9-EXT', [], 'Grade 9');

      expect(exactScore).toBeGreaterThan(prefixScore);
      expect(prefixScore).toBeGreaterThan(partialScore);
    });

    it('ranks Grade 9 strictly ahead of Grade 90 and Grade 19', () => {
      const classes = [
        { name: 'Grade 90', code: 'G90' },
        { name: 'Grade 9', code: 'G9' },
        { name: 'Grade 19', code: 'G19' },
      ];

      const ranked = filterAndRankRecords(classes, 'Grade 9', (c) => ({
        name: c.name,
        code: c.code,
      }));

      expect(ranked[0].name).toBe('Grade 9');
    });

    it('filters and ranks a full list of classes correctly', () => {
      const allClasses = [
        { id: '1', name: 'Grade 1', code: 'G1' },
        { id: '2', name: 'Grade 2', code: 'G2' },
        { id: '3', name: 'Grade 3', code: 'G3' },
        { id: '9', name: 'Grade 9', code: 'G9' },
        { id: '10', name: 'Grade 10', code: 'G10' },
      ];

      const result = filterAndRankRecords(allClasses, 'Grade 9', (c) => ({
        name: c.name,
        code: c.code,
      }));

      // Must only contain Grade 9, NOT all other grades
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Grade 9');
    });
  });
});
