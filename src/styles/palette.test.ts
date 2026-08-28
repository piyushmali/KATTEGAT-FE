import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseOklch, toHex, type Oklch } from '../lib/utils/color';

/**
 * Contrast floor for the palette, measured from the stylesheet itself.
 *
 * A dark, low-chroma, cinematic palette is exactly where accessibility quietly fails:
 * every step looks fine in isolation on a good monitor, and `ink-faint` at 11px
 * uppercase is the first thing to fall below AA. OKLCH makes it easier to get wrong,
 * because its lightness axis is perceptually even but is *not* WCAG luminance — "54%
 * on 10.5% looks like plenty" is not a measurement.
 *
 * So the ratios are computed from the real token values, and this fails the build if
 * someone darkens a surface or mutes an ink one step too far. Tokens are read out of
 * the CSS rather than duplicated here, so the test cannot drift from what ships.
 */

// Resolved from the project root, which is where vitest runs. `import.meta.url` is
// not a file URL under vitest's transform, so it cannot be used here.
const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8');

const tokens = new Map<string, Oklch>();
for (const match of css.matchAll(/--color-([a-z-]+):\s*(oklch\([^)]*\))/g)) {
  const parsed = parseOklch(match[2]!);
  if (parsed) tokens.set(match[1]!, parsed);
}

function ratio(foreground: string, background: string): number {
  const fg = tokens.get(foreground);
  const bg = tokens.get(background);
  if (!fg || !bg) throw new Error(`missing token: ${foreground} or ${background}`);
  return contrastRatio(fg, bg);
}

describe('palette is parsed from the stylesheet', () => {
  it('finds the full token set', () => {
    // Guards against a regex that silently matches nothing after a syntax change.
    expect(tokens.size).toBeGreaterThanOrEqual(28);
    expect(tokens.has('void')).toBe(true);
    expect(tokens.has('ink-faint')).toBe(true);
  });
});

describe('text meets WCAG AA (4.5:1) on every ground it is used on', () => {
  const grounds = ['void', 'surface-base', 'surface-raised', 'surface-inset'] as const;
  const inks = ['ink', 'ink-secondary', 'ink-muted', 'ink-faint'] as const;

  for (const ink of inks) {
    for (const ground of grounds) {
      it(`${ink} on ${ground}`, () => {
        expect(ratio(ink, ground)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('ink-faint on the raised surface clears AA, since it carries the eyebrows', () => {
    // The tightest real pairing in the product: 11px uppercase labels inside panels.
    expect(ratio('ink-faint', 'surface-raised')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('non-text and accent colours meet AA for UI components (3:1)', () => {
  // WCAG 1.4.11: indicators, borders and icons need 3:1, not 4.5:1.
  const pairs: Array<[string, string]> = [
    ['amber', 'void'],
    ['amber', 'surface-raised'],
    ['positive', 'void'],
    ['caution', 'void'],
    ['critical', 'void'],
    ['info', 'void'],
    ['bronze', 'void'],
    ['mist', 'void'],
  ];

  for (const [fg, bg] of pairs) {
    it(`${fg} on ${bg}`, () => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('the primary button label is readable on its own fill', () => {
  it('amber-ink on amber clears AA', () => {
    expect(ratio('amber-ink', 'amber')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the mobile browser chrome matches the page ground', () => {
  it('viewport.themeColor is the sRGB rendering of --color-void', () => {
    /*
     * These are two hand-maintained copies of one colour and they had already drifted
     * before this test existed: themeColor read #12151c while the token rendered near
     * #060609, so mobile chrome framed the page in a lighter band instead of
     * continuing it.
     *
     * The layout is read as text rather than imported, because importing it pulls in
     * `next/font/google`, which does not run outside a Next build.
     */
    const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const declared = /themeColor:\s*'(#[0-9a-f]{6})'/.exec(layout)?.[1];

    const ground = tokens.get('void');
    expect(ground).toBeDefined();
    expect(declared).toBe(toHex(ground!));
  });
});

describe('gold stays an accent rather than the dominant colour', () => {
  it('is desaturated well below BNB brand yellow', () => {
    // #F0B90B sits near chroma 0.155 in OKLCH. The art direction calls for antique
    // gold, so this pins the restraint that makes a page with several accents work.
    const amber = tokens.get('amber');
    expect(amber?.c).toBeLessThan(0.13);
  });
});
