'use client';

import Link from 'next/link';
import { ArrowUpRight, Gauge, Grid3x3, Scale, Sprout } from 'lucide-react';
import type { ComponentType } from 'react';
import { Skeleton } from '../../components/ui/states';
import { formatCount } from '../../lib/utils/format';
import { LAUNCH_CATEGORIES, CATEGORY_LABELS, type AgentCategoryId } from '../../lib/api/contract';
import { useCategories } from '../discovery/use-agents';
import { guidanceFor } from '../categories/category-guidance';

/**
 * The four Agent Studio categories, as the landing page's primary way in.
 *
 * "Find an agent by category" is the second step of the journey the marketplace is judged
 * on, and it was previously reachable only by going to Discover and finding the right chip
 * in a row of twelve. That buries the four categories the product is built around behind the
 * broad ones that happen to be larger.
 *
 * Equal treatment is deliberate and structural: one tile each, same size, same fields, in a
 * fixed order. Not sorted by agent count, because sorting by size would put Yield first and
 * Health Factor last every time, and a marketplace that ranks strategies by how many
 * entries it happened to index is making a recommendation it cannot support.
 *
 * The counts are real and some of them are small. Shown anyway. A visitor learning that BNB
 * Chain has 120 grid agents and 44 health-factor monitors knows something true and useful;
 * hiding the number to avoid looking sparse would be the marketing move this product exists
 * not to make.
 */

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  rebalancing: Scale,
  'grid-trading': Grid3x3,
  'yield-optimization': Sprout,
  'health-factor-monitoring': Gauge,
};

export function LaunchCategories() {
  const { data, isLoading, isError } = useCategories();

  // Degrades to nothing rather than a broken frame on the first screen a visitor sees.
  if (isError) return null;

  const byId = new Map((data?.data ?? []).map((entry) => [entry.id, entry]));

  return (
    <ul className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
      {LAUNCH_CATEGORIES.map((id) => (
        <CategoryTile
          key={id}
          id={id}
          count={byId.get(id)?.agentCount}
          isLoading={isLoading}
        />
      ))}
    </ul>
  );
}

function CategoryTile({
  id,
  count,
  isLoading,
}: {
  id: AgentCategoryId;
  count: number | undefined;
  isLoading: boolean;
}) {
  const guidance = guidanceFor(id);
  const Icon = ICONS[id] ?? Scale;

  return (
    <li className="bg-void">
      <Link
        href={`/categories/${id}`}
        className="group flex h-full flex-col p-5 transition-colors duration-300 hover:bg-surface-raised/50 sm:p-6"
      >
        {/*
         * The count leads, and the icon lost its badge.
         *
         * This row used to be split: an amber bordered box holding a glyph on the left, the
         * figure pushed to the right. The glyph won a 36px frame and the accent colour while
         * the only fact on the tile sat opposite it, right-aligned against nothing — and the
         * badge was the same icon-in-a-box device the empty, error and hiring surfaces have
         * all since dropped.
         *
         * So the tile reads top-down now: how many, of what, described, then the way in. The
         * glyph still helps four categories stay distinguishable at a glance, so it stays —
         * inline against the name, at the weight of a mark rather than a button.
         */}
        {isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="display tabular text-2xl leading-none text-ink">
            {formatCount(count ?? 0)}
          </p>
        )}
        <p className="eyebrow mt-2">{count === 1 ? 'agent' : 'agents'}</p>

        <h3 className="display mt-6 flex items-baseline gap-2 text-lg leading-tight text-ink transition-colors duration-300 group-hover:text-amber-bright">
          <Icon
            className="size-3.5 shrink-0 translate-y-px text-amber-dim transition-colors duration-300 group-hover:text-amber"
            aria-hidden="true"
          />
          {CATEGORY_LABELS[id]}
        </h3>

        <p className="mt-2.5 line-clamp-3 text-xs leading-6 text-ink-muted">
          {guidance?.summary ?? ''}
        </p>

        <span
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-2xs font-medium text-ink-faint transition-all duration-300 ease-fjord group-hover:gap-2 group-hover:text-amber"
          aria-hidden="true"
        >
          Browse and compare
          <ArrowUpRight className="size-3" />
        </span>
      </Link>
    </li>
  );
}
