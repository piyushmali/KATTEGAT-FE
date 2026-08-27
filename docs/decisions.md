# Decisions

Frontend decisions and the reasoning, including the alternatives rejected and one
diagnosis that was simply wrong.

Backend decisions live in [KATTEGAT-BE `docs/decisions.md`](https://github.com/piyushmali/KATTEGAT-BE/blob/main/docs/decisions.md).

---

## 1. Re-declare the API contract instead of generating a client

**Decision.** `src/lib/api/contract.ts` restates the backend's response shapes as Zod
schemas, and every response is parsed through them.

**Why.** The repositories deploy independently. A client generated from the backend's
OpenAPI silently assumes the backend it was generated against; when the two drift, a
renamed field arrives as `undefined` deep inside a render. A local schema turns that
into a clear, located error at the boundary.

**Cost.** Two definitions of the same shape. Mitigated by
`src/lib/api/live-contract.test.ts`, which parses real responses from a running backend
through these exact schemas — the duplication is checked, not hoped about.

---

## 2. No component library

**Decision.** Hand-rolled primitives in `src/components/ui`. No shadcn/ui, no Radix, no
class-variance-authority.

**Why.** This UI needs a badge, a button and a set of loading/empty/error states. Those
are ~200 lines. Installing and configuring a library, then overriding its tokens to
match the design system, is more work and leaves the tokens in two places.

**Revisit** when a genuinely hard primitive is needed — a modal with focus trapping, a
combobox, a date picker. Then take Radix for that primitive specifically rather than
adopting a whole system.

---

## 3. No global client store

**Decision.** TanStack Query for server data, `useState` for view-local filter and
pagination state, wagmi for wallet. No Zustand.

**Why.** Nothing currently needs state shared across unrelated subtrees. Filter
selections belong to the discovery view. Adding a store for them would be indirection
with no benefit.

**Revisit** when a comparison tray must survive navigation — and even then, URL search
params are probably the better answer, because a comparison should be shareable.

---

## 4. Providers in the `(site)` route group, not the root layout

**Decision.** The root layout is `<html>`, fonts and the stylesheet. Providers and
chrome live in `(site)/layout.tsx`.

**Why.** Only the app routes consume the wallet client and query cache. The root 404
has no use for them, and a route group adds no URL segment, so scoping them costs
nothing.

**Honest footnote.** This structure was first introduced while chasing the build failure
in decision 8, for a reason that turned out to be wrong. It was kept because it stands
on its own merit, and its code comments were rewritten to say why.

---

## 5. Wallet control is `ssr: false`

**Decision.** `features/wallet/connect-button.tsx` loads the real control via
`next/dynamic` with `ssr: false`.

**Why.** Wallet state comes from an injected provider that does not exist on the server.
Server-rendering it guarantees a hydration mismatch: the server always renders "Connect
wallet" while the client may already know the wallet is connected. Excluding it is the
standard treatment, and it keeps a connector stack the server can never use out of the
server bundle.

**Trade-off.** A brief empty slot on first paint. Mitigated by reserving the button's
footprint so nothing shifts.

---

## 6. Frontend reads no contracts directly

**Decision.** Agent data and reputation come from the backend. `lib/web3` exists for
wallet identity and explorer links.

**Why.** RPC endpoint selection is genuinely hard here — most public BSC endpoints
cannot serve `eth_getLogs`, and log retention on free tiers is about two hours. Keeping
that server-side means one place for retries, fallbacks and caching, and no RPC
credentials in a browser bundle.

**Consequence.** The frontend cannot show data the backend has not indexed. That is the
right trade: it also means the frontend cannot show data nobody has validated.

---

## 7. Only BNB Smart Chain is configured in wagmi

**Decision.** One chain.

**Why.** Declaring more would let a wallet connect on a network the marketplace has no
data for. "Wrong network" is a state worth detecting and telling the user about, not
tolerating silently.

---

## 8. A misdiagnosis worth recording

`pnpm build` failed repeatedly with
`Cannot read properties of null (reading 'useContext')` while prerendering
`/_global-error`. It was attributed to a known Next 16 bug, and Next was downgraded to
15.5.24 on that basis.

**That was wrong.** The cause was `NODE_ENV=development` exported in the shell, leaking
into `next build`. Next 16.3.3 builds cleanly with `NODE_ENV=production`. The downgrade
was reverted.

Three things came out of it:

- `pnpm build` must run with `NODE_ENV` unset or `production` — documented in the README
  and [`development.md`](development.md), because the error message names an unrelated
  internal route and is genuinely misleading.
- The structural changes made while chasing it — the `(site)` group, `ssr: false` on the
  wallet, the route-level error boundary, the root 404 — were each re-justified on their
  own merit and kept. Their comments no longer blame a framework bug that was not there.
- A reminder that a failing build in an unexpected place is worth checking the
  environment for before the framework.

---

## 9. ESLint 9, and no `@eslint/js`

**Decision.** ESLint 9.39.5. `eslint-config-next@16` spread directly, with only a small
TypeScript override layered on.

**Why.** `eslint-config-next@16` crashes on ESLint 10 with
`scopeManager.addGlobals is not a function`. And it already bundles typescript-eslint,
react, react-hooks, import and jsx-a11y — layering `@eslint/js` or typescript-eslint's
own presets on top registers the same plugins twice, so both were removed as direct
dependencies.

**Detail.** The override is scoped to `**/*.ts{,x}` and re-declares the plugin, because
in flat config a rule is only resolvable in a config object where its plugin is
registered.

---

## 10. Mock fixtures never claim to be live

**Decision.** `mockReputation` reports `origin: 'snapshot'` and a "Mock data source"
note.

**Why.** A fixture is not a chain read. If mock mode reported `origin: 'chain'`, the UI
would be built and demoed against a provenance claim that is false — and provenance is
exactly what this product is selling.

---

## 11. Discovery is client-rendered for now

**Decision.** The discovery shell is static; its data is fetched client-side.

**Why.** The surface is interactive — debounced search, filter chips, pagination — and
its state currently lives in the client.

**Known improvement, not done.** Server-rendering the first page would improve first
paint and make the catalogue indexable. It requires moving filter state into search
params first, which is worth doing properly rather than half-way. Recorded rather than
silently skipped.

---

## 12. Natural-language search has no UI yet

**Decision.** The backend `/api/v1/search` endpoint is wired into the API client and
covered by live contract tests, but no search surface consumes it. The discovery search
box still uses structured `GET /agents`.

**Why.** The two are different interactions. The filter chips map cleanly onto
structured filters; a prose query needs a surface that shows the interpretation
(`meta.interpretation.explanation`) so the user can see and correct how it was read.
Bolting prose parsing onto the existing box would make the filter UI ambiguous.

**Not dead code.** The client method is exercised end-to-end by the live contract tests,
so the endpoint and its contract are verified even before the surface exists.
