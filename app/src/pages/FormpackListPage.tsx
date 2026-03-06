import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../i18n/useLocale';
import {
  buildTranslatedManifests,
  CATEGORY_I18N_KEYS,
  countGroupedFormpacks,
  filterFormpacksByQuery,
  groupFormpacksByCategory,
  readResumeFormpackId,
} from './formpack-list/formpackListHelpers';
import { useFormpackCatalog } from './formpack-list/useFormpackCatalog';

/**
 * Shows the registry of available formpacks.
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

  const translated = useMemo(
    () => (isI18nReady ? buildTranslatedManifests(manifests, t) : []),
    [manifests, isI18nReady, t],
  );

  const groups = useMemo(
    () => groupFormpacksByCategory(filterFormpacksByQuery(translated, query)),
    [translated, query],
  );
  const resultCount = useMemo(() => countGroupedFormpacks(groups), [groups]);

  const resumeFormpack = useMemo(() => {
    const resumeId = readResumeFormpackId();
    if (!resumeId) {
      return null;
    }

    return translated.find((item) => item.manifest.id === resumeId) ?? null;
  }, [translated]);

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
    <section className="app__card">
      <div className="app__card-header">
        <div>
          <h2>{t('formpackListTitle')}</h2>
          <p className="app__subtitle">{t('formpackListDescription')}</p>
        </div>
      </div>
      {resumeFormpack && (
        <p>
          <Link
            className="app__button formpack-list__resume-link"
            to={`/formpacks/${resumeFormpack.manifest.id}`}
            aria-label={t('formpackOpenWithTitle', {
              title: resumeFormpack.title,
            })}
          >
            {t('formpackResumeLast')}
          </Link>
        </p>
      )}
      {manifests.length > 0 && (
        <>
          <input
            type="search"
            className="formpack-list__search"
            placeholder={t('formpackSearchPlaceholder')}
            aria-label={t('formpackSearchAriaLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <output aria-live="polite" className="formpack-list__status">
            {t('formpackSearchResultsStatus')} {resultCount}
          </output>
        </>
      )}
      {groups.length > 0 &&
        groups.map(([category, items]) => (
          <div key={category}>
            <h3 className="formpack-list__category-heading">
              {t(CATEGORY_I18N_KEYS[category])}
            </h3>
            <div className="formpack-list">
              {items.map(({ manifest, title, description }) => (
                <Link
                  key={manifest.id}
                  className="formpack-card"
                  to={`/formpacks/${manifest.id}`}
                  aria-label={t('formpackOpenWithTitle', { title })}
                >
                  <div>
                    <h3>{title}</h3>
                    <p className="formpack-card__description">{description}</p>
                  </div>
                  <div className="formpack-card__link">{t('formpackOpen')}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      {groups.length === 0 && manifests.length > 0 && (
        <p className="formpack-list__empty">{t('formpackSearchEmpty')}</p>
      )}
      {manifests.length === 0 && (
        <p className="formpack-records__empty">{t('formpackListEmpty')}</p>
      )}
    </section>
  );
}
