import type { AgentJob, JobStatus } from '../../lib/api/contract';

/**
 * Reading an ERC-8183 job for display.
 *
 * Kept out of the component because both halves of it are decisions rather than markup: what a
 * status means for whether money moved, and how to get a readable task out of a field that is
 * sometimes prose and sometimes a nested signed quote.
 */

/** How a status should read to someone deciding whether to hire. */
export interface StatusMeaning {
  label: string;
  /** One line on what actually happened, in plain terms. */
  detail: string;
  tone: 'positive' | 'info' | 'caution' | 'neutral';
  /** False for a job that was created and never funded, so nothing was ever at stake. */
  moneyMoved: boolean;
}

export const STATUS_MEANING: Record<JobStatus, StatusMeaning> = {
  /*
   * The one that is easy to get wrong. OPEN sounds like work in progress, but on this kernel it
   * means the job was created and the escrow never funded: `createJob` and `setBudget` cost
   * nothing, and only `fund` moves tokens. Anyone can create one naming any provider.
   */
  OPEN: {
    label: 'Not funded',
    detail: 'Created but the escrow was never funded, so nothing was ever at stake.',
    tone: 'neutral',
    moneyMoved: false,
  },
  FUNDED: {
    label: 'Funded',
    detail: 'Payment is locked in escrow and the agent has not delivered yet.',
    tone: 'info',
    moneyMoved: true,
  },
  SUBMITTED: {
    label: 'Delivered',
    detail: 'The agent delivered and the escrow is held until the dispute window closes.',
    tone: 'info',
    moneyMoved: true,
  },
  COMPLETED: {
    label: 'Paid',
    detail: 'Delivered and the escrow was released to the agent.',
    tone: 'positive',
    moneyMoved: true,
  },
  REJECTED: {
    label: 'Rejected',
    detail: 'The client disputed the delivery and the escrow was not released.',
    tone: 'caution',
    moneyMoved: true,
  },
  EXPIRED: {
    label: 'Expired',
    detail: 'Nothing was delivered before the deadline and the client could reclaim the escrow.',
    tone: 'caution',
    moneyMoved: true,
  },
  UNKNOWN: {
    label: 'Unrecognised',
    detail: 'The kernel reported a status this build does not know how to describe.',
    tone: 'neutral',
    moneyMoved: false,
  },
};

/**
 * Pulls the human task out of a job description.
 *
 * Most descriptions on the live kernel are not prose. They are a signed quote as JSON, with the
 * real instruction nested in a `task` field that is itself sometimes JSON again, holding a
 * `goal`. Rendering the outer blob would put a wall of signatures and hashes where the
 * commissioning text should be.
 *
 * Only ever selects an existing field, never rewrites or summarises one, and falls back to the
 * raw string whenever it cannot find a better answer. The point is to show the evidence, so a
 * description this does not understand is displayed as written rather than hidden.
 */
export function readTask(description: string): string {
  const trimmed = description.trim();
  if (!trimmed.startsWith('{')) return trimmed;

  let task: unknown = pick(trimmed, 'task') ?? trimmed;

  // `task` is frequently another JSON document carrying the actual instruction.
  if (typeof task === 'string' && task.trim().startsWith('{')) {
    task = pick(task, 'goal') ?? pick(task, 'task') ?? task;
  }

  return typeof task === 'string' && task.trim().length > 0 ? task.trim() : trimmed;
}

/** One named field out of a JSON string, or undefined if it is not there or not parseable. */
function pick(raw: string, key: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return undefined;
    return (parsed as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/**
 * Whether a delivered job is still inside its dispute window.
 *
 * Used so "delivered, not yet paid" can say which it is: waiting out the window, which is the
 * normal course of things, or past it and awaiting a settle call that has not happened.
 */
export function releaseDueAt(job: AgentJob, disputeWindowSeconds: number): Date | null {
  if (job.submittedAt === null) return null;
  return new Date(new Date(job.submittedAt).getTime() + disputeWindowSeconds * 1000);
}
