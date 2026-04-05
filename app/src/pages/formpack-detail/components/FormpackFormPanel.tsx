import {
  Suspense,
  type ChangeEventHandler,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import FormpackIntroModal from '../../../components/FormpackIntroModal';
import { formpackWidgets } from '../../../lib/rjsfWidgetRegistry';
import type { FormpackFormContext } from '../../../lib/rjsfTemplates';
import FormpackIntroGatePanel from './FormpackIntroGatePanel';
import FormpackIntroUtilityRow from './FormpackIntroUtilityRow';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type RjsfFormProps = FormProps<FormDataState>;

/**
 * Translated intro-gate copy used by formpacks that require acknowledgement.
 */
export interface FormpackIntroTexts {
  body: string;
  checkboxLabel: string;
  reopenButtonLabel: string;
  startButtonLabel: string;
  title: string;
}

/**
 * Props required to render the editable form content for a formpack.
 */
export interface FormpackFormPanelProps {
  FormComponent: ComponentType<RjsfFormProps>;
  actions: ReactNode;
  activeRecordExists: boolean;
  closeLabel: string;
  emptyMessage: string;
  formClassName: string;
  formContentRef: RefObject<HTMLDivElement | null>;
  formContext: FormpackFormContext & {
    formData?: Record<string, unknown>;
    formpackId?: string;
    infoBoxes?: unknown[];
  };
  formData: FormDataState;
  formSchema: RJSFSchema | null;
  introGateEnabled: boolean;
  introTexts: FormpackIntroTexts | null;
  isIntroGateVisible: boolean;
  isIntroModalOpen: boolean;
  loadingLabel: string;
  noSchemaMessage?: ReactNode;
  onApplyDummyData: () => void;
  onApplyProfile: () => void | Promise<void>;
  onCloseIntroModal: () => void;
  onConfirmIntroGate: () => void;
  onFormChange: NonNullable<RjsfFormProps['onChange']>;
  onFormSubmit: NonNullable<RjsfFormProps['onSubmit']>;
  onOpenIntroModal: () => void;
  onProfileSaveToggle: ChangeEventHandler<HTMLInputElement>;
  profileHasSavedData: boolean;
  profileSaveEnabled: boolean;
  profileStatus: string | null;
  profileStatusSuccessText: string;
  profileToggleLabel: string;
  profileApplyLabel: string;
  profileApplyDummyLabel: string;
  showDevSections: boolean;
  templates: NonNullable<RjsfFormProps['templates']>;
  uiSchema: UiSchema | null;
  validator: ValidatorType | null;
}

/**
 * Renders the intro gate, profile controls, and RJSF form for a formpack.
 *
 * @param props - Form state, handlers, and translated labels for the active formpack.
 * @returns The interactive form body or an empty-state placeholder.
 */
export default function FormpackFormPanel({
  FormComponent,
  actions,
  activeRecordExists,
  closeLabel,
  emptyMessage,
  formClassName,
  formContentRef,
  formContext,
  formData,
  formSchema,
  introGateEnabled,
  introTexts,
  isIntroGateVisible,
  isIntroModalOpen,
  loadingLabel,
  noSchemaMessage = null,
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
  uiSchema,
  validator,
}: Readonly<FormpackFormPanelProps>) {
  const introGatePanelProps = introTexts
    ? {
        title: introTexts.title,
        body: introTexts.body,
        checkboxLabel: introTexts.checkboxLabel,
        startButtonLabel: introTexts.startButtonLabel,
        onConfirm: onConfirmIntroGate,
        formContentRef,
      }
    : null;

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

  if (!activeRecordExists) {
    return <p className="formpack-records__empty">{emptyMessage}</p>;
  }

  if (!formSchema || !uiSchema || !validator) {
    return noSchemaMessage;
  }

  if (isIntroGateVisible && introGatePanelProps) {
    return <FormpackIntroGatePanel {...introGatePanelProps} />;
  }

  return (
    <div ref={formContentRef}>
      <FormpackIntroUtilityRow
        containerClassName="formpack-utility-row"
        profileClassName="profile-quickfill"
        introButtonWrapperClassName="formpack-intro__reopen"
        {...introUtilityProps}
      />
      <Suspense fallback={<p>{loadingLabel}</p>}>
        <FormComponent
          className={formClassName}
          schema={formSchema}
          uiSchema={uiSchema}
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
          <div className="formpack-form__actions">{actions}</div>
        </FormComponent>
      </Suspense>
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
