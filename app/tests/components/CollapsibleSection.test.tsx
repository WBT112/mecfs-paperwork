import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CollapsibleSection from '../../src/components/CollapsibleSection';

const ARIA_EXPANDED = 'aria-expanded';

describe('CollapsibleSection', () => {
  it('toggles content visibility on click', () => {
    render(
      <CollapsibleSection id="medical" title="Medical" className="custom">
        <p>Section content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole('button', { name: 'Medical' });
    const content = screen.getByText('Section content').parentElement;

    expect(button).toHaveAttribute(ARIA_EXPANDED, 'false');
    expect(content).toHaveAttribute('hidden');

    fireEvent.click(button);

    expect(button).toHaveAttribute(ARIA_EXPANDED, 'true');
    expect(content).not.toHaveAttribute('hidden');
  });

  it('prevents double toggle when Space keydown is followed by keyup', () => {
    render(
      <CollapsibleSection id="symptoms" title="Symptoms">
        <p>Body</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole('button', { name: 'Symptoms' });

    fireEvent.keyDown(button, { code: 'Space' });
    expect(button).toHaveAttribute(ARIA_EXPANDED, 'true');

    fireEvent.keyUp(button, { code: 'Space' });
    expect(button).toHaveAttribute(ARIA_EXPANDED, 'true');

    fireEvent.keyUp(button, { code: 'Space' });
    expect(button).toHaveAttribute(ARIA_EXPANDED, 'false');
  });

  it('toggles on Enter keyup when no keydown toggle happened', () => {
    render(
      <CollapsibleSection id="medication" title="Medication">
        <p>Body</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole('button', { name: 'Medication' });

    fireEvent.keyUp(button, { code: 'Enter' });
    expect(button).toHaveAttribute(ARIA_EXPANDED, 'true');
  });

  it('ignores unrelated keyboard keys', () => {
    render(
      <CollapsibleSection id="notes" title="Notes" defaultOpen>
        <p>Body</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole('button', { name: 'Notes' });

    fireEvent.keyDown(button, { code: 'KeyA' });
    fireEvent.keyUp(button, { code: 'KeyA' });

    expect(button).toHaveAttribute(ARIA_EXPANDED, 'true');
  });
});
