/**
 * In-memory ring buffer for recent app errors.
 * Stores only the error message and timestamp, never payloads or field values.
 */

const MAX_ERRORS = 50;

type ErrorEntry = {
  timestamp: string;
  message: string;
  source: string;
};

const buffer: ErrorEntry[] = [];

export const pushError = (message: string, source: string): void => {
  const entry: ErrorEntry = {
    timestamp: new Date().toISOString(),
    message: message.slice(0, 500),
    source: source.slice(0, 100),
  };

  buffer.push(entry);

  if (buffer.length > MAX_ERRORS) {
    buffer.shift();
  }
};

export const getErrors = (): string[] =>
  buffer.map(
    (entry) => `[${entry.timestamp}] (${entry.source}) ${entry.message}`,
  );

export const clearErrors = (): void => {
  buffer.length = 0;
};

export const getErrorCount = (): number => buffer.length;

/**
 * Installs global error listeners that feed into the ring buffer.
 * Call once at app startup.
 */
export const installGlobalErrorListeners = (): (() => void) => {
  const handleError = (event: ErrorEvent) => {
    pushError(event.message || 'Unknown error', 'globalThis.onerror');
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? 'Unhandled rejection');
    pushError(message, 'unhandledrejection');
  };

  globalThis.addEventListener('error', handleError);
  globalThis.addEventListener('unhandledrejection', handleRejection);

  return () => {
    globalThis.removeEventListener('error', handleError);
    globalThis.removeEventListener('unhandledrejection', handleRejection);
  };
};
