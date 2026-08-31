import type { AgentCategoryId } from '../../lib/api/contract';

/**
 * What each category does, and what to check before hiring one.
 *
 * Editorial content, held in the frontend on purpose. The API already ships a one-line
 * category description from the taxonomy, which is the right thing for a chip tooltip and
 * far too thin for a page someone lands on. This is the layer that turns a filtered list
 * into something a person can act on: what the category is for, what separates a good agent
 * in it from a bad one, and what it will be touching on BNB Chain.
 *
 * Written per category rather than generated, because the useful advice is genuinely
 * different. What makes a grid bot trustworthy (does it bound its range, what happens when
 * price leaves it) has nothing in common with what makes a health-factor monitor
 * trustworthy (how fast does it react, can it act or only warn).
 *
 * `checks` is the part that matters most. The marketplace is judged on whether someone can
 * "make a genuinely informed call on which agent to hire", and a count plus a name is not
 * that. These are the questions to take into an agent's profile, where the endpoint, the
 * reputation record and the classification evidence are waiting.
 */

export interface CategoryGuidance {
  /** One sentence on the job the agent does. Plainer than the taxonomy description. */
  summary: string;
  /** Why someone hires one of these at all. */
  why: string;
  /** What to verify on the agent's profile before trusting it. */
  checks: readonly string[];
  /** BNB Chain venues an agent in this category typically touches. */
  venues: readonly string[];
}

/**
 * The four BNB Agent Studio launch categories, then the rest.
 *
 * All four get the same shape and the same depth, which is the point: a marketplace that
 * treats one category as the main event and the others as an afterthought is a marketplace
 * that has decided for the user which strategy is worth their money.
 */
export const CATEGORY_GUIDANCE: Partial<Record<AgentCategoryId, CategoryGuidance>> = {
  rebalancing: {
    summary:
      'Keeps a portfolio or a liquidity position at its intended shape, trading it back into line when the market pulls it out.',
    why: 'A position left alone drifts. Concentrated liquidity falls out of range and stops earning; a target allocation quietly becomes a bet you did not place.',
    checks: [
      'Does it state the drift threshold it acts on, or does it just say "monitors"? A rebalancer without a trigger is a dashboard.',
      'Does it declare a callable endpoint? An agent with no interface cannot be put to work, whatever its description claims.',
      'For liquidity agents, does it say what happens when price leaves the range: reset, widen, or withdraw.',
      'Rebalancing means trading. Check the reputation record, because every rebalance is a realised cost.',
    ],
    venues: ['PancakeSwap', 'Concentrated liquidity pools', 'BNB Chain DEXes'],
  },

  'grid-trading': {
    summary:
      'Places a ladder of buy and sell orders across a price range and works the range as the market oscillates.',
    why: 'Sideways markets pay nothing to a holder. A grid harvests the movement inside a range instead of betting on direction.',
    checks: [
      'Does it bound the range explicitly? A grid is only as safe as the band it refuses to trade outside.',
      'What does it do when price breaks out of the range. Silence here is the most expensive gap in the category.',
      'Does it publish the grid plan before executing, so you can read the levels rather than trust them?',
      'Grid density and fee assumptions decide whether the strategy nets anything. Look for stated slippage and fee handling.',
    ],
    venues: ['PancakeSwap V2', 'PancakeSwap V3', 'BNB/USDT pairs'],
  },

  'yield-optimization': {
    summary:
      'Finds the strongest available return and moves capital toward it, compounding rewards as they accrue.',
    why: 'Yields on BNB Chain move constantly across lending markets, liquid staking and LP positions. Chasing them by hand is a full-time job with a gas bill.',
    checks: [
      'Does it rotate capital, or only report rates? Reporting is discovery, not optimisation, and the two are priced differently.',
      'Which venues can it actually reach. A yield agent restricted to one protocol is a wrapper, not an optimiser.',
      'Does it account for the cost of moving? A rotation that ignores gas and exit fees can lose to doing nothing.',
      'Higher APY is usually higher risk. Check whether it says anything about the risk it is taking to get there.',
    ],
    venues: ['Venus', 'Lista liquid staking', 'PancakeSwap liquidity', 'Aave V3'],
  },

  'health-factor-monitoring': {
    summary:
      'Watches a leveraged lending position and acts, or warns, before it reaches liquidation.',
    why: 'Liquidation is the one DeFi outcome you cannot undo. A monitor that reacts in seconds is worth more than one that emails you in the morning.',
    checks: [
      'Can it act, or only alert? Repaying debt and topping up collateral are very different products from a notification.',
      'How often does it read the position. A health factor can move faster than a polling interval.',
      'Which markets does it cover. A monitor watching one venue leaves the rest of your borrow exposed.',
      'This category has custody implications. Read the scope of authority carefully before granting anything.',
    ],
    venues: ['Venus Protocol', 'Aave V3', 'BNB Chain lending markets'],
  },

  'trading-execution': {
    summary:
      'Analyses markets and executes trades. The broad trading bucket, holding agents that do not run one specific named strategy.',
    why: 'The largest category on BNB Chain by a wide margin, and the least specific. Useful as a starting point, not as a filter you can trust to be selective.',
    checks: [
      'This bucket contains bulk platform registrations. Many entries share one description and one operator, so read the name and the owner.',
      'Does it publish a callable endpoint, or is it an identity with nothing behind it?',
      'A specific strategy (grid, rebalancing, yield) is classified under that strategy instead. An agent here is claiming generality.',
      'Check the feedback record. In a category this large, a track record is the main thing that separates entries.',
    ],
    venues: ['PancakeSwap', 'BNB Chain DEXes', 'Perpetuals venues'],
  },

  'security-verification': {
    summary: 'Audits contracts, verifies claims and looks for vulnerabilities.',
    why: 'The agents other agents get checked by. Useful before you grant authority to anything else on this marketplace.',
    checks: [
      'Does it describe what it inspects, or only that it inspects?',
      'Static analysis, formal verification and manual review are different products at different prices.',
      'Look for a TEE attestation if the work involves anything you would not want read.',
      'A security claim without evidence is the thing this category exists to catch. Hold it to its own standard.',
    ],
    venues: ['BNB Smart Chain contracts', 'Solidity'],
  },
};

/** Categories with no bespoke guidance fall back to the taxonomy description. */
export function guidanceFor(id: AgentCategoryId): CategoryGuidance | null {
  return CATEGORY_GUIDANCE[id] ?? null;
}
