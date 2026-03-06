import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import ConfirmationDialog from './ConfirmationDialog';

type ConfirmationDialogTone = 'default' | 'danger';

/**
 * Options for prompting the user with an accessible confirmation dialog.
 */
export interface ConfirmationRequest {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmationDialogTone;
}

type PendingConfirmation = ConfirmationRequest | null;

/**
 * Exposes a promise-based confirmation API backed by the reusable dialog
 * component.
 *
 * @remarks
 * RATIONALE: This keeps page logic linear (`await requestConfirmation(...)`)
 * while routing all destructive confirmations through the same accessible UI.
 *
 * @returns A `requestConfirmation` helper and the dialog element to render once per page.
 */
export const useConfirmationDialog = () => {
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const closePendingConfirmation = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setPendingConfirmation(null);
    resolver?.(confirmed);
  }, []);

  const requestConfirmation = useCallback(
    async (request: ConfirmationRequest): Promise<boolean> => {
      if (resolverRef.current) {
        closePendingConfirmation(false);
      }

      setPendingConfirmation(request);
      return await new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [closePendingConfirmation],
  );

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        closePendingConfirmation(false);
      }
    };
  }, [closePendingConfirmation]);

  const confirmationDialog = useMemo(
    () => (
      <ConfirmationDialog
        isOpen={pendingConfirmation !== null}
        title={pendingConfirmation?.title ?? ''}
        message={pendingConfirmation?.message ?? ''}
        confirmLabel={pendingConfirmation?.confirmLabel ?? ''}
        cancelLabel={pendingConfirmation?.cancelLabel ?? ''}
        tone={pendingConfirmation?.tone}
        onConfirm={() => {
          closePendingConfirmation(true);
        }}
        onCancel={() => {
          closePendingConfirmation(false);
        }}
      />
    ),
    [closePendingConfirmation, pendingConfirmation],
  );

  return {
    requestConfirmation,
    confirmationDialog,
  };
};
