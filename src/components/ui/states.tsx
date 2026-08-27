import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './button';

/**
 * The non-happy-path states, as first-class components.
 *
 * Loading, empty and error are the states a marketplace spends most of its
 * real-world time in — an unsynced database, an unreachable backend, a filter
 * that matches nothing. Giving them proper components is what stops them from
 * being an afterthought or a blank screen.
 */

/* ------------------------------- skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-skeleton rounded-control bg-surface-overlay', className)}
      // Decorative: the surrounding region announces the loading state.
      aria-hidden="true"
    />
  );
}

/** Card-shaped placeholder that matches AgentCard's footprint to avoid layout shift. */
export function AgentCardSkeleton() {
  return (
    <div className="rounded-card border border-line-subtle bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function AgentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      // Announced once, rather than per card.
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">Loading agents…</span>
      {Array.from({ length: count }, (_, index) => (
        <AgentCardSkeleton key={index} />
      ))}
    </div>
  );
}

/* -------------------------------- inline --------------------------------- */

export function InlineSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-content-muted" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}

/* --------------------------------- empty --------------------------------- */

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-inset px-6 py-16 text-center">
      <Inbox className="size-8 text-content-faint" aria-hidden="true" />
      <h3 className="mt-4 text-base font-semibold text-content-primary">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-content-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- error --------------------------------- */

export interface ErrorStateProps {
  title: string;
  detail: string;
  /** Diagnostic id from the API, shown so a user can quote it in a report. */
  requestId?: string | null;
  onRetry?: () => void;
}

export function ErrorState({ title, detail, requestId, onRetry }: ErrorStateProps) {
  return (
    <div
      // `alert` so assistive tech announces a failure the user did not trigger.
      role="alert"
      className="flex flex-col items-center justify-center rounded-card border border-critical-muted bg-critical-muted/10 px-6 py-14 text-center"
    >
      <AlertTriangle className="size-8 text-critical" aria-hidden="true" />
      <h3 className="mt-4 text-base font-semibold text-content-primary">{title}</h3>
      <p className="mt-1.5 max-w-lg text-sm text-content-secondary">{detail}</p>
      {requestId ? (
        <p className="mt-3 font-mono text-2xs text-content-faint">request id: {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
