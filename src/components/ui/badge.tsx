import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Compact label for categorical metadata.
 *
 * Tone is semantic, never decorative. `amber` marks the primary category and
 * verified on-chain facts; the state tones are reserved for things a user should act
 * on. Anything else is `neutral`, which is most things — a protocol tag is
 * information, not a signal.
 */

export type BadgeTone =
  | 'neutral'
  | 'outline'
  | 'amber'
  | 'positive'
  | 'caution'
  | 'critical'
  | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-overlay text-ink-secondary ring-line',
  outline: 'bg-transparent text-ink-muted ring-line',
  amber: 'bg-amber-wash/40 text-amber ring-amber-dim/40',
  positive: 'bg-positive-wash/40 text-positive ring-positive/25',
  caution: 'bg-caution-wash/40 text-caution ring-caution/25',
  critical: 'bg-critical-wash/40 text-critical ring-critical/25',
  info: 'bg-info-wash/40 text-info ring-info/25',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  mono?: boolean;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

export function Badge({ children, tone = 'neutral', mono, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap ring-1 ring-inset',
        mono && 'font-mono',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Status pill with a leading dot.
 *
 * The dot carries the state as well as the colour, so the meaning survives for a
 * user who cannot distinguish the hues.
 */
export function StatusDot({
  tone = 'neutral',
  label,
  live,
  className,
}: {
  tone?: 'positive' | 'caution' | 'neutral';
  label: string;
  live?: boolean;
  className?: string;
}) {
  const dot =
    tone === 'positive' ? 'bg-positive' : tone === 'caution' ? 'bg-caution' : 'bg-ink-faint';

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-2xs text-ink-muted', className)}>
      <span
        className={cn('size-1.5 shrink-0 rounded-pill', dot, live && 'animate-live')}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
