const OTHER_CAUSE_CODE_PATTERN =
  /\[\[OTHER_CAUSE_CODE\]\]([\s\S]*?)\[\[\/OTHER_CAUSE_CODE\]\]/g;

/**
 * Replaces the localized other-cause placeholder with the entered code.
 *
 * @param caseText - Localized case text containing an optional marker.
 * @param otherCauseCode - User-entered code or description.
 * @returns Case text with the entered value, or its localized fallback.
 * @remarks The marker keeps the existing fallback copy inside each locale and
 * avoids interpreting user input as markup.
 */
export const replaceOtherCauseCodePlaceholder = (
  caseText: string,
  otherCauseCode: unknown,
): string => {
  const replacement =
    typeof otherCauseCode === 'string' ? otherCauseCode.trim() : '';

  return caseText.replaceAll(
    OTHER_CAUSE_CODE_PATTERN,
    (_match, localizedFallback: string) =>
      replacement === '' ? localizedFallback : replacement,
  );
};
