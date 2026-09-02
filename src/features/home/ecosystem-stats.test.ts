import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeFreshness } from './ecosystem-stats';

/**
 * Guards the one claim this indicator is allowed to make.
 *
 * `advancing` decides whether a green dot pulses beside the index counts, and the deployed
 * catalogue is a snapshot — ingestion runs against a local database and this one is refreshed
 * deliberately — so `last_indexed_at` in production is routinely hours old. A pulse there
 * would be asserting activity that is not happening, on the page whose entire argument is
 * that absent data gets reported as absent.
 *
 * That is exactly the kind of thing a later simplification quietly undoes: hardcoding the
 * pulse back on looks tidier, breaks nothing visible, and turns a status light into theatre.
 */

afterEach(() => {
  vi.useRealTimers();
});

/** Pins "now" so the thresholds can be asserted rather than approximated. */
function at(now: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
}

describe('describeFreshness', () => {
  it('says nothing when there is no timestamp, rather than inventing freshness', () => {
    expect(describeFreshness(null)).toBeNull();
  });

  it('says nothing when the timestamp cannot be parsed', () => {
    expect(describeFreshness('not a date')).toBeNull();
  });

  it('reports minutes and allows the pulse while the index is genuinely moving', () => {
    at('2026-09-01T10:06:00Z');

    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: '6 min ago',
      advancing: true,
    });
  });

  it('collapses the first minute to words rather than "0 min ago"', () => {
    at('2026-09-01T10:00:20Z');

    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: 'moments ago',
      advancing: true,
    });
  });

  it('refuses the pulse once the index has not advanced for an hour', () => {
    at('2026-09-01T11:00:00Z');

    /*
     * The boundary case, and the one that matters in production: exactly an hour is already
     * stale. This is a snapshot deployment, so this is the branch that actually renders.
     */
    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: '1 hour ago',
      advancing: false,
    });
  });

  it('reports hours, still without pulsing', () => {
    at('2026-09-01T15:00:00Z');

    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: '5 hours ago',
      advancing: false,
    });
  });

  it('reports days once it has been that long', () => {
    at('2026-09-04T10:00:00Z');

    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: '3 days ago',
      advancing: false,
    });
  });

  it('singularises a single day', () => {
    at('2026-09-02T11:00:00Z');

    expect(describeFreshness('2026-09-01T10:00:00Z')).toEqual({
      label: '1 day ago',
      advancing: false,
    });
  });
});
