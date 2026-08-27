# KATTEGAT — Frontend

**The home of autonomous agents.**

The discovery, comparison and trust surface for autonomous agents on BNB Smart Chain.
Agents are indexed from the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
registries; this app makes them understandable enough to decide which one to hire.

Backend repository: [KATTEGAT-BE](https://github.com/piyushmali/KATTEGAT-BE)

---

## The product loop

```
Land → Understand → Browse → Filter → Open an agent
     → See reputation and reasoning → Compare → Decide → Hire
```

Everything built so far serves the left-hand side of that arrow. Hiring is not
implemented, and the detail page says so plainly rather than showing a dead button.

Two principles the UI is built around:

**Show the reasoning.** ERC-8004 carries no category field, so KATTEGAT derives one.
Every derived claim ships the signals that produced it (`capability:rebalance`,
`phrase:health factor`) and the UI renders them. No unexplained score appears anywhere.

**Show absence honestly.** An agent with no feedback reads "No feedback yet", never
`0`. An agent whose off-chain metadata failed to resolve is labelled as partial rather
than hidden — its on-chain identity is still verified.

## Tech stack

| Concern    | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19                 |
| Language   | TypeScript 6, strict                              |
| Styling    | Tailwind CSS 4 — tokens in `src/styles/globals.css` |
| Data       | TanStack Query 5                                  |
| Validation | Zod 4 at the API boundary                         |
| Web3       | wagmi 3 + viem 2 (BNB Smart Chain)                |
| Icons      | lucide-react                                      |
| Tests      | Vitest + Testing Library                          |

No component library. The handful of primitives this UI needs are in
`src/components/ui`, which is less code than configuring one and keeps the design
tokens authoritative.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev                     # http://localhost:3000
```

That runs against a backend at `http://127.0.0.1:4000`. To work without one:

```bash
# .env.local
NEXT_PUBLIC_DATA_SOURCE=mock
```

Mock mode serves fixtures from `src/lib/api/mock-data.ts` through the **same** Zod
schemas as live responses, so a fixture that drifts from the API contract fails
loudly. The fixtures deliberately cover the states a happy path misses: all four
categories, an agent with no reputation, an agent with unresolved metadata, and an
agent spanning two categories.

## Commands

| Command          | Purpose                        |
| ---------------- | ------------------------------ |
| `pnpm dev`       | Dev server                     |
| `pnpm build`     | Production build               |
| `pnpm start`     | Serve the production build     |
| `pnpm typecheck` | `tsc --noEmit`                 |
| `pnpm lint`      | ESLint                         |
| `pnpm test`      | Vitest                         |

> **`pnpm build` requires `NODE_ENV` to be unset or `production`.** If your shell
> exports `NODE_ENV=development`, `next build` fails while prerendering `/404` with a
> confusing `<Html> should not be imported outside of pages/_document` or a null
> `useContext`. Run `NODE_ENV=production pnpm build`. This cost a long debugging
> detour; see `docs/decisions.md`.

## Routes

| Route           | Rendering | Purpose                                        |
| --------------- | --------- | ---------------------------------------------- |
| `/`             | static    | What KATTEGAT does and how it decides          |
| `/discover`     | static shell + client data | Search, filter, browse         |
| `/agents/[id]`  | dynamic   | Capabilities, reputation, classification reasoning, on-chain identity |

`id` is the backend's composite `<chainId>:<agentId>`, e.g. `56:309685`.

## Project structure

```
src/
├── app/                     routes only
│   ├── layout.tsx           document shell
│   └── (site)/              providers + chrome, then the pages
├── components/
│   ├── ui/                  primitives: badge, button, loading/empty/error states
│   └── layout/              site header
├── config/env.ts            validated NEXT_PUBLIC_* config
├── features/
│   ├── agents/              agent card, agent detail
│   ├── discovery/           discovery view + query hooks
│   └── wallet/              connect button (browser-only)
├── lib/
│   ├── api/                 contract, client, errors, fixtures
│   ├── web3/                chain constants, wagmi config
│   └── utils/               cn()
├── providers/               wagmi + TanStack Query
├── styles/globals.css       design tokens
└── types/                   ambient declarations
```

`app/` holds routing and nothing else. Features own their own components and hooks;
`lib/` is the only place that talks to the network or the chain.

Providers live in the `(site)` route group rather than the root layout, so routes
outside the app shell (the root 404) do not mount a wallet client they never use. A
route group adds no URL segment.

## The API boundary

`src/lib/api/` is the only code that makes HTTP requests. It guarantees two things:

1. **Every response is parsed against a Zod schema** before a component sees it. A
   backend field rename surfaces as a clear `CONTRACT_MISMATCH` at the boundary
   instead of `undefined` deep inside a render.
2. **Every failure is an `ApiError` with a stable `code`**, so error UI branches on a
   token rather than string-matching a message. `requestId` is surfaced because the
   backend logs the same id.

The contract is re-declared here rather than generated from the backend's OpenAPI. The
two repositories deploy independently, so a generated client would silently assume the
backend it was generated against. `src/lib/api/live-contract.test.ts` is what keeps
them honest — it parses real responses from a running backend through these schemas.

Wire format is `snake_case`; schemas transform to `camelCase` so React code never
carries the transport convention.

## Design system

Tokens live in `src/styles/globals.css` under Tailwind 4's `@theme`. Nothing in the
app hardcodes a colour.

The palette is one dark neutral surface ramp, one accent, and semantic colours
reserved for state. This UI presents financial data about agents that can move real
funds, so colour carries meaning — a protocol tag is neutral, `tee-attested` is
informational, and warning colours are not spent on decoration. No gradients, no
glassmorphism.

Accessibility is built in rather than retrofitted: semantic landmarks, a skip link,
`:focus-visible` rings, `aria-pressed` on filter chips, `role="status"` and
`role="alert"` on async regions, and `prefers-reduced-motion` honoured. Full WCAG
conformance needs manual testing with assistive technology and expert review — this is
a solid baseline, not a certification.

See [`docs/design-system.md`](docs/design-system.md).

## Non-happy-path states

Every async surface renders explicitly for: first load (skeletons matching the real
layout, so nothing shifts), background refetch (distinct from first load), empty
result, *filtered* to nothing (offers "clear filters" — a different fix from an empty
index), error with retry and request id, and partial data.

Wallet states are handled separately: not yet mounted, no wallet installed,
disconnected, connecting, connected on the wrong network, connected. The wrong-network
case matters most — KATTEGAT only has data for BNB Smart Chain, so a wallet on another
chain is told plainly.

## Wallet

Connecting establishes identity only. Nothing requests an allowance or signs anything.
When hiring lands, granting an agent authority will be an explicit, scoped step with
spend cap, expiry and revocation shown before signing.

The wallet control is loaded with `next/dynamic` and `ssr: false`. Wallet state comes
from an injected provider that does not exist on the server, so server-rendering it
guarantees a hydration mismatch.

## Testing

```bash
pnpm test

# include live contract checks against a running backend
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 pnpm test
```

Contract tests verify the snake_case → camelCase mapping, that unknown enum values are
rejected rather than passed through, and that the fixtures satisfy the same schemas as
live data.

Live contract tests skip themselves when no backend is reachable, so `pnpm test` stays
useful offline. They are the most valuable tests in the repo: they are the only thing
that catches the backend and frontend drifting apart.

## Environment

All configuration is `NEXT_PUBLIC_*` and therefore visible in the browser bundle —
never put a secret in `.env.local`. Values are validated by `src/config/env.ts`.

| Variable                   | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | KATTEGAT backend base URL                |
| `NEXT_PUBLIC_DATA_SOURCE`  | `live` or `mock`                         |
| `NEXT_PUBLIC_BSC_RPC_URL`  | BNB Smart Chain endpoint for wallet checks |

## Documentation

| Document                                       | Contents                                     |
| ---------------------------------------------- | -------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | Layers, data flow, state boundaries          |
| [`docs/design-system.md`](docs/design-system.md) | Tokens, primitives, product patterns, a11y |
| [`docs/development.md`](docs/development.md)   | Setup, conventions, troubleshooting          |
| [`docs/decisions.md`](docs/decisions.md)       | Decisions and rejected alternatives          |

## Status

Working: landing, discovery with search and filters, agent detail with live reputation
and classification reasoning, wallet connection with network validation, mock mode,
full loading/empty/error state coverage.

Not built: hiring, comparison, activity monitoring, natural-language search UI (the
backend endpoint exists and is contract-tested; the surface is next).
