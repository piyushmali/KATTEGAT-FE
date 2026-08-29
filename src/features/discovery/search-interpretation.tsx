'use client';

import { Check, Sliders, Sparkle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { CATEGORY_LABELS, type SearchInterpretation } from '../../lib/api/contract';
import { PROTOCOL_OPTIONS, TRAIT_OPTIONS, type DiscoveryState } from './use-discovery-params';

/**
 * How the marketplace read a request, shown before its results.
 *
 * Intent search is the one place this product could quietly become a black box: the
 * user types a sentence, agents appear, and nothing explains the relationship between
 * them. That is the same failure the classification panel exists to prevent, so it gets
 * the same treatment — the derived query is stated, every inference is listed in the
 * backend's own words, and the whole thing can be turned into ordinary filters the user
 * can then edit.
 *
 * `resolvedBy` is shown rather than hidden. `rules` means a deterministic engine matched
 * known vocabulary, which is repeatable and worth trusting; `ai-assisted` means a model
 * was involved and the reading is a guess. Those deserve different confidence, so the
 * user is told which one they got.
 */
export function SearchInterpretationPanel({
  interpretation,
  total,
  onApply,
}: {
  interpretation: SearchInterpretation;
  total: number | undefined;
  /** Materialises the derived query as ordinary, editable filters. */
  onApply: (patch: Partial<DiscoveryState>) => void;
}) {
  const { filters, explanation, resolvedBy } = interpretation;

  const protocolLabel =
    PROTOCOL_OPTIONS.find((option) => option.value === filters.protocol)?.label ??
    filters.protocol;

  // The derived query, as the chips a user would have set by hand to get this result.
  const derived: string[] = [
    filters.category ? CATEGORY_LABELS[filters.category] : null,
    protocolLabel,
    ...filters.traits.map(
      (trait) => TRAIT_OPTIONS.find((option) => option.value === trait)?.label ?? trait,
    ),
    filters.resolvedOnly ? 'Resolved metadata only' : null,
    filters.text ? `text “${filters.text}”` : null,
  ].filter((entry): entry is string => entry !== null);

  return (
    <section
      aria-label="How this request was read"
      className="rounded-card border border-line bg-surface-inset/70 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="size-3 text-amber" aria-hidden="true" />
            Read as a request
          </p>

          {derived.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {derived.map((entry) => (
                <Badge key={entry} tone="amber">
                  {entry}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">
              Nothing specific was recognised, so every agent was searched.
            </p>
          )}
        </div>

        {/*
         * Provenance. `rules` is repeatable and says so; anything model-assisted is
         * labelled a guess, because the difference changes how much to trust it.
         */}
        <Badge
          tone={resolvedBy === 'rules' ? 'neutral' : 'info'}
          title={
            resolvedBy === 'rules'
              ? 'Matched deterministically against known vocabulary — the same request always reads the same way.'
              : 'A model helped interpret this request, so the reading is an inference rather than a rule.'
          }
        >
          {resolvedBy === 'rules' ? 'Deterministic' : 'Model-assisted'}
        </Badge>
      </div>

      {/* The backend's own account, rendered verbatim rather than paraphrased here. */}
      {explanation.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {explanation.map((line) => (
            <li key={line} className="flex gap-2.5 text-2xs leading-5 text-ink-muted">
              <Check className="mt-0.5 size-3 shrink-0 text-amber-dim" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            /*
             * Hands control back. The derived query becomes ordinary URL filter state,
             * so the user can correct one wrong inference instead of rephrasing the
             * whole sentence and hoping — and the result stays shareable.
             */
            onApply({
              q: filters.text ?? '',
              category: filters.category,
              protocol: filters.protocol,
              traits: filters.traits,
              resolvedOnly: filters.resolvedOnly,
            });
          }}
        >
          <Sliders className="size-3.5" aria-hidden="true" />
          Edit as filters
        </Button>
        <p className="text-2xs text-ink-faint">
          {total === 0
            ? 'Nothing matched this reading — edit the filters to widen it.'
            : 'Adjust any part of this reading if it misread you.'}
        </p>
      </div>
    </section>
  );
}
