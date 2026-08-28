/**
 * The harbour, built from light rather than from an image.
 *
 * There is no artwork in this repository and none is needed here: receding headlands,
 * a waterline and a low sun are shapes and gradients, so they ship as a few hundred
 * bytes of inline SVG that scales to any viewport, needs no network request, costs no
 * layout, and cannot arrive late and shift the hero.
 *
 * The read is deliberately abstract. Literal Nordic iconography — a longship, a
 * carved prow, runes — is one bad curve away from a theme park, and the brief is
 * cinematic, not fantasy. Depth here comes from atmospheric perspective: each headland
 * further away is lighter and lower in contrast, which is how distance actually looks
 * through cold air, and it lets the composition suggest enormous scale without drawing
 * anything recognisable.
 *
 * Everything is `aria-hidden`; it carries no information a screen reader needs.
 */
export function HarbourAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/*
       * Survey grid. Sits furthest back and reads as a plan drawing under the
       * composition — harbour architecture rather than decoration.
       */}
      <div className="grid-field absolute inset-0 opacity-30" />

      {/*
       * Fog. Drifts very slowly and returns to its origin, so the reduced-motion rule
       * that collapses animations to a single instant frame lands back at 0 rather than
       * leaving the bank shoved off to one side.
       */}
      <div className="fog animate-drift absolute -inset-x-24 inset-y-0 opacity-70" />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1600 900"
        // The waterline stays anchored near the bottom while the sky crops, so the
        // horizon does not ride up into the headline on short viewports.
        preserveAspectRatio="xMidYMax slice"
        role="presentation"
      >
        <defs>
          {/* A low sun sitting just above the waterline. The single light source. */}
          <radialGradient id="kg-sun" cx="52%" cy="70%" r="42%">
            <stop offset="0%" stopColor="var(--color-amber)" stopOpacity="0.2" />
            <stop offset="42%" stopColor="var(--color-ember)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--color-void)" stopOpacity="0" />
          </radialGradient>

          {/* Water: darkest at the shore, catching light toward the horizon. */}
          <linearGradient id="kg-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-fjord)" stopOpacity="0.3" />
            <stop offset="55%" stopColor="var(--color-fjord-deep)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-void)" stopOpacity="0.9" />
          </linearGradient>

          {/*
           * Fades the whole scene out at the top and bottom, so it dissolves into the
           * page instead of ending on a visible seam.
           */}
          <linearGradient id="kg-falloff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset="26%" stopColor="black" stopOpacity="0.75" />
            <stop offset="74%" stopColor="black" stopOpacity="1" />
            <stop offset="100%" stopColor="black" stopOpacity="0.15" />
          </linearGradient>
          <mask id="kg-mask">
            <rect width="1600" height="900" fill="url(#kg-falloff)" />
          </mask>
        </defs>

        <g mask="url(#kg-mask)">
          <rect width="1600" height="900" fill="url(#kg-sun)" />

          {/*
           * Three headland layers. Lightest and flattest is furthest away; each nearer
           * ridge is darker and taller. Bases run past the viewBox so no shape shows a
           * cut edge when the SVG crops.
           */}
          <path
            d="M0 596 L214 540 L338 572 L512 498 L668 566 L826 522 L1010 580 L1168 512 L1342 566 L1476 528 L1600 574 L1600 900 L0 900 Z"
            fill="var(--color-fjord)"
            opacity="0.22"
          />
          <path
            d="M0 646 L182 596 L352 638 L534 566 L700 630 L884 588 L1066 646 L1252 578 L1428 634 L1600 600 L1600 900 L0 900 Z"
            fill="var(--color-fjord-deep)"
            opacity="0.5"
          />
          <path
            d="M0 692 L236 650 L430 686 L610 636 L806 690 L1002 646 L1198 692 L1396 648 L1600 688 L1600 900 L0 900 Z"
            fill="var(--color-void)"
            opacity="0.86"
          />

          {/* The water, and the seam where the light collects on it. */}
          <rect y="688" width="1600" height="212" fill="url(#kg-water)" />
          <rect y="687" width="1600" height="1" fill="var(--color-mist)" opacity="0.28" />
        </g>
      </svg>

      {/*
       * Final scrim. Guarantees headline contrast over the brightest part of the sun
       * rather than trusting the artwork to stay dark enough — the type has to clear AA
       * regardless of what the atmosphere is doing behind it.
       */}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/70 to-transparent" />
    </div>
  );
}
