import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadFormpackI18n } from '../i18n/formpack';
import { useLocale } from '../i18n/useLocale';
import { listFormpacks } from '../formpacks/loader';
import { filterVisibleFormpacks } from '../formpacks/visibility';
import type { FormpackManifest } from '../formpacks/types';
import type { SupportedLocale } from '../i18n/locale';

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
      } catch (error) {
        if (!isActive) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('formpackListErrorFallback'),
        );
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
      {manifests.length > 0 ? (
        <div className="formpack-list">
          {manifests.map((manifest) => {
            const namespace = `formpack:${manifest.id}`;
            const title = t(manifest.titleKey, {
              ns: namespace,
              defaultValue: manifest.titleKey,
            });
            const description = t(manifest.descriptionKey, {
              ns: namespace,
              defaultValue: manifest.descriptionKey,
            });

            return (
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
            );
          })}
        </div>
      ) : (
        <p className="formpack-records__empty">{t('formpackListEmpty')}</p>
      )}
    </section>
  );
}
