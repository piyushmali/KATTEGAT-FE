import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Panel primitive.
 *
 * Separation comes from a hairline border, not a shadow — stacked shadows are what
 * makes a dark interface look like a template. `inset` is for content wells inside a
 * panel; `raised` is the default surface.
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

  return (
    <Tag className={cn('rounded-panel border', tones[tone], className)}>{children}</Tag>
  );
}

/**
 * Panel header with an eyebrow label and optional trailing control.
 *
 * Consistent section framing is what makes a long profile page scannable — the eye
 * learns where to find the label and where to find the action.
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
        'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="eyebrow">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Label/value row. Used for on-chain identity and any dense fact list. */
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
        'grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4 sm:px-5',
        className,
      )}
    >
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-xs text-ink-secondary">{children}</dd>
    </div>
  );
}
