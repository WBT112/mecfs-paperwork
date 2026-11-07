import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useLocale } from '../../../i18n/useLocale';
import CopyIconButton from '../components/CopyIconButton';
import CopyableTextField from '../components/CopyableTextField';
import {
  type RepresentativeCatalog,
  type RepresentativeCatalogEntry,
} from '../data/catalogs';
import type { ConstituencyLocationCatalog } from '../data/constituencyLocationCatalogs';
import { getRepresentativeLetterContent } from '../data/letterContent';
import { generateRepresentativeLetter } from '../generator';
import { loadConstituencyLocationCatalog } from '../data/loadConstituencyLocationCatalog';
import { loadRepresentativeCatalog } from '../data/loadRepresentativeCatalog';
import {
  REPRESENTATIVE_LETTER_TOOL_ID,
  createDefaultRepresentativeLetterState,
  type RepresentativeLetterBodyLength,
  type RepresentativeLetterState,
} from '../model';
import {
  clearRepresentativeLetterState,
  readRepresentativeLetterState,
  writeRepresentativeLetterState,
} from '../sessionState';
import { findRepresentativesForConstituency } from '../representativeSearch';
import {
  searchConstituencyLocations,
  type ConstituencyLocationMatch,
  type ConstituencyLocationSearchStatus,
} from '../constituencyLocationSearch';
import { createMailtoLink, type MailtoLink } from '../mailto';
import { copyRepresentativeLetterText } from '../clipboard';

const RESULT_LIMIT = 50;
const STACKED_PANEL_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.85rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '10px',
  padding: '1rem',
};
const PRIMARY_ACTIONS_STYLE: CSSProperties = {
  ...STACKED_PANEL_STYLE,
  justifyItems: 'start',
  gap: '0.5rem',
  background: 'var(--color-help-category)',
};
const PRIMARY_ACTION_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: '0.5rem',
  flexWrap: 'wrap',
};
const SEND_BUTTON_STYLE: CSSProperties = {
  borderColor: 'var(--color-link)',
  fontWeight: 700,
};
const PRIMARY_DESCRIPTION_STYLE: CSSProperties = { margin: 0 };
const FIELD_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
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
const RESULTS_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.6rem',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};
const RESULT_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '1rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '8px',
  padding: '0.75rem',
};
const RESULT_DETAILS_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.2rem',
};
const LINKS_STYLE: CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};
const SUBTLE_TEXT_STYLE: CSSProperties = {
  color: 'var(--color-text-secondary)',
};
const constituencyLabel = (
  representative: RepresentativeCatalogEntry,
): string | null => {
  const constituency = representative.constituency;
  return constituency ? `${constituency.number} – ${constituency.name}` : null;
};

type RepresentativeResultProps = {
  representative: RepresentativeCatalogEntry;
  isSelected: boolean;
  onSelect: (recipientId: string) => void;
};

const RepresentativeResult = ({
  representative,
  isSelected,
  onSelect,
}: RepresentativeResultProps) => {
  const { t } = useTranslation();
  const constituency = constituencyLabel(representative);
  return (
    <li style={RESULT_STYLE}>
      <div style={RESULT_DETAILS_STYLE}>
        <strong>{representative.fullName}</strong>
        <span>
          {[representative.state, constituency].filter(Boolean).join(' · ')}
        </span>
        <span>{representative.parliamentaryGroup}</span>
      </div>
      <button
        type="button"
        className="app__button"
        aria-pressed={isSelected}
        aria-label={t('representativeLetter.selectRecipientNamed', {
          name: representative.fullName,
        })}
        onClick={() => onSelect(representative.id)}
      >
        {isSelected
          ? t('representativeLetter.selected')
          : t('representativeLetter.selectRecipient')}
      </button>
    </li>
  );
};

type SearchResultsProps = {
  matches: RepresentativeCatalogEntry[];
  recipientId: string | null;
  onSelect: (recipientId: string) => void;
};

