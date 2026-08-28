import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RotateCw, SearchX, ServerCrash } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './button';

/**
 * Loading, empty and error states as first-class components.
 *
 * A marketplace fronting a chain index spends much of its real life in one of these:
 * an unsynced database, an unreachable RPC, a filter that matches nothing. Treating
 * them as designed states rather than fallbacks is most of what separates this from a
 * scaffold.
 *
 * Skeletons mirror the real layout so nothing shifts when data lands.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-skeleton rounded-sm bg-surface-overlay', className)}
      aria-hidden="true"
    />
  );
}

/** Matches AgentCard's footprint exactly, to avoid layout shift on load. */
export function AgentCardSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-control" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3.5 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    </div>
  );
}

export function AgentGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      // Announced once for the whole grid, not once per card.
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">Loading agents…</span>
      {Array.from({ length: count }, (_, index) => (
        <AgentCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Mirrors the agent profile so the page does not reflow when data arrives. */
export function AgentProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" role="status">
      <span className="sr-only">Loading agent…</span>
      <div className="flex items-start gap-4">
        <Skeleton className="size-20 rounded-panel" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-panel" />
          <Skeleton className="h-52 rounded-panel" />
        </div>
        <Skeleton className="h-64 rounded-panel" />
      </div>
    </div>
  );
}

export function InlineSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted" role="status">
      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}

/* --------------------------------- empty ---------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = SearchX,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: typeof SearchX;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface-inset px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-control bg-surface-overlay">
        <Icon className="size-4 text-ink-faint" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- error ---------------------------------- */

export interface ErrorStateProps {
  title: string;
  detail: string;
  /** Diagnostic id from the API, so a user can quote it in a report. */
  requestId?: string | null;
  onRetry?: () => void;
  /** True when the failure is an upstream chain/RPC problem rather than ours. */
  upstream?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  detail,
  requestId,
  onRetry,
  upstream,
  className,
}: ErrorStateProps) {
  const Icon = upstream ? ServerCrash : AlertTriangle;

  return (
    <div
      // `alert` so assistive tech announces a failure the user did not trigger.
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-critical/25 bg-critical-wash/12 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-control bg-critical-wash/40">
        <Icon className="size-4 text-critical" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-lg text-xs leading-5 text-ink-secondary">{detail}</p>
      {requestId ? (
        <p className="mt-3 font-mono text-3xs text-ink-faint">ref {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
