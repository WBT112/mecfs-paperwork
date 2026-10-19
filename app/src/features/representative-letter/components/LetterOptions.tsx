import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { RepresentativeLetterContentCatalog } from '../data/letterContent';
import {
  createRepresentativeLetterBlockPreview,
  getRepresentativeLetterVariants,
} from '../generator';
import type { RepresentativeLetterState } from '../model';

const SEVERITY_IDS = ['mild', 'moderate', 'severe', 'very-severe'] as const;
const CARE_STATUS_IDS = [
  'none',
  'pending',
  'level-1',
  'level-2',
  'level-3',
  'level-4',
  'level-5',
] as const;

const PANEL_STYLE: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '10px',
  padding: '1rem',
};
const GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
  gap: '1rem',
  alignItems: 'start',
};
const STACK_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.65rem',
};
const FIELD_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.4rem',
  fontWeight: 700,
};
const CONTROL_STYLE: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '0.7rem',
  background: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  font: 'inherit',
};
const CHECKBOX_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.6rem',
};
const CHECKBOX_INPUT_STYLE: CSSProperties = {
  inlineSize: '1.25rem',
  blockSize: '1.25rem',
  flex: '0 0 auto',
};
const SUBTLE_TEXT_STYLE: CSSProperties = {
  color: 'var(--color-text-secondary)',
};

type LetterOptionsProps = {
  catalog: RepresentativeLetterContentCatalog;
  state: RepresentativeLetterState;
  onChange: (patch: Partial<RepresentativeLetterState>) => void;
};

type VariantPickerProps = {
  catalog: RepresentativeLetterContentCatalog;
  category: 'severity' | 'care';
  selectionId: string | null;
  variantId: string;
  label: string;
  onChange: (variantId: string) => void;
};

const VariantPicker = ({
  catalog,
  category,
  selectionId,
  variantId,
  label,
  onChange,
}: VariantPickerProps) => {
  const { t } = useTranslation();
  const variants = getRepresentativeLetterVariants(
    catalog,
    category,
    selectionId,
  );
  const selectedVariant = variants.find(
    (variant) => variant.variantId === variantId,
  );
  if (!selectionId || !selectedVariant) {
    return null;
  }

  return (
    <div className="representative-letter__variant" style={STACK_STYLE}>
      <label style={FIELD_STYLE}>
        {label}
        <select
          value={variantId}
          onChange={(event) => onChange(event.target.value)}
          style={CONTROL_STYLE}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.variantId}>
              {t('representativeLetter.variantOption', {
                variant: variant.variantId,
              })}
            </option>
          ))}
        </select>
      </label>
      <p className="representative-letter__preview" style={SUBTLE_TEXT_STYLE}>
        <strong>{t('representativeLetter.previewLabel')}</strong>{' '}
        {createRepresentativeLetterBlockPreview(selectedVariant)}
      </p>
    </div>
  );
};

/**
 * Renders optional health-related selections without collecting identity data.
 *
 * @param props - Approved catalog, current tab-local state, and patch handler.
 * @returns Controls and previews for deterministic letter assembly.
 */
export default function LetterOptions({
  catalog,
  state,
  onChange,
}: LetterOptionsProps) {
  const { t } = useTranslation();
  return (
    <section
      className="representative-letter__options"
      aria-labelledby="representative-letter-options-title"
      style={PANEL_STYLE}
    >
      <div>
        <h3 id="representative-letter-options-title">
          {t('representativeLetter.optionsTitle')}
        </h3>
        <p>{t('representativeLetter.optionsDescription')}</p>
      </div>

      <div className="representative-letter__option-grid" style={GRID_STYLE}>
        <label style={FIELD_STYLE}>
          {t('representativeLetter.severityLabel')}
          <select
            value={state.severityId ?? ''}
            onChange={(event) =>
              onChange({
                severityId: event.target.value || null,
                severityVariantId: '1',
              })
            }
            style={CONTROL_STYLE}
          >
            <option value="">{t('representativeLetter.noSelection')}</option>
            {SEVERITY_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`representativeLetter.severityOptions.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <VariantPicker
          catalog={catalog}
          category="severity"
          selectionId={state.severityId}
          variantId={state.severityVariantId}
          label={t('representativeLetter.severityVariantLabel')}
          onChange={(severityVariantId) => onChange({ severityVariantId })}
        />

        <label style={FIELD_STYLE}>
          {t('representativeLetter.careStatusLabel')}
          <select
            value={state.careStatusId ?? ''}
            onChange={(event) =>
              onChange({
                careStatusId: event.target.value || null,
                careStatusVariantId: '1',
              })
            }
            style={CONTROL_STYLE}
          >
            <option value="">{t('representativeLetter.noSelection')}</option>
            {CARE_STATUS_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`representativeLetter.careStatusOptions.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <VariantPicker
          catalog={catalog}
          category="care"
          selectionId={state.careStatusId}
          variantId={state.careStatusVariantId}
          label={t('representativeLetter.careVariantLabel')}
          onChange={(careStatusVariantId) => onChange({ careStatusVariantId })}
        />
      </div>

      <label className="representative-letter__checkbox" style={CHECKBOX_STYLE}>
        <input
          type="checkbox"
          checked={state.includeConstituencyStatement}
          onChange={(event) =>
            onChange({ includeConstituencyStatement: event.target.checked })
          }
          style={CHECKBOX_INPUT_STYLE}
        />
        <span>{t('representativeLetter.constituencyConfirmation')}</span>
      </label>

      <details className="representative-letter__customize" style={STACK_STYLE}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t('representativeLetter.customizeTitle')}
        </summary>
        <p>{t('representativeLetter.customizeDescription')}</p>
        <label style={FIELD_STYLE}>
          {t('representativeLetter.customExperienceLabel')}
          <textarea
            rows={4}
            value={state.customExperience}
            onChange={(event) =>
              onChange({ customExperience: event.target.value })
            }
            style={CONTROL_STYLE}
          />
        </label>
        <label style={FIELD_STYLE}>
          {t('representativeLetter.customRequestLabel')}
          <textarea
            rows={4}
            value={state.customRequest}
            onChange={(event) =>
              onChange({ customRequest: event.target.value })
            }
            style={CONTROL_STYLE}
          />
        </label>
      </details>

      <label className="representative-letter__checkbox" style={CHECKBOX_STYLE}>
        <input
          type="checkbox"
          checked={state.includePersonalDetailsInShortBody}
          onChange={(event) =>
            onChange({
              includePersonalDetailsInShortBody: event.target.checked,
            })
          }
          style={CHECKBOX_INPUT_STYLE}
        />
        <span>{t('representativeLetter.includePersonalInShortBody')}</span>
      </label>
      <p
        className="representative-letter__language-note"
        style={SUBTLE_TEXT_STYLE}
      >
        {t('representativeLetter.contentLanguageNotice')}
      </p>
    </section>
  );
}
