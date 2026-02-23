// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveOfflabelFocusTarget } from '../../src/formpacks/offlabel-antrag/focusTarget';

describe('resolveOfflabelFocusTarget', () => {
  it('focuses otherDrugName when switching to other medication', () => {
    const target = resolveOfflabelFocusTarget(
      { drug: 'agomelatin', selectedIndicationKey: 'agomelatin.mecfs_fatigue' },
      { drug: 'other' },
      true,
    );

    expect(target).toBe('request.otherDrugName');
  });

  it('focuses selected indication when switching to a multi-indication medication', () => {
    const target = resolveOfflabelFocusTarget(
      { drug: 'other' },
      { drug: 'agomelatin' },
      true,
    );

    expect(target).toBe('request.selectedIndicationKey');
  });

  it('focuses indication confirmation when switching to a single-indication medication', () => {
    const target = resolveOfflabelFocusTarget(
      { drug: 'other' },
      { drug: 'ivabradine' },
      true,
    );

    expect(target).toBe('request.indicationFullyMetOrDoctorConfirms');
  });

  it('returns null when medication does not change', () => {
    const target = resolveOfflabelFocusTarget(
      { drug: 'agomelatin', selectedIndicationKey: 'agomelatin.mecfs_fatigue' },
      {
        drug: 'agomelatin',
        selectedIndicationKey: 'agomelatin.long_post_covid_fatigue',
      },
      true,
    );

    expect(target).toBeNull();
  });

  it('returns null when request state is missing', () => {
    expect(resolveOfflabelFocusTarget(null, { drug: 'ivabradine' }, true)).toBe(
      null,
    );
    expect(resolveOfflabelFocusTarget({ drug: 'ivabradine' }, null, true)).toBe(
      null,
    );
  });

  it('falls back to first visible medication for unknown drug values', () => {
    const target = resolveOfflabelFocusTarget(
      { drug: 'unknown-value' },
      { drug: 'another-unknown-value' },
      false,
    );

    expect(target).toBeNull();
  });
});
