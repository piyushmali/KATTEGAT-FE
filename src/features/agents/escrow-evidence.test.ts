import { describe, expect, it } from 'vitest';
import { readTask, releaseDueAt, STATUS_MEANING } from './escrow-evidence';

/**
 * Job descriptions on the live kernel are mostly not prose, and the status names do not mean what
 * they sound like. Both are places where a reasonable-looking display would misrepresent whether
 * an agent was actually paid.
 */

describe('readTask', () => {
  it('returns plain prose untouched', () => {
    expect(readTask('Report whether the position is still in range.')).toBe(
      'Report whether the position is still in range.',
    );
  });

  it('lifts the task out of a signed quote', () => {
    /*
     * The common shape on mainnet. The outer document is a signed price quote, and rendering it
     * would put a signature and two hashes where the instruction should be.
     */
    const quote = JSON.stringify({
      chain_id: 56,
      currency: '0xcE24439F2D9C6a2289F741120FE202248B666666',
      negotiation_hash: '0xf05c6e7d',
      provider_sig: '0xff18228b',
      task: 'Rank current Venus supply yields for USDT on BNB Chain.',
      version: 1,
    });

    expect(readTask(quote)).toBe('Rank current Venus supply yields for USDT on BNB Chain.');
  });

  it('unwraps a task that is itself JSON carrying a goal', () => {
    // Also real: the task field holds another document, with the instruction under `goal`.
    const quote = JSON.stringify({
      price: '100000000000000000',
      task: JSON.stringify({
        goal: 'Rebalance a three asset portfolio to target weights.',
        chain: 'bsc',
      }),
    });

    expect(readTask(quote)).toBe('Rebalance a three asset portfolio to target weights.');
  });

  it('falls back to the raw text rather than hiding a shape it does not know', () => {
    /*
     * The evidence is the point, so an unrecognised description is shown as written. Returning
     * empty here would silently blank the commissioning text for any future format.
     */
    const odd = '{"unexpected":"shape","with":"no task field"}';
    expect(readTask(odd)).toBe(odd);

    const broken = '{not valid json at all';
    expect(readTask(broken)).toBe(broken);
  });
});

describe('STATUS_MEANING', () => {
  it('treats an OPEN job as no money having moved', () => {
    /*
     * The distinction the whole panel rests on. OPEN reads like work in progress but means the
     * job was created and never funded: creating one and setting a budget cost nothing, and
     * anyone can do it naming any provider. Counting it as work would let a stranger inflate an
     * agent's record for free.
     */
    expect(STATUS_MEANING.OPEN.moneyMoved).toBe(false);
    expect(STATUS_MEANING.OPEN.label).not.toMatch(/open/i);
  });

  it('treats every status past OPEN as escrow that was funded', () => {
    for (const status of ['FUNDED', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'EXPIRED'] as const) {
      expect(STATUS_MEANING[status].moneyMoved).toBe(true);
    }
  });

  it('describes COMPLETED as paid and SUBMITTED as delivered but unreleased', () => {
    // A user must not read "delivered" as "the agent has been paid".
    expect(STATUS_MEANING.COMPLETED.label).toBe('Paid');
    expect(STATUS_MEANING.SUBMITTED.label).toBe('Delivered');
    expect(STATUS_MEANING.SUBMITTED.detail).toContain('held');
  });
});

describe('releaseDueAt', () => {
  it('adds the dispute window to the submission time', () => {
    const job = { submittedAt: '2026-08-24T00:00:00.000Z' } as Parameters<typeof releaseDueAt>[0];
    // Seven days, as on mainnet.
    expect(releaseDueAt(job, 604_800)?.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });

  it('has no answer for a job that was never submitted', () => {
    const job = { submittedAt: null } as Parameters<typeof releaseDueAt>[0];
    expect(releaseDueAt(job, 604_800)).toBeNull();
  });
});
