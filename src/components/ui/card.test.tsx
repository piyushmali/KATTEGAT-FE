import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataRow, Panel, PanelHeader, SectionRule } from './card';

/**
 * The hierarchy primitives, tested for the part that is invisible.
 *
 * `weight` is a visual decision and not worth asserting — a class list tells you nothing
 * about whether a page reads well. The document outline is different. Grouping the profile
 * behind section rules only helps someone using a screen reader if the levels nest, and
 * getting that wrong looks identical to getting it right. It is exactly the kind of thing
 * that rots the next time a panel is moved between tiers.
 */

describe('SectionRule', () => {
  it('is a real heading, so a section can be labelled by it', () => {
    render(<SectionRule label="Evidence" />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Evidence' });
    // The id is what `aria-labelledby` on the surrounding section points at.
    expect(heading).toHaveAttribute('id', 'evidence');
  });

  it('slugs a label with punctuation into a usable id', () => {
    render(<SectionRule label="KATTEGAT’s reading" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'kattegat-s-reading');
  });

  it('takes an explicit id, since a label can change without breaking the reference', () => {
    render(<SectionRule label="Reference" id="tier-reference" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'tier-reference');
  });
});

describe('PanelHeader', () => {
  it('is an h2 by default', () => {
    render(<PanelHeader title="Interface" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Interface' })).toBeInTheDocument();
  });

  it('drops to h3 inside a grouped tier, so the outline nests instead of flattening', () => {
    render(
      <section aria-labelledby="tier-evidence">
        <SectionRule id="tier-evidence" label="Evidence" />
        <Panel weight="lead">
          <PanelHeader level={3} title="Interface" />
        </Panel>
      </section>,
    );

    const headings = screen.getAllByRole('heading');
    // h2 then h3: a group and a thing inside it, not two siblings.
    expect(headings.map((heading) => heading.tagName)).toEqual(['H2', 'H3']);
  });
});

describe('Panel', () => {
  it('renders the tag it is asked for, so a section stays a section', () => {
    render(
      <Panel as="section" weight="quiet">
        <p>content</p>
      </Panel>,
    );

    expect(screen.getByText('content').closest('section')).not.toBeNull();
  });
});

describe('DataRow', () => {
  it('keeps its label and value associated as a definition pair', () => {
    render(
      <dl>
        <DataRow label="Owner" bare>
          0x1234
        </DataRow>
      </dl>,
    );

    const label = screen.getByText('Owner');
    expect(label.tagName).toBe('DT');
    expect(screen.getByText('0x1234').tagName).toBe('DD');
  });
});
