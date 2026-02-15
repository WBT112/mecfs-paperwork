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
  it('keeps continue button disabled until scrolled to bottom and accepted', () => {
    const onConfirm = vi.fn();
    renderGate(onConfirm);

    const button = screen.getByRole('button', { name: 'Weiter' });
    const checkbox = screen.getByRole('checkbox', { name: 'Ich stimme zu' });
    const content = document.querySelector('.formpack-intro-gate__content');
    expect(content).not.toBeNull();
    if (!content) {
      return;
    }

    expect(button).toBeDisabled();
    fireEvent.click(checkbox);
    expect(button).toBeDisabled();

    Object.defineProperty(content, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(content, 'clientHeight', {
      value: 400,
      configurable: true,
    });

    Object.defineProperty(content, 'scrollTop', {
      value: 300,
      configurable: true,
    });
    fireEvent.scroll(content);
    expect(button).toBeDisabled();

    Object.defineProperty(content, 'scrollTop', {
      value: 590,
      configurable: true,
    });
    fireEvent.scroll(content);

    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
