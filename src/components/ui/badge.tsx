import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Compact label for categorical metadata.
 *
 * Tone is semantic, not decorative: `positive`/`caution`/`critical` are reserved
 * for state a user should act on, so a protocol tag uses `neutral` and only
 * genuine signals get colour.
 */

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-overlay text-content-secondary ring-line-subtle',
  accent: 'bg-accent-muted/25 text-accent ring-accent-muted/50',
  positive: 'bg-positive-muted/25 text-positive ring-positive-muted/50',
  caution: 'bg-caution-muted/25 text-caution ring-caution-muted/50',
  critical: 'bg-critical-muted/25 text-critical ring-critical-muted/50',
  info: 'bg-info-muted/25 text-info ring-info-muted/50',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  /** Announced by screen readers in place of the visible text. */
  'aria-label'?: string;
  title?: string;
}

export function Badge({ children, tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-2xs font-medium ring-1 ring-inset whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
