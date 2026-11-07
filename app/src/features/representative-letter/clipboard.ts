/** Minimal clipboard contract required by the representative-letter tool. */
export type RepresentativeLetterClipboard = Pick<Clipboard, 'writeText'>;

const getBrowserClipboard = (): RepresentativeLetterClipboard | null =>
  'clipboard' in navigator ? navigator.clipboard : null;

/**
 * Attempts to copy one visible representative-letter field.
 *
 * @param text - Exact visible plain text to copy.
 * @param clipboard - Clipboard implementation, or `null` when unavailable.
 * @returns Whether the clipboard write completed successfully.
 * @remarks Failures are converted to `false` so the UI can offer manual
 * selection without exposing field contents in logs or error reporting.
 */
export const copyRepresentativeLetterText = async (
  text: string,
  clipboard: RepresentativeLetterClipboard | null = getBrowserClipboard(),
): Promise<boolean> => {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
