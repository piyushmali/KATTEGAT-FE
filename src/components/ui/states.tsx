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
      {/*
       * Mirrors the profile's three tiers, not a flat stack.
       *
       * Kept in step by hand, and it drifted the moment the real page was retiered: the
       * body went to `space-y-14` groups behind section rules with a wider rail gutter,
       * while this still described one `space-y-4` column. The cost of that drift is the
       * whole reason this component exists — the page visibly jumped as data landed, which
       * is worse than no skeleton at all, because it looks like a second render rather
       * than a load.
       */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        <div className="space-y-14">
          {/* Evidence: a section rule, then three lead panels. */}
          <div className="space-y-4">
            <TierRuleSkeleton />
            <Skeleton className="h-40 rounded-panel" />
            <Skeleton className="h-52 rounded-panel" />
            <Skeleton className="h-44 rounded-panel" />
          </div>
          {/* KATTEGAT's reading. */}
          <div className="space-y-4">
            <TierRuleSkeleton />
            <Skeleton className="h-36 rounded-panel" />
          </div>
          {/* Reference: boxless, so bars rather than panels. */}
          <div className="space-y-4">
            <TierRuleSkeleton />
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </div>
  );
}

/** The label-on-a-rule that opens each tier of the profile. */
function TierRuleSkeleton() {
  return (
    <div className="flex items-baseline gap-4">
      <Skeleton className="h-2.5 w-20" />
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
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
         * A hollow in the page rather than a card containing the word "nothing": inset and
         * dashed, so the region reads as the shape results would have filled.
         *
         * Left-aligned, and that is the whole change. A boxed icon centred above centred
         * text over a centred button is the single most template-looking arrangement in
         * interface design — it is what every scaffold ships, and no amount of good type
         * inside it reads as authored. Setting it on the same left margin as the content
         * it replaced, with the title at display scale, makes it look like a page that has
         * something to say instead of a placeholder apologising.
         */
        'rounded-panel border border-dashed border-line-strong bg-surface-inset px-6 py-16 sm:px-10 sm:py-20',
        className,
      )}
    >
      {/*
       * The icon rides the eyebrow instead of sitting in a bordered badge above everything.
       * It still carries the distinction between "nothing matched" and "nothing exists",
       * and it no longer costs a 44px chrome element to say so.
       */}
      <p className="eyebrow flex items-center gap-2">
        <Icon className="size-3.5" aria-hidden="true" />
        Nothing here
      </p>
      <h3 className="display mt-4 max-w-reading text-display-sm text-ink">{title}</h3>
      <p className="mt-3 max-w-reading text-xs leading-6 text-ink-muted">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
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
        /*
         * Left-aligned for the same reason as the empty state, and with the critical wash
         * pulled back to a left edge rule instead of a full tinted panel. A page-wide red
         * box shouts about a condition the user usually cannot act on; a marked edge and a
         * plain explanation treat them as someone who can read.
         */
        'relative overflow-hidden rounded-panel border border-line bg-surface-inset px-6 py-14 sm:px-10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-critical/60 to-transparent"
      />
      <p className="eyebrow flex items-center gap-2 text-critical/80">
        <Icon className="size-3.5" aria-hidden="true" />
        {upstream ? 'Upstream failure' : 'Something failed'}
      </p>
      <h3 className="display mt-4 max-w-reading text-display-sm text-ink">{title}</h3>
      <p className="mt-3 max-w-reading text-xs leading-6 text-ink-secondary">{detail}</p>
      {requestId ? (
        // Quotable in a bug report. Mono, and dim enough not to alarm.
        <p className="mt-4 font-mono text-3xs text-ink-faint">ref {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-8" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
