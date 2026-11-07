import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../i18n/useLocale';
import {
  buildFormpackListItems,
  buildRepresentativeLetterListItem,
  CATEGORY_I18N_KEYS,
  countGroupedHelpOffers,
  filterHelpOffersByQuery,
  groupHelpOffersByCategory,
  readResumeFormpackId,
} from './formpack-list/formpackListHelpers';
import { useFormpackCatalog } from './formpack-list/useFormpackCatalog';

/**
 * Shows the searchable overview of available help offers.
 *
 * @returns The help-offer overview page.
 */
export default function FormpackListPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [query, setQuery] = useState('');
  const { manifests, isLoading, errorMessage, isI18nReady } =
    useFormpackCatalog({
      locale,
      translate: t,
    });

  const formpackItems = useMemo(
    () => (isI18nReady ? buildFormpackListItems(manifests, t) : []),
    [manifests, isI18nReady, t],
  );
  const helpOffers = useMemo(
    () =>
      isI18nReady
        ? [buildRepresentativeLetterListItem(t), ...formpackItems]
        : [],
    [formpackItems, isI18nReady, t],
  );
  const groups = useMemo(
    () => groupHelpOffersByCategory(filterHelpOffersByQuery(helpOffers, query)),
    [helpOffers, query],
  );
  const resultCount = useMemo(() => countGroupedHelpOffers(groups), [groups]);

  const resumeFormpack = useMemo(() => {
    const resumeId = readResumeFormpackId();
    if (!resumeId) {
      return null;
    }

    return formpackItems.find((item) => item.formpackId === resumeId) ?? null;
  }, [formpackItems]);

  if (isLoading || !isI18nReady) {
    return (
      <section className="app__card">
        <h2>{t('formpackListTitle')}</h2>
        <p>{t('formpackLoading')}</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="app__card">
        <h2>{t('formpackListTitle')}</h2>
        <p className="app__error">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="app__card formpack-list-page">
      <div className="app__card-header">
        <h2>{t('formpackListTitle')}</h2>
      </div>
      <div className="formpack-list__controls">
        <output aria-live="polite" className="formpack-list__status">
          {t('formpackSearchResultsStatus')} {resultCount}
        </output>
        <input
          type="search"
          className="formpack-list__search"
          placeholder={t('formpackSearchPlaceholder')}
          aria-label={t('formpackSearchAriaLabel')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="formpack-list__categories">
        {groups.map(([category, items]) => {
          const headingId = `formpack-list-category-${category}`;

          return (
            <section
              className="formpack-list__category"
              aria-labelledby={headingId}
              key={category}
            >
              <h3 className="formpack-list__category-heading" id={headingId}>
                {t(CATEGORY_I18N_KEYS[category])}
              </h3>
              <div className="formpack-list">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    className="formpack-card"
                    to={item.href}
                    aria-label={item.ariaLabel}
                  >
                    <div>
                      <h3>{item.title}</h3>
                      <p className="formpack-card__description">
                        {item.description}
                      </p>
                    </div>
                    <div className="formpack-card__link">{item.openLabel}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {groups.length === 0 && (
        <p className="formpack-list__empty">{t('formpackSearchEmpty')}</p>
      )}
      {resumeFormpack && (
        <p>
          <Link
            className="app__button formpack-list__resume-link"
            to={resumeFormpack.href}
            aria-label={resumeFormpack.ariaLabel}
          >
            {t('formpackResumeLast')}
          </Link>
        </p>
      )}
    </section>
  );
}