const SearchResults = ({
  matches,
  recipientId,
  onSelect,
}: SearchResultsProps) => {
  const { t } = useTranslation();
  return (
    <>
      <output className="representative-letter__result-count">
        {t('representativeLetter.resultCount', { count: matches.length })}
      </output>
      {matches.length > 0 ? (
        <ul className="representative-letter__results" style={RESULTS_STYLE}>
          {matches.map((representative) => (
            <RepresentativeResult
              key={representative.id}
              representative={representative}
              isSelected={representative.id === recipientId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : (
        <p>{t('representativeLetter.noResults')}</p>
      )}
    </>
  );
};

type RecipientPickerProps = {
  representatives: readonly RepresentativeCatalogEntry[];
  locationCatalog: ConstituencyLocationCatalog;
  locationQuery: string;
  selectedConstituencyNumber: number | null;
  recipientId: string | null;
  onLocationQueryChange: (value: string) => void;
  onSelectConstituency: (constituencyNumber: number) => void;
  onSelect: (recipientId: string) => void;
};

const locationStatusKey = (
  status: ConstituencyLocationSearchStatus,
): string => {
  const keys: Record<ConstituencyLocationSearchStatus, string> = {
    idle: 'representativeLetter.locationSearchPrompt',
    'incomplete-postcode': 'representativeLetter.locationIncompletePostcode',
    'invalid-postcode': 'representativeLetter.locationInvalidPostcode',
    'incomplete-place': 'representativeLetter.locationIncompletePlace',
    'not-found': 'representativeLetter.locationNotFound',
    matches: 'representativeLetter.locationChooseConstituency',
  };
  return keys[status];
};

type LocationResultProps = {
  match: ConstituencyLocationMatch;
  isSelected: boolean;
  onSelect: (constituencyNumber: number) => void;
};

const LocationResult = ({
  match,
  isSelected,
  onSelect,
}: LocationResultProps) => {
  const { t } = useTranslation();
  const visibleLocations = match.locations.slice(0, 3);
  const locationSummary = visibleLocations
    .map(({ municipality }) => municipality)
    .join(' · ');
  const postalCodeSummary = [
    ...new Set(match.locations.flatMap(({ postalCodes }) => postalCodes)),
  ]
    .slice(0, 4)
    .join(', ');

  return (
    <li style={RESULT_STYLE}>
      <div style={RESULT_DETAILS_STYLE}>
        <strong>
          {t('representativeLetter.constituencyResult', {
            number: match.constituencyNumber,
            name: match.constituencyName,
          })}
        </strong>
        <span>{match.state}</span>
        <span>{locationSummary}</span>
        <span>
          {t('representativeLetter.postcodeSummary', {
            postalCodes: postalCodeSummary,
          })}
        </span>
      </div>
      <button
        type="button"
        className="app__button"
        aria-pressed={isSelected}
        aria-label={t('representativeLetter.selectConstituencyNamed', {
          number: match.constituencyNumber,
          name: match.constituencyName,
        })}
        onClick={() => onSelect(match.constituencyNumber)}
      >
        {isSelected
          ? t('representativeLetter.constituencySelected')
          : t('representativeLetter.selectConstituency')}
      </button>
    </li>
  );
};

type LocationSearchResultsProps = {
  status: ConstituencyLocationSearchStatus;
  matches: ConstituencyLocationMatch[];
  selectedConstituencyNumber: number | null;
  onSelect: (constituencyNumber: number) => void;
};

const LocationSearchResults = ({
  status,
  matches,
  selectedConstituencyNumber,
  onSelect,
}: LocationSearchResultsProps) => {
  const { t } = useTranslation();
  if (status === 'idle') {
    return null;
  }
  if (status !== 'matches') {
    return <output>{t(locationStatusKey(status))}</output>;
  }

  return (
    <div className="representative-letter__location-results">
      <output>
        {t(
          matches.length > 1
            ? 'representativeLetter.locationAmbiguous'
            : 'representativeLetter.locationChooseConstituency',
          { count: matches.length },
        )}
      </output>
      <ul className="representative-letter__results" style={RESULTS_STYLE}>
        {matches.slice(0, RESULT_LIMIT).map((match) => (
          <LocationResult
            key={match.constituencyNumber}
            match={match}
            isSelected={match.constituencyNumber === selectedConstituencyNumber}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {matches.length > RESULT_LIMIT ? (
        <p>{t('representativeLetter.refineLocationSearch')}</p>
      ) : null}
    </div>
  );
};

const RecipientPicker = ({
  representatives,
  locationCatalog,
  locationQuery,
  selectedConstituencyNumber,
  recipientId,
  onLocationQueryChange,
  onSelectConstituency,
  onSelect,
}: RecipientPickerProps) => {
  const { t } = useTranslation();
  const locationSearch = searchConstituencyLocations(
    locationCatalog,
    locationQuery,
  );
  const matches = selectedConstituencyNumber
    ? findRepresentativesForConstituency(
        representatives,
        selectedConstituencyNumber,
      )
    : [];

  return (
    <section
      className="representative-letter__recipient-search"
      aria-labelledby="representative-letter-search-title"
      style={STACKED_PANEL_STYLE}
    >
      <div>
        <h3 id="representative-letter-search-title">
          {t('representativeLetter.recipientSearchTitle')}
        </h3>
        <p>{t('representativeLetter.recipientSearchDescription')}</p>
      </div>
      <div className="representative-letter__search-controls">
        <label
          htmlFor="representative-letter-location-search"
          style={FIELD_STYLE}
        >
          {t('representativeLetter.locationSearchLabel')}
          <input
            id="representative-letter-location-search"
            type="search"
            inputMode="search"
            value={locationQuery}
            onChange={(event) => onLocationQueryChange(event.target.value)}
            placeholder={t('representativeLetter.locationSearchPlaceholder')}
            style={CONTROL_STYLE}
          />
        </label>
      </div>
      <LocationSearchResults
        status={locationSearch.status}
        matches={locationSearch.matches}
        selectedConstituencyNumber={selectedConstituencyNumber}
        onSelect={onSelectConstituency}
      />
      <p className="representative-letter__search-hint">
        {t('representativeLetter.constituencyHint')}{' '}
        <a
          className="app__link"
          href="https://www.bundestag.de/abgeordnete/wahlkreise/"
          target="_blank"
          rel="noreferrer"
        >
          {t('representativeLetter.constituencyLookup')}
        </a>
      </p>
      {selectedConstituencyNumber === null ? null : (
        <SearchResults
          matches={matches}
          recipientId={recipientId}
          onSelect={onSelect}
        />
      )}
    </section>
  );
};

const useRepresentativeCatalogs = (): {
  catalog: RepresentativeCatalog | null;
  locationCatalog: ConstituencyLocationCatalog | null;
  failed: boolean;
} => {
  const [catalog, setCatalog] = useState<RepresentativeCatalog | null>(null);
  const [locationCatalog, setLocationCatalog] =
    useState<ConstituencyLocationCatalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      loadRepresentativeCatalog(),
      loadConstituencyLocationCatalog(),
    ]).then(
      ([loadedCatalog, loadedLocationCatalog]) => {
        setCatalog(loadedCatalog);
        setLocationCatalog(loadedLocationCatalog);
      },
      () => setFailed(true),
    );
  }, []);

  return { catalog, locationCatalog, failed };
};

const SelectedRecipient = ({
  representative,
}: {
  representative: RepresentativeCatalogEntry;
}) => {
  const { t } = useTranslation();
  return (
    <CollapsibleSection
      id="representative-letter-selection"
      className="representative-letter__background"
      title={representative.fullName}
    >
      <p>
        {[
          representative.state,
          constituencyLabel(representative),
          representative.parliamentaryGroup,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <output className="representative-letter__contact-status">
        {representative.email
          ? t('representativeLetter.emailVerified', {
              date: representative.verifiedAt,
            })
          : t('representativeLetter.emailMissing')}
      </output>
      <div className="representative-letter__profile-links" style={LINKS_STYLE}>
        <a
          className="app__link"
          href={representative.abgeordnetenwatchProfileUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('representativeLetter.abgeordnetenwatchProfile')}
        </a>
        <a
          className="app__link"
          href={representative.officialProfileUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('representativeLetter.officialProfile')}
        </a>
        <a
          className="app__link"
          href={representative.officialContactUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('representativeLetter.officialContact')}
        </a>
      </div>
      <p style={SUBTLE_TEXT_STYLE}>
        {t('representativeLetter.abgeordnetenwatchPublicNotice')}
      </p>
    </CollapsibleSection>
  );
};

type PrimaryMailActionsProps = {
  mailtoLink: MailtoLink | null;
  body: string;
  bodyFieldRef: RefObject<HTMLTextAreaElement | null>;
};

type CatalogSource = {
  id: string;
  url: string;
  attribution: string;
};

type CatalogSourceListProps = {
  label: string;
  sources: readonly CatalogSource[];
};

const CatalogSourceList = ({ label, sources }: CatalogSourceListProps) => (
  <div>
    <p>{label}</p>
    <ul>
      {sources.map((source) => (
        <li key={source.id}>
          <a
            className="app__link"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.attribution}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

type CatalogProvenanceProps = {
  catalog: RepresentativeCatalog;
  locationCatalog: ConstituencyLocationCatalog;
};

const CatalogProvenance = ({
  catalog,
  locationCatalog,
}: CatalogProvenanceProps) => {
  const { t } = useTranslation();

  return (
    <div className="representative-letter__catalog-provenance">
      <p>
        {t('representativeLetter.dataSnapshotStatus', {
          term: catalog.term.number,
          representativeDate: catalog.verifiedAt,
          constituencyStatus: locationCatalog.constituencyStatus,
          locationDate: locationCatalog.verifiedAt,
        })}
      </p>
      <p>{t('representativeLetter.dataNotAutomaticallyUpdated')}</p>
      <CatalogSourceList
        label={t('representativeLetter.contactDataSources')}
        sources={catalog.sources}
      />
      <CatalogSourceList
        label={t('representativeLetter.locationDataSources')}
        sources={locationCatalog.sources}
      />
    </div>
  );
};

type PrimaryCopyStatus = 'idle' | 'copied' | 'manual';

const PrimaryMailActions = ({
  mailtoLink,
  body,
  bodyFieldRef,
}: PrimaryMailActionsProps) => {
  const { t } = useTranslation();
  const descriptionId = 'representative-letter-mailto-description';
  const copyStatusId = 'representative-letter-primary-copy-status';
  const [copyStatus, setCopyStatus] = useState<PrimaryCopyStatus>('idle');

  useEffect(() => {
    setCopyStatus('idle');
  }, [body]);

  const copyBody = async () => {
    const copied = await copyRepresentativeLetterText(body);
    if (copied) {
      setCopyStatus('copied');
      return;
    }

    bodyFieldRef.current!.focus();
    bodyFieldRef.current!.select();
    setCopyStatus('manual');
  };

  const copyStatusMessage: Record<PrimaryCopyStatus, string> = {
    idle: '',
    copied: t('representativeLetter.copySucceeded'),
    manual: t('representativeLetter.copyManualFallback'),
  };

  return (
    <section
      aria-label={t('representativeLetter.primaryActionsLabel')}
      style={PRIMARY_ACTIONS_STYLE}
    >
      <div style={PRIMARY_ACTION_ROW_STYLE}>
        {mailtoLink ? (
          <a
            className="app__button"
            href={mailtoLink.href}
            aria-describedby={descriptionId}
            style={SEND_BUTTON_STYLE}
          >
            {t('representativeLetter.openEmailApp')}
          </a>
        ) : (
          <button
            type="button"
            className="app__button"
            aria-describedby={descriptionId}
            disabled
            style={SEND_BUTTON_STYLE}
          >
            {t('representativeLetter.openEmailApp')}
          </button>
        )}
        <CopyIconButton
          label={t('representativeLetter.copyBody')}
          describedBy={copyStatusId}
          disabled={false}
          onClick={copyBody}
        />
      </div>
      <p id={descriptionId} style={PRIMARY_DESCRIPTION_STYLE}>
        {mailtoLink
          ? t('representativeLetter.mailtoDescription')
          : t('representativeLetter.mailtoUnavailable')}
      </p>
      {mailtoLink && !mailtoLink.bodyIncluded ? (
        <output>{t('representativeLetter.mailtoBodyTooLong')}</output>
      ) : null}
      <output
        id={copyStatusId}
        className="representative-letter__copy-status"
        aria-live="polite"
      >
        {copyStatusMessage[copyStatus]}
      </output>
    </section>
  );
};

/**
 * Renders the standalone, offline representative-letter workflow.
 *
 * @returns The representative-letter workflow with supporting disclosures.
 */
export default function RepresentativeLetterPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [state, setState] = useState<RepresentativeLetterState>(() =>
    readRepresentativeLetterState(),
  );
  const [locationQuery, setLocationQuery] = useState('');
  const bodyFieldRef = useRef<HTMLTextAreaElement>(null);
  const [selectedConstituencyNumber, setSelectedConstituencyNumber] = useState<
    number | null
  >(null);
  const {
    catalog,
    locationCatalog,
    failed: catalogFailed,
  } = useRepresentativeCatalogs();
  const skipNextWrite = useRef(false);

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    writeRepresentativeLetterState(state);
  }, [state]);

  const setBodyLength = (bodyLength: RepresentativeLetterBodyLength) => {
    setState((current) => ({ ...current, bodyLength }));
  };

  const selectRecipient = (recipientId: string) => {
    setState((current) => ({ ...current, recipientId }));
  };

  const reset = () => {
    skipNextWrite.current = true;
    clearRepresentativeLetterState();
    setState(createDefaultRepresentativeLetterState());
    setLocationQuery('');
    setSelectedConstituencyNumber(null);
  };

  const updateLocationQuery = (value: string) => {
    setLocationQuery(value);
    setSelectedConstituencyNumber(null);
    setState((current) => ({ ...current, recipientId: null }));
  };

  const selectConstituency = (constituencyNumber: number) => {
    setSelectedConstituencyNumber(constituencyNumber);
    setState((current) => ({ ...current, recipientId: null }));
  };

  const contentCatalog = getRepresentativeLetterContent(locale);
  const representatives = catalog?.representatives ?? [];
  const selectedRepresentative = representatives.find(
    ({ id }) => id === state.recipientId,
  );
  const generatedLetter = generateRepresentativeLetter({
    catalog: contentCatalog,
    bodyLength: state.bodyLength,
    recipientName: selectedRepresentative?.fullName ?? null,
  });
  const mailtoLink = createMailtoLink({
    recipient: selectedRepresentative?.email ?? null,
    recipientStatus: selectedRepresentative?.emailStatus ?? 'missing',
    subject: generatedLetter.subject,
    body: generatedLetter.body,
  });

  return (
    <section
      className="app__card representative-letter"
      data-tool-id={REPRESENTATIVE_LETTER_TOOL_ID}
    >
      <div className="app__card-header">
        <div>
          <p className="representative-letter__eyebrow">
            {t('representativeLetter.toolLabel')}
          </p>
          <h1 className="representative-letter__title">
            {t('representativeLetter.title')}
          </h1>
          <p className="app__subtitle">
            {t('representativeLetter.description')}
          </p>
        </div>
      </div>

      <div className="representative-letter__panel">
        {catalog && locationCatalog ? (
          <RecipientPicker
            representatives={representatives}
            locationCatalog={locationCatalog}
            locationQuery={locationQuery}
            selectedConstituencyNumber={selectedConstituencyNumber}
            recipientId={state.recipientId}
            onLocationQueryChange={updateLocationQuery}
            onSelectConstituency={selectConstituency}
            onSelect={selectRecipient}
          />
        ) : (
          <output className="representative-letter__catalog-status">
            {t(
              catalogFailed
                ? 'representativeLetter.catalogLoadFailed'
                : 'representativeLetter.catalogLoading',
            )}
          </output>
        )}

        {selectedRepresentative ? (
          <>
            <SelectedRecipient representative={selectedRepresentative} />
            <PrimaryMailActions
              mailtoLink={mailtoLink}
              body={generatedLetter.body}
              bodyFieldRef={bodyFieldRef}
            />
          </>
        ) : null}

        <div
          className="representative-letter__length-switch"
          role="group"
          aria-label={t('representativeLetter.lengthLabel')}
        >
          <button
            type="button"
            className="app__button"
            aria-pressed={state.bodyLength === 'short'}
            onClick={() => setBodyLength('short')}
          >
            {t('representativeLetter.shortBody')}
          </button>
          <button
            type="button"
            className="app__button"
            aria-pressed={state.bodyLength === 'long'}
            onClick={() => setBodyLength('long')}
          >
            {t('representativeLetter.longBody')}
          </button>
        </div>

        <p
          className="representative-letter__language-note"
          style={SUBTLE_TEXT_STYLE}
        >
          {t('representativeLetter.contentLanguageNotice')}
        </p>

        <div className="representative-letter__outputs">
          <CopyableTextField
            id="representative-letter-recipient"
            label={t('representativeLetter.recipientLabel')}
            copyLabel={t('representativeLetter.copyRecipient')}
            value={selectedRepresentative?.email ?? ''}
            placeholder={t(
              selectedRepresentative
                ? 'representativeLetter.recipientMissingPlaceholder'
                : 'representativeLetter.recipientPlaceholder',
            )}
            multiline
          />

          <CopyableTextField
            id="representative-letter-subject"
            label={t('representativeLetter.subjectLabel')}
            copyLabel={t('representativeLetter.copySubject')}
            value={generatedLetter.subject}
            placeholder={t('representativeLetter.subjectPlaceholder')}
          />

          <CopyableTextField
            id="representative-letter-body"
            label={t('representativeLetter.bodyLabel')}
            copyLabel={t('representativeLetter.copyBody')}
            value={generatedLetter.body}
            placeholder={t('representativeLetter.bodyPlaceholder')}
            multiline
            rows={12}
            textareaRef={bodyFieldRef}
          />
        </div>

        <p style={SUBTLE_TEXT_STYLE}>
          {t('representativeLetter.signatureNotice')}
        </p>

        <div className="representative-letter__actions">
          <button type="button" className="app__button" onClick={reset}>
            {t('representativeLetter.reset')}
          </button>
        </div>
      </div>

      <div className="representative-letter__information">
        <CollapsibleSection
          id="representative-letter-process"
          title={t('representativeLetter.processTitle')}
          className="representative-letter__background"
        >
          <ol>
            <li>{t('representativeLetter.processRecipient')}</li>
            <li>{t('representativeLetter.processCopy')}</li>
          </ol>
        </CollapsibleSection>
        <CollapsibleSection
          id="representative-letter-data-processing"
          title={t('representativeLetter.dataProcessingTitle')}
          className="representative-letter__background"
        >
          <p>{t('representativeLetter.backgroundText')}</p>
          <p>{t('representativeLetter.locationPrivacyHint')}</p>
          {catalog && locationCatalog ? (
            <CatalogProvenance
              catalog={catalog}
              locationCatalog={locationCatalog}
            />
          ) : null}
        </CollapsibleSection>
      </div>
    </section>
  );
}
