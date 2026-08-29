/**
 * Number and date formatting with the locale pinned.
 *
 * `toLocaleString()` and `toLocaleDateString()` with no locale argument resolve
 * against the host's locale, and the Node process rendering on the server rarely
 * shares one with the browser. "18,766" server-side against "18.766" client-side is a
 * hydration mismatch, and the same call sites are the ones that render counts and
 * dates — so the locale is stated explicitly instead of inherited.
 *
 * `'en-US'` is a deliberate choice, not a placeholder: KATTEGAT ships one locale, and
 * pinning it is what makes server and client output identical. Real localisation would
 * replace these with a negotiated locale threaded from the request, at which point the
 * value has to come from somewhere both renders agree on.
 */

const COUNT = new Intl.NumberFormat('en-US');

/** Up to one decimal, none forced — so `100` stays `100` and `87.5` keeps its half. */
const SCORE = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Group-separated integer, e.g. `18,766`. */
export function formatCount(value: number): string {
  return COUNT.format(value);
}

/**
 * An ERC-8004 feedback score, on the 0–100 scale the standard defines.
 *
 * Shown to at most one decimal, and a trailing `.0` is dropped: a mean of two perfect
 * ratings should read `100`, not `100.0`, while a genuine `87.5` keeps its precision.
 *
 * This replaced a `toFixed(2)` that rendered a real value of 100 as "100.00" beside a
 * hardcoded "/ 5" — a correct number reported against a scale ERC-8004 never defines.
 */
export function formatScore(value: number): string {
  return SCORE.format(value);
}

/**
 * Calendar date from an ISO timestamp, e.g. `12 Mar 2025`.
 *
 * Rendered in UTC. On-chain timestamps are UTC block times, so showing them in the
 * viewer's zone would shift the displayed day for anyone west of Greenwich and make
 * two people reading the same block disagree about its date.
 *
 * Returns `null` for a missing or unparseable input, so callers keep control of what
 * absence looks like rather than getting "Invalid Date" in the layout.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
}
