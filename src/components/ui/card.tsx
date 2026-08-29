import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

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
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'raised' | 'inset' | 'flat';
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  const tones = {
    raised: 'bg-surface-raised border-line',
    inset: 'bg-surface-inset border-line',
    flat: 'bg-transparent border-line',
  } as const;

  return <Tag className={cn('rounded-panel border', tones[tone], className)}>{children}</Tag>;
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
  className,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="eyebrow">{title}</h2>
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
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-1 px-4 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4 sm:px-5',
        className,
      )}
    >
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-xs leading-6 text-ink-secondary">{children}</dd>
    </div>
  );
}
