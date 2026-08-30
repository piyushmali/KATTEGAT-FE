/**
 * Decides whether a query should be read as a request or as a keyword.
 *
 * The marketplace has two search paths and they are good at different things:
 *
 *   `/agents?q=`  substring match. Right for "rebalance" or an agent's name, where the
 *                 user knows the word they want and intent parsing would only get in
 *                 the way.
 *   `/search`     intent parsing. Right for "conservative yield agent with a track
 *                 record", where a substring match returns nothing because no agent
 *                 description contains that sentence.
 *
 * Choosing wrongly is visible in both directions: send a keyword to the intent parser
 * and the user gets an explanation they did not ask for; send a sentence to the
 * substring matcher and they get an empty grid for a perfectly reasonable request. So
 * the rule lives here on its own, with tests, rather than inline as a `split(' ').length`
 * check nobody can audit.
 *
 * The heuristic is deliberately conservative — it only claims a query when there is real
 * evidence of a sentence, because the substring path is the safer default.
 *
 * ponytail: word-count plus a small stop-word list, not a parser. The ceiling is that a
 * terse three-word query like "bnb yield vault" gets sent to intent parsing, which reads
 * it correctly anyway. Upgrade path if that stops being true: ask the backend to
 * interpret every query and return a confidence, then branch on that instead of guessing
 * client-side.
 */

/**
 * Words that only appear when someone is describing a need rather than naming a thing.
 * Deliberately short: each entry has to be a word nobody types as a bare keyword.
 */
const REQUEST_WORDS = new Set([
  'a',
  'an',
  'the',
  'my',
  'me',
  'i',
  'with',
  'that',
  'which',
  'for',
  'from',
  'and',
  'or',
  'on',
  'to',
  'can',
  'need',
  'want',
  'looking',
  'help',
  'find',
  'best',
  'good',
  'some',
  'any',
  'who',
  'what',
  'how',
]);

/** Splits on whitespace and strips punctuation, so "portfolio," counts as one word. */
function words(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/g, ''))
    .filter((word) => word.length > 0);
}

/**
 * True when a query reads as a request in words rather than a keyword to match.
 *
 * Four or more words is treated as a sentence outright. Two or three words qualify only
 * if one of them is a word that belongs to a request — "rebalance my portfolio" does,
 * "grid trading bot" does not, and the latter is genuinely better served by a substring
 * match against descriptions.
 */
export function readsAsRequest(query: string): boolean {
  const parts = words(query);

  if (parts.length >= 4) return true;
  if (parts.length < 2) return false;

  return parts.some((word) => REQUEST_WORDS.has(word));
}

/**
 * The full routing decision for the discovery view.
 *
 * Beyond how the query reads, one rule matters more: **an explicit filter always wins.**
 * The interpreter derives its own category, protocol and traits, so running it while the
 * user has set any of those by hand would silently discard a deliberate choice — the
 * user picks "Security & Verification", types a sentence, and watches their category
 * quietly change to something else. Worse, they would have no way to tell it happened.
 *
 * So this is a rule rather than a preference, and it is tested as one.
 */
export function shouldInterpret(state: {
  q: string;
  category: string | null;
  protocol: string | null;
  traits: string[];
  resolvedOnly: boolean;
}): boolean {
  const hasExplicitFilter =
    state.category !== null ||
    state.protocol !== null ||
    state.traits.length > 0 ||
    /*
     * Off, not on.
     *
     * `resolvedOnly` is on by default now (see use-discovery-params), so testing for
     * `true` here would mean no query was ever interpreted: the default state would look
     * like a hand-set filter and every sentence would fall through to substring matching.
     *
     * Asking to *include* partial records is the explicit choice, and it is one the
     * interpreter would override, because it derives `resolvedOnly: true` from phrasing
     * like "with a track record". Deferring to the user is the whole point of this rule.
     */
    !state.resolvedOnly;

  if (hasExplicitFilter) return false;
  return readsAsRequest(state.q);
}
