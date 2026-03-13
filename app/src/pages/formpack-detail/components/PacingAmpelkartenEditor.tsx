import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEventHandler,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import FormpackIntroModal from '../../../components/FormpackIntroModal';
import { formpackWidgets } from '../../../lib/rjsfWidgetRegistry';
import { getPathValue } from '../../../lib/pathAccess';
import { isRecord } from '../../../lib/utils';
import FormpackDocumentPreviewContent from './FormpackDocumentPreviewContent';
import FormpackIntroGatePanel from './FormpackIntroGatePanel';
import FormpackIntroUtilityRow from './FormpackIntroUtilityRow';
import {
  buildPacingEditorUiSchema,
  PACING_EDITOR_STEP_IDS,
  type PacingEditorCardColor,
  type PacingEditorStepId,
} from '../../../formpacks/pacing-ampelkarten/editorUiSchema';
import { assessPacingCardPageOverflow } from '../../../formpacks/pacing-ampelkarten/pageOverflowWarning';
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
const PACING_PREVIEW_ACCENT = 'var(--pacing-preview)';
const PACING_PREVIEW_SOFT = 'var(--pacing-preview-soft)';
const STEP_HEADER_CLASS_BY_COLOR: Record<PacingEditorCardColor, string> = {
  green: 'pacing-editor__step-header--green',
  yellow: 'pacing-editor__step-header--yellow',
  red: 'pacing-editor__step-header--red',
};
const STEP_HEADER_CLASS_BY_STEP: Record<PacingEditorStepId, string> = {
  variant: 'pacing-editor__step-header--variant',
  green: 'pacing-editor__step-header--green',
  yellow: 'pacing-editor__step-header--yellow',
  red: 'pacing-editor__step-header--red',
  preview: 'pacing-editor__step-header--preview',
};
const STEP_BUTTON_CLASS_BY_STEP: Record<PacingEditorStepId, string> = {
  variant: 'pacing-editor__step--variant',
  green: 'pacing-editor__step--green',
  yellow: 'pacing-editor__step--yellow',
  red: 'pacing-editor__step--red',
  preview: 'pacing-editor__step--preview',
};

const buildToneStyle = (
  accent: string,
  soft: string,
  options: {
    badgeDarkBase: string;
    badgeText: string;
    badgeDarkText: string;
    headerDarkBase: string;
    stepText: string;
  },
): CSSProperties =>
  ({
    '--pacing-step-accent': accent,
    '--pacing-step-soft': soft,
    '--pacing-step-text': options.stepText,
    '--pacing-header-accent': accent,
    '--pacing-header-soft': soft,
    '--pacing-header-dark-base': options.headerDarkBase,
    '--pacing-badge-accent': accent,
    '--pacing-badge-dark-base': options.badgeDarkBase,
    '--pacing-badge-text': options.badgeText,
    '--pacing-badge-dark-text': options.badgeDarkText,
  }) as CSSProperties;

const STEP_TONE_STYLE_BY_STEP: Record<PacingEditorStepId, CSSProperties> = {
  variant: buildToneStyle(
    'var(--pacing-variant)',
    'var(--pacing-variant-soft)',
    {
      badgeDarkBase: '#121722',
      badgeText: 'var(--pacing-variant)',
      badgeDarkText: '#eef4ff',
      headerDarkBase: '#0d111b',
      stepText: '#21457f',
    },
  ),
  green: buildToneStyle('var(--pacing-green)', 'var(--pacing-green-soft)', {
    badgeDarkBase: '#101611',
    badgeText: 'var(--pacing-green)',
    badgeDarkText: '#e6fff0',
    headerDarkBase: '#0f1712',
    stepText: '#22553a',
  }),
  yellow: buildToneStyle('var(--pacing-yellow)', 'var(--pacing-yellow-soft)', {
    badgeDarkBase: '#17130b',
    badgeText: '#6f5200',
    badgeDarkText: '#fff2bf',
    headerDarkBase: '#171309',
    stepText: '#5f4800',
  }),
  red: buildToneStyle('var(--pacing-red)', 'var(--pacing-red-soft)', {
    badgeDarkBase: '#170f10',
    badgeText: 'var(--pacing-red)',
    badgeDarkText: '#ffe8e6',
    headerDarkBase: '#190f10',
    stepText: '#7f3131',
  }),
  preview: buildToneStyle(PACING_PREVIEW_ACCENT, PACING_PREVIEW_SOFT, {
    badgeDarkBase: '#121722',
    badgeText: PACING_PREVIEW_ACCENT,
    badgeDarkText: '#eef4ff',
    headerDarkBase: '#12101b',
    stepText: '#4c4381',
  }),
};

const getStepHeaderClass = (step: PacingEditorStepId): string =>
  STEP_HEADER_CLASS_BY_STEP[step];

const getStepButtonClass = (step: PacingEditorStepId): string =>
  STEP_BUTTON_CLASS_BY_STEP[step];

