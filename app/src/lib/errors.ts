export const toError = (reason: unknown, fallbackMessage: string): Error =>
  reason instanceof Error ? reason : new Error(fallbackMessage);
