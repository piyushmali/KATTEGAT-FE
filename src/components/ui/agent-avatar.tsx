import { cn } from '../../lib/utils/cn';

/**
 * Deterministic visual identity for an agent.
 *
 * Marketplace recognition needs an agent to look the same every time it appears, so
 * this is derived purely from the agent id — no randomness, no network request, no
 * external avatar service. The same id always produces the same mark.
 *
 * The mark is a 4x4 cell pattern, mirrored on the vertical axis so it reads as an
 * intentional glyph rather than noise, plus two hues drawn from the id. Hues are
 * constrained to a narrow band around the product's amber and steel so a wall of
 * agent cards stays coherent instead of turning into confetti.
 */

/** FNV-1a. Small, fast, and stable across runtimes — which is the requirement. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

const SIZES = {
  sm: { box: 'size-8 rounded-sm', grid: 4 },
  md: { box: 'size-10 rounded-control', grid: 4 },
  lg: { box: 'size-14 rounded-card', grid: 5 },
  xl: { box: 'size-20 rounded-panel', grid: 5 },
} as const;

export function AgentAvatar({
  agentId,
  name,
  size = 'md',
  className,
}: {
  /** Composite id (`56:310018`) or any stable identifier. */
  agentId: string;
  /** Used only for the accessible label. */
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const seed = hash(agentId);
  const { box, grid } = SIZES[size];

  /*
   * Two hues from the same seed, each confined to one of the palette's own families:
   * `hueA` is struck metal (bronze through gold, 55°–95°) and `hueB` is deep water
   * (225°–262°). Constraining them this tightly is what lets a grid of twenty-four
   * marks read as one collection of artefacts rather than as confetti — the variation
   * a viewer notices is the pattern, not the colour.
   */
  const hueA = 55 + (seed % 40);
  const hueB = 225 + ((seed >> 8) % 37);

  const half = Math.ceil(grid / 2);
  const cells: boolean[] = [];
  for (let row = 0; row < grid; row += 1) {
    const rowCells: boolean[] = [];
    for (let column = 0; column < half; column += 1) {
      // One bit of the hash per cell, re-mixed per row so rows differ.
      const bit = (seed >> ((row * half + column) % 30)) & 1;
      const extra = (hash(`${agentId}:${String(row)}:${String(column)}`) >> 3) & 1;
      rowCells.push((bit ^ extra) === 1);
    }
    // Mirror, dropping the centre column on an odd grid so it is not doubled.
    const mirrored = [...rowCells, ...[...rowCells].reverse().slice(grid % 2 === 0 ? 0 : 1)];
    cells.push(...mirrored.slice(0, grid));
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden border border-line-strong/60 bg-surface-inset',
        box,
        className,
      )}
      role="img"
      aria-label={name ? `${name} identity mark` : 'Agent identity mark'}
    >
      {/* The plate: cold water lit from the top-left, so the mark sits on a material. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(142deg, oklch(24% 0.045 ${String(hueA)}) 0%, oklch(17% 0.03 ${String(hueB)}) 62%, oklch(13% 0.022 ${String(hueB)}) 100%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="relative grid size-full p-[15%]"
        style={{ gridTemplateColumns: `repeat(${String(grid)}, 1fr)`, gap: '9%' }}
        aria-hidden="true"
      >
        {cells.map((filled, index) => (
          <span
            key={index}
            className="rounded-[1px]"
            style={{
              /*
               * Chroma is held at 0.095 — well under the accent's own 0.115 — because
               * the mark is identity, not a signal. It has to be recognisable at a
               * glance without competing with the one amber action on the screen.
               */
              background: filled
                ? `oklch(74% 0.095 ${String(hueA)} / ${index % 3 === 0 ? '0.92' : '0.62'})`
                : 'transparent',
            }}
          />
        ))}
      </div>

      {/*
       * Struck edge. A one-pixel inset highlight along the top and a darker seam below
       * it, which is what reads as stamped rather than printed — the same trick the
       * panels use, at a sixteenth of the scale.
       */}
      <div
        className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-ink/8"
        style={{
          boxShadow: 'inset 0 1px 0 0 oklch(100% 0 0 / 0.07), inset 0 -1px 2px 0 oklch(0% 0 0 / 0.4)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
