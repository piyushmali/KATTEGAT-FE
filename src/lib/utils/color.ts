/**
 * OKLCH to WCAG relative luminance, so contrast can be asserted rather than eyeballed.
 *
 * The palette in `styles/globals.css` is authored entirely in OKLCH because its
 * lightness axis is perceptually even — stepping a surface by 3% looks like an even
 * step, which is not true of HSL. The catch is that OKLCH lightness is *not* WCAG
 * luminance, so "54% on 10.5% must be fine" is a guess. This converts properly:
 *
 *   OKLCH -> OKLab -> linear sRGB -> relative luminance -> contrast ratio
 *
 * Matrices are from the OKLab definition (Björn Ottosson). Kept here rather than
 * pulling a colour library in: this is the only conversion the project needs, and a
 * dependency for thirty lines of arithmetic is not worth the supply chain.
 */

/** A colour as authored in the stylesheet: `oklch(54% 0.014 70)`. */
export interface Oklch {
  /** Perceptual lightness, 0–1. */
  l: number;
  /** Chroma, absolute. */
  c: number;
  /** Hue angle in degrees. */
  h: number;
}

/** Parses the `oklch(L% C H)` form used throughout the stylesheet. */
export function parseOklch(value: string): Oklch | null {
  const match = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(value);
  if (!match) return null;

  return {
    l: Number(match[1]) / 100,
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

/** Linear-light sRGB channels. May fall outside 0–1 for out-of-gamut colours. */
function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab -> LMS, then undo the cube-root compression.
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ] as const;

  return [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = toLinearSrgb(color);
  // Clamped because an out-of-gamut colour still renders as its nearest displayable
  // neighbour, and a negative channel would otherwise understate the luminance.
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

/**
 * The sRGB hex a browser will actually paint for an OKLCH colour.
 *
 * Needed because a few places outside CSS have to name a colour as hex — the
 * `themeColor` viewport value, for one — and those hand-written duplicates drift from
 * the tokens silently. Converting lets a test assert they still agree.
 */
export function toHex(color: Oklch): string {
  const encode = (channel: number) => {
    const v = Math.min(1, Math.max(0, channel));
    // sRGB transfer function.
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };

  return `#${toLinearSrgb(color)
    .map((channel) =>
      Math.round(encode(channel) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** WCAG 2.1 contrast ratio between two colours. Order does not matter. */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
