'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-strong active:bg-accent font-semibold shadow-raised',
  secondary:
    'bg-surface-overlay text-content-primary ring-1 ring-inset ring-line-strong hover:bg-surface-hover',
  ghost: 'text-content-secondary hover:bg-surface-overlay hover:text-content-primary',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // 32px / 40px tall. `md` clears the 40px minimum comfortable touch target.
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
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
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Defaulted because an unspecified <button> inside a form submits it,
      // which is almost never what a caller means.
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-control transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
