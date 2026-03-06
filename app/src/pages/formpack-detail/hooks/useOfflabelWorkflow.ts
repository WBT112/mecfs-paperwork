import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { SupportedLocale } from '../../../i18n/locale';
import { isRecord } from '../../../lib/utils';
import { getPathValue } from '../../../lib/pathAccess';
import { OFFLABEL_ANTRAG_FORMPACK_ID } from '../../../formpacks';
import { buildOfflabelDocuments } from '../../../formpacks/offlabel-antrag/content/buildOfflabelDocuments';
import {
  resolveOfflabelFocusTarget,
  type OfflabelFocusTarget,
} from '../../../formpacks/offlabel-antrag/focusTarget';
import { applyOfflabelVisibility } from '../../../formpacks/offlabel-antrag/uiVisibility';
import { offlabelFormHelpers } from '../helpers/offlabelFormHelpers';
import { offlabelPreviewHelpers } from '../helpers/offlabelPreviewHelpers';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type OfflabelPreviewId = 'part1' | 'part2' | 'part3';

/**
 * Dependencies required to coordinate offlabel-specific form behavior.
 */
export interface UseOfflabelWorkflowOptions {
  formData: FormDataState;
  formpackId: string | null;
  locale: SupportedLocale;
  normalizedUiSchema: UiSchema | null;
  schema: RJSFSchema | null;
  setFormData: Dispatch<SetStateAction<FormDataState>>;
  showDevMedicationOptions: boolean;
}

/**
 * Offlabel-specific state and handlers exposed to the detail page.
 */
export interface UseOfflabelWorkflowResult {
  clearPendingOfflabelFocusTarget: () => void;
  formSchema: RJSFSchema | null;
  handleOfflabelFormChange: (incomingData: FormDataState) => FormDataState;
  offlabelOutputLocale: SupportedLocale;
  offlabelPreviewDocuments: ReturnType<typeof buildOfflabelDocuments>;
  offlabelUiSchema: UiSchema | null;
  pendingOfflabelFocusSelector: string | null;
  selectedOfflabelPreviewId: OfflabelPreviewId;
  setSelectedOfflabelPreviewId: Dispatch<SetStateAction<OfflabelPreviewId>>;
}

/**
 * Encapsulates medication-specific schema, visibility, preview, and focus rules.
 *
 * @remarks
 * RATIONALE: The offlabel formpack has dynamic medication and indication logic
 * that is unrelated to generic form rendering. Keeping it in a dedicated hook
 * prevents the page component from owning domain-specific state machines.
 *
 * @param options - Current form state, locale, and setters required for offlabel behavior.
 * @returns Derived schema/UI state plus normalization and focus helpers.
 */
export const useOfflabelWorkflow = ({
  formData,
  formpackId,
  locale,
  normalizedUiSchema,
  schema,
  setFormData,
  showDevMedicationOptions,
}: UseOfflabelWorkflowOptions): UseOfflabelWorkflowResult => {
  const [selectedOfflabelPreviewId, setSelectedOfflabelPreviewId] =
    useState<OfflabelPreviewId>('part1');
  const [pendingOfflabelFocusTarget, setPendingOfflabelFocusTarget] =
    useState<OfflabelFocusTarget | null>(null);

  useEffect(() => {
    setSelectedOfflabelPreviewId('part1');
    setPendingOfflabelFocusTarget(null);
  }, [formpackId]);

  const offlabelOutputLocale: SupportedLocale =
    formpackId === OFFLABEL_ANTRAG_FORMPACK_ID ? 'de' : locale;

  const selectedDrug = getPathValue(formData, 'request.drug');
  const selectedIndicationKey = getPathValue(
    formData,
    'request.selectedIndicationKey',
  );
  const indicationConfirmation = getPathValue(
    formData,
    'request.indicationFullyMetOrDoctorConfirms',
  );

  const offlabelVisibilityData = useMemo(
    () => ({
      request: {
        drug: selectedDrug,
        selectedIndicationKey,
        indicationFullyMetOrDoctorConfirms: indicationConfirmation,
      },
    }),
    [selectedDrug, selectedIndicationKey, indicationConfirmation],
  );

  const formSchema = useMemo(() => {
    if (!schema || formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID) {
      return schema;
    }

    return offlabelFormHelpers.buildOfflabelFormSchema(
      schema,
      formData,
      showDevMedicationOptions,
      locale,
    );
  }, [formData, formpackId, locale, schema, showDevMedicationOptions]);

  const offlabelUiSchema = useMemo(() => {
    if (!normalizedUiSchema) {
      return normalizedUiSchema;
    }

    if (formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID) {
      return normalizedUiSchema;
    }

    return applyOfflabelVisibility(
      normalizedUiSchema,
      offlabelVisibilityData,
      locale,
      showDevMedicationOptions,
    );
  }, [
    formpackId,
    locale,
    normalizedUiSchema,
    offlabelVisibilityData,
    showDevMedicationOptions,
  ]);

  const handleOfflabelFormChange = useCallback(
    (incomingData: FormDataState) => {
      if (
        formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID ||
        !isRecord(incomingData.request)
      ) {
        return incomingData;
      }

      const previousRequest = isRecord(formData.request)
        ? formData.request
        : null;
      const normalizedRequest = offlabelFormHelpers.normalizeOfflabelRequest(
        incomingData.request,
        showDevMedicationOptions,
      );
      const focusTarget = resolveOfflabelFocusTarget(
        previousRequest,
        normalizedRequest,
        showDevMedicationOptions,
      );
      if (focusTarget) {
        setPendingOfflabelFocusTarget(focusTarget);
      }

      return {
        ...incomingData,
        request: normalizedRequest,
      };
    },
    [formData.request, formpackId, showDevMedicationOptions],
  );

  useEffect(() => {
    if (
      formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID ||
      !isRecord(formData.request)
    ) {
      return;
    }

    const request = formData.request;
    const normalizedRequest = offlabelFormHelpers.normalizeOfflabelRequest(
      request,
      showDevMedicationOptions,
    );
    if (JSON.stringify(request) === JSON.stringify(normalizedRequest)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      request: normalizedRequest,
    }));
  }, [formData, formpackId, setFormData, showDevMedicationOptions]);

  const offlabelPreviewDocuments = useMemo(
    () =>
      formpackId === OFFLABEL_ANTRAG_FORMPACK_ID
        ? buildOfflabelDocuments(formData, offlabelOutputLocale).map(
            (document) =>
              offlabelPreviewHelpers.stripOfflabelPart2ConsentFromPreview(
                document,
              ),
          )
        : [],
    [formData, formpackId, offlabelOutputLocale],
  );

  const pendingOfflabelFocusSelector = useMemo(
    () =>
      pendingOfflabelFocusTarget
        ? offlabelFormHelpers.OFFLABEL_FOCUS_SELECTOR_BY_TARGET[
            pendingOfflabelFocusTarget
          ]
        : null,
    [pendingOfflabelFocusTarget],
  );

  const clearPendingOfflabelFocusTarget = useCallback(() => {
    setPendingOfflabelFocusTarget(null);
  }, []);

  return {
    clearPendingOfflabelFocusTarget,
    formSchema,
    handleOfflabelFormChange,
    offlabelOutputLocale,
    offlabelPreviewDocuments,
    offlabelUiSchema,
    pendingOfflabelFocusSelector,
    selectedOfflabelPreviewId,
    setSelectedOfflabelPreviewId,
  };
};
