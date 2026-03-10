import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEventHandler,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import FormpackIntroModal from '../../../components/FormpackIntroModal';
import { formpackWidgets } from '../../../lib/rjsfWidgetRegistry';
import { getPathValue } from '../../../lib/pathAccess';
import FormpackDocumentPreviewContent from './FormpackDocumentPreviewContent';
import FormpackIntroGatePanel from './FormpackIntroGatePanel';
import FormpackIntroUtilityRow from './FormpackIntroUtilityRow';
import {
  buildPacingEditorUiSchema,
  PACING_EDITOR_STEP_IDS,
  type PacingEditorCardColor,
  type PacingEditorSecondarySectionState,
  type PacingEditorStepId,
} from '../../../formpacks/pacing-ampelkarten/editorUiSchema';
import type { FormpackFormContext } from '../../../lib/rjsfTemplates';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;
type RjsfFormProps = FormProps<FormDataState>;
type PacingVariant = 'adult' | 'child';

const CARD_STEPS: readonly PacingEditorCardColor[] = [
  'green',
  'yellow',
  'red',
] as const;
const STEP_HEADER_CLASS_BY_COLOR: Record<PacingEditorCardColor, string> = {
  green: 'pacing-editor__step-header--green',
  yellow: 'pacing-editor__step-header--yellow',
  red: 'pacing-editor__step-header--red',
};
const CARD_BADGE_CLASS_BY_COLOR: Record<PacingEditorCardColor, string> = {
  green: 'pacing-editor__card-badge--green',
  yellow: 'pacing-editor__card-badge--yellow',
  red: 'pacing-editor__card-badge--red',
};

const resolveVariant = (value: unknown): PacingVariant =>
  value === 'child' ? 'child' : 'adult';

const resolveCardStep = (
  step: PacingEditorStepId,
): PacingEditorCardColor | null =>
  CARD_STEPS.includes(step as PacingEditorCardColor)
    ? (step as PacingEditorCardColor)
    : null;

/**
 * Props required to render the custom pacing-card editor flow.
 */
export interface PacingAmpelkartenEditorProps {
  FormComponent: ComponentType<RjsfFormProps>;
  activeRecordExists: boolean;
  closeLabel: string;
  documentPreview: ReactNode;
  emptyMessage: string;
  emptyPreviewLabel: string;
  exportActions: ReactNode;
  formClassName: string;
  formContentRef: RefObject<HTMLDivElement | null>;
  formContext: FormpackFormContext & {
    formData?: Record<string, unknown>;
    formpackId?: string;
    infoBoxes?: unknown[];
  };
  formData: FormDataState;
  formSchema: RJSFSchema | null;
  hasDocumentContent: boolean;
  introGateEnabled: boolean;
  introTexts: {
    body: string;
    checkboxLabel: string;
    reopenButtonLabel: string;
    startButtonLabel: string;
    title: string;
  } | null;
  isIntroGateVisible: boolean;
  isIntroModalOpen: boolean;
  loadingLabel: string;
  onApplyDummyData: () => void;
  onApplyProfile: () => void | Promise<void>;
  onCloseIntroModal: () => void;
  onConfirmIntroGate: () => void;
  onFormChange: NonNullable<RjsfFormProps['onChange']>;
  onFormSubmit: NonNullable<RjsfFormProps['onSubmit']>;
  onOpenIntroModal: () => void;
  onProfileSaveToggle: ChangeEventHandler<HTMLInputElement>;
  profileApplyDummyLabel: string;
  profileApplyLabel: string;
  profileHasSavedData: boolean;
  profileSaveEnabled: boolean;
  profileStatus: string | null;
  profileStatusSuccessText: string;
  profileToggleLabel: string;
  showDevSections: boolean;
  templates: NonNullable<RjsfFormProps['templates']>;
  t: (key: string) => string;
  tFormpack: (key: string) => string;
  uiSchema: UiSchema | null;
  validator: ValidatorType | null;
}

const getStepTranslationKey = (step: PacingEditorStepId) =>
  `pacing-ampelkarten.editor.steps.${step}.label`;

const getStepDescriptionKey = (step: PacingEditorStepId) =>
  `pacing-ampelkarten.editor.steps.${step}.description`;

const getCardSummaryKey = (color: PacingEditorCardColor) =>
  `pacing-ampelkarten.editor.cards.${color}.summary`;

/**
 * Renders the pacing-card editor as a guided step-by-step flow.
 *
 * @param props - Current form state, handlers, preview payload, and translated labels.
 * @returns A pacing-specific editor that preserves the existing data model.
 */
