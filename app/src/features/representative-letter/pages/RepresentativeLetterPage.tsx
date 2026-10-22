import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useLocale } from '../../../i18n/useLocale';
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
  type RepresentativeLetterView,
} from '../model';
import {
  clearRepresentativeLetterState,
  readRepresentativeLetterState,
  writeRepresentativeLetterState,
} from '../sessionState';
import { filterRepresentatives } from '../representativeSearch';
import {
  searchConstituencyLocations,
  type ConstituencyLocationMatch,
  type ConstituencyLocationSearchStatus,
} from '../constituencyLocationSearch';
import { createMailtoLink, type MailtoLink } from '../mailto';

const RESULT_LIMIT = 50;
const STACKED_PANEL_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.85rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '10px',
  padding: '1rem',
};
const MAILTO_PANEL_STYLE: CSSProperties = {
  ...STACKED_PANEL_STYLE,
  justifyItems: 'start',
};
const CONTROL_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '0.75rem',
};
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
  active: boolean;
  matches: RepresentativeCatalogEntry[];
  recipientId: string | null;
  onSelect: (recipientId: string) => void;
};

const SearchResults = ({
  active,
  matches,
  recipientId,
  onSelect,
}: SearchResultsProps) => {
  const { t } = useTranslation();
  if (!active) {
    return <p>{t('representativeLetter.searchPrompt')}</p>;
  }

  const visibleRepresentatives = matches.slice(0, RESULT_LIMIT);
  return (
    <>
      <output className="representative-letter__result-count">
        {t('representativeLetter.resultCount', { count: matches.length })}
      </output>
      {visibleRepresentatives.length > 0 ? (
        <ul className="representative-letter__results" style={RESULTS_STYLE}>
          {visibleRepresentatives.map((representative) => (
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
      {matches.length > RESULT_LIMIT ? (
        <p>{t('representativeLetter.refineSearch')}</p>
      ) : null}
    </>
  );
};

type RecipientPickerProps = {
  representatives: readonly RepresentativeCatalogEntry[];
  locationCatalog: ConstituencyLocationCatalog;
  query: string;
  locationQuery: string;
  stateCode: string;
  selectedConstituencyNumber: number | null;
  recipientId: string | null;
  onQueryChange: (value: string) => void;
  onLocationQueryChange: (value: string) => void;
  onStateChange: (value: string) => void;
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
  query,
  locationQuery,
  stateCode,
  selectedConstituencyNumber,
  recipientId,
  onQueryChange,
  onLocationQueryChange,
  onStateChange,
  onSelectConstituency,
  onSelect,
}: RecipientPickerProps) => {
  const { t } = useTranslation();
  const representativeStates = [
    ...new Map(
      representatives.map(({ stateCode: optionCode, state }) => [
        optionCode,
        state,
      ]),
    ).entries(),
  ].toSorted(([, left], [, right]) => left.localeCompare(right, 'de'));
  const locationSearch = searchConstituencyLocations(
    locationCatalog,
    locationQuery,
    stateCode,
  );
  const locationActive = locationQuery.trim() !== '';
  const active = locationActive
    ? selectedConstituencyNumber !== null
    : query.trim() !== '' || stateCode !== '';
  const matches = active
    ? filterRepresentatives(
        representatives,
        query,
        stateCode,
        locationActive ? selectedConstituencyNumber : null,
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
      <div
        className="representative-letter__search-controls"
        style={CONTROL_GRID_STYLE}
      >
        <label htmlFor="representative-letter-search" style={FIELD_STYLE}>
          {t('representativeLetter.searchLabel')}
          <input
            id="representative-letter-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('representativeLetter.searchPlaceholder')}
            style={CONTROL_STYLE}
          />
        </label>
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
        <label htmlFor="representative-letter-state-filter" style={FIELD_STYLE}>
          {t('representativeLetter.stateFilterLabel')}
          <select
            id="representative-letter-state-filter"
            value={stateCode}
            onChange={(event) => onStateChange(event.target.value)}
            style={CONTROL_STYLE}
          >
            <option value="">{t('representativeLetter.allStates')}</option>
            {representativeStates.map(([optionCode, stateName]) => (
              <option key={optionCode} value={optionCode}>
                {stateName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="representative-letter__search-hint">
        {t('representativeLetter.locationPrivacyHint')}
      </p>
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
      {!locationActive || selectedConstituencyNumber !== null ? (
        <SearchResults
          active={active}
          matches={matches}
          recipientId={recipientId}
          onSelect={onSelect}
        />
      ) : null}
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
    <section
      className="representative-letter__selection"
      aria-labelledby="representative-letter-selection-title"
      style={STACKED_PANEL_STYLE}
    >
      <h3 id="representative-letter-selection-title">
        {t('representativeLetter.selectionTitle')}
      </h3>
      <strong>{representative.fullName}</strong>
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
    </section>
  );
};

type MailtoActionProps = {
  mailtoLink: MailtoLink | null;
};

const MailtoAction = ({ mailtoLink }: MailtoActionProps) => {
  const { t } = useTranslation();
  const descriptionId = 'representative-letter-mailto-description';

  return (
    <section
      className="representative-letter__mailto"
      aria-labelledby="representative-letter-mailto-title"
      style={MAILTO_PANEL_STYLE}
    >
      <h3 id="representative-letter-mailto-title">
        {t('representativeLetter.mailtoTitle')}
      </h3>
      {mailtoLink ? (
        <a
          className="app__button"
          href={mailtoLink.href}
          aria-describedby={descriptionId}
        >
          {t('representativeLetter.openMailClient')}
        </a>
      ) : (
        <button
          type="button"
          className="app__button"
          aria-describedby={descriptionId}
          disabled
        >
          {t('representativeLetter.openMailClient')}
        </button>
      )}
      <p id={descriptionId}>
        {mailtoLink
          ? t('representativeLetter.mailtoDescription')
          : t('representativeLetter.mailtoUnavailable')}
      </p>
      {mailtoLink && !mailtoLink.bodyIncluded ? (
        <output>{t('representativeLetter.mailtoBodyTooLong')}</output>
      ) : null}
    </section>
  );
};

/**
 * Renders the standalone, offline representative-letter workflow.
 *
 * @returns The representative-letter information and plain-text output views.
 */
export default function RepresentativeLetterPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [state, setState] = useState<RepresentativeLetterState>(() =>
    readRepresentativeLetterState(),
  );
  const [view, setView] = useState<RepresentativeLetterView>('letter');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
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
    setView('letter');
    setSearchQuery('');
    setLocationQuery('');
    setStateFilter('');
    setSelectedConstituencyNumber(null);
  };

  const updateRepresentativeQuery = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setLocationQuery('');
      setSelectedConstituencyNumber(null);
    }
  };

  const updateLocationQuery = (value: string) => {
    setLocationQuery(value);
    setSelectedConstituencyNumber(null);
    if (value.trim()) {
      setSearchQuery('');
    }
  };

  const updateStateFilter = (value: string) => {
    setStateFilter(value);
    setSelectedConstituencyNumber(null);
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
          <h2>{t('representativeLetter.title')}</h2>
          <p className="app__subtitle">
            {t('representativeLetter.description')}
          </p>
        </div>
        <Link className="app__link" to="/formpacks">
          {t('representativeLetter.backToOverview')}
        </Link>
      </div>

      <nav
        className="representative-letter__view-switch"
        aria-label={t('representativeLetter.viewNavigation')}
      >
        <button
          type="button"
          className="app__button"
          aria-pressed={view === 'information'}
          onClick={() => setView('information')}
        >
          {t('representativeLetter.informationTab')}
        </button>
        <button
          type="button"
          className="app__button"
          aria-pressed={view === 'letter'}
          onClick={() => setView('letter')}
        >
          {t('representativeLetter.letterTab')}
        </button>
      </nav>

      {view === 'information' ? (
        <div className="representative-letter__panel">
          <h3>{t('representativeLetter.processTitle')}</h3>
          <ol>
            <li>{t('representativeLetter.processRecipient')}</li>
            <li>{t('representativeLetter.processCopy')}</li>
          </ol>
          <CollapsibleSection
            id="representative-letter-background"
            title={t('representativeLetter.backgroundTitle')}
            className="representative-letter__background"
          >
            <p>{t('representativeLetter.backgroundText')}</p>
          </CollapsibleSection>
          <button
            type="button"
            className="app__button"
            onClick={() => setView('letter')}
          >
            {t('representativeLetter.start')}
          </button>
        </div>
      ) : (
        <div className="representative-letter__panel">
          {catalog && locationCatalog ? (
            <RecipientPicker
              representatives={representatives}
              locationCatalog={locationCatalog}
              query={searchQuery}
              locationQuery={locationQuery}
              stateCode={stateFilter}
              selectedConstituencyNumber={selectedConstituencyNumber}
              recipientId={state.recipientId}
              onQueryChange={updateRepresentativeQuery}
              onLocationQueryChange={updateLocationQuery}
              onStateChange={updateStateFilter}
              onSelectConstituency={setSelectedConstituencyNumber}
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
            <SelectedRecipient representative={selectedRepresentative} />
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
            />
          </div>

          <p style={SUBTLE_TEXT_STYLE}>
            {t('representativeLetter.signatureNotice')}
          </p>

          <MailtoAction mailtoLink={mailtoLink} />
        </div>
      )}

      <div className="representative-letter__actions">
        <button type="button" className="app__button" onClick={reset}>
          {t('representativeLetter.reset')}
        </button>
      </div>
    </section>
  );
}
