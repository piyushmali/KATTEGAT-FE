import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Compact label for categorical metadata.
 *
 * Tone is semantic, never decorative. `amber` marks the primary category and verified
 * on-chain facts; the state tones are reserved for things a user should act on.
 * Anything else is `neutral`, which is most things — a protocol tag is information, not
 * a signal.
 *
 * Visually these are engraved rather than printed: a hairline ring holds a very low
 * tint, so a card carrying six of them reads as one surface with markings on it instead
 * of six coloured stickers. Slight positive tracking, because a label this small needs
 * air more than it needs weight.
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
  neutral: 'bg-surface-overlay/60 text-ink-secondary ring-line',
  outline: 'bg-transparent text-ink-muted ring-line',
  amber: 'bg-amber-wash/30 text-amber ring-amber-dim/35',
  positive: 'bg-positive-wash/30 text-positive ring-positive/25',
  caution: 'bg-caution-wash/30 text-caution ring-caution/25',
  critical: 'bg-critical-wash/30 text-critical ring-critical/25',
  info: 'bg-info-wash/30 text-info ring-info/25',
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
        // Mono carries hashes and raw values, where tracking would hurt scanning.
        mono ? 'font-mono tracking-normal' : 'tracking-[0.01em]',
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
 * The dot carries the state as well as the colour, so the meaning survives for a user
 * who cannot distinguish the hues. A ring around the dot lifts it off dark ground —
 * 6px of saturated colour on near-black is otherwise easy to miss entirely.
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
    tone === 'positive'
      ? 'bg-positive ring-positive/20'
      : tone === 'caution'
        ? 'bg-caution ring-caution/20'
        : 'bg-ink-faint ring-ink-faint/20';

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-2xs text-ink-muted', className)}>
      <span
        className={cn('size-1.5 shrink-0 rounded-pill ring-2', dot, live && 'animate-live')}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
