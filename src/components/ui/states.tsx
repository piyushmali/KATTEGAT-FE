import type { CSSProperties, ReactNode } from 'react';
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

/**
 * Matches AgentCard's footprint, to avoid layout shift on load.
 *
 * This has to be kept in step with the card by hand, and the pairing is deliberate:
 * every measurement here mirrors a real one — `p-5`, the `size-10` mark, the serif name
 * block, the two clamped description lines, and the `py-3` evidence footer behind its
 * hairline. When the card's padding or footer changes, this changes with it, otherwise
 * the grid visibly jumps as data lands.
 */
export function AgentCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-card border border-line bg-surface-raised"
      /*
       * Inherited by every `.animate-skeleton` inside, which reads it as its
       * `animation-delay`. A custom property is the mechanism because `animation-delay`
       * itself does not inherit — setting it on this wrapper would do nothing.
       */
      style={delay > 0 ? ({ '--skeleton-delay': `${String(delay)}ms` } as CSSProperties) : undefined}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="size-10 rounded-control" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* The serif name: one tall bar, since it is the card's dominant element. */}
        <Skeleton className="mt-4 h-5 w-3/4" />
        <Skeleton className="mt-2.5 h-2.5 w-2/5" />
        <div className="mt-4 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="mt-4 h-3 w-3/5" />
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-3 w-10" />
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">Loading agents…</span>
      {Array.from({ length: count }, (_, index) => (
        /*
         * Staggered so the grid resolves as a wave rather than pulsing in unison. A
         * dozen cards blinking on the same frame reads as a broken screen; a slight
         * offset reads as loading. Wrapped at six steps so late cards never lag
         * visibly behind the first row.
         */
        <AgentCardSkeleton key={index} delay={(index % 6) * 90} />
      ))}
    </div>
  );
}

/** Mirrors the agent profile so the page does not reflow when data arrives. */
export function AgentProfileSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" role="status">
      <span className="sr-only">Loading agent…</span>
      <div className="space-y-5">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-start gap-5">
          <Skeleton className="size-20 rounded-panel" />
          <div className="flex-1 space-y-4 pt-1">
            {/* The display-serif name, which dominates the real header. */}
            <Skeleton className="h-10 w-96 max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-panel" />
          <Skeleton className="h-52 rounded-panel" />
          <Skeleton className="h-44 rounded-panel" />
        </div>
        <Skeleton className="h-72 rounded-panel" />
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
        /*
         * Dashed, and inset rather than raised — an empty result should read as a hollow
         * in the page, not as a card containing the word "nothing". The title is set in
         * the display serif because these are moments the product speaks to the user
         * directly, and they deserve the same voice as the rest of it.
         */
        'flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface-inset px-6 py-20 text-center',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-control border border-line bg-surface-overlay/60">
        <Icon className="size-4 text-ink-faint" aria-hidden="true" />
      </div>
      <h3 className="display mt-5 text-xl text-ink">{title}</h3>
      <p className="mt-2.5 max-w-md text-xs leading-6 text-ink-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
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
        'flex flex-col items-center justify-center rounded-panel border border-critical/25 bg-critical-wash/12 px-6 py-18 text-center',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-control border border-critical/25 bg-critical-wash/40">
        <Icon className="size-4 text-critical" aria-hidden="true" />
      </div>
      <h3 className="display mt-5 text-xl text-ink">{title}</h3>
      <p className="mt-2.5 max-w-lg text-xs leading-6 text-ink-secondary">{detail}</p>
      {requestId ? (
        // Quotable in a bug report. Mono, and dim enough not to alarm.
        <p className="mt-4 font-mono text-3xs text-ink-faint">ref {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-7" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
