import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useLocale } from '../../../i18n/useLocale';
import { representativeLetterTextCatalogs } from '../data/catalogs';
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

  const reset = () => {
    skipNextWrite.current = true;
    clearRepresentativeLetterState();
    setState(createDefaultRepresentativeLetterState());
  };

  const textCatalog = representativeLetterTextCatalogs[locale];
  const mailBody =
    state.bodyLength === 'short' ? textCatalog.shortBody : textCatalog.longBody;

  return (
    <section
      className="app__card representative-letter"
      data-tool-id={REPRESENTATIVE_LETTER_TOOL_ID}
    >
      <div className="representative-letter__header">
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
          <output className="representative-letter__notice">
            {t('representativeLetter.catalogPending')}
          </output>
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
              value=""
              placeholder={t('representativeLetter.recipientPlaceholder')}
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
