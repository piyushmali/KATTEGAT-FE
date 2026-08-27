# Development

## Prerequisites

- Node.js 22+ (developed on 24 — see `.nvmrc`)
- pnpm 10+
- Optionally the [KATTEGAT-BE](https://github.com/piyushmali/KATTEGAT-BE) backend; mock
  mode works without it

## First run

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000
```

## Working without a backend

```bash
# .env.local
NEXT_PUBLIC_DATA_SOURCE=mock
```

Fixtures come from `src/lib/api/mock-data.ts` and are parsed through the **same** Zod
schemas as live responses, so mock mode is not a separate code path — a fixture that
drifts from the contract fails exactly as a bad API response would.

The fixtures cover the states a happy path misses: all four categories, an agent with
no reputation, an agent whose metadata never resolved, and an agent spanning two
categories. When adding a UI state, add the fixture that exercises it.

## Commands

| Command          | Notes                                        |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Dev server                                   |
| `pnpm build`     | Production build — see the `NODE_ENV` warning |
| `pnpm start`     | Serve the production build                   |
| `pnpm typecheck` | `tsc --noEmit`                               |
| `pnpm lint`      | ESLint; Next 16 no longer lints during build |
| `pnpm test`      | Vitest                                       |

## Conventions

**Imports.** App-router files use the `@/` alias; library and feature files use
relative paths. Neither carries a file extension.

```ts
import { DiscoveryView } from '@/features/discovery/discovery-view';  // in app/
import { Button } from '../../components/ui/button';                  // elsewhere
import { cn } from '../lib/utils/cn.js';                              // wrong
```

**The backend uses the opposite convention** — relative paths *with* explicit `.js`,
required by its NodeNext build. Copying an import style between the repos breaks it.

**`app/` is routing only.** A page composes a feature. It does not fetch or render
domain markup.

**`components/` never fetches.** Primitives take props. Anything that knows what an
agent is belongs in `features/`.

**All network access goes through `lib/api`.** No `fetch` anywhere else. Every response
is Zod-parsed; every failure is an `ApiError` with a stable `code`.

**No hardcoded design values.** Use tokens from `src/styles/globals.css`. If one is
missing, add it to `@theme`.

**No hex literals or explorer URLs in components.** Chain constants live in
`lib/web3/chain.ts`.

**Every async surface handles loading, empty, error and partial data.** See
[`design-system.md`](design-system.md).

## Adding a feature surface

1. Create `src/features/<name>/`.
2. If it needs new data, add the schema to `lib/api/contract.ts`, the method to
   `lib/api/client.ts`, and a fixture to `lib/api/mock-data.ts`.
3. Add a query hook with a key factory entry.
4. Add a route under `src/app/(site)/` that composes the feature and nothing else.
5. Cover loading, empty and error states.
6. Add a live contract test if a new endpoint is involved.

## Keeping the contract in sync with the backend

The contract is re-declared here rather than generated, because the repositories deploy
independently and a generated client silently assumes the backend it was built against.
`src/lib/api/live-contract.test.ts` is what keeps the duplication honest.

After any backend response change:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 pnpm test
```

A mismatch fails there with the offending field named. Without a running backend those
tests skip themselves, so `pnpm test` stays useful offline — but run them before
merging anything that touches the contract.

## Testing

```bash
pnpm test
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 pnpm test   # include live checks
```

Contract tests assert the snake_case → camelCase mapping, that unknown enum values are
rejected rather than passed through, that fixed-point reputation decodes correctly, and
that fixtures satisfy the live schemas.

## Before pushing

```bash
pnpm lint && pnpm typecheck && pnpm test && NODE_ENV=production pnpm build
```

## Troubleshooting

**`pnpm build` fails with `<Html> should not be imported outside of pages/_document`,
or a null `useContext` while prerendering.** Your shell exports
`NODE_ENV=development`. `next build` requires it unset or `production`:

```bash
NODE_ENV=production pnpm build
```

This is the single most confusing failure in this repo — the error names an unrelated
internal route and sent an earlier debugging session down a long false trail. See
[`decisions.md`](decisions.md).

**"Cannot reach the marketplace".** The backend is not running or
`NEXT_PUBLIC_API_BASE_URL` is wrong. Check `curl http://127.0.0.1:4000/health`, or set
`NEXT_PUBLIC_DATA_SOURCE=mock` to keep working.

**"No agents indexed yet".** The backend is reachable but its catalogue is empty. Run
`pnpm sync:agents` in KATTEGAT-BE.

**"Unexpected API response" (`CONTRACT_MISMATCH`).** The backend returned a shape the
schema rejects — the repositories have drifted. Run the live contract tests; the failure
names the field.

**Type error on a CSS import.** `src/types/assets.d.ts` declares `*.css`; TypeScript 6
checks side-effect imports and errors without it.

**ESLint crashes with `scopeManager.addGlobals is not a function`.** Something pulled
ESLint 10 in. `eslint-config-next@16` requires ESLint 9 — keep the pin.

**Wallet button shows nothing briefly on load.** Intended. It is `ssr: false` and
reserves its footprint until mounted, which avoids a hydration mismatch on wallet state.
