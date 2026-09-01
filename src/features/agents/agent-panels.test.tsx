import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listAgentsResponseSchema, listCategoriesResponseSchema } from '../../lib/api/contract';
import { mockListAgents, mockListCategories } from '../../lib/api/mock-data';
import { AgentFilters } from '../discovery/agent-filters';
import { AgentInterface } from './agent-interface';
import { AgentReputationPanel } from './agent-reputation-panel';
import { ClassificationEvidence } from './classification-evidence';
import { CommissionForm } from './commission-form';
import { EscrowPanel } from './escrow-panel';
import { formatWei, HiringPanel } from './hiring-panel';
import type { HiringContext } from '../../lib/api/contract';
import type { DiscoveryState } from '../discovery/use-discovery-params';

/**
 * Rendering tests for the panels that carry KATTEGAT's actual claims.
 *
 * These assert product invariants, not markup. Each case is something that would
 * quietly mislead a user if it regressed: an absent reputation reading as a bad score,
 * a derived category shown without its evidence, an empty category offered as a working
 * filter, or the hiring panel implying wallet access.
 *
 * Fixtures are parsed through the real contract first, so these cannot pass against a
 * shape the API would never send.
 */

const agents = listAgentsResponseSchema.parse(mockListAgents({ perPage: 100 })).data;
const categories = listCategoriesResponseSchema.parse(mockListCategories()).data;

const byId = (id: string) => {
  const agent = agents.find((entry) => entry.identity.id === id);
  if (!agent) throw new Error(`fixture ${id} missing`);
  return agent;
};

const baseState: DiscoveryState = {
  q: '',
  category: null,
  protocol: null,
  traits: [],
  // The discovery view's default: complete records only.
  resolvedOnly: true,
  sort: 'registered_at',
  page: 1,
};

