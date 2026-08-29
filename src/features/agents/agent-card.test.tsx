import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { listAgentsResponseSchema } from '../../lib/api/contract';
import { mockListAgents } from '../../lib/api/mock-data';
import { AgentCard } from './agent-card';

/**
 * Rendering tests for the marketplace's primary unit of discovery.
 *
 * These assert the product's honesty rules, not markup details. Each case is a
 * claim the UI must not misstate: absence of feedback must not read as a zero
 * score, an agent with unresolved metadata must still appear and be labelled, and
 * a derived category must never be presented without its evidence.
 *
 * Fixtures are parsed through the real contract first, so a component test cannot
 * pass against a shape the API would never send.
 */

const agents = listAgentsResponseSchema.parse(mockListAgents({ perPage: 100 })).data;

const byId = (id: string) => {
  const agent = agents.find((entry) => entry.identity.id === id);
  if (!agent) throw new Error(`fixture ${id} missing`);
  return agent;
};

describe('AgentCard', () => {
  it('renders name, category and description', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    expect(screen.getByText('Meridian Rebalancer')).toBeInTheDocument();
    expect(screen.getByText('Rebalancing')).toBeInTheDocument();
    expect(screen.getByText(/target allocation/i)).toBeInTheDocument();
  });

  it('links to the agent detail route using the composite id', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    expect(screen.getByRole('link', { name: /Meridian Rebalancer/i })).toHaveAttribute(
      'href',
      '/agents/56%3A900001',
    );
  });

  it('shows a decoded reputation score, not the raw fixed-point value', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    /*
     * The fixture carries 9240 at 2dp, so the score is 92.4 on ERC-8004's 0–100 scale.
     * Showing "9240" would be the original bug; showing "4.62" would be the second one,
     * where a correctly decoded value was reported against an invented 0–5 scale.
     */
    expect(screen.getByText('92.4')).toBeInTheDocument();
    expect(screen.queryByText('9240')).not.toBeInTheDocument();
    expect(screen.getByText(/41 reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/28 clients/i)).toBeInTheDocument();
  });

  it('reports absence of feedback rather than a zero score', () => {
    // Kelp Yield Router has feedback_count 0 and score null.
    render(<AgentCard agent={byId('56:900003')} />);

    expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });

  it('still renders an agent whose registration file never resolved, and says so', () => {
    render(<AgentCard agent={byId('56:900006')} />);

    // The agent is real — its identity is on chain — so it must not be hidden, and the
    // gap must be labelled rather than left as a silently empty card.
    expect(screen.getByText('Agent #900006')).toBeInTheDocument();
    expect(screen.getByText(/could not be resolved/i)).toBeInTheDocument();
    expect(screen.getByText(/metadata unresolved/i)).toBeInTheDocument();
    expect(screen.getByText(/unclassified/i)).toBeInTheDocument();
  });

  it('signals additional categories for a multi-category agent', () => {
    // Fjord Treasury Manager is primary rebalancing, secondary yield-optimization.
    render(<AgentCard agent={byId('56:900005')} />);

    expect(screen.getByText('Rebalancing')).toBeInTheDocument();
    expect(screen.getByText(/1 more categor/i)).toBeInTheDocument();
  });

  it('renders a deterministic identity mark', () => {
    const { unmount } = render(<AgentCard agent={byId('56:900001')} />);
    const first = screen.getByRole('img', { name: /Meridian Rebalancer identity mark/i });
    expect(first).toBeInTheDocument();
    unmount();

    // Same agent, same mark — marketplace recognition depends on it being stable.
    render(<AgentCard agent={byId('56:900001')} />);
    expect(
      screen.getByRole('img', { name: /Meridian Rebalancer identity mark/i }),
    ).toBeInTheDocument();
  });

  it('surfaces declared capabilities on the card', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    // The card previews capabilities so a browsing user can judge fit before opening it.
    expect(screen.getByText('rebalance')).toBeInTheDocument();
  });

  it('renders every fixture without throwing', () => {
    for (const agent of agents) {
      expect(() => render(<AgentCard agent={agent} />)).not.toThrow();
    }
  });
});
