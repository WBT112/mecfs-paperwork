import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import CollapsibleSection from '../../../components/CollapsibleSection';
import CopyIconButton from '../components/CopyIconButton';
import CopyableTextField from '../components/CopyableTextField';
import {
  type RepresentativeCatalog,
  type RepresentativeCatalogEntry,
} from '../data/catalogs';
import type { ConstituencyLocationCatalog } from '../data/constituencyLocationCatalogs';
import { generateRepresentativeLetter } from '../generator';
import { selectLetterVariants } from '../variants';
import { loadConstituencyLocationCatalog } from '../data/loadConstituencyLocationCatalog';
import { loadRepresentativeCatalog } from '../data/loadRepresentativeCatalog';
import {
  REPRESENTATIVE_LETTER_TOOL_ID,
  createDefaultRepresentativeLetterState,
  type RepresentativeLetterState,
} from '../model';
import {
  clearRepresentativeLetterState,
  readRepresentativeLetterState,
  writeRepresentativeLetterState,
} from '../sessionState';
import {
  resolveRepresentativesForLocations,
  type RepresentativeLocationMatch,
} from '../representativeSearch';
import {
  searchConstituencyLocations,
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
  match: RepresentativeLocationMatch;
  onSelect: (recipientId: string) => void;
};

const RepresentativeResult = ({
  match,
  onSelect,
}: RepresentativeResultProps) => {
  const { t } = useTranslation();
  const { representative, location } = match;
  const constituency = constituencyLabel(representative);
  const locationSummary = location.locations
    .slice(0, 3)
    .map(({ municipality }) => municipality)
    .join(' · ');
  const postalCodeSummary = [
    ...new Set(location.locations.flatMap(({ postalCodes }) => postalCodes)),
  ]
    .slice(0, 4)
    .join(', ');
  return (
    <li style={RESULT_STYLE}>
      <div style={RESULT_DETAILS_STYLE}>
        <strong>{representative.fullName}</strong>
        <span>
          {[representative.state, constituency].filter(Boolean).join(' · ')}
        </span>
        <span>{representative.parliamentaryGroup}</span>
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
        aria-label={t('representativeLetter.selectRecipientNamed', {
          name: representative.fullName,
          number: location.constituencyNumber,
          constituency: location.constituencyName,
        })}
        onClick={() => onSelect(representative.id)}
      >
        {t('representativeLetter.selectRecipient')}
      </button>
    </li>
  );
};

type SearchResultsProps = {
  matches: RepresentativeLocationMatch[];
  showRefineHint: boolean;
  onSelect: (recipientId: string) => void;
};

const SearchResults = ({
  matches,
  showRefineHint,
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
          {matches.slice(0, RESULT_LIMIT).map((match) => (
            <RepresentativeResult
              key={match.representative.id}
              match={match}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : (
        <p>{t('representativeLetter.noResults')}</p>
      )}
      {showRefineHint ? (
        <p>{t('representativeLetter.refineLocationSearch')}</p>
      ) : null}
    </>
  );
};

type RecipientPickerProps = {
  representatives: readonly RepresentativeCatalogEntry[];
  locationCatalog: ConstituencyLocationCatalog;
  locationQuery: string;
  onLocationQueryChange: (value: string) => void;
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
    matches: 'representativeLetter.locationMatches',
  };
  return keys[status];
};

const RecipientPicker = ({
  representatives,
  locationCatalog,
  locationQuery,
  onLocationQueryChange,
  onSelect,
}: RecipientPickerProps) => {
  const { t } = useTranslation();
  const locationSearch = searchConstituencyLocations(
    locationCatalog,
    locationQuery,
  );
  const matches = resolveRepresentativesForLocations(
    representatives,
    locationSearch.matches,
  );

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
      {locationSearch.status === 'idle' ? null : (
        <output>
          {t(locationStatusKey(locationSearch.status), {
            count: locationSearch.matches.length,
          })}
        </output>
      )}
      {locationSearch.status === 'matches' ? (
        <SearchResults
          matches={matches}
          showRefineHint={
            locationSearch.matches.length > RESULT_LIMIT ||
            matches.length > RESULT_LIMIT
          }
          onSelect={onSelect}
        />
      ) : null}
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
    </section>
  );
};