export default function PacingAmpelkartenEditor({
  FormComponent,
  activeRecordExists,
  closeLabel,
  documentPreview,
  emptyMessage,
  emptyPreviewLabel,
  exportActions,
  formClassName,
  formContentRef,
  formContext,
  formData,
  formSchema,
  hasDocumentContent,
  introGateEnabled,
  introTexts,
  isIntroGateVisible,
  isIntroModalOpen,
  loadingLabel,
  onApplyDummyData,
  onApplyProfile,
  onCloseIntroModal,
  onConfirmIntroGate,
  onFormChange,
  onFormSubmit,
  onOpenIntroModal,
  onProfileSaveToggle,
  profileApplyDummyLabel,
  profileApplyLabel,
  profileHasSavedData,
  profileSaveEnabled,
  profileStatus,
  profileStatusSuccessText,
  profileToggleLabel,
  showDevSections,
  templates,
  t,
  tFormpack,
  uiSchema,
  validator,
}: Readonly<PacingAmpelkartenEditorProps>) {
  const [currentStep, setCurrentStep] = useState<PacingEditorStepId>('variant');
  const [expandedSecondarySections, setExpandedSecondarySections] =
    useState<PacingEditorSecondarySectionState>({});

  const introUtilityProps = {
    introGateEnabled,
    introReopenLabel: introTexts?.reopenButtonLabel,
    onApplyDummyData,
    onApplyProfile,
    onOpenIntroModal,
    onProfileSaveToggle,
    profileApplyDummyLabel,
    profileApplyLabel,
    profileHasSavedData,
    profileSaveEnabled,
    profileStatus,
    profileStatusSuccessText,
    profileToggleLabel,
    showDevSections,
  };
  const ignoreOfflabelPreviewSelection = setCurrentStep as unknown as (
    previewId: string,
  ) => void;

  useEffect(() => {
    if (isIntroGateVisible || !activeRecordExists) {
      setCurrentStep('variant');
      setExpandedSecondarySections({});
    }
  }, [activeRecordExists, isIntroGateVisible]);

  const variant = resolveVariant(getPathValue(formData, 'meta.variant'));
  const currentStepIndex = PACING_EDITOR_STEP_IDS.indexOf(currentStep);
  const currentCardStep = resolveCardStep(currentStep);

  const filteredUiSchema = useMemo(() => {
    if (!uiSchema || currentStep === 'preview') {
      return null;
    }

    return buildPacingEditorUiSchema(
      uiSchema,
      formData,
      currentStep,
      expandedSecondarySections,
    );
  }, [currentStep, expandedSecondarySections, formData, uiSchema]);

  const currentCardTitle =
    currentCardStep === null
      ? null
      : tFormpack(
          `pacing-ampelkarten.${variant}.cards.${currentCardStep}.title`,
        );

  const currentAnimalLabel =
    currentCardStep === null
      ? null
      : tFormpack(`pacing-ampelkarten.card.animal.${currentCardStep}`);

  const renderStepHeader = () => {
    if (currentStep === 'preview') {
      return (
        <div className="pacing-editor__step-header">
          <p className="pacing-editor__eyebrow">
            {tFormpack(getStepTranslationKey(currentStep))}
          </p>
          <h4>{tFormpack('pacing-ampelkarten.editor.preview.title')}</h4>
          <p className="pacing-editor__description">
            {tFormpack(getStepDescriptionKey(currentStep))}
          </p>
        </div>
      );
    }

    if (currentCardStep !== null && currentCardTitle && currentAnimalLabel) {
      return (
        <div
          className={`pacing-editor__step-header ${STEP_HEADER_CLASS_BY_COLOR[currentCardStep]}`}
        >
          <p className="pacing-editor__eyebrow">
            {tFormpack(getStepTranslationKey(currentStep))}
          </p>
          <div className="pacing-editor__card-heading">
            <span
              className={`pacing-editor__card-badge ${CARD_BADGE_CLASS_BY_COLOR[currentCardStep]}`}
            >
              {currentAnimalLabel}
            </span>
            <h4>{currentCardTitle}</h4>
          </div>
          <p className="pacing-editor__description">
            {tFormpack(getCardSummaryKey(currentCardStep))}
          </p>
        </div>
      );
    }

    return (
      <div className="pacing-editor__step-header">
        <p className="pacing-editor__eyebrow">
          {tFormpack(getStepTranslationKey(currentStep))}
        </p>
        <h4>{tFormpack(`pacing-ampelkarten.editor.${currentStep}.title`)}</h4>
        <p className="pacing-editor__description">
          {tFormpack(getStepDescriptionKey(currentStep))}
        </p>
      </div>
    );
  };

  const renderStepNavigation = () => (
    <nav
      className="pacing-editor__steps"
      aria-label={tFormpack('pacing-ampelkarten.editor.navigation.label')}
    >
      {PACING_EDITOR_STEP_IDS.map((step, index) => {
        const isCurrent = step === currentStep;
        return (
          <button
            key={step}
            type="button"
            className={
              isCurrent
                ? 'pacing-editor__step pacing-editor__step--current'
                : 'pacing-editor__step'
            }
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => setCurrentStep(step)}
          >
            <span className="pacing-editor__step-index">{index + 1}</span>
            <span className="pacing-editor__step-label">
              {tFormpack(getStepTranslationKey(step))}
            </span>
          </button>
        );
      })}
    </nav>
  );

  const renderStepActions = () => (
    <div className="formpack-form__actions pacing-editor__actions">
      {currentCardStep !== null && (
        <button
          type="button"
          className="app__button"
          onClick={() =>
            setExpandedSecondarySections((current) => ({
              ...current,
              [currentCardStep]: current[currentCardStep] !== true,
            }))
          }
        >
          {expandedSecondarySections[currentCardStep]
            ? tFormpack('pacing-ampelkarten.editor.secondary.hide')
            : tFormpack('pacing-ampelkarten.editor.secondary.show')}
        </button>
      )}
      <div className="pacing-editor__step-buttons">
        {currentStepIndex > 0 && (
          <button
            type="button"
            className="app__button"
            onClick={() =>
              setCurrentStep(PACING_EDITOR_STEP_IDS[currentStepIndex - 1])
            }
          >
            {tFormpack('pacing-ampelkarten.editor.navigation.previous')}
          </button>
        )}
        {currentStepIndex < PACING_EDITOR_STEP_IDS.length - 1 && (
          <button
            type="button"
            className="app__button"
            onClick={() =>
              setCurrentStep(PACING_EDITOR_STEP_IDS[currentStepIndex + 1])
            }
          >
            {tFormpack('pacing-ampelkarten.editor.navigation.next')}
          </button>
        )}
      </div>
    </div>
  );

  if (!activeRecordExists) {
    return <p className="formpack-records__empty">{emptyMessage}</p>;
  }

  if (
    formSchema === null ||
    validator === null ||
    (currentStep !== 'preview' && filteredUiSchema === null)
  ) {
    return null;
  }

  if (isIntroGateVisible && introTexts) {
    return (
      <FormpackIntroGatePanel
        title={introTexts.title}
        body={introTexts.body}
        checkboxLabel={introTexts.checkboxLabel}
        startButtonLabel={introTexts.startButtonLabel}
        onConfirm={onConfirmIntroGate}
        formContentRef={formContentRef}
      />
    );
  }

  return (
    <div ref={formContentRef} className="pacing-editor">
      <FormpackIntroUtilityRow
        containerClassName="pacing-editor__utility-row"
        profileClassName="pacing-editor__utility"
        {...introUtilityProps}
      />
      {renderStepNavigation()}
      {renderStepHeader()}

      {currentStep === 'preview' ? (
        <div className={`${formClassName} pacing-editor__preview-step`}>
          <div className="pacing-editor__export-panel">{exportActions}</div>
          <div className="pacing-editor__preview-panel">
            <h5>{t('formpackDocumentPreviewHeading')}</h5>
            <div id="formpack-document-preview-content">
              <FormpackDocumentPreviewContent
                documentPreview={documentPreview}
                emptyLabel={emptyPreviewLabel}
                formpackId="pacing-ampelkarten"
                hasDocumentContent={hasDocumentContent}
                offlabelPreviewDocuments={[]}
                onSelectOfflabelPreview={ignoreOfflabelPreviewSelection}
                selectedOfflabelPreviewId="part1"
              />
            </div>
          </div>
          {renderStepActions()}
        </div>
      ) : (
        <div className={formClassName}>
          <Suspense fallback={<p>{loadingLabel}</p>}>
            <FormComponent
              schema={formSchema}
              uiSchema={filteredUiSchema as UiSchema}
              templates={templates}
              widgets={formpackWidgets}
              validator={validator}
              formData={formData}
              omitExtraData
              liveOmit
              onChange={onFormChange}
              onSubmit={onFormSubmit}
              formContext={formContext}
              noHtml5Validate
              showErrorList={false}
            >
              {renderStepActions()}
            </FormComponent>
          </Suspense>
        </div>
      )}
      {introGateEnabled && introTexts && (
        <FormpackIntroModal
          isOpen={isIntroModalOpen}
          title={introTexts.title}
          body={introTexts.body}
          closeLabel={closeLabel}
          onClose={onCloseIntroModal}
        />
      )}
    </div>
  );
}
