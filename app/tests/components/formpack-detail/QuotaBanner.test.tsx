import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuotaBanner from '../../../src/pages/formpack-detail/QuotaBanner';

describe('QuotaBanner', () => {
  it('shows warning text for warning status and triggers dismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <QuotaBanner
        status="warning"
        warningText="Storage is nearly full."
        errorText="Storage is full."
        dismissLabel="Dismiss"
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Storage is nearly full.')).toBeInTheDocument();
    expect(screen.queryByText('Storage is full.')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows error text for error status', () => {
    render(
      <QuotaBanner
        status="error"
        warningText="Storage is nearly full."
        errorText="Storage is full."
        dismissLabel="Dismiss"
        onDismiss={() => undefined}
      />,
    );

    expect(screen.getByText('Storage is full.')).toBeInTheDocument();
  });
});
