import FormpackProfileUtilityBar from './FormpackProfileUtilityBar';
import type { ChangeEventHandler } from 'react';

/**
 * Props required to render the shared intro/profile utility controls.
 */
export interface FormpackIntroUtilityRowProps {
  containerClassName?: string;
  introButtonWrapperClassName?: string;
  introGateEnabled: boolean;
  introReopenLabel?: string;
  onApplyDummyData: () => void;
  onApplyProfile: () => void | Promise<void>;
  onOpenIntroModal: () => void;
  onProfileSaveToggle: ChangeEventHandler<HTMLInputElement>;
  profileApplyDummyLabel: string;
  profileApplyLabel: string;
  profileClassName: string;
  profileHasSavedData: boolean;
  profileSaveEnabled: boolean;
  profileStatus: string | null;
  profileStatusSuccessText: string;
  profileToggleLabel: string;
  showDevSections: boolean;
}

/**
 * Renders the reopen-intro button and compact profile controls with configurable layout wrappers.
 *
 * @param props - Layout classes, translated labels, and profile interaction handlers.
 * @returns Shared intro/profile utility controls for formpack editors.
 */
export default function FormpackIntroUtilityRow({
  containerClassName,
  introButtonWrapperClassName,
  introGateEnabled,
  introReopenLabel,
  onApplyDummyData,
  onApplyProfile,
  onOpenIntroModal,
  onProfileSaveToggle,
  profileApplyDummyLabel,
  profileApplyLabel,
  profileClassName,
  profileHasSavedData,
  profileSaveEnabled,
  profileStatus,
  profileStatusSuccessText,
  profileToggleLabel,
  showDevSections,
}: Readonly<FormpackIntroUtilityRowProps>) {
  const introButton =
    introGateEnabled && introReopenLabel ? (
      <button type="button" className="app__button" onClick={onOpenIntroModal}>
        {introReopenLabel}
      </button>
    ) : null;

  const content = (
    <>
      {introButtonWrapperClassName && introButton ? (
        <div className={introButtonWrapperClassName}>{introButton}</div>
      ) : (
        introButton
      )}
      <FormpackProfileUtilityBar
        className={profileClassName}
        onApplyDummyData={onApplyDummyData}
        onApplyProfile={onApplyProfile}
        onProfileSaveToggle={onProfileSaveToggle}
        profileApplyDummyLabel={profileApplyDummyLabel}
        profileApplyLabel={profileApplyLabel}
        profileHasSavedData={profileHasSavedData}
        profileSaveEnabled={profileSaveEnabled}
        profileStatus={profileStatus}
        profileStatusSuccessText={profileStatusSuccessText}
        profileToggleLabel={profileToggleLabel}
        showDevSections={showDevSections}
      />
    </>
  );

  if (!containerClassName) {
    return content;
  }

  return <div className={containerClassName}>{content}</div>;
}
