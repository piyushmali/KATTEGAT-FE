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

/**
 * The opening sentence of a description, for places that can only afford one line.
 *
 * Exists because `truncate` was cutting operator-written prose mid-word, and the arrivals
 * list is where that showed worst: registration descriptions are frequently two or three
 * run-on sentences, so every row ended in a severed fragment like "for PancakeSwap
 * concentra…". A clipped word reads as a rendering fault. A complete sentence reads as an
 * edit, and the first sentence of these descriptions is almost always the summary — the
 * operator wrote it that way because that is how people write.
 *
 * `minLength` is the whole reason this is not a one-liner. Splitting on the first period
 * breaks on the abbreviations and version numbers this data is full of: "SmartSentinels
 * v1. Keeps ranges…" would surrender at "SmartSentinels v1." and say nothing. So it keeps
 * looking until a boundary lands far enough in to carry meaning, and returns the text
 * untouched if none does — callers still clamp, so an unpunctuated wall of text degrades
 * to the old behaviour rather than to nothing.
 *
 * 32 characters, arrived at from both directions. "SmartSentinels v1." is 18 and has to be
 * rejected; "Keeps ranges in line when the market moves." is 43 and has to be accepted. The
 * first draft used 48 and swallowed that second one whole, which is the failure this
 * function was written to prevent, so the threshold sits nearer the fragments it is
 * screening out than the sentences it is looking for.
 */
export function firstSentence(text: string, minLength = 32): string {
  const trimmed = text.trim();
  // Lookahead rather than a consuming group, so `.index` stays the punctuation itself.
  const boundary = /[.!?](?=\s|$)/g;

  let match: RegExpExecArray | null;
  while ((match = boundary.exec(trimmed)) !== null) {
    const end = match.index + 1;
    if (end >= minLength) return trimmed.slice(0, end);
  }

  return trimmed;
}
