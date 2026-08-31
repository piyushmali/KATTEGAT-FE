import { notFound } from 'next/navigation';
import { CategoryView } from '@/features/categories/category-view';
import { AGENT_CATEGORIES, CATEGORY_LABELS, type AgentCategoryId } from '@/lib/api/contract';

/**
 * A page per category.
 *
 * Validated against the taxonomy rather than passed through, so `/categories/nonsense` is a
 * 404 instead of an empty grid that looks like a broken filter.
 */

const isCategory = (value: string): value is AgentCategoryId =>
  (AGENT_CATEGORIES as readonly string[]).includes(value);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCategory(id)) return { title: 'Category not found' };

  return {
    title: `${CATEGORY_LABELS[id]} agents`,
    description: `Autonomous ${CATEGORY_LABELS[id]} agents indexed from the ERC-8004 registry on BNB Smart Chain, with the evidence behind every claim.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCategory(id)) notFound();

  return <CategoryView id={id} />;
}
