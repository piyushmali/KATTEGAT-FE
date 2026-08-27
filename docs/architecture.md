# Architecture

## Layers

```
app/            routing only — layouts, pages, error boundaries
   ↓
features/       product surfaces: discovery, agents, wallet
   ↓
components/     ui primitives + layout chrome (no data access)
   ↓
lib/            api client, web3 config, utils — the only network/chain access
   ↓
providers/      wagmi + TanStack Query
```

Two rules hold this together:

- **`app/` contains routing and nothing else.** A page composes a feature; it never
  fetches or renders domain markup itself.
- **`components/` never fetches.** Primitives take props. Any component that knows
  about an agent belongs in `features/`.

## Route structure

```
src/app/
├── layout.tsx            <html>, fonts, global stylesheet
├── not-found.tsx         root 404 — no providers, plain <a>
└── (site)/
    ├── layout.tsx        providers + header + footer + skip link
    ├── page.tsx          /
    ├── error.tsx         error boundary for the site tree
    ├── not-found.tsx     404 inside the app shell
    ├── discover/page.tsx /discover
    └── agents/[id]/page.tsx
```

**Why the `(site)` route group.** The root layout is the document shell only.
Providers and chrome sit one level down so routes outside the app shell — the root 404
— do not mount a wallet client and query cache they never use. A route group
contributes no URL segment, so paths are unaffected.

**Two 404s on purpose.** The root one handles URLs matching no route at all and renders
bare. The `(site)` one handles misses inside the shell and keeps the header.

**A route-level `error.tsx`, not a global one.** A failed page keeps the header,
navigation and wallet state instead of replacing the whole document. It surfaces
`error.digest`, which is the only handle a user has on a server-side failure whose
details are deliberately not sent to them.

## Data flow

```
component
  → feature hook (useAgents / useAgent / useAgentReputation / useCategories)
  → TanStack Query
  → lib/api/client.ts        ← the only fetch() in the app
  → Zod parse against lib/api/contract.ts
  → typed camelCase result
```

Nothing bypasses that path. A component cannot receive a shape the contract did not
approve, and every failure arrives as an `ApiError` with a stable `code`.

Query keys are built by factories next to the hooks (`agentKeys`) so a key can never
drift from the parameters it represents — the usual cause of a filter change that
fetches but renders the previous result.

### Server vs client rendering

The landing page and the discovery shell are static. Discovery data is fetched
client-side because the surface is interactive — debounced search, filter chips,
pagination — and its state belongs in the URL-less client for now.

The agent detail route is a server component that only unwraps the `params` promise and
hands the id to a client view. Fetching stays on the client so the detail page shares
the TanStack Query cache with the discovery grid: a card the user just clicked renders
from cache instead of refetching.

Server-rendering the discovery list is a real future improvement (faster first paint,
indexable). It is not done yet because it needs the filter state moved into search
params first. Noted rather than half-built.

## Reputation: two sources, one panel

An agent record carries a cached reputation snapshot, adequate for browsing. The detail
page additionally calls `GET /agents/:id/reputation`, which reads the registry live.

The panel renders the live value when it arrives and the snapshot until then, so the
page is never blocked on an RPC call. It states which it is showing, because provenance
changes how much the number is worth, and it renders the backend's own `notes` verbatim
rather than inventing an explanation.

`score: null` is displayed as "No feedback yet". It is never shown as `0`.

## State boundaries

| State                              | Where it lives              |
| ---------------------------------- | --------------------------- |
| Server data (agents, categories)   | TanStack Query              |
| Filter and pagination selections   | Local `useState` in the view |
| Wallet connection                  | wagmi                       |
| Design tokens                      | CSS custom properties       |

No global client store. Nothing currently needs state shared across unrelated
subtrees, and adding Zustand for filters that belong to one view would be indirection
without benefit. The moment a comparison tray must persist across routes, that is the
right conversation — and probably URL state rather than a store.

## The API boundary

`src/lib/api/` is deliberately the only place that knows the backend exists.

- `contract.ts` — Zod schemas plus snake_case → camelCase transforms
- `client.ts` — fetch, timeout, parse, and the mock-mode switch
- `errors.ts` — `ApiError`, retryability, and user-facing copy per code
- `mock-data.ts` — synthetic fixtures for `NEXT_PUBLIC_DATA_SOURCE=mock`

**Why the contract is re-declared instead of generated.** The two repositories deploy
independently. A generated client silently assumes the backend it was generated
against; a local schema turns a mismatch into a loud, located error. `live-contract.test.ts`
parses real responses from a running backend through these exact schemas, which is what
keeps the duplication honest.

**Mock mode is not a separate code path.** Fixtures go through the same schemas, so a
fixture that drifts from the contract fails the same way a bad API response would.

## Web3

```
component → features/wallet → wagmi hooks → lib/web3/wagmi.ts → viem → RPC
```

All chain constants — expected chain, registry addresses, explorer URL builders,
address truncation — are in `lib/web3/chain.ts`. No component contains a hex literal or
a hardcoded bscscan URL.

Only BNB Smart Chain is configured. Declaring extra chains would let a wallet connect
on a network the marketplace has no data for; "wrong network" is a state worth
detecting, not tolerating.

The frontend reads no contracts directly. Agent data and reputation both come through
the backend, which keeps RPC keys, retries, fallback endpoints and caching server-side.
`lib/web3` exists for wallet identity and link construction.

The wallet control is `next/dynamic` with `ssr: false` — wallet state comes from an
injected provider absent on the server, so server-rendering it guarantees a hydration
mismatch.

## Extension points

**Natural-language search UI.** The backend endpoint and the FE client method and
schemas already exist and are contract-tested. What is missing is the surface: a query
box that shows `meta.interpretation.explanation` so a user can see and correct how their
query was read. Deliberately not bolted onto the structured filter chips, which map
cleanly to `GET /agents`.

**Comparison.** Add `features/comparison` with a selection tray. Client-side until
comparisons need to be shareable, at which point it needs a backend id.

**Hiring.** Add `features/hiring`. The non-negotiable constraint, stated on the detail
page today: authority is granted in an explicit, scoped step with spend cap, expiry and
revocation visible before signing. A listed agent must never obtain open-ended access
to user funds.

**Activity monitoring.** Needs backend transaction indexing first.
