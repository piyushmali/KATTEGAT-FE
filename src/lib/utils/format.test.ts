import { describe, expect, it } from 'vitest';
import { formatCount, formatDate, formatScore } from './format';

/**
 * These exist to catch a locale regression, which is the failure mode that made the
 * module necessary: if someone drops the `'en-US'` argument, the output starts tracking
 * whatever locale the host happens to have, server and client stop agreeing, and React
 * throws a hydration error at runtime rather than here.
 *
 * The assertions are therefore against literal strings, not against a second
 * `Intl` call — comparing one locale-sensitive call to another would pass under
 * every locale and prove nothing.
 */

describe('formatCount', () => {
  it('groups thousands with commas regardless of host locale', () => {
    expect(formatCount(18766)).toBe('18,766');
    expect(formatCount(310064)).toBe('310,064');
  });

  it('leaves small numbers alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
  });
});

describe('formatDate', () => {
  it('renders an ISO timestamp as a fixed-locale UTC date', () => {
    expect(formatDate('2025-03-12T00:00:00.000Z')).toBe('Mar 12, 2025');
  });

  it('does not shift the day for late-UTC timestamps', () => {
    // Would render as Mar 12 in any timezone behind UTC if the zone were not pinned.
    expect(formatDate('2025-03-13T00:30:00.000Z')).toBe('Mar 13, 2025');
  });

  it('returns null for absent or unparseable input so callers own the empty state', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('')).toBeNull();
    expect(formatDate('not a date')).toBeNull();
  });
});

describe('formatScore', () => {
  /*
   * Scores are 0–100 per ERC-8004. This replaced a `toFixed(2)` that rendered a real
   * value of 100 as "100.00" next to a hardcoded "/ 5".
   */
  it('drops a trailing zero so a perfect score reads as a whole number', () => {
    expect(formatScore(100)).toBe('100');
    expect(formatScore(85)).toBe('85');
  });

  it('keeps a genuine fraction to one decimal', () => {
    expect(formatScore(92.4)).toBe('92.4');
    expect(formatScore(77.6)).toBe('77.6');
  });

  it('rounds beyond one decimal rather than implying false precision', () => {
    // A mean of three integer scores can run long; 87.666… is not 87.67 of anything.
    expect(formatScore(87.666666)).toBe('87.7');
  });

  it('renders a genuine zero as a zero, not as nothing', () => {
    // A client rating an agent 0 is evidence. Only `null` means no evidence, and that
    // never reaches this function.
    expect(formatScore(0)).toBe('0');
  });
});
