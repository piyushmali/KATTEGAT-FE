'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // Amber is the single primary action per view. More than one and it stops meaning anything.
  primary:
    'bg-amber text-amber-ink font-semibold hover:bg-amber-bright active:bg-amber shadow-pop',
  secondary:
    'bg-surface-overlay text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover hover:ring-line-strong',
  ghost: 'text-ink-secondary hover:bg-surface-overlay hover:text-ink',
  danger: 'bg-critical-wash/50 text-critical ring-1 ring-inset ring-critical/30 hover:bg-critical-wash',
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
        'inline-flex shrink-0 items-center justify-center transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
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
