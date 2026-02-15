import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormpackIntroModal from '../../src/components/FormpackIntroModal';

const MODAL_TITLE = 'Hinweise';
const CLOSE_LABEL = 'Schließen';

describe('FormpackIntroModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <FormpackIntroModal
        isOpen={false}
        title={MODAL_TITLE}
        body="Inhalt"
        closeLabel={CLOSE_LABEL}
        onClose={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders dialog and closes via close button and backdrop', () => {
    const onClose = vi.fn();
    render(
      <FormpackIntroModal
        isOpen
        title={MODAL_TITLE}
        body="Inhalt"
        closeLabel={CLOSE_LABEL}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: MODAL_TITLE });
    expect(dialog).toBeInTheDocument();

    const [backdropButton, closeButton] = screen.getAllByRole('button', {
      name: CLOSE_LABEL,
    });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(backdropButton).toHaveClass('formpack-intro-modal__backdrop');
    fireEvent.click(backdropButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