const getStepToneStyle = (step: PacingEditorStepId): CSSProperties =>
  STEP_TONE_STYLE_BY_STEP[step];

const resolveVariant = (value: unknown): PacingVariant =>
  value === 'child' ? 'child' : 'adult';

const normalizeMeta = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? { ...value } : {};

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
    }
  }, [activeRecordExists, isIntroGateVisible]);

  const variant = resolveVariant(getPathValue(formData, 'meta.variant'));
  const currentStepIndex = PACING_EDITOR_STEP_IDS.indexOf(currentStep);
  const currentCardStep = resolveCardStep(currentStep);

  const filteredUiSchema = useMemo(() => {
    if (!uiSchema || currentStep === 'preview') {
      return null;
    }

    return buildPacingEditorUiSchema(uiSchema, formData, currentStep);
  }, [currentStep, formData, uiSchema]);

  const currentCardTitle =
    currentCardStep === null
      ? null
      : tFormpack(
          `pacing-ampelkarten.${variant}.cards.${currentCardStep}.title`,
        );

  const currentCardOverflowAssessment =
    currentCardStep === null
      ? null
      : assessPacingCardPageOverflow(
          getPathValue(formData, `${variant}.cards.${currentCardStep}`),
        );

  const handleVariantSelect = (nextVariant: PacingVariant) => {
    const nextData: FormDataState = {
      ...formData,
      meta: {
        ...normalizeMeta(formData.meta),
        variant: nextVariant,
      },
    };
    onFormChange({
      formData: nextData,
    } as Parameters<NonNullable<RjsfFormProps['onChange']>>[0]);
  };

  const renderStepHeader = () => {
    if (currentStep === 'preview') {
      return (
        <div
          className={`pacing-editor__step-header ${getStepHeaderClass(currentStep)}`}
          style={getStepToneStyle(currentStep)}
        >
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

    if (currentCardStep !== null && currentCardTitle) {
      return (
        <div
          className={`pacing-editor__step-header ${STEP_HEADER_CLASS_BY_COLOR[currentCardStep]}`}
          style={getStepToneStyle(currentCardStep)}
        >
          <p className="pacing-editor__eyebrow">
            {tFormpack(getStepTranslationKey(currentStep))}
          </p>
          <h4 className="pacing-editor__card-title">{currentCardTitle}</h4>
          <p className="pacing-editor__description">
            {tFormpack(getCardSummaryKey(currentCardStep))}
          </p>
        </div>
      );
    }

    return (
      <div
        className={`pacing-editor__step-header ${getStepHeaderClass(currentStep)}`}
        style={getStepToneStyle(currentStep)}
      >
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
            className={[
              'pacing-editor__step',
              getStepButtonClass(step),
              isCurrent ? 'pacing-editor__step--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={getStepToneStyle(step)}
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

  const renderVariantChooser = () => (
    <section className="pacing-editor__variant-stage">
      <div
        className="pacing-editor__variant-grid"
        role="radiogroup"
        aria-label={tFormpack('pacing-ampelkarten.meta.variant.label')}
      >
        {(['adult', 'child'] as const).map((option) => {
          const isSelected = option === variant;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={[
                'pacing-editor__variant-card',
                isSelected ? 'pacing-editor__variant-card--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleVariantSelect(option)}
            >
              <span className="pacing-editor__variant-pill">
                {tFormpack(`pacing-ampelkarten.editor.variant.${option}.badge`)}
              </span>
              <span className="pacing-editor__variant-title">
                {tFormpack(`pacing-ampelkarten.meta.variant.option.${option}`)}
              </span>
              <span className="pacing-editor__variant-body">
                {tFormpack(
                  `pacing-ampelkarten.editor.variant.${option}.summary`,
                )}
              </span>
              <span className="pacing-editor__variant-check">
                {isSelected
                  ? tFormpack('pacing-ampelkarten.editor.variant.selected')
                  : tFormpack('pacing-ampelkarten.editor.variant.select')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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

  let stepContent: ReactNode;

  if (currentStep === 'preview') {
    stepContent = (
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
    );
  } else if (currentStep === 'variant') {
    stepContent = (
      <div className={`${formClassName} pacing-editor__form-step`}>
        {renderVariantChooser()}
        {renderStepActions()}
      </div>
    );
  } else {
    stepContent = (
      <div className={`${formClassName} pacing-editor__form-step`}>
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
      {currentCardOverflowAssessment?.shouldWarn ? (
        <output className="pacing-editor__page-warning" aria-live="polite">
          <p className="pacing-editor__page-warning-title">
            {tFormpack('pacing-ampelkarten.editor.pageWarning.title')}
          </p>
          <p className="pacing-editor__page-warning-body">
            {tFormpack('pacing-ampelkarten.editor.pageWarning.body')}
          </p>
        </output>
      ) : null}
      {stepContent}
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
