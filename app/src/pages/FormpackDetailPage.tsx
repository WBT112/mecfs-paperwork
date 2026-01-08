import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadFormpackI18n } from '../i18n/formpack';
import { useLocale } from '../i18n/useLocale';
import { FormpackLoaderError, loadFormpackManifest } from '../formpacks/loader';
import type { FormpackManifest } from '../formpacks/types';

const buildErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  if (error instanceof FormpackLoaderError) {
    if (error.code === 'not_found') {
      return t('formpackNotFound');
    }

    if (error.code === 'unsupported') {
      return t('formpackUnsupported');
    }

    if (error.code === 'invalid') {
      return t('formpackInvalid');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t('formpackLoadError');
};

/**
 * Shows formpack metadata with translations loaded for the active locale.
 */
export default function FormpackDetailPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = useParams();
  const [manifest, setManifest] = useState<FormpackManifest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadManifest = async (formpackId: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await loadFormpackManifest(formpackId);
        if (!isActive) {
          return;
        }
        await loadFormpackI18n(formpackId, locale);
        if (!isActive) {
          return;
        }
        setManifest(data);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setManifest(null);
        setErrorMessage(buildErrorMessage(error, t));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      void loadManifest(id);
    } else {
      setErrorMessage(t('formpackMissingId'));
      setIsLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [id, locale, t]);

  const namespace = useMemo(
    () => (manifest ? `formpack:${manifest.id}` : undefined),
    [manifest],
  );

  const title = manifest
    ? t(manifest.titleKey, {
        ns: namespace,
        defaultValue: manifest.titleKey,
      })
    : '';

  const description = manifest
    ? t(manifest.descriptionKey, {
        ns: namespace,
        defaultValue: manifest.descriptionKey,
      })
    : '';

  if (isLoading) {
    return (
      <section className="app__card">
        <h2>{t('formpackDetailTitle')}</h2>
        <p>{t('formpackLoading')}</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="app__card">
        <h2>{t('formpackDetailTitle')}</h2>
        <p className="app__error">{errorMessage}</p>
        <Link className="app__link" to="/formpacks">
          {t('formpackBackToList')}
        </Link>
      </section>
    );
  }

  if (!manifest) {
    return null;
  }

  return (
    <section className="app__card">
      <div className="app__card-header">
        <div>
          <h2>{title}</h2>
          <p className="app__subtitle">{description}</p>
        </div>
        <Link className="app__link" to="/formpacks">
          {t('formpackBackToList')}
        </Link>
      </div>
      <div className="formpack-detail">
        <div className="formpack-detail__section">
          <h3>{t('formpackDetailsHeading')}</h3>
          <dl>
            <div>
              <dt>{t('formpackId')}</dt>
              <dd>{manifest.id}</dd>
            </div>
            <div>
              <dt>{t('formpackVersion')}</dt>
              <dd>{manifest.version}</dd>
            </div>
            <div>
              <dt>{t('formpackDefaultLocale')}</dt>
              <dd>{manifest.defaultLocale}</dd>
            </div>
            <div>
              <dt>{t('formpackLocales')}</dt>
              <dd>{manifest.locales.join(', ')}</dd>
            </div>
          </dl>
        </div>
        <div className="formpack-detail__section">
          <h3>{t('formpackExportsHeading')}</h3>
          <dl>
            <div>
              <dt>{t('formpackExports')}</dt>
              <dd>{manifest.exports.join(', ')}</dd>
            </div>
          </dl>
        </div>
        {manifest.docx && (
          <div className="formpack-detail__section">
            <h3>{t('formpackDocxHeading')}</h3>
            <dl>
              <div>
                <dt>{t('formpackDocxTemplateA4')}</dt>
                <dd>{manifest.docx.templates.a4}</dd>
              </div>
              <div>
                <dt>{t('formpackDocxTemplateWallet')}</dt>
                <dd>{manifest.docx.templates.wallet}</dd>
              </div>
              <div>
                <dt>{t('formpackDocxMapping')}</dt>
                <dd>{manifest.docx.mapping}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
