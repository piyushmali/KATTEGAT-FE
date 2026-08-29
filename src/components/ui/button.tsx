'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Button primitive.
 *
 * Four variants, and the restraint is the design: amber is the single primary action
 * per view, and more than one stops it meaning anything. Everything else recedes.
 *
 * Motion is a press, not a bounce. `active:translate-y-px` with a shadow that collapses
 * on the same frame reads as a physical key going down — enough feedback to feel
 * mechanical, short enough that a fast clicker never waits for it. Interface feedback
 * uses the quick easing; the long cinematic curve belongs to scroll reveals, not to
 * something the hand is touching.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  /*
   * The one warm light. Antique gold rather than brand yellow, with a shadow that
   * deepens on hover so the key appears to rise before it is pressed.
   */
  primary:
    'bg-amber text-amber-ink font-semibold shadow-pop hover:bg-amber-bright hover:shadow-float active:shadow-none',
  /*
   * Weathered metal: a translucent fill over whatever surface it sits on, held by a
   * hairline. Translucent rather than solid so it belongs to its panel instead of
   * cutting a lighter rectangle into it.
   */
  secondary:
    'bg-surface-overlay/70 text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover hover:ring-line-strong active:bg-surface-overlay',
  ghost: 'text-ink-muted hover:bg-surface-overlay/60 hover:text-ink',
  danger:
    'bg-critical-wash/45 text-critical ring-1 ring-inset ring-critical/30 hover:bg-critical-wash hover:ring-critical/45',
};

const SIZES: Record<ButtonSize, string> = {
  // Heights: 28 / 32 / 38 / 44px. `md` and up clear a comfortable touch target.
  xs: 'h-7 px-2 text-2xs gap-1 rounded-sm',
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-control',
  md: 'h-[2.375rem] px-3.5 text-sm gap-2 rounded-control',
  lg: 'h-11 px-5 text-sm gap-2 rounded-control',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  // Defaulted because an unspecified <button> inside a form submits it, which is
  // almost never what the caller meant.
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
        // Only the properties that actually change, so this never animates layout.
        'transition-[background-color,color,box-shadow,transform,--tw-ring-color] duration-200 ease-out-quart',
        'active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
