import Link from 'next/link';
import { ERC8004_ADDRESSES, EXPECTED_CHAIN, explorerUrl } from '../../lib/web3/chain';

/**
 * Footer.
 *
 * Doubles as a provenance statement: it names the registries KATTEGAT reads and links
 * them on the explorer, so the central claim — that this is indexed from chain rather
 * than curated by us — is verifiable from any page.
 */
export function SiteFooter() {
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
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
            <div>
              <h2 className="eyebrow">Marketplace</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/discover"
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Discover agents
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#how-it-works"
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    How it works
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="eyebrow">Registries</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={explorerUrl.address(ERC8004_ADDRESSES.identityRegistry)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Identity registry
                  </a>
                </li>
                <li>
                  <a
                    href={explorerUrl.address(ERC8004_ADDRESSES.reputationRegistry)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Reputation registry
                  </a>
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
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    ERC-8004
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.bnbchain.org"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
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
