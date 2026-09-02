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
          <radialGradient id="kg-sun" cx="58%" cy="72%" r="46%">
            <stop offset="0%" stopColor="var(--color-amber)" stopOpacity="0.34" />
            <stop offset="34%" stopColor="var(--color-ember)" stopOpacity="0.15" />
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
            opacity="0.30"
          />
          <path
            d="M0 646 L182 596 L352 638 L534 566 L700 630 L884 588 L1066 646 L1252 578 L1428 634 L1600 600 L1600 900 L0 900 Z"
            fill="var(--color-fjord-deep)"
            opacity="0.58"
          />
          <path
            d="M0 692 L236 650 L430 686 L610 636 L806 690 L1002 646 L1198 692 L1396 648 L1600 688 L1600 900 L0 900 Z"
            fill="var(--color-void)"
            opacity="0.86"
          />

          {/* The water, and the seam where the light collects on it. */}
          <rect y="688" width="1600" height="212" fill="url(#kg-water)" />
          <rect y="687" width="1600" height="1" fill="var(--color-mist)" opacity="0.42" />

          {/*
           * Harbour lights on the far shore, and their reflections on the water.
           *
           * The one literal thing in the scene, and the only one worth being literal about.
           * Everything else here is deliberately abstract because a longship or a carved
           * prow is one bad curve away from a theme park — but a working harbour at dusk is
           * read instantly from a handful of warm points above a waterline, with no
           * iconography at all. It is what turns three grey ridges into somewhere occupied.
           *
           * Placed and sized by hand rather than mapped from an array. Even spacing and a
           * single radius is the thing that makes procedural decoration look procedural; a
           * real shoreline clusters, leaves gaps, and holds one light noticeably brighter
           * than the rest. The reflections are 1px smears rather than mirrored copies,
           * because still water in low light gives back a smudge and not a picture.
           *
           * Static, and staying static. A blinking harbour would pull the eye off the
           * headline every few seconds to look at scenery.
           */}
          <g fill="var(--color-amber)">
            <circle cx="343" cy="684" r="1.4" opacity="0.5" />
            <circle cx="352" cy="685" r="1" opacity="0.32" />
            <circle cx="497" cy="682" r="1.2" opacity="0.4" />
            {/* The harbour mouth: the one light meant to be found first. */}
            <circle cx="612" cy="681" r="2.1" opacity="0.72" />
            <circle cx="628" cy="684" r="1.1" opacity="0.34" />
            <circle cx="806" cy="686" r="1.5" opacity="0.46" />
            <circle cx="1004" cy="683" r="1.2" opacity="0.38" />
            <circle cx="1015" cy="684" r="0.9" opacity="0.26" />
            <circle cx="1198" cy="686" r="1.3" opacity="0.34" />
            <circle cx="1394" cy="683" r="1" opacity="0.28" />
          </g>
          <g fill="var(--color-amber)">
            <rect x="342.6" y="689" width="0.8" height="13" opacity="0.16" />
            <rect x="496.6" y="689" width="0.8" height="10" opacity="0.13" />
            <rect x="611.2" y="689" width="1.6" height="22" opacity="0.24" />
            <rect x="805.6" y="689" width="0.8" height="15" opacity="0.15" />
            <rect x="1003.6" y="689" width="0.8" height="11" opacity="0.12" />
            <rect x="1197.6" y="689" width="0.8" height="9" opacity="0.1" />
          </g>
        </g>
      </svg>

      {/*
       * Contrast scrim, and it does exactly one job now.
       *
       * It used to run `from-void via-void/70 to-transparent`, which held 70% void across
       * the middle of the frame. That guaranteed headline contrast and, in doing so, erased
       * the harbour everywhere the headline was not: the whole scene measured a few percent
       * of luminance against the ground behind it, so a composition built from three
       * headlands, a low sun and a waterline arrived as flat near-black. The page was
       * described as cinematic and read as a switched-off screen.
       *
       * The type sits in the left column, so the guarantee is only needed there. Full void
       * to 38%, released by 78%, which keeps the headline clearing AA on solid ground while
       * letting the right two-thirds of the frame actually be seen.
       */}
      <div className="absolute inset-0 bg-gradient-to-r from-void from-38% via-void/40 to-transparent" />
    </div>
  );
}
