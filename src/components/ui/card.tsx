import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * How much of the page a panel claims. Passed down from the composing page, because
 * prominence is relative and only the page knows what it is competing with.
 */
export type PanelWeight = 'lead' | 'default' | 'quiet';

/**
 * Panel primitive.
 *
 * Separation comes from a hairline, not a shadow — stacked shadows are what make a dark
 * interface look like a template. These read as architectural surfaces: flat planes
 * bounded by a drawn edge, the way a plan drawing describes a wall.
 *
 * `raised` is the default surface, `inset` is a content well inside a panel, and `flat`
 * borrows whatever is behind it — which is what to reach for when a section needs
 * structure without another visible box. Not every group of facts deserves a container,
 * and `flat` exists so the answer to "how do I frame this" can be "don't".
 */
export function Panel({
  children,
  className,
  tone = 'raised',
  weight = 'default',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'raised' | 'inset' | 'flat';
  /**
   * How much of the page this panel should claim.
   *
   * Exists because prominence is a decision the composing page has to make, and every
   * component here used to make it privately. A profile assembled from seven panels that
   * each declared themselves equally important read as a settings form: same border, same
   * fill, same radius, same small label, seven times down one column. Nothing was wrong
   * with any single panel and the page had no hierarchy at all.
   *
   * `lead` is for content a decision rests on. It takes the one-pixel lit edge the
   * surfaces already define, so the emphasis is a light catching a plane rather than
   * another border or a heavier fill.
   *
   * `quiet` is the important one: it removes the box. Reference material — addresses,
   * declared strings, registry traits — is worth keeping and not worth framing, and a
   * bordered card around it claims the same attention as the evidence above it. A single
   * top hairline is enough to separate a ledger section from the one before it.
   */
  weight?: PanelWeight;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  const tones = {
    raised: 'bg-surface-raised',
    inset: 'bg-surface-inset',
    flat: 'bg-transparent',
  } as const;

  const weights = {
    lead: 'lit-edge rounded-panel border border-line-strong shadow-pop',
    default: 'rounded-panel border border-line',
    // No frame, no fill, no radius: a ruled section rather than a card.
    quiet: 'border-t border-line',
  } as const;

  return (
    <Tag
      className={cn(weights[weight], weight === 'quiet' ? 'bg-transparent' : tones[tone], className)}
    >
      {children}
    </Tag>
  );
}

/** `Interface & endpoints` -> `interface-endpoints`, for heading ids. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Editorial section marker: a label sitting on a rule that runs to the page edge.
 *
 * The device that gives a long profile its rhythm. Grouping panels needs a heading, and a
 * heading inside another bordered header would have added an eighth box to a page whose
 * problem was already boxes. A label on a hairline is drawn architecture instead — the
 * same language as the survey grid behind the composition — and it costs one element.
 *
 * The rule fades rather than terminating, so it reads as a plane receding rather than a
 * table border. Renders a real `h2` and returns its id, so the section it introduces can
 * point at it with `aria-labelledby` and the grouping exists for a screen reader too, not
 * just visually.
 */
export function SectionRule({
  label,
  meta,
  id,
  className,
}: {
  label: string;
  /** Optional trailing note, e.g. a count or a provenance line. */
  meta?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-4', className)}>
      <h2 id={id ?? slugify(label)} className="eyebrow shrink-0">
        {label}
      </h2>
      <span
        aria-hidden="true"
        className="h-px min-w-6 flex-1 translate-y-[-0.2em] bg-gradient-to-r from-line-strong via-line to-transparent"
      />
      {meta ? <span className="shrink-0 text-2xs text-ink-faint">{meta}</span> : null}
    </div>
  );
}

/**
 * Panel header with an eyebrow label and optional trailing control.
 *
 * Consistent section framing is what makes a long profile page scannable — the eye
 * learns where to find the label and where to find the action, so it can skip whole
 * sections without reading them. That reliability is worth more here than variety.
 */
export function PanelHeader({
  title,
  hint,
  action,
  level = 2,
  bare = false,
  className,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  /**
   * Heading level. Drops to 3 when the panel sits inside a `SectionRule` group, so the
   * document outline matches the visual grouping instead of presenting a flat run of
   * sibling h2s that a screen reader cannot tell apart.
   */
  level?: 2 | 3;
  /** For `quiet` panels: no rule beneath and no horizontal inset, since there is no box. */
  bare?: boolean;
  className?: string;
}) {
  const Heading = level === 3 ? 'h3' : 'h2';

  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1',
        bare ? 'pt-5 pb-3' : 'border-b border-line px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="eyebrow">{title}</Heading>
        {hint ? <p className="mt-1.5 text-xs leading-5 text-ink-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Label/value row. Used for on-chain identity and any dense fact list.
 *
 * The label column is fixed so values align down the page into a readable column rather
 * than stepping in and out with each label's length. Below `sm` it stacks, because a
 * 11rem label column on a phone leaves nothing for the value.
 */
export function DataRow({
  label,
  children,
  bare = false,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Drops the horizontal inset, for rows in a `quiet` panel that has no box to inset from. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4',
        bare ? '' : 'px-4 sm:px-5',
        className,
      )}
    >
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-xs leading-6 text-ink-secondary">{children}</dd>
    </div>
  );
}
