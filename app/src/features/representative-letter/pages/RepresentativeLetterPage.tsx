import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useLocale } from '../../../i18n/useLocale';
import {
  representativeLetterTextCatalogs,
  type RepresentativeCatalog,
  type RepresentativeCatalogEntry,
} from '../data/catalogs';
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

const RESULT_LIMIT = 50;
const STACKED_PANEL_STYLE: CSSProperties = {
  display: 'grid',
  gap: '0.85rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '10px',
  padding: '1rem',
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
  query: string;
  stateCode: string;
  recipientId: string | null;
  onQueryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onSelect: (recipientId: string) => void;
};

const RecipientPicker = ({
  representatives,
  query,
  stateCode,
  recipientId,
  onQueryChange,
  onStateChange,
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
  const active = query.trim() !== '' || stateCode !== '';
  const matches = active
    ? filterRepresentatives(representatives, query, stateCode)
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
      <SearchResults
        active={active}
        matches={matches}
        recipientId={recipientId}
        onSelect={onSelect}
      />
    </section>
  );
};

const useRepresentativeCatalog = (): {
  catalog: RepresentativeCatalog | null;
  failed: boolean;
} => {
  const [catalog, setCatalog] = useState<RepresentativeCatalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadRepresentativeCatalog().then(
      (loadedCatalog) => setCatalog(loadedCatalog),
      () => setFailed(true),
    );
  }, []);

  return { catalog, failed };
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
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const { catalog, failed: catalogFailed } = useRepresentativeCatalog();
  const skipNextWrite = useRef(false);

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    writeRepresentativeLetterState(state);
  }, [state]);

  const setView = (view: RepresentativeLetterView) => {
    setState((current) => ({ ...current, view }));
  };

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
    setSearchQuery('');
    setStateFilter('');
  };

  const textCatalog = representativeLetterTextCatalogs[locale];
  const mailBody =
    state.bodyLength === 'short' ? textCatalog.shortBody : textCatalog.longBody;
  const representatives = catalog?.representatives ?? [];
  const selectedRepresentative = representatives.find(
    ({ id }) => id === state.recipientId,
  );

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
          aria-pressed={state.view === 'information'}
          onClick={() => setView('information')}
        >
          {t('representativeLetter.informationTab')}
        </button>
        <button
          type="button"
          className="app__button"
          aria-pressed={state.view === 'letter'}
          onClick={() => setView('letter')}
        >
          {t('representativeLetter.letterTab')}
        </button>
      </nav>

      {state.view === 'information' ? (
        <div className="representative-letter__panel">
          <h3>{t('representativeLetter.processTitle')}</h3>
          <ol>
            <li>{t('representativeLetter.processRecipient')}</li>
            <li>{t('representativeLetter.processOptions')}</li>
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
          {catalog ? (
            <RecipientPicker
              representatives={representatives}
              query={searchQuery}
              stateCode={stateFilter}
              recipientId={state.recipientId}
              onQueryChange={setSearchQuery}
              onStateChange={setStateFilter}
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

          <div className="representative-letter__outputs">
            <label htmlFor="representative-letter-recipient">
              {t('representativeLetter.recipientLabel')}
            </label>
            <textarea
              id="representative-letter-recipient"
              rows={2}
              readOnly
              value={selectedRepresentative?.email ?? ''}
              placeholder={t(
                selectedRepresentative
                  ? 'representativeLetter.recipientMissingPlaceholder'
                  : 'representativeLetter.recipientPlaceholder',
              )}
            />

            <label htmlFor="representative-letter-subject">
              {t('representativeLetter.subjectLabel')}
            </label>
            <input
              id="representative-letter-subject"
              type="text"
              readOnly
              value={textCatalog.subject}
              placeholder={t('representativeLetter.subjectPlaceholder')}
            />

            <label htmlFor="representative-letter-body">
              {t('representativeLetter.bodyLabel')}
            </label>
            <textarea
              id="representative-letter-body"
              rows={12}
              readOnly
              value={mailBody}
              placeholder={t('representativeLetter.bodyPlaceholder')}
            />
          </div>
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