type RecipientSelectionSummaryProps = {
  representative: RepresentativeCatalogEntry;
  onChange: () => void;
};

const RecipientSelectionSummary = ({
  representative,
  onChange,
}: RecipientSelectionSummaryProps) => {
  const { t } = useTranslation();
  return (
    <section
      className="representative-letter__recipient-search"
      aria-label={t('representativeLetter.recipientSearchTitle')}
      style={STACKED_PANEL_STYLE}
    >
      <p style={PRIMARY_DESCRIPTION_STYLE}>
        {t('representativeLetter.recipientSelectedSummary', {
          name: representative.fullName,
        })}
      </p>
      <button type="button" className="app__button" onClick={onChange}>
        {t('representativeLetter.changeRecipient')}
      </button>
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
  const [state, setState] = useState<RepresentativeLetterState>(() =>
    readRepresentativeLetterState(),
  );
  const [locationQuery, setLocationQuery] = useState('');
  const [variantChanged, setVariantChanged] = useState(0);
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(
    () => state.recipientId === null,
  );
  const bodyFieldRef = useRef<HTMLTextAreaElement>(null);
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

  const selectRecipient = (recipientId: string) => {
    setState((current) => ({ ...current, recipientId }));
    setRecipientSearchOpen(false);
  };

  const reset = () => {
    skipNextWrite.current = true;
    clearRepresentativeLetterState();
    setState(createDefaultRepresentativeLetterState());
    setLocationQuery('');
    setRecipientSearchOpen(true);
  };

  const updateLocationQuery = (value: string) => {
    setLocationQuery(value);
    setState((current) => ({ ...current, recipientId: null }));
  };

  const changeRecipient = () => {
    setState((current) => ({ ...current, recipientId: null }));
    setRecipientSearchOpen(true);
  };

  const representatives = catalog?.representatives ?? [];
  const selectedRepresentative = representatives.find(
    ({ id }) => id === state.recipientId,
  );
  const generatedLetter = generateRepresentativeLetter({
    recipientName: selectedRepresentative?.fullName ?? null,
    variant: state.variant,
  });
  const mailtoLink = createMailtoLink({
    recipient: selectedRepresentative?.email ?? null,
    recipientStatus: selectedRepresentative?.emailStatus ?? 'missing',
    subject: generatedLetter.subject,
    body: generatedLetter.body,
  });
  let recipientSearchContent: ReactNode;
  if (selectedRepresentative && !recipientSearchOpen) {
    recipientSearchContent = (
      <RecipientSelectionSummary
        representative={selectedRepresentative}
        onChange={changeRecipient}
      />
    );
  } else if (catalog && locationCatalog) {
    recipientSearchContent = (
      <RecipientPicker
        representatives={representatives}
        locationCatalog={locationCatalog}
        locationQuery={locationQuery}
        onLocationQueryChange={updateLocationQuery}
        onSelect={selectRecipient}
      />
    );
  } else {
    recipientSearchContent = (
      <output className="representative-letter__catalog-status">
        {t(
          catalogFailed
            ? 'representativeLetter.catalogLoadFailed'
            : 'representativeLetter.catalogLoading',
        )}
      </output>
    );
  }

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
        {recipientSearchContent}

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
          <button
            type="button"
            className="app__button"
            onClick={() => {
              setState((current) => ({
                ...current,
                variant: selectLetterVariants(current.variant),
              }));
              setVariantChanged((count) => count + 1);
            }}
          >
            {t('representativeLetter.refreshVariant')}
          </button>
          <output aria-live="polite">
            {variantChanged
              ? t('representativeLetter.variantChanged', {
                  count: variantChanged,
                })
              : ''}
          </output>
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
