import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccessibleDialog } from '../../src/components/useAccessibleDialog';

type HarnessProps = {
  isOpen: boolean;
  onClose: () => void;
  showDialog?: boolean;
  renderOutside?: boolean;
  useInitialFocus?: boolean;
  includeFirstFocusable?: boolean;
  includeSecondFocusable?: boolean;
  includeHiddenFocusable?: boolean;
};

const DialogHarness = ({
  isOpen,
  onClose,
  showDialog = isOpen,
  renderOutside = true,
  useInitialFocus = false,
  includeFirstFocusable = true,
  includeSecondFocusable = true,
  includeHiddenFocusable = false,
}: HarnessProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleDialog({
    isOpen,
    dialogRef,
    onClose,
    initialFocusRef: useInitialFocus ? initialFocusRef : undefined,
  });

  return (
    <div>
      {renderOutside ? <button data-testid="outside">Outside</button> : null}
      {showDialog ? (
        <div role="dialog" tabIndex={-1} ref={dialogRef} data-testid="dialog">
          {includeFirstFocusable ? (
            <button data-testid="first">First</button>
          ) : null}
          {includeSecondFocusable ? (
            <button data-testid="last">Last</button>
          ) : null}
          {useInitialFocus ? (
            <button data-testid="preferred" ref={initialFocusRef}>
              Preferred
            </button>
          ) : null}
          {includeHiddenFocusable ? (
            <button data-testid="hidden" aria-hidden="true">
              Hidden
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const dispatchKey = (key: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
};

const flushOpenTimer = async () => {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
};

describe('useAccessibleDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('focuses the preferred initial target when present inside the dialog', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <DialogHarness isOpen onClose={onClose} useInitialFocus />,
    );

    await flushOpenTimer();

    expect(getByTestId('preferred')).toHaveFocus();
  });

  it('falls back to the first focusable element when no preferred target is provided', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<DialogHarness isOpen onClose={onClose} />);

    await flushOpenTimer();

    expect(getByTestId('first')).toHaveFocus();
  });

  it('focuses the dialog itself when no focusable elements are available', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <DialogHarness
        isOpen
        onClose={onClose}
        includeFirstFocusable={false}
        includeSecondFocusable={false}
        includeHiddenFocusable
      />,
    );

    await flushOpenTimer();

    const dialog = getByTestId('dialog');
    expect(dialog).toHaveFocus();

    const tabEvent = dispatchKey('Tab');
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(dialog).toHaveFocus();
  });

  it('cycles focus for Tab and Shift+Tab, including when focus starts outside the dialog', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<DialogHarness isOpen onClose={onClose} />);

    await flushOpenTimer();

    const first = getByTestId('first');
    const last = getByTestId('last');
    const outside = getByTestId('outside');

    last.focus();
    const tabFromLast = dispatchKey('Tab');
    expect(tabFromLast.defaultPrevented).toBe(true);
    expect(first).toHaveFocus();

    first.focus();
    const shiftTabFromFirst = dispatchKey('Tab', true);
    expect(shiftTabFromFirst.defaultPrevented).toBe(true);
    expect(last).toHaveFocus();

    outside.focus();
    const tabFromOutside = dispatchKey('Tab');
    expect(tabFromOutside.defaultPrevented).toBe(true);
    expect(first).toHaveFocus();

    outside.focus();
    const shiftTabFromOutside = dispatchKey('Tab', true);
    expect(shiftTabFromOutside.defaultPrevented).toBe(true);
    expect(last).toHaveFocus();
  });

  it('handles Escape and ignores non-Tab keys', async () => {
    const onClose = vi.fn();
    render(<DialogHarness isOpen onClose={onClose} />);

    await flushOpenTimer();

    const letterEvent = dispatchKey('a');
    expect(letterEvent.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    const escapeEvent = dispatchKey('Escape');
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the previously active element when dialog closes', async () => {
    const onClose = vi.fn();
    const { getByTestId, rerender } = render(
      <DialogHarness isOpen={false} onClose={onClose} showDialog={false} />,
    );

    const outside = getByTestId('outside');
    outside.focus();

    rerender(<DialogHarness isOpen onClose={onClose} />);
    await flushOpenTimer();

    rerender(
      <DialogHarness isOpen={false} onClose={onClose} showDialog={false} />,
    );

    expect(outside).toHaveFocus();
  });

  it('does not attempt to trap keys when the dialog ref is no longer available', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<DialogHarness isOpen onClose={onClose} />);

    await flushOpenTimer();

    rerender(<DialogHarness isOpen onClose={onClose} showDialog={false} />);

    dispatchKey('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns early when opened without a dialog element', () => {
    const onClose = vi.fn();
    render(<DialogHarness isOpen onClose={onClose} showDialog={false} />);

    dispatchKey('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to element.focus() when preventScroll focus is unsupported', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<DialogHarness isOpen onClose={onClose} />);
    const first = getByTestId('first') as HTMLButtonElement;

    const focusSpy = vi
      .spyOn(first, 'focus')
      .mockImplementationOnce(() => {
        throw new Error('focus options unsupported');
      })
      .mockImplementation(function (this: HTMLButtonElement) {
        HTMLElement.prototype.focus.call(this);
      });

    await flushOpenTimer();

    expect(first).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledTimes(2);
  });

  it('handles Tab when document.activeElement is not an HTMLElement', async () => {
    const onClose = vi.fn();
    render(<DialogHarness isOpen onClose={onClose} />);
    await flushOpenTimer();

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'activeElement',
    );
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => document as unknown as Element,
    });

    try {
      const tabEvent = dispatchKey('Tab');
      expect(tabEvent.defaultPrevented).toBe(true);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, 'activeElement', originalDescriptor);
      } else {
        Reflect.deleteProperty(document, 'activeElement');
      }
    }
  });

  it('does not prevent Tab when focus is inside dialog and no wrap condition is met', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <DialogHarness isOpen onClose={onClose} useInitialFocus />,
    );

    await flushOpenTimer();

    const first = getByTestId('first');
    first.focus();
    const tabEvent = dispatchKey('Tab');

    expect(tabEvent.defaultPrevented).toBe(false);
  });

  it('opens when activeElement is not an HTMLElement', async () => {
    const onClose = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'activeElement',
    );
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => document as unknown as Element,
    });

    try {
      render(<DialogHarness isOpen onClose={onClose} />);
      await flushOpenTimer();

      const escapeEvent = dispatchKey('Escape');
      expect(escapeEvent.defaultPrevented).toBe(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, 'activeElement', originalDescriptor);
      } else {
        Reflect.deleteProperty(document, 'activeElement');
      }
    }
  });

  it('uses first element when Array.at fallback is unavailable', async () => {
    const onClose = vi.fn();
    const atSpy = vi
      .spyOn(Array.prototype, 'at')
      .mockReturnValue(undefined as never);

    try {
      const { getByTestId } = render(
        <DialogHarness isOpen onClose={onClose} />,
      );
      await flushOpenTimer();

      const outside = getByTestId('outside');
      outside.focus();
      const shiftTabEvent = dispatchKey('Tab', true);

      expect(shiftTabEvent.defaultPrevented).toBe(true);
      expect(getByTestId('first')).toHaveFocus();
    } finally {
      atSpy.mockRestore();
    }
  });

  it('skips focus restoration when the original focused element was removed', async () => {
    const onClose = vi.fn();
    const { getByTestId, queryByTestId, rerender } = render(
      <DialogHarness isOpen={false} onClose={onClose} showDialog={false} />,
    );

    getByTestId('outside').focus();

    rerender(<DialogHarness isOpen onClose={onClose} />);
    await flushOpenTimer();

    rerender(
      <DialogHarness
        isOpen={false}
        onClose={onClose}
        showDialog={false}
        renderOutside={false}
      />,
    );

    expect(queryByTestId('outside')).toBeNull();
    expect(document.body).toHaveFocus();
  });
});
