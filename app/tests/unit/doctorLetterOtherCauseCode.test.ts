// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { replaceOtherCauseCodePlaceholder } from '../../src/formpacks/doctor-letter/otherCauseCode';

const MARKED_TEXT =
  'Code: [[OTHER_CAUSE_CODE]][localized fallback][[/OTHER_CAUSE_CODE]]';

describe('replaceOtherCauseCodePlaceholder', () => {
  it('replaces the marker with trimmed plain text', () => {
    expect(
      replaceOtherCauseCodePlaceholder(MARKED_TEXT, '  E89.9 (Example)  '),
    ).toBe('Code: E89.9 (Example)');
  });

  it.each([undefined, null, 42, '', '   '])(
    'keeps the localized fallback for %s',
    (value) => {
      expect(replaceOtherCauseCodePlaceholder(MARKED_TEXT, value)).toBe(
        'Code: [localized fallback]',
      );
    },
  );

  it('leaves unrelated case text unchanged', () => {
    expect(replaceOtherCauseCodePlaceholder('No marker', 'E89.9')).toBe(
      'No marker',
    );
  });
});
