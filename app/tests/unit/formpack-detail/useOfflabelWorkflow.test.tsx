import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { OfflabelRenderedDocument } from '../../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const mocked = vi.hoisted(() => ({
  applyOfflabelVisibility: vi.fn(),
  buildOfflabelDocuments:
    vi.fn<
      (
        formData: Record<string, unknown>,
        locale: 'de' | 'en',
      ) => OfflabelRenderedDocument[]
    >(),
  buildOfflabelFormSchema: vi.fn(),
  normalizeOfflabelRequest: vi.fn(),
  resolveOfflabelFocusTarget: vi.fn(),
  stripOfflabelPart2ConsentFromPreview:
    vi.fn<(document: OfflabelRenderedDocument) => OfflabelRenderedDocument>(),
}));

vi.mock(
  '../../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments',
  () => ({
    buildOfflabelDocuments: mocked.buildOfflabelDocuments,
  }),
);

vi.mock('../../../src/formpacks/offlabel-antrag/focusTarget', () => ({
  resolveOfflabelFocusTarget: mocked.resolveOfflabelFocusTarget,
}));

vi.mock('../../../src/formpacks/offlabel-antrag/uiVisibility', () => ({
  applyOfflabelVisibility: mocked.applyOfflabelVisibility,
}));

vi.mock(
  '../../../src/pages/formpack-detail/helpers/offlabelFormHelpers',
  () => ({
    offlabelFormHelpers: {
      OFFLABEL_FOCUS_SELECTOR_BY_TARGET: {
        'request.otherDrugName': '#other-drug',
        'request.selectedIndicationKey': '#indication',
        'request.indicationFullyMetOrDoctorConfirms': '#confirmation',
      },
      buildOfflabelFormSchema: mocked.buildOfflabelFormSchema,
      normalizeOfflabelRequest: mocked.normalizeOfflabelRequest,
    },
  }),
);

vi.mock(
  '../../../src/pages/formpack-detail/helpers/offlabelPreviewHelpers',
  () => ({
    offlabelPreviewHelpers: {
      stripOfflabelPart2ConsentFromPreview:
        mocked.stripOfflabelPart2ConsentFromPreview,
    },
  }),
);

import { useOfflabelWorkflow } from '../../../src/pages/formpack-detail/hooks/useOfflabelWorkflow';

const BASE_SCHEMA: RJSFSchema = { type: 'object' };
const BASE_UI_SCHEMA: UiSchema = { 'ui:order': ['request'] };
const FORM_DATA = {
  request: {
    drug: 'agomelatin',
    selectedIndicationKey: 'agomelatin.mecfs',
    indicationFullyMetOrDoctorConfirms: 'yes',
  },
};
const PREVIEW_DOCUMENTS: OfflabelRenderedDocument[] = [
  { id: 'part1', title: 'Teil 1', blocks: [] },
  { id: 'part2', title: 'Teil 2', blocks: [] },
];

describe('useOfflabelWorkflow', () => {
  beforeEach(() => {
    Object.values(mocked).forEach((value) => value.mockReset());
    mocked.buildOfflabelDocuments.mockReturnValue(PREVIEW_DOCUMENTS);
    mocked.buildOfflabelFormSchema.mockReturnValue({
      type: 'object',
      title: 'derived',
    });
    mocked.normalizeOfflabelRequest.mockImplementation(
      (request: Record<string, unknown>) => request,
    );
    mocked.applyOfflabelVisibility.mockReturnValue({ visible: true });
    mocked.stripOfflabelPart2ConsentFromPreview.mockImplementation(
      (document: OfflabelRenderedDocument) => ({
        ...document,
        title: `${document.title}-preview`,
      }),
    );
    mocked.resolveOfflabelFocusTarget.mockReturnValue(null);
  });

  it('returns the base schema and locale unchanged for non-offlabel formpacks', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() =>
      useOfflabelWorkflow({
        formData: {},
        formpackId: 'doctor-letter',
        locale: 'en',
        normalizedUiSchema: BASE_UI_SCHEMA,
        schema: BASE_SCHEMA,
        setFormData,
        showDevMedicationOptions: false,
      }),
    );

    expect(result.current.offlabelOutputLocale).toBe('en');
    expect(result.current.formSchema).toBe(BASE_SCHEMA);
    expect(result.current.offlabelUiSchema).toBe(BASE_UI_SCHEMA);
    expect(result.current.offlabelPreviewDocuments).toEqual([]);
    expect(mocked.buildOfflabelFormSchema).not.toHaveBeenCalled();
  });

  it('derives offlabel schema, visibility, preview content, and focus selectors', async () => {
    const setFormData = vi.fn();
    mocked.resolveOfflabelFocusTarget.mockReturnValue('request.otherDrugName');
    mocked.normalizeOfflabelRequest
      .mockReturnValueOnce({ drug: 'other' })
      .mockReturnValueOnce({ drug: 'other' });

    const { result, rerender } = renderHook(
      ({ formpackId }) =>
        useOfflabelWorkflow({
          formData: FORM_DATA,
          formpackId,
          locale: 'en',
          normalizedUiSchema: BASE_UI_SCHEMA,
          schema: BASE_SCHEMA,
          setFormData,
          showDevMedicationOptions: true,
        }),
      {
        initialProps: { formpackId: 'offlabel-antrag' },
      },
    );

    expect(result.current.offlabelOutputLocale).toBe('de');
    expect(result.current.formSchema).toEqual({
      type: 'object',
      title: 'derived',
    });
    expect(result.current.offlabelUiSchema).toEqual({ visible: true });
    expect(result.current.offlabelPreviewDocuments).toEqual([
      { id: 'part1', title: 'Teil 1-preview', blocks: [] },
      { id: 'part2', title: 'Teil 2-preview', blocks: [] },
    ]);

    await act(async () => {
      const next = result.current.handleOfflabelFormChange({
        request: { drug: 'other' },
      });
      expect(next).toEqual({ request: { drug: 'other' } });
    });
    expect(result.current.pendingOfflabelFocusSelector).toBe('#other-drug');

    act(() => {
      result.current.setSelectedOfflabelPreviewId('part2');
    });
    expect(result.current.selectedOfflabelPreviewId).toBe('part2');

    rerender({ formpackId: 'doctor-letter' });
    await waitFor(() => {
      expect(result.current.selectedOfflabelPreviewId).toBe('part1');
    });
  });

  it('normalizes invalid persisted request data after mount', async () => {
    const setFormData = vi.fn();
    mocked.normalizeOfflabelRequest.mockReturnValue({ drug: 'normalized' });

    renderHook(() =>
      useOfflabelWorkflow({
        formData: { request: { drug: 'legacy' } },
        formpackId: 'offlabel-antrag',
        locale: 'de',
        normalizedUiSchema: BASE_UI_SCHEMA,
        schema: BASE_SCHEMA,
        setFormData,
        showDevMedicationOptions: false,
      }),
    );

    await waitFor(() => {
      expect(setFormData).toHaveBeenCalled();
    });
    const update = setFormData.mock.calls[0][0] as (
      value: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(update({ request: { drug: 'legacy' } })).toEqual({
      request: { drug: 'normalized' },
    });
  });
});
