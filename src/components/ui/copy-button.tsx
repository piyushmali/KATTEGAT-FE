'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

/**
 * Copies a value and confirms it inline.
 *
 * Addresses and agent ids are the values a user most needs to move somewhere else,
 * and re-selecting a truncated address by hand is the small friction that makes an
 * explorer feel unfinished.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** What is being copied, for the screen-reader label. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1600);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        // Clipboard access can be denied; a failed copy should do nothing visible
        // rather than claim success.
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
          })
          .catch(() => undefined);
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : 'Copy'}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-surface-overlay hover:text-ink-secondary',
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-positive" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {/* Announced politely so the confirmation is not silent to a screen reader. */}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
