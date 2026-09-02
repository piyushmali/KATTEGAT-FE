import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { listAgentsResponseSchema, type Agent } from '../../lib/api/contract';
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

  it("shows the agent's own artwork when it published one", () => {
    /*
     * 95.5% of agents with resolved metadata publish an `image` in their registration
     * file, so real artwork is the common case and the generated mark is the fallback.
     */
    render(<AgentCard agent={byId('56:900001')} />);

    const artwork = screen.getByRole('img', { name: /Meridian Rebalancer artwork/i });
    expect(artwork).toHaveAttribute('src', 'https://www.iconaves.com/logo/pro.ave.ai.png');
    // Browsing must not tell a third-party host which agent is being viewed.
    expect(artwork).toHaveAttribute('referrerPolicy', 'no-referrer');
    expect(artwork).toHaveAttribute('loading', 'lazy');
  });

  it('falls back to a deterministic identity mark when there is no artwork', () => {
    // 56:900006 publishes no image, which is the 4.5% case.
    const agent = byId('56:900006');
    const markName = new RegExp(`${agent.profile.name} identity mark`, 'i');

    const { unmount } = render(<AgentCard agent={agent} />);
    const first = screen.getByRole('img', { name: markName });
    const firstHtml = first.innerHTML;
    unmount();

    // Same agent, same mark — marketplace recognition depends on it being stable, and
    // that is the whole reason the mark is derived from the id rather than random.
    render(<AgentCard agent={agent} />);
    expect(screen.getByRole('img', { name: markName }).innerHTML).toBe(firstHtml);
  });

  it('surfaces declared capabilities on the card', () => {
    render(<AgentCard agent={byId('56:900001')} />);

    // The card previews capabilities so a browsing user can judge fit before opening it.
    expect(screen.getByText('rebalance')).toBeInTheDocument();
  });

  /**
   * The card's middle line, for the very common agent that publishes an endpoint and never
   * fills in a capability list. It used to read "No capabilities declared" — the least
   * useful true sentence available about an agent that is, in fact, callable.
   *
   * Worth testing beyond the happy path because the fallback chain reads an operator-supplied
   * string: `new URL()` throws on values that are not URLs, and the registry is full of
   * `mcp://` schemes and CAIP-10 references. A throw here would take out the whole grid.
   */
  describe('an agent with an endpoint but no declared capabilities', () => {
    const withEndpoint = (endpoint: Partial<Agent['profile']['endpoints'][number]>): Agent => {
      const base = byId('56:900001');
      return {
        ...base,
        profile: {
          ...base.profile,
          capabilities: [],
          endpoints: [
            { label: null, value: '', url: null, kind: 'a2a', version: null, ...endpoint },
          ],
        },
      };
    };

    it('prefers the label the operator published', () => {
      render(<AgentCard agent={withEndpoint({ label: 'Agent card', value: 'https://a.example/x' })} />);

      expect(screen.getByText('Agent card')).toBeInTheDocument();
      expect(screen.queryByText(/no capabilities declared/i)).not.toBeInTheDocument();
    });

    it('falls back to the host, not the whole URL', () => {
      render(
        <AgentCard
          agent={withEndpoint({
            value: 'https://tidewater.example/v1/mcp/very/long/path',
            url: 'https://tidewater.example/v1/mcp/very/long/path',
          })}
        />,
      );

      // The host is the part worth the line; a path tells a scanning reader nothing.
      expect(screen.getByText('tidewater.example')).toBeInTheDocument();
    });

    it('reads the host out of a non-http scheme', () => {
      // The registry is full of these; `new URL` parses them, so the host is still the answer.
      render(<AgentCard agent={withEndpoint({ value: 'mcp://gate.example', url: 'mcp://gate.example' })} />);

      expect(screen.getByText('gate.example')).toBeInTheDocument();
    });

    it('shows the raw value when the scheme carries no host', () => {
      /*
       * A CAIP-10 reference parses without throwing and yields an empty host. Returning that
       * would print an empty line where a fact was promised.
       */
      const caip = 'eip155:56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';
      render(<AgentCard agent={withEndpoint({ value: caip, url: caip })} />);

      expect(screen.getByText(caip)).toBeInTheDocument();
    });

    it('does not throw on a value that is not a URL at all', () => {
      const agent = withEndpoint({ value: 'reachable by carrier pigeon', url: 'not a url' });

      expect(() => render(<AgentCard agent={agent} />)).not.toThrow();
      expect(screen.getByText('reachable by carrier pigeon')).toBeInTheDocument();
    });

    it('still says so when there is genuinely nothing to report', () => {
      const base = byId('56:900001');
      render(
        <AgentCard
          agent={{ ...base, profile: { ...base.profile, capabilities: [], endpoints: [] } }}
        />,
      );

      expect(screen.getByText(/no capabilities declared/i)).toBeInTheDocument();
    });
  });

  it('renders every fixture without throwing', () => {
    for (const agent of agents) {
      expect(() => render(<AgentCard agent={agent} />)).not.toThrow();
    }
  });
});
