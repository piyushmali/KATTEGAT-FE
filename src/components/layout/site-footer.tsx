import Link from 'next/link';
import { env } from '../../config/env';
import {
  describeHiringNetwork,
  ERC8004_ADDRESSES,
  EXPECTED_CHAIN,
  EXPECTED_CHAIN_ID,
  explorerUrl,
} from '../../lib/web3/chain';

/**
 * Footer.
 *
 * Doubles as a provenance statement: it names the registries KATTEGAT reads and links
 * them on the explorer, so the central claim — that this is indexed from chain rather
 * than curated by us — is verifiable from any page.
 *
 * WHY THE NETWORKS ARE SPELLED OUT HERE
 *
 * Two chains do two jobs, and the difference decides whether hiring costs real money: agents are
 * read from the ERC-8004 registries on BNB Smart Chain, while a hire settles on whichever network
 * the backend points at. The hiring panel has always shown the second one, but only on an agent
 * page and only once JavaScript has run — so a reader on the landing page, or a reviewer reading
 * the served HTML, had no way to tell which network they were looking at.
 *
 * This footer is a server component, so both statements are in the initial HTML on every page.
 * The registry addresses are printed as text as well as linked, because "show the contract
 * addresses you are reading from" is not satisfied by a link whose label hides them.
 */
export function SiteFooter() {
  const hiring = describeHiringNetwork(env.hiringNetwork);

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-shell px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
          <div className="max-w-sm">
            {/* Same wordmark treatment as the header, so the brand closes as it opened. */}
            <p className="display text-[0.9375rem] tracking-[0.22em] text-ink">KATTEGAT</p>
            <p className="mt-4 text-xs leading-6 text-ink-muted">
              The discovery and trust layer for autonomous agents on {EXPECTED_CHAIN.name}. Agent
              identity, capabilities and reputation are read from the ERC-8004 registries.
              Categories are derived by KATTEGAT and always shown with their evidence.
            </p>

            {/*
             * The network statement. Deliberately plain and deliberately two lines, because the
             * two chains are not interchangeable: one is where agents are read from, the other is
             * where money moves.
             */}
            <dl className="mt-5 space-y-2 text-3xs leading-5">
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-faint">Agents read from</dt>
                <dd className="text-ink-muted">
                  {EXPECTED_CHAIN.name} · chain {EXPECTED_CHAIN_ID}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-faint">Hiring settles on</dt>
                <dd className={hiring.live ? 'text-caution' : 'text-ink-muted'}>
                  {hiring.label} · chain {hiring.chainId}
                  {hiring.live ? ' · real funds' : ' · test network, no real funds'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
            <div>
              <h2 className="eyebrow">Marketplace</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/discover"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Discover agents
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#how-it-works"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    How it works
                  </Link>
                </li>
              </ul>
            </div>

            {/*
             * Addresses printed, not just linked. The label "Identity registry" over an href tells
             * a reader nothing they can check without clicking; the hex is the verifiable part, so
             * it belongs on the page.
             */}
            <div>
              <h2 className="eyebrow">Registries</h2>
              <ul className="mt-3 space-y-3">
                <li>
                  <a
                    href={explorerUrl.address(ERC8004_ADDRESSES.identityRegistry)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Identity registry
                  </a>
                  <span className="mt-1 block break-all font-mono text-3xs leading-4 text-ink-faint">
                    {ERC8004_ADDRESSES.identityRegistry}
                  </span>
                </li>
                <li>
                  <a
                    href={explorerUrl.address(ERC8004_ADDRESSES.reputationRegistry)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Reputation registry
                  </a>
                  <span className="mt-1 block break-all font-mono text-3xs leading-4 text-ink-faint">
                    {ERC8004_ADDRESSES.reputationRegistry}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="eyebrow">Standard</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="https://eips.ethereum.org/EIPS/eip-8004"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    ERC-8004
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.bnbchain.org"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-rule text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    BNB Chain
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/*
         * The product's standing commitment, and the last thing on every page. Kept on a
         * luminous seam rather than a plain rule — the waterline motif from the hero,
         * closing the page where the site opened.
         */}
        <p className="horizon mt-14 pt-8 pb-1 text-3xs leading-5 text-ink-faint">
          KATTEGAT reports only what it can evidence. Where the data does not exist, whether that is
          reputation, activity or performance, it is shown as absent rather than as zero.
        </p>
      </div>
    </footer>
  );
}
