type FocusWithRetryOptions = {
  getRoot: () => ParentNode | null;
  selector: string;
  fallbackSelector?: string;
  maxAttempts: number;
  retryDelayMs: number;
  onResolved?: () => void;
};

/**
 * Tries to focus a target element with retries until it appears in the DOM.
 *
 * @remarks
 * RATIONALE: Some UI transitions (lazy rendering, conditional sections) expose
 * focus targets asynchronously. This helper centralizes the retry loop and
 * fallback behavior to keep page components smaller and easier to test.
 *
 * @param options - Retry, selector and lifecycle options for focus resolution.
 * @returns Cleanup function that cancels pending retries.
 */
export const focusWithRetry = (
  options: FocusWithRetryOptions,
): (() => void) => {
  let cancelled = false;
  let attempts = 0;

  const resolve = () => {
    options.onResolved?.();
  };

  const tryFocus = () => {
    if (cancelled) {
      return;
    }

    const root = options.getRoot();
    const target = root?.querySelector<HTMLElement>(options.selector);
    if (target) {
      target.focus();
      resolve();
      return;
    }

    if (attempts < options.maxAttempts) {
      attempts += 1;
      globalThis.setTimeout(tryFocus, options.retryDelayMs);
      return;
    }

    if (options.fallbackSelector) {
      root?.querySelector<HTMLElement>(options.fallbackSelector)?.focus();
    }
    resolve();
  };

  globalThis.setTimeout(tryFocus, 0);

  return () => {
    cancelled = true;
  };
};