describe('AgentReputationPanel', () => {
  it('presents absence of feedback as absence of evidence, not a low score', () => {
    // Kelp Yield Router: feedback_count 0, score null.
    render(<AgentReputationPanel agent={byId('56:900003')} live={null} isLoading={false} />);

    expect(screen.getByText(/no reputation evidence yet/i)).toBeInTheDocument();
    expect(screen.getByText(/absence/i)).toBeInTheDocument();
    // The failure mode this guards: rendering a 0 the user reads as a bad rating.
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    // Neither a zero nor a scale denominator should appear when there is no evidence.
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows the decoded score and the raw on-chain pair when evidence exists', () => {
    render(<AgentReputationPanel agent={byId('56:900001')} live={null} isLoading={false} />);

    expect(screen.getByText('92.4')).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();
    // The raw fixed-point pair is exposed so a reader can verify our arithmetic.
    expect(screen.getByText(/raw 9240 @ 2dp/i)).toBeInTheDocument();
    expect(screen.getByText(/reputation registry/i)).toBeInTheDocument();
    // The scale is stated, so a reader cannot mistake 92.4 for a five-star rating.
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('states the provenance of a live reading', () => {
    render(
      <AgentReputationPanel
        agent={byId('56:900001')}
        live={{
          agentId: '56:900001',
          feedbackCount: 41,
          clientCount: 28,
          summaryValue: 462,
          summaryDecimals: 2,
          score: 4.62,
          origin: 'chain',
          computedAt: new Date().toISOString(),
          notes: [],
          explorer: null,
        }}
        isLoading={false}
      />,
    );

    // Provenance changes how much the number is worth, so it is never implicit.
    expect(screen.getByText(/read live from registry/i)).toBeInTheDocument();
  });

  it('flags a cached reading when the live read fell back', () => {
    render(
      <AgentReputationPanel
        agent={byId('56:900001')}
        live={
          {
            agentId: '56:900001',
            feedbackCount: 41,
            clientCount: 28,
            summaryValue: 462,
            summaryDecimals: 2,
            score: 4.62,
            origin: 'snapshot',
            computedAt: new Date().toISOString(),
            notes: ['Live registry read failed; showing the most recent cached reading.'],
            isLoadingPlaceholder: undefined,
          } as never
        }
        isLoading={false}
      />,
    );

    // Both the header provenance label and the backend's own note say so.
    expect(screen.getAllByText(/cached reading/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/live registry read failed/i)).toBeInTheDocument();
  });
});

describe('ClassificationEvidence', () => {
  it('shows the matched signals verbatim, with confidence and ruleset', () => {
    render(<ClassificationEvidence categories={byId('56:900001').categories} />);

    expect(screen.getByText(/why this classification/i)).toBeInTheDocument();
    // Raw signals are the point: a paraphrase would be less checkable.
    expect(screen.getByText('rebalance')).toBeInTheDocument();
    expect(screen.getByText(/100% confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/rules-v1|rules-v2/)).toBeInTheDocument();
  });

  it('distinguishes primary from secondary categories', () => {
    // Fjord Treasury Manager: primary rebalancing, secondary yield-optimization.
    render(<ClassificationEvidence categories={byId('56:900005').categories} />);

    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('explains an unclassified agent instead of leaving the panel blank', () => {
    render(<ClassificationEvidence categories={byId('56:900006').categories} />);

    expect(screen.getByText(/not confidently classified/i)).toBeInTheDocument();
    // States why declining is the correct behaviour, not a failure.
    expect(screen.getByText(/wrong category is worse than none/i)).toBeInTheDocument();
  });
});

describe('HiringPanel', () => {
  /** The panel reads its state through TanStack Query, so it needs a client. */
  const renderPanel = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <HiringPanel
          agentId="56:900001"
          agentName="Meridian Rebalancer"
          providerAddress={null}
        />
      </QueryClientProvider>,
    );
  };

  it('frames hiring as scoped authority and never as wallet access', () => {
    /*
     * Matched with a node-level predicate rather than a plain string, because "not" is
     * emphasised in its own <em> and a text-node query cannot see across that. The
     * element filter keeps the assertion on the single heading that makes the claim
     * instead of matching every ancestor that happens to contain the words.
     */
    renderPanel();

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          /scoped authority,\s*not\s*wallet access/i.test(element.textContent ?? ''),
      ),
    ).toBeInTheDocument();
  });

  it('never claims KATTEGAT can act on the user behalf', () => {
    /*
     * The regression that matters most here, and the one that already happened once.
     *
     * An earlier version of this panel had the backend hold an admin key and sign every grant,
     * and described it as a sandbox. Custodial with a disclaimer. If anyone reintroduces a
     * server-signed path, the honest copy for it would have to say so, and this test fails on
     * the language that would accompany it.
     */
    renderPanel();

    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/on your behalf(?!\.)|KATTEGAT-operated|we hold|our key signs/i);
  });

  it('says hiring is switched off rather than showing a form that cannot work', async () => {
    /*
     * In mock mode the client reports `enabled: false`, because there is deliberately no
     * fixture for a session: a fake grant would render a spend cap and an explorer link for
     * authority that does not exist.
     *
     * What the panel must not do is render the form disabled with no explanation, which reads
     * as a broken page rather than a configuration state.
     */
    renderPanel();

    expect(await screen.findByText(/hiring is switched off/i)).toBeInTheDocument();
    expect(screen.getByText(/^unavailable$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hire agent/i })).toBeNull();
  });
});

describe('formatWei', () => {
  /**
   * The spend ceiling is the one number on the hiring panel that states a limit on someone's
   * money, so it is converted with integer arithmetic. `Number(wei) / 1e18` is the obvious
   * version and introduces a float exactly there.
   */
  it('converts without a float', () => {
    expect(formatWei('10000000000000000')).toBe('0.01');
    expect(formatWei('1000000000000000')).toBe('0.001');
    expect(formatWei('100000000000000000')).toBe('0.1');
    expect(formatWei('1000000000000000000')).toBe('1');
  });

  it('keeps precision a float would lose', () => {
    // 18 significant digits: beyond what a double holds exactly.
    expect(formatWei('1234567890123456789')).toBe('1.234567890123456789');
  });

  it('handles zero and very large values', () => {
    expect(formatWei('0')).toBe('0');
    expect(formatWei('123456789000000000000000000')).toBe('123456789');
  });
});

