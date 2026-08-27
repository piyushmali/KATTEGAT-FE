# Design system

All tokens live in `src/styles/globals.css` under Tailwind 4's `@theme`. That file is
the single source of truth — nothing in the app hardcodes a colour, radius or easing.

## Intent

KATTEGAT presents financial data about autonomous agents that can move real funds. The
visual language follows from that:

- **Colour carries meaning.** Semantic colours are reserved for state a user should act
  on. A protocol tag is neutral; `tee-attested` is informational; warning colours are
  not spent on decoration.
- **Restrained surfaces.** One dark neutral ramp and one accent. No gradients, no
  glassmorphism, no decorative motion.
- **Border over shadow.** Cards separate with a border. Shadows are reserved for
  genuinely floating layers.
- **Absence is content.** "No feedback yet" is a designed state, not a blank.

## Tokens

### Surfaces

A five-step ramp in OKLCH, chosen for perceptually even steps at low lightness.

| Token              | Use                                  |
| ------------------ | ------------------------------------ |
| `surface-base`     | Page background                      |
| `surface-raised`   | Cards, panels                        |
| `surface-overlay`  | Badges, chips, hovered cards         |
| `surface-inset`    | Inputs, empty states                 |
| `surface-hover`    | Interactive hover                    |

### Lines

`line-subtle` for default separation, `line-strong` for emphasis and dashed empty-state
borders.

### Content

Four levels of emphasis, so hierarchy never depends on font size alone.

| Token               | Use                              |
| ------------------- | -------------------------------- |
| `content-primary`   | Headings, key values             |
| `content-secondary` | Body copy                        |
| `content-muted`     | Supporting detail                |
| `content-faint`     | Metadata, labels, addresses      |

### Accent

BNB Chain's brand yellow pulled toward gold so it stays legible on dark surfaces and
does not read as a warning. `accent`, `accent-strong` (hover), `accent-muted`
(backgrounds/rings), `accent-contrast` (text on accent).

### Semantic

`positive`, `caution`, `critical`, `info`, each with a `-muted` companion for tinted
backgrounds and rings. Used for state only.

### Radii, shadows, motion

`radius-card` (0.75rem), `radius-control` (0.5rem), `radius-pill`.
`shadow-raised` and `shadow-overlay` only.
`ease-out-quart` with `animate-duration-fast` (120ms) and `-base` (200ms) — motion
confirms a state change and never announces itself.

### Type

Geist Sans and Geist Mono, self-hosted by Next at build time (no runtime request to
Google). Monospace is used for addresses, ids and classification signals — anything a
user might compare character by character. One extra size, `text-2xs`, for metadata.

## Primitives

In `src/components/ui`. Only what the product uses.

**`Badge`** — categorical metadata. `tone` is semantic: `neutral` for protocol tags,
`accent` for the primary category, `positive`/`caution`/`critical`/`info` for real
signals.

**`Button`** — `primary` (one per view), `secondary`, `ghost`; sizes `sm` (32px) and
`md` (40px, clearing the comfortable touch target). `type="button"` by default, because
an unspecified `<button>` inside a form submits it.

**States** — `Skeleton`, `AgentCardSkeleton`, `AgentGridSkeleton`, `InlineSpinner`,
`EmptyState`, `ErrorState`. First-class components because loading, empty and error are
where a marketplace spends most of its real-world time.

There is no component library. The primitives above are less code than configuring one
and keep the tokens authoritative.

## Product patterns

**Agent card** (`features/agents/agent-card.tsx`) — answers "what is this and can I
trust it?" in scanning order: name, primary category, description, protocol and traits,
then owner and feedback. Skeletons match its footprint exactly so the grid does not
shift on load.

**Reputation panel** (`features/agents/agent-detail-view.tsx`) — the decision surface.
Shows score, review count, distinct clients, registration date; states whether the
figure was read live from the registry or served from cache; renders the backend's notes
verbatim.

**Classification reasoning** — the "Why this category?" panel lists the raw signals
(`capability:rebalance`) in monospace with a confidence percentage and the classifier
version. This is what stops a derived category from being an unexplained claim.

**Filter chips** — `aria-pressed` for selection, category counts inline, and empty
categories still rendered so a category never silently disappears when it empties.

## Non-happy-path states

Every async surface handles, explicitly:

| State                 | Treatment                                             |
| --------------------- | ----------------------------------------------------- |
| First load            | Skeletons matching real layout, one `role="status"`    |
| Background refetch    | `InlineSpinner`, distinct from first load              |
| Empty index           | Explains that ingestion has not run                   |
| Filtered to nothing   | Offers "clear filters" — a different fix              |
| Error                 | Cause, request id, retry                              |
| Partial data          | Agent shown with an "unresolved metadata" note        |
| Wallet: not mounted   | Reserved space, no layout shift                       |
| Wallet: none          | "No browser wallet detected"                          |
| Wallet: wrong network | Prompts a switch to BNB Smart Chain                   |

Distinguishing "empty index" from "filtered to nothing" matters because the fix
differs: run a sync versus clear a filter.

## Accessibility

Baseline, built in rather than retrofitted:

- Semantic landmarks (`header`, `main`, `nav`, `footer`, `article`, `section`) with
  `aria-labelledby` on each section
- Skip link as the first focusable element
- `:focus-visible` rings only — a mouse click leaves no ring, and `outline: none` never
  appears without a replacement
- `aria-pressed` on filter chips; `aria-label` on icon-only controls
- `role="status"` with `aria-live="polite"` for loading and result counts;
  `role="alert"` for failures
- Icons `aria-hidden`, with text alternatives where they carry meaning
- Four content levels so hierarchy is not conveyed by colour alone
- `prefers-reduced-motion` honoured globally
- 40px `md` controls; `sm` reserved for dense secondary actions

Automated checks (`jsx-a11y` via `eslint-config-next`) run in `pnpm lint`, with
`alt-text` and `aria-props` raised to errors.

Full WCAG 2.1 AA conformance cannot be claimed from static review. It needs manual
testing with real assistive technology, verified contrast measurements across states,
and expert audit. This is a solid baseline, not a certification.

## Adding a component

1. If it takes only props and no data, it belongs in `components/ui`.
2. Use tokens. If a token is missing, add it to `@theme` — do not inline a value.
3. Handle disabled, loading and error where applicable.
4. Keyboard reachable, visible focus, correct semantic element.
5. Use `cn()` for class merging so a caller's class beats the component default.
