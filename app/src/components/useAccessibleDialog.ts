import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const toFocusableElements = (container: HTMLElement): HTMLElement[] =>
  [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1,
  );

const focusElement = (element: HTMLElement): void => {
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

type AccessibleDialogOptions = {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Provides shared keyboard and focus management for custom dialog overlays.
 *
 * @param options - Dialog lifecycle callbacks and refs used to control focus.
 */
export const useAccessibleDialog = ({
  isOpen,
  dialogRef,
  onClose,
  initialFocusRef,
}: AccessibleDialogOptions): void => {
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;

      if (restoreTarget && document.contains(restoreTarget)) {
        focusElement(restoreTarget);
      }
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusInitialTarget = () => {
      const preferredTarget = initialFocusRef?.current;
      if (preferredTarget && dialog.contains(preferredTarget)) {
        focusElement(preferredTarget);
        return;
      }

      const focusableElements = toFocusableElements(dialog);
      const fallbackTarget = focusableElements[0] ?? dialog;
      focusElement(fallbackTarget);
    };

    const timeoutId = globalThis.setTimeout(focusInitialTarget, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentDialog = dialogRef.current;
      if (!currentDialog) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = toFocusableElements(currentDialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusElement(currentDialog);
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1) ?? first;
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!activeElement || !currentDialog.contains(activeElement)) {
        event.preventDefault();
        focusElement(event.shiftKey ? last : first);
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        focusElement(last);
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      globalThis.clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialogRef, initialFocusRef, isOpen, onClose]);
};
