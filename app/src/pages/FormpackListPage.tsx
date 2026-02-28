import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadFormpackI18n } from '../i18n/formpack';
import { useLocale } from '../i18n/useLocale';
import { listFormpacks } from '../formpacks/loader';
import { filterVisibleFormpacks } from '../formpacks/visibility';
import type { FormpackCategory, FormpackManifest } from '../formpacks/types';
import type { SupportedLocale } from '../i18n/locale';

const CATEGORY_ORDER: FormpackCategory[] = [
  'insurer',
  'doctor',
  'general',
  'other',
];

const CATEGORY_I18N_KEYS: Record<FormpackCategory, string> = {
  insurer: 'formpackCategoryInsurer',
  doctor: 'formpackCategoryDoctor',
  general: 'formpackCategoryGeneral',
  other: 'formpackCategoryOther',
};

type TranslatedManifest = {
  manifest: FormpackManifest;
  title: string;
  description: string;
  searchBlob: string;
};

const LAST_ACTIVE_FORMPACK_KEY = 'mecfs-paperwork.lastActiveFormpackId';

const readResumeFormpackId = (): string | null => {
  try {
    const formpackId = globalThis.localStorage.getItem(
      LAST_ACTIVE_FORMPACK_KEY,
    );
    if (!formpackId) {
      return null;
    }

    const activeRecordId = globalThis.localStorage.getItem(
      `mecfs-paperwork.activeRecordId.${formpackId}`,
    );
    return activeRecordId ? formpackId : null;
  } catch {
    return null;
  }
};

const buildTranslatedManifests = (
  manifests: FormpackManifest[],
  t: (key: string, options?: Record<string, unknown>) => string,
): TranslatedManifest[] =>
  manifests.map((manifest) => {
    const namespace = `formpack:${manifest.id}`;
    const title = t(manifest.titleKey, {
      ns: namespace,
      defaultValue: manifest.titleKey,
    });
    const description = t(manifest.descriptionKey, {
      ns: namespace,
      defaultValue: manifest.descriptionKey,
    });
    const keywords = (manifest.meta?.keywords ?? []).join(' ');
    const searchBlob = `${title} ${description} ${keywords}`.toLowerCase();

    return { manifest, title, description, searchBlob };
  });

const filterByQuery = (
  items: TranslatedManifest[],
  query: string,
): TranslatedManifest[] => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return items;
  }

  return items.filter((item) =>
    tokens.every((tok) => item.searchBlob.includes(tok)),
  );
};

const groupByCategory = (
  items: TranslatedManifest[],
): [FormpackCategory, TranslatedManifest[]][] => {
  const groups = new Map<FormpackCategory, TranslatedManifest[]>();

  for (const item of items) {
    const category = item.manifest.meta?.category ?? 'other';
    const list = groups.get(category);
    if (list) {
      list.push(item);
    } else {
      groups.set(category, [item]);
    }
  }

  return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => [
    cat,
    groups.get(cat)!,
  ]);
};

const loadFormpackTranslations = async (
  manifests: FormpackManifest[],
  locale: SupportedLocale,
) => {
  await Promise.all(
    manifests.map((manifest) => loadFormpackI18n(manifest.id, locale)),
  );
};

/**
 * Shows the registry of available formpacks.
 */
export default function FormpackListPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [manifests, setManifests] = useState<FormpackManifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadManifests = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await listFormpacks();
        if (!isActive) {
          return;
        }
        setManifests(filterVisibleFormpacks(data));
      } catch {
        if (!isActive) {
          return;
        }
        setErrorMessage(t('formpackListErrorFallback'));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadManifests().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [t]);

  useEffect(() => {
    let isActive = true;

    const loadTranslations = async () => {
      if (!manifests.length) {
        setIsI18nReady(true);
        return;
      }

      setIsI18nReady(false);
      await loadFormpackTranslations(manifests, locale);

      if (isActive) {
        setIsI18nReady(true);
      }
    };

    loadTranslations().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [locale, manifests]);

  const translated = useMemo(
    () => (isI18nReady ? buildTranslatedManifests(manifests, t) : []),
    [manifests, isI18nReady, t],
  );

  const groups = useMemo(
    () => groupByCategory(filterByQuery(translated, query)),
    [translated, query],
  );

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
        <input
          type="search"
          className="formpack-list__search"
          placeholder={t('formpackSearchPlaceholder')}
          aria-label={t('formpackSearchAriaLabel')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
