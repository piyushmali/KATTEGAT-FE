import type { AgentCategoryId } from '../../lib/api/contract';

/**
 * A hairline schematic of what each strategy actually does.
 *
 * WHY NOT JUST DIFFERENT ICONS
 *
 * The four launch tiles were identical but for a glyph and a number, and the glyphs were
 * generic — a set of scales, a grid, a sprout, a dial — so all four read as the same card
 * four times. Swapping in prettier icons would not have fixed that, because the problem was
 * that nothing on a tile described its strategy. A visitor deciding between rebalancing and
 * grid trading learns nothing from a sprout.
 *
 * So each tile gets a diagram instead. A band with a marker being pulled back to the middle
 * *is* rebalancing; a ladder of rungs across a range *is* grid trading. They are drawn in
 * the language the rest of the product is drawn in — the survey grid behind the hero, the
 * hairline rules, the plan-drawing register — which is why they read as belonging here
 * rather than as illustration bolted on.
 *
 * They also carry the differentiation without introducing a ranking. The tiles stay the same
 * size with the same fields in a fixed order, because sorting them by agent count would put
 * Yield first and Health Factor last every time and amount to a recommendation this product
 * cannot support. Character, not hierarchy.
 *
 * HOW THEY BEHAVE
 *
 * Two strokes per drawing: the structure, which is always visible in `line-strong`, and the
 * one moving part, which is dim at rest and takes metal on hover. The moving part is chosen
 * to be the thing the strategy is about — the marker returning to range, the rung that
 * filled, the curve compounding, the position approaching its threshold — so the hover is
 * explanatory rather than a colour change.
 *
 * `vectorEffect="non-scaling-stroke"` throughout: these scale with the tile, and without it
 * the hairlines would thicken and stop matching the real 1px rules beside them.
 */

const STRUCTURE = 'var(--color-line-strong)';

export function CategorySchematic({ id }: { id: AgentCategoryId }) {
  return (
    <svg
      viewBox="0 0 72 44"
      className="h-11 w-18 shrink-0 overflow-visible"
      fill="none"
      strokeWidth="1"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
    >
      {id === 'rebalancing' ? <Rebalancing /> : null}
      {id === 'grid-trading' ? <GridTrading /> : null}
      {id === 'yield-optimization' ? <Yield /> : null}
      {id === 'health-factor-monitoring' ? <HealthFactor /> : null}
    </svg>
  );
}

/** Two bounds, a centre line, and a position being pulled back inside the range. */
function Rebalancing() {
  return (
    <>
      <path d="M2 8 H70" stroke={STRUCTURE} opacity="0.55" vectorEffect="non-scaling-stroke" />
      <path d="M2 36 H70" stroke={STRUCTURE} opacity="0.55" vectorEffect="non-scaling-stroke" />
      <path
        d="M36 4 V40"
        stroke={STRUCTURE}
        opacity="0.35"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      {/* The correction: drifted high and to the right, arcing back to centre. */}
      <path
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        stroke="currentColor"
        d="M58 13 C50 17, 42 19, 37 22"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        fill="currentColor"
        cx="58"
        cy="13"
        r="1.8"
      />
      <circle
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        fill="currentColor"
        cx="36"
        cy="22"
        r="2.4"
      />
    </>
  );
}

/** A ladder of orders across a price range, one of them filled. */
function GridTrading() {
  const rungs = [8, 15, 22, 29, 36];

  return (
    <>
      <path d="M6 4 V40" stroke={STRUCTURE} opacity="0.4" vectorEffect="non-scaling-stroke" />
      {rungs.map((y, index) => (
        <path
          key={y}
          d={`M6 ${String(y)} H${String(30 + index * 9)}`}
          stroke={STRUCTURE}
          // Staggered opacity so the ladder reads as depth rather than as a barcode.
          opacity={0.3 + index * 0.09}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* The rung that filled. Middle of the range, which is where a grid works. */}
      <path
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        stroke="currentColor"
        d="M6 22 H48"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        fill="currentColor"
        cx="48"
        cy="22"
        r="2.2"
      />
    </>
  );
}

/** A baseline, and a curve compounding away from it. */
function Yield() {
  return (
    <>
      <path d="M2 38 H70" stroke={STRUCTURE} opacity="0.55" vectorEffect="non-scaling-stroke" />
      {/* Flat reference: what the capital would have done left alone. */}
      <path
        d="M2 30 H70"
        stroke={STRUCTURE}
        opacity="0.3"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        stroke="currentColor"
        d="M2 32 C22 31, 38 24, 48 15 S62 6, 68 5"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        fill="currentColor"
        cx="68"
        cy="5"
        r="2.2"
      />
    </>
  );
}

/** A liquidation threshold, and a position falling toward it. */
function HealthFactor() {
  return (
    <>
      {/* The threshold. Dashed, because it is a limit rather than a measurement. */}
      <path
        d="M2 34 H70"
        stroke="var(--color-critical)"
        opacity="0.45"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M2 6 H70" stroke={STRUCTURE} opacity="0.35" vectorEffect="non-scaling-stroke" />
      {/* Health declining toward the line, and levelling off before it reaches it. */}
      <path
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        stroke="currentColor"
        d="M2 10 C16 12, 26 20, 38 26 S54 29, 68 28"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
        fill="currentColor"
        cx="68"
        cy="28"
        r="2.2"
      />
    </>
  );
}
