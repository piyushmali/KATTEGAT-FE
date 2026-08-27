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

    // The fixture carries 462 at 2dp. Showing "462" would be the bug.
    expect(screen.getByText('4.62')).toBeInTheDocument();
    expect(screen.queryByText('462')).not.toBeInTheDocument();
    expect(screen.getByText(/from 41 reviews/i)).toBeInTheDocument();
  });

  it('reports absence of feedback rather than a zero score', () => {
    // Kelp Yield Router has feedback_count 0 and score null.
    render(<AgentCard agent={byId('56:900003')} />);

    expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });

  it('still renders an agent whose registration file never resolved, and says so', () => {
    render(<AgentCard agent={byId('56:900006')} />);

    // The agent is real — its identity is on chain — so it must not be hidden.
    expect(screen.getByText('Agent #900006')).toBeInTheDocument();
    expect(screen.getByText(/could not be resolved/i)).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('signals additional categories for a multi-category agent', () => {
    // Fjord Treasury Manager is primary rebalancing, secondary yield-optimization.
    render(<AgentCard agent={byId('56:900005')} />);

    expect(screen.getByText('Rebalancing')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('exposes an accessible external link to the on-chain identity', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    const link = screen.getByRole('link', { name: /view agent 900001 on bscscan/i });
    expect(link).toHaveAttribute('target', '_blank');
    // noreferrer is required alongside target=_blank to avoid leaking the referrer.
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('href')).toContain('bscscan.com');
  });

  it('renders every fixture without throwing', () => {
    for (const agent of agents) {
      expect(() => render(<AgentCard agent={agent} />)).not.toThrow();
    }
  });
});
