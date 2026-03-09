import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormpackIntroGate from '../../src/components/FormpackIntroGate';

const renderGate = (onConfirm: () => void) =>
  render(
    <FormpackIntroGate
      title="Hinweise"
      body="**Text**"
      checkboxLabel="Ich stimme zu"
      startButtonLabel="Weiter"
      onConfirm={onConfirm}
    />,
  );

describe('FormpackIntroGate', () => {
  it('keeps continue button disabled until checkbox is accepted', () => {
    const onConfirm = vi.fn();
    renderGate(onConfirm);

    const button = screen.getByRole('button', { name: 'Weiter' });
    const checkbox = screen.getByRole('checkbox', { name: 'Ich stimme zu' });

    expect(button).toBeDisabled();

    fireEvent.click(checkbox);
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
