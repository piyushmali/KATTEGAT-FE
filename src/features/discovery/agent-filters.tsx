'use client';

import { useState } from 'react';
import { Check, ChevronDown, ListFilter, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { InlineSpinner } from '../../components/ui/states';
import { cn } from '../../lib/utils/cn';
import { formatCount } from '../../lib/utils/format';
import type { Category } from '../../lib/api/contract';
import { LAUNCH_CATEGORIES } from '../../lib/api/contract';
import {
  PROTOCOL_OPTIONS,
  SORT_OPTIONS,
  TRAIT_OPTIONS,
  type DiscoveryState,
} from './use-discovery-params';

/**
 * Marketplace filter controls.
 *
 * Structured rather than a wall of pills: categories are the primary axis and get
 * their own row with counts; protocol, traits and sort are secondary and collapse
 * behind a disclosure so the default view stays calm.
 *
 * The category row is the interesting part. The taxonomy contains categories with
 * zero indexed agents, and showing those as ordinary options makes the marketplace
 * look broken when a user clicks one and gets nothing. So:
 *  - categories with agents are offered normally, with their count
 *  - the four launch categories are always kept visible even at zero, because they
 *    are the product's declared scope — but marked as awaiting agents and disabled
 *  - any other empty category is simply omitted
 */

export interface AgentFiltersProps {
  state: DiscoveryState;
  categories: Category[] | undefined;
  totalForQuery: number | undefined;
  /** A background refetch is in flight. Shown beside the count it is about to change. */
  isRefetching?: boolean;
  hasFilters: boolean;
  onUpdate: (patch: Partial<DiscoveryState>) => void;
  onToggleTrait: (trait: string) => void;
  onClear: () => void;
}

export function AgentFilters({
  state,
  categories,
  totalForQuery,
  isRefetching = false,
  hasFilters,
  onUpdate,
  onToggleTrait,
  onClear,
}: AgentFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const populated = (categories ?? []).filter(
    (category) => category.agentCount > 0 && category.id !== 'uncategorized',
  );
  const uncategorized = (categories ?? []).find((category) => category.id === 'uncategorized');
  const awaiting = (categories ?? []).filter(
    (category) =>
      category.agentCount === 0 && (LAUNCH_CATEGORIES as readonly string[]).includes(category.id),
  );

  /*
   * Counts only what the disclosure hides, so the badge matches what opening it reveals.
   * Protocol is excluded now that it has its own visible row, and `resolvedOnly` counts
   * when it is off, because on is the default.
   */
  const advancedCount = state.traits.length + (state.resolvedOnly ? 0 : 1);

  const activeCategory = (categories ?? []).find((category) => category.id === state.category);

  return (
    <div className="space-y-5">
      {/* ------------------------------- the answer ---------------------------- */}
      {/*
       * The count leads the toolbar.
       *
       * It is the answer to whatever the user just did, and it used to be set in 11px text
       * in the bottom-right corner beneath four rows of controls — the least prominent thing
       * on a screen whose entire purpose is to report it. At display scale it becomes the
       * anchor the rest of the toolbar hangs off, and the line beneath it states in words
       * which slice of the registry is being counted, so the figure can never be mistaken
       * for the size of the whole index.
       */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0" role="status">
          {totalForQuery === undefined ? (
            // Reserves the line's height so the toolbar does not jump when the count lands.
            <p className="display text-display-sm text-ink-faint/40" aria-hidden="true">
              —
            </p>
          ) : (
            <p className="display tabular text-display-sm text-ink">
              {formatCount(totalForQuery)}{' '}
              <span className="text-base text-ink-muted">
                {totalForQuery === 1 ? 'agent' : 'agents'}
              </span>
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-faint">
            <span>{activeCategory ? activeCategory.label : 'Every category'}</span>
            <span className="text-line-strong" aria-hidden="true">
              /
            </span>
            <span>{state.hasEndpoint && state.protocol === null ? 'with an endpoint' : 'any interface'}</span>
            {isRefetching ? <InlineSpinner label="Updating" /> : null}
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-2">
          <span className="eyebrow">Order</span>
          <select
            value={state.sort}
            onChange={(event) => {
              onUpdate({ sort: event.target.value as DiscoveryState['sort'] });
            }}
            className="rounded-control border border-line bg-surface-raised px-2.5 py-1.5 text-2xs text-ink-secondary transition-colors hover:bg-surface-overlay focus:border-amber-dim focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------------------------- category axis --------------------------- */}
      {/*
       * Typographic tabs on one scrolling line, not filled pills on three wrapped rows.
       *
       * Twelve filled chips made the primary axis read as a tag cloud: every option carried
       * a border and a fill, so none of them carried emphasis, and selection had to compete
       * with eleven other boxes to be seen. Tabs invert that — the row is quiet type, and the
       * selected one is the only thing in it wearing metal. It is also how a magazine sets a
       * contents bar, which is the register this product is written in.
       */}
      <div
        className="rail items-stretch gap-6 border-b border-line"
        role="group"
        aria-label="Filter by category"
      >
        <CategoryTab
          active={state.category === null}
          onClick={() => {
            onUpdate({ category: null });
          }}
        >
          All agents
        </CategoryTab>

        {populated.map((category) => (
          <CategoryTab
            key={category.id}
            active={state.category === category.id}
            count={category.agentCount}
            title={category.description}
            onClick={() => {
              onUpdate({ category: state.category === category.id ? null : category.id });
            }}
          >
            {category.label}
          </CategoryTab>
        ))}

        {uncategorized && uncategorized.agentCount > 0 ? (
          <CategoryTab
            active={state.category === 'uncategorized'}
            count={uncategorized.agentCount}
            title={uncategorized.description}
            muted
            onClick={() => {
              onUpdate({ category: state.category === 'uncategorized' ? null : 'uncategorized' });
            }}
          >
            Unclassified
          </CategoryTab>
        ) : null}
      </div>

      {/*
       * Launch categories with no agents yet. Kept visible because they are the
       * product's declared scope, but disabled so a click cannot lead to an empty
       * grid that reads as a bug.
       */}
      {awaiting.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-3xs text-ink-faint">
          <span>Awaiting agents:</span>
          {awaiting.map((category) => (
            <span
              key={category.id}
              title={`${category.description} No agents indexed in this category yet.`}
              className="rounded-sm border border-dashed border-line px-1.5 py-0.5"
            >
              {category.label}
            </span>
          ))}
        </p>
      ) : null}

      {/* ---------------------------- interface axis --------------------------- */}
      {/*
       * Promoted out of the disclosure, because it is the second question a visitor has
       * and it was two clicks deep.
       *
       * Roughly half the registry has a resolved registration file that declares no
       * endpoint at all. Those entries are real and stay in the catalogue, but someone
       * looking for an agent they can actually call had no visible way to say so, which
       * made the grid feel like it was full of empty records with no recourse.
       */}
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
        role="group"
        aria-label="Filter by interface"
      >
        <span className="eyebrow shrink-0">Interface</span>
        {/*
         * Two unfiltered states rather than one, because "no protocol selected" now covers two
         * different questions. "Has endpoint" is the default view and asks for agents there is
         * something to call; "Any" is the whole registry including the 156,665 entries that
         * published nowhere to reach them.
         */}
        <Chip
          size="sm"
          active={state.protocol === null && state.hasEndpoint}
          onClick={() => {
            onUpdate({ protocol: null, hasEndpoint: true });
          }}
        >
          Has endpoint
        </Chip>
        <Chip
          size="sm"
          active={state.protocol === null && !state.hasEndpoint}
          onClick={() => {
            onUpdate({ protocol: null, hasEndpoint: false });
          }}
        >
          Any
        </Chip>
        {PROTOCOL_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            active={state.protocol === option.value}
            muted={option.value === 'unconfigured'}
            onClick={() => {
              // Naming a protocol already implies an endpoint, and `unconfigured` means the
              // opposite of one, so both clear the broader flag rather than fighting it.
              onUpdate({
                protocol: state.protocol === option.value ? null : option.value,
                hasEndpoint: state.protocol === option.value,
              });
            }}
          >
            {option.label}
          </Chip>
        ))}

        <span className="grow" aria-hidden="true" />

        {/*
         * Filters and Clear ride on the end of the interface line rather than getting a
         * bordered row of their own. Two controls did not justify a third horizontal rule
         * across the page, and the toolbar reads as three bands instead of five.
         */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdvancedOpen((open) => !open);
            }}
            aria-expanded={advancedOpen}
            className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface-raised px-2.5 py-1.5 text-2xs font-medium text-ink-secondary transition-colors hover:bg-surface-overlay"
          >
            <ListFilter className="size-3" aria-hidden="true" />
            Filters
            {advancedCount > 0 ? (
              <span className="rounded-sm bg-amber px-1 font-semibold text-amber-ink">
                {advancedCount}
              </span>
            ) : null}
            <ChevronDown
              className={cn('size-3 transition-transform', advancedOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          {hasFilters ? (
            <Button variant="ghost" size="xs" onClick={onClear}>
              <X className="size-3" aria-hidden="true" />
              Clear all
            </Button>
          ) : null}
        </div>

      </div>

      {advancedOpen ? (
        <div className="animate-rise space-y-4 rounded-card border border-line bg-surface-inset p-4">
          {/* Protocol lives in the always-visible row above, so it is not repeated here. */}
          <FilterGroup label="Declared traits">
            {TRAIT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                size="sm"
                active={state.traits.includes(option.value)}
                onClick={() => {
                  onToggleTrait(option.value);
                }}
              >
                {state.traits.includes(option.value) ? (
                  <Check className="size-2.5" aria-hidden="true" />
                ) : null}
                {option.label}
              </Chip>
            ))}
          </FilterGroup>

          {/*
           * Phrased as an opt-in to see more, because complete records are the default.
           * "Metadata resolved" described our pipeline; this describes what the user gets.
           */}
          <FilterGroup label="Record completeness">
            <Chip
              size="sm"
              active={!state.resolvedOnly}
              title="Also show agents whose off-chain registration file has not resolved. These have a verified on-chain identity but no name, description or endpoint yet."
              onClick={() => {
                onUpdate({ resolvedOnly: state.resolvedOnly ? false : true });
              }}
            >
              {state.resolvedOnly ? null : <Check className="size-2.5" aria-hidden="true" />}
              Include partial records
            </Chip>
          </FilterGroup>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * A category on the primary axis.
 *
 * Type on a shared baseline rule, with the selected one carrying a metal underline that
 * sits on that rule. No border, no fill, no radius — the emphasis is a mark under a word
 * rather than a box around it, which is what lets twelve of these sit in one line without
 * the row becoming a wall.
 *
 * The count rides small and tabular beside the label rather than inside a pill, so the
 * numbers form their own quiet column down the rail as the eye scans across.
 */
function CategoryTab({
  active,
  onClick,
  children,
  count,
  title,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  title?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'group relative shrink-0 pb-2.5 text-xs whitespace-nowrap transition-colors duration-200',
        active
          ? 'text-amber'
          : muted
            ? 'text-ink-faint hover:text-ink-muted'
            : 'text-ink-muted hover:text-ink',
      )}
    >
      <span className={active ? 'font-medium' : undefined}>{children}</span>
      {count !== undefined ? (
        <span className={cn('tabular ml-1.5 text-3xs', active ? 'text-amber/60' : 'text-ink-faint')}>
          {formatCount(count)}
        </span>
      ) : null}
      {/*
       * Drawn at -1px so it lands on the rail's own bottom border rather than above it,
       * which is the difference between an underline and a floating dash.
       */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -bottom-px left-0 h-px w-full transition-[opacity,background-color] duration-200',
          active ? 'bg-amber opacity-100' : 'bg-line-strong opacity-0 group-hover:opacity-100',
        )}
      />
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
  count,
  title,
  muted,
  size = 'md',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  title?: string;
  muted?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      // Selection is announced, not just coloured.
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border font-medium transition-colors',
        size === 'sm' ? 'px-2 py-1 text-3xs' : 'px-2.5 py-1.5 text-2xs',
        active
          ? 'border-amber-dim bg-amber-wash/50 text-amber'
          : muted
            ? 'border-line bg-transparent text-ink-faint hover:bg-surface-raised hover:text-ink-muted'
            : 'border-line bg-surface-raised text-ink-secondary hover:bg-surface-overlay hover:text-ink',
      )}
    >
      {children}
      {count !== undefined ? (
        <span className={cn('tabular', active ? 'text-amber/70' : 'text-ink-faint')}>
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  );
}
