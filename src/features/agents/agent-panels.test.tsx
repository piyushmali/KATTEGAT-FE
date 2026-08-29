import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { listAgentsResponseSchema, listCategoriesResponseSchema } from '../../lib/api/contract';
import { mockListAgents, mockListCategories } from '../../lib/api/mock-data';
import { AgentFilters } from '../discovery/agent-filters';
import { AgentReputationPanel } from './agent-reputation-panel';
import { ClassificationEvidence } from './classification-evidence';
import { HiringPanel } from './hiring-panel';
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
  resolvedOnly: false,
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
        live={{
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
        } as never}
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
  it('frames hiring as scoped authority and never as wallet access', () => {
    render(<HiringPanel agentName="Meridian Rebalancer" />);

    /*
     * Matched with a node-level predicate rather than a plain string, because "not" is
     * emphasised in its own <em> and a text-node query cannot see across that. The
     * element filter keeps the assertion on the single heading that makes the claim
     * instead of matching every ancestor that happens to contain the words.
     */
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          /scoped authority,\s*not\s*wallet access/i.test(element.textContent ?? ''),
      ),
    ).toBeInTheDocument();
    // All four bounds a user needs to understand before granting anything.
    expect(screen.getByText(/spend ceiling/i)).toBeInTheDocument();
    expect(screen.getByText(/session expiry/i)).toBeInTheDocument();
    expect(screen.getByText(/permission scope/i)).toBeInTheDocument();
    expect(screen.getByText(/revocation/i)).toBeInTheDocument();
  });

  it('marks itself a preview and disables the action rather than faking it', () => {
    render(<HiringPanel agentName="Meridian Rebalancer" />);

    expect(screen.getByText(/not yet live/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hire agent/i })).toBeDisabled();
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
