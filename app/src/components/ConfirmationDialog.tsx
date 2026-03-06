import { useId, useRef, type ReactNode } from 'react';
import { useAccessibleDialog } from './useAccessibleDialog';

type ConfirmationDialogTone = 'default' | 'danger';

/**
 * Props for the reusable confirmation dialog overlay.
 */
export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmationDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Renders an accessible confirmation dialog with focus trapping and explicit
 * confirm/cancel actions.
 *
 * @param props - Dialog labels, body content, and lifecycle handlers.
 * @returns The modal overlay when open, otherwise `null`.
 */
export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: Readonly<ConfirmationDialogProps>) {
  const headingId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleDialog({
    isOpen,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    onClose: onCancel,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirmation-dialog">
      <button
        type="button"
        className="confirmation-dialog__backdrop"
        onClick={onCancel}
        aria-label={cancelLabel}
      />
      <dialog
        ref={dialogRef}
        open
        className="confirmation-dialog__content"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
      >
        <div className="confirmation-dialog__header">
          <h4 id={headingId}>{title}</h4>
        </div>
        <div id={bodyId} className="confirmation-dialog__body">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="confirmation-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="app__button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`app__button${tone === 'danger' ? ' app__button--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