describe('AgentFilters', () => {
  const noop = () => undefined;

  it('offers populated categories with their counts', () => {
    render(
      <AgentFilters
        state={baseState}
        categories={categories}
        totalForQuery={6}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /all agents/i })).toBeInTheDocument();
    // Rebalancing has fixtures, so it is a real, clickable filter.
    expect(screen.getByRole('button', { name: /rebalancing/i })).toBeInTheDocument();
  });

  it('does not offer an empty launch category as a working filter', () => {
    /*
     * The requirement this guards: a category with zero agents must not look like a
     * broken filter. Launch categories stay visible for scope, but as inert labels
     * under "Awaiting agents" rather than chips that lead to an empty grid.
     *
     * Built by hand rather than from the fixtures, because every launch category has
     * at least one fixture agent — which is exactly the case this test must not have.
     */
    const withEmpty = [
      {
        id: 'trading-execution' as const,
        label: 'Trading & Execution',
        description: 'Analyses markets and executes trades.',
        agentCount: 4528,
      },
      {
        id: 'grid-trading' as const,
        label: 'Grid Trading',
        description: 'Works a price range with staggered orders.',
        agentCount: 0,
      },
      {
        id: 'health-factor-monitoring' as const,
        label: 'Health Factor Monitoring',
        description: 'Watches leveraged lending positions.',
        agentCount: 0,
      },
    ];

    render(
      <AgentFilters
        state={baseState}
        categories={withEmpty}
        totalForQuery={4528}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    // The populated one is a real filter.
    expect(screen.getByRole('button', { name: /trading & execution/i })).toBeInTheDocument();

    // The empty ones are labels, not controls.
    expect(screen.getByText(/awaiting agents/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /health factor monitoring/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^grid trading/i })).not.toBeInTheDocument();
  });

  it('offers the interface filter without opening a disclosure', () => {
    /*
     * Roughly half the registry publishes no callable endpoint. Someone looking for an
     * agent they can actually use must be able to say so from the default view, so this
     * asserts the row is reachable without expanding "Filters" first.
     */
    render(
      <AgentFilters
        state={baseState}
        categories={categories}
        totalForQuery={6}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    const group = screen.getByRole('group', { name: /filter by interface/i });
    expect(group).toBeInTheDocument();

    // Labelled for a visitor, not after the database column.
    expect(screen.getByRole('button', { name: /^no endpoint$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unconfigured/i })).toBeNull();
  });

  it('treats including partial records as the deviation, not the default', () => {
    /*
     * Complete records are the default view, so the badge on "Filters" must count the
     * opt-in to partial records. Counting it the other way round would put a permanent
     * "1" on the button in the state nobody chose.
     */
    const { unmount } = render(
      <AgentFilters
        state={baseState}
        categories={categories}
        totalForQuery={6}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /^filters$/i })).toBeInTheDocument();
    unmount();

    render(
      <AgentFilters
        state={{ ...baseState, resolvedOnly: false }}
        categories={categories}
        totalForQuery={6}
        hasFilters
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /filters\s*1/i })).toBeInTheDocument();
  });

  it('marks the selected category as pressed for assistive technology', () => {
    render(
      <AgentFilters
        state={{ ...baseState, category: 'rebalancing' }}
        categories={categories}
        totalForQuery={2}
        hasFilters
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    // Selection must not be conveyed by colour alone.
    expect(screen.getByRole('button', { name: /rebalancing/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /all agents/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('offers a clear control only when filters are active', () => {
    const { unmount } = render(
      <AgentFilters
        state={baseState}
        categories={categories}
        totalForQuery={6}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    unmount();

    render(
      <AgentFilters
        state={{ ...baseState, protocol: 'a2a' }}
        categories={categories}
        totalForQuery={3}
        hasFilters
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('reports the result count', () => {
    render(
      <AgentFilters
        state={baseState}
        categories={categories}
        totalForQuery={4528}
        hasFilters={false}
        onUpdate={noop}
        onToggleTrait={noop}
        onClear={noop}
      />,
    );

    /*
     * Asserted against the live region's full text rather than a single text node: the
     * figure is rendered in its own element so it can carry the display face, which
     * splits "4,528" from "agents" in the DOM. `toHaveTextContent` reads across
     * children, which is also what a screen reader announces for this region.
     */
    expect(screen.getByRole('status')).toHaveTextContent('4,528 agents');
  });
});

describe('AgentInterface', () => {
  const renderFor = (id: string) => {
    const { profile } = byId(id);
    return render(
      <AgentInterface
        endpoints={profile.endpoints}
        trustModels={profile.trustModels}
        x402Support={profile.x402Support}
        metadataResolved={profile.metadataResolvedAt !== null}
      />,
    );
  };

  it('links an https endpoint so the agent can actually be reached', () => {
    // Meridian Rebalancer: an A2A card and a web dashboard, both https.
    renderFor('56:900001');

    const link = screen.getByRole('link', {
      name: /meridian\.example\/\.well-known\/agent-card\.json/,
    });
    expect(link).toHaveAttribute('href', 'https://meridian.example/.well-known/agent-card.json');
    // Opening a third-party endpoint must not hand it a window reference.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows a non-URL endpoint without turning it into a link', () => {
    /*
     * Kelp Yield Router carries a CAIP-10 contract reference. This is the invariant that
     * matters most on this panel: the value is on-chain input, so anything that is not a
     * verified https URL must reach the page as text and never as an href.
     */
    renderFor('56:900003');

    const caip = 'eip155:56:0x15b15DF2fFFF6653C21C11b93fB8A7718CE854Ce/10711';
    expect(screen.getByText(caip)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: new RegExp('eip155') })).toBeNull();
  });

  it('shows where a templated endpoint actually goes, not the template', () => {
    /*
     * The bug this pins. A third of the registry publishes one URL per platform with an
     * `{agentId}` placeholder. The backend resolves it, but the panel was rendering the
     * published string as the link text, so the visible URL read `{agentId}` while the
     * href pointed elsewhere and every one of those links looked broken.
     */
    renderFor('56:900002');

    const link = screen.getByRole('link', { name: /agents\/900002\/services/ });
    expect(link).toHaveAttribute(
      'href',
      'https://tidewater.example/api/v1/agents/900002/services',
    );
    // The template must not be what the visitor reads.
    expect(screen.queryByText(/\{agentId\}/)).toBeNull();
    // But the substitution is disclosed rather than passed off as the published value.
    expect(screen.getByTitle(/published as a template/i)).toBeInTheDocument();
  });

  it('does not prefix a version that is not a version number', () => {
    // "aacp-platform-v1" is a platform name. `v` + that read "vaacp-platform-v1".
    renderFor('56:900002');

    expect(screen.getByText('aacp-platform-v1')).toBeInTheDocument();
    expect(screen.queryByText('vaacp-platform-v1')).toBeNull();
    // A real semver still gets the prefix.
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
  });

  it('counts only machine-callable interfaces, not contact details', () => {
    // Fjord Treasury Manager publishes an MCP server and a Telegram handle.
    renderFor('56:900005');

    expect(screen.getByText('1 callable interface')).toBeInTheDocument();
  });

  it('distinguishes "declared nothing" from "we do not know yet"', () => {
    /*
     * Agent #900006 never resolved its registration file. Saying it declared no endpoints
     * would report a gap in KATTEGAT's index as a fact about the agent.
     */
    renderFor('56:900006');

    expect(screen.getByText(/not known yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/declared no service endpoints/i)).toBeNull();
  });

  it('reports x402 support when the operator declared it', () => {
    renderFor('56:900002');
    expect(screen.getByText(/x402 accepted/i)).toBeInTheDocument();
  });

  it('stays silent about x402 when the operator said nothing', () => {
    // Not "Not offered", which would answer a question the agent never answered.
    renderFor('56:900006');
    expect(screen.queryByText(/x402/i)).toBeNull();
    expect(screen.queryByText(/pay per call/i)).toBeNull();
  });
});

describe('EscrowPanel', () => {
  const renderPanel = (id: string) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
      <QueryClientProvider client={queryClient}>
        <EscrowPanel agent={byId(id)} />
      </QueryClientProvider>,
    );
  };

  it('presents no escrow history as nothing recorded, not a poor record', () => {
    /*
     * The state almost every agent is in: 53 of 317,476 indexed agents have a job on the kernel.
     * If this ever reads as a failure, the panel damages the overwhelming majority of the
     * catalogue for having done nothing wrong.
     */
    renderPanel('56:900003');

    expect(screen.getByText(/never hired through on-chain escrow/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing recorded yet/i)).toBeInTheDocument();
    // A zero here would read as "delivered nothing", which is a different and worse claim.
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('leads with escrow actually released rather than with jobs created', () => {
    // Meridian: 14 jobs named, 9 funded, 6 released for 0.6 U.
    renderPanel('56:900001');

    expect(screen.getByText('0.6')).toBeInTheDocument();
    expect(screen.getByText(/released to this agent/i)).toBeInTheDocument();
    // The funded count is the denominator on show, not the total.
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('says plainly that unfunded jobs are excluded from every figure', () => {
    /*
     * The honesty rule that matters most here. Creating a job and naming any provider costs
     * nothing and needs no agreement from that agent, so 5 of Meridian's 14 could have been
     * opened by anyone. Without this sentence the headline count looks unexplainably smaller
     * than the job list.
     */
    renderPanel('56:900001');

    expect(screen.getByText(/never funded/i)).toBeInTheDocument();
    expect(screen.getByText(/costs nothing/i)).toBeInTheDocument();
  });

  it('offers the escrow contract for independent verification', () => {
    renderPanel('56:900001');

    // The point of showing escrow over a rating is that a stranger can check it.
    expect(screen.getByText(/erc-8183 escrow/i)).toBeInTheDocument();
  });
});

const escrowContext = (over: Partial<HiringContext['escrow']> = {}): HiringContext => ({
  enabled: true,
  chainId: 97,
  network: 'bnb-testnet',
  isMainnet: false,
  nativeSymbol: 'tBNB',
  explorerUrl: 'https://testnet.bscscan.com',
  keystoreAddress: '0x6b8361C29d05D498b1a12B54A37310f94171E94A',
  gasSponsored: true,
  escrow: {
    available: true,
    commerce: '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE',
    router: '0xD7d36D66d2F1B608A0F943f722D27e3744f66F25',
    policy: '0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA',
    paymentToken: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
    tokenSymbol: 'U',
    tokenDecimals: 18,
    disputeWindowSeconds: 900,
    allowedTargets: [
      '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE',
      '0xD7d36D66d2F1B608A0F943f722D27e3744f66F25',
      '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
    ],
    ...over,
  },
});

/**
 * Commissioning work spends the user's money, so the states that matter are the ones where it
 * must not offer a button.
 */
describe('CommissionForm', () => {
  const renderForm = (props: Partial<Parameters<typeof CommissionForm>[0]> = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
      <QueryClientProvider client={queryClient}>
        <CommissionForm
          agentId="56:900001"
          agentName="Meridian Rebalancer"
          providerAddress="0x72070faa1e33d7f8b31397bc8da65be2b1f6281f"
          context={escrowContext()}
          {...props}
        />
      </QueryClientProvider>,
    );
  };

  it('frames the payment as held by the contract rather than by KATTEGAT', () => {
    renderForm();
    expect(screen.getByText(/held by the escrow contract, not by/i)).toBeInTheDocument();
  });

  it('refuses to offer a hire when no dispute policy is accepted on this network', () => {
    /*
     * The measured state of BSC testnet against the SDK's pinned policy. registerJob reverts and
     * funding reverts after it, so a button here would ask for a biometric to send a transaction
     * that cannot succeed.
     */
    renderForm({ context: escrowContext({ available: false }) });

    expect(screen.getByText(/no accepted dispute policy/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fund the job/i })).not.toBeInTheDocument();
  });

  it('refuses when the agent published no wallet to pay', () => {
    // The kernel names providers by address, so there is nothing to escrow against.
    renderForm({ providerAddress: null });

    expect(screen.getByText(/publishes no payment wallet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fund the job/i })).not.toBeInTheDocument();
  });

  it('presents a zero budget as a real job rather than an unset field', () => {
    /*
     * Documented in the protocol: zero moves no tokens and skips the approve, which is how the
     * rail can be exercised without holding any. Reading as "you forgot something" would hide a
     * legitimate option.
     */
    renderForm();
    expect(screen.getByText(/zero moves no tokens/i)).toBeInTheDocument();
  });

  it('states the dispute window, so escrow held after delivery is expected', () => {
    renderForm();
    expect(screen.getByText(/15 minutes before the escrow can be released/i)).toBeInTheDocument();
  });
});
