import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, resolving Tailwind conflicts so a caller-supplied class
 * reliably beats a component default (`p-2` + `p-4` collapses to `p-4` rather
 * than emitting both and leaving the winner to source order).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
