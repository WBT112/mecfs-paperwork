import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfirmationDialog } from '../../src/components/useConfirmationDialog';

const results = vi.fn();

const DANGER_TITLE = 'Danger title';
const DANGER_MESSAGE = 'Danger message';
const DANGER_TRIGGER = 'Open danger';
const DANGER_CONFIRM_LABEL = 'Delete now';
const DANGER_CANCEL_LABEL = 'Cancel now';
const NODE_MESSAGE = 'node message';
const NODE_TITLE = 'Node title';
const NODE_TRIGGER = 'Open node';
const NODE_CONFIRM_LABEL = 'Continue';
const NODE_CANCEL_LABEL = 'Back';

function ConfirmationDialogHarness() {
  const { confirmationDialog, requestConfirmation } = useConfirmationDialog();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          requestConfirmation({
            title: DANGER_TITLE,
            message: DANGER_MESSAGE,
            confirmLabel: DANGER_CONFIRM_LABEL,
            cancelLabel: DANGER_CANCEL_LABEL,
            tone: 'danger',
          }).then(
            (confirmed) => {
              results('danger', confirmed);
            },
            () => undefined,
          );
        }}
      >
        {DANGER_TRIGGER}
      </button>
      <button
        type="button"
        onClick={() => {
          requestConfirmation({
            title: NODE_TITLE,
            message: <strong>{NODE_MESSAGE}</strong>,
            confirmLabel: NODE_CONFIRM_LABEL,
            cancelLabel: NODE_CANCEL_LABEL,
          }).then(
            (confirmed) => {
              results('node', confirmed);
            },
            () => undefined,
          );
        }}
      >
        {NODE_TRIGGER}
      </button>
      {confirmationDialog}
    </>
  );
}

describe('useConfirmationDialog', () => {
  beforeEach(() => {
    results.mockReset();
  });

  it('does not render a dialog before a confirmation is requested', () => {
    render(<ConfirmationDialogHarness />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a danger dialog and resolves false on cancel', async () => {
    render(<ConfirmationDialogHarness />);

    await userEvent.click(screen.getByRole('button', { name: DANGER_TRIGGER }));

    const dialog = await screen.findByRole('dialog', { name: DANGER_TITLE });
    expect(within(dialog).getByText(DANGER_MESSAGE)).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: DANGER_CONFIRM_LABEL }),
    ).toHaveClass('app__button--danger');

    await userEvent.click(
      within(dialog).getByRole('button', { name: DANGER_CANCEL_LABEL }),
    );

    await waitFor(() => {
      expect(results).toHaveBeenCalledWith('danger', false);
    });
    expect(screen.queryByRole('dialog', { name: DANGER_TITLE })).toBeNull();
  });

  it('renders ReactNode content and resolves true on confirm', async () => {
    render(<ConfirmationDialogHarness />);

    await userEvent.click(screen.getByRole('button', { name: NODE_TRIGGER }));

    const dialog = await screen.findByRole('dialog', { name: NODE_TITLE });
    expect(within(dialog).getByText(NODE_MESSAGE)).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: NODE_CONFIRM_LABEL }),
    ).not.toHaveClass('app__button--danger');

    await userEvent.click(
      within(dialog).getByRole('button', { name: NODE_CONFIRM_LABEL }),
    );

    await waitFor(() => {
      expect(results).toHaveBeenCalledWith('node', true);
    });
  });

  it('resolves the previous request as cancelled when a new request replaces it', async () => {
    render(<ConfirmationDialogHarness />);

    await userEvent.click(screen.getByRole('button', { name: DANGER_TRIGGER }));
    await userEvent.click(screen.getByRole('button', { name: NODE_TRIGGER }));

    await waitFor(() => {
      expect(results).toHaveBeenCalledWith('danger', false);
    });
    expect(
      await screen.findByRole('dialog', { name: NODE_TITLE }),
    ).toBeInTheDocument();
  });

  it('resolves pending confirmations as cancelled on unmount', async () => {
    const view = render(<ConfirmationDialogHarness />);

    await userEvent.click(screen.getByRole('button', { name: DANGER_TRIGGER }));
    view.unmount();

    await waitFor(() => {
      expect(results).toHaveBeenCalledWith('danger', false);
    });
  });
});
