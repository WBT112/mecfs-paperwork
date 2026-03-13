import type { ChangeEventHandler } from 'react';

/**
 * Props required to render the compact profile utility controls for a formpack.
 */
export interface FormpackProfileUtilityBarProps {
  className: string;
  onApplyDummyData: () => void;
  onApplyProfile: () => void | Promise<void>;
  onProfileSaveToggle: ChangeEventHandler<HTMLInputElement>;
  profileApplyDummyLabel: string;
  profileApplyLabel: string;
  profileHasSavedData: boolean;
  profileSaveEnabled: boolean;
  profileStatus: string | null;
  profileStatusSuccessText: string;
  profileToggleLabel: string;
  showDevSections: boolean;
}

/**
 * Renders profile persistence/apply controls shared by formpack editors.
 *
 * @param props - Current profile state, labels, and interaction handlers.
 * @returns A compact utility row for profile-related actions.
 */
export default function FormpackProfileUtilityBar({
  className,
  onApplyDummyData,
  onApplyProfile,
  onProfileSaveToggle,
  profileApplyDummyLabel,
  profileApplyLabel,
  profileHasSavedData,
  profileSaveEnabled,
  profileStatus,
  profileStatusSuccessText,
  profileToggleLabel,
  showDevSections,
}: Readonly<FormpackProfileUtilityBarProps>) {
  return (
    <div className={className}>
      <label className={`${className}__save`}>
        <input
          type="checkbox"
          checked={profileSaveEnabled}
          onChange={onProfileSaveToggle}
        />
        {profileToggleLabel}
      </label>
      <button
        type="button"
        className="app__button"
        disabled={!profileHasSavedData}
        onClick={onApplyProfile}
      >
        {profileApplyLabel}
      </button>
      {showDevSections && (
        <button
          type="button"
          className="app__button"
          onClick={onApplyDummyData}
        >
          {profileApplyDummyLabel}
        </button>
      )}
      {profileStatus && (
        <span
          className={
            profileStatus === profileStatusSuccessText
              ? `${className}__success`
              : `${className}__error`
          }
          aria-live="polite"
        >
          {profileStatus}
        </span>
      )}
    </div>
  );
}
