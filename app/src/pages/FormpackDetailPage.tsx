import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadFormpackI18n } from '../i18n/formpack';
import { translateUiSchema } from '../i18n/rjsf';
import { useLocale } from '../i18n/useLocale';
import {
  FormpackLoaderError,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
} from '../formpacks/loader';
import type { FormpackManifest } from '../formpacks/types';
import type { ComponentType } from 'react';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type RjsfFormProps = FormProps<FormDataState>;

const LazyForm = lazy(async () => {
  const module = await import('@rjsf/core');
  return { default: module.default as ComponentType<RjsfFormProps> };
});

const buildErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  if (error instanceof FormpackLoaderError) {
    if (error.code === 'schema_not_found') {
      return t('formpackSchemaNotFound');
    }

    if (error.code === 'schema_invalid') {
      return t('formpackSchemaInvalid');
    }

    if (error.code === 'schema_unavailable') {
      return t('formpackSchemaUnavailable');
    }

    if (error.code === 'ui_schema_not_found') {
      return t('formpackUiSchemaNotFound');
    }

    if (error.code === 'ui_schema_invalid') {
      return t('formpackUiSchemaInvalid');
    }

    if (error.code === 'ui_schema_unavailable') {
      return t('formpackUiSchemaUnavailable');
    }

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
  const { t, i18n } = useTranslation();
  const { locale } = useLocale();
  const { id } = useParams();
  const [manifest, setManifest] = useState<FormpackManifest | null>(null);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<FormDataState>({});
  const [validator, setValidator] = useState<ValidatorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFormpackIdRef = useRef<string | undefined>(undefined);

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
        const [schemaData, uiSchemaData] = await Promise.all([
          loadFormpackSchema(formpackId),
          loadFormpackUiSchema(formpackId),
        ]);
        if (!isActive) {
          return;
        }
        const shouldResetFormData = lastFormpackIdRef.current !== formpackId;
        setManifest(data);
        setSchema(schemaData as RJSFSchema);
        setUiSchema(uiSchemaData as UiSchema);
        if (shouldResetFormData) {
          setFormData({});
          lastFormpackIdRef.current = formpackId;
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setManifest(null);
        setSchema(null);
        setUiSchema(null);
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
      setManifest(null);
      setSchema(null);
      setUiSchema(null);
      setFormData({});
      setValidator(null);
      lastFormpackIdRef.current = undefined;
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
  const activeLanguage = i18n.language;
  const translatedUiSchema = useMemo(() => {
    void activeLanguage;
    return uiSchema ? translateUiSchema(uiSchema, t, namespace) : null;
  }, [activeLanguage, namespace, t, uiSchema]);

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

  const handleFormChange: NonNullable<RjsfFormProps['onChange']> = (event) => {
    setFormData(event.formData as FormDataState);
  };

  const handleFormSubmit: NonNullable<RjsfFormProps['onSubmit']> = (
    event,
    submitEvent,
  ) => {
    submitEvent?.preventDefault();
    setFormData(event.formData as FormDataState);
  };

  useEffect(() => {
    let isActive = true;

    const loadValidator = async () => {
      const module = await import('@rjsf/validator-ajv8');
      if (isActive) {
        setValidator(module.default);
      }
    };

    void loadValidator();

    return () => {
      isActive = false;
    };
  }, []);

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
        <div className="formpack-detail__assets">
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
        <div className="formpack-detail__form">
          <div className="formpack-detail__section">
            <h3>{t('formpackFormHeading')}</h3>
            {schema && translatedUiSchema && validator && (
              <Suspense fallback={<p>{t('formpackLoading')}</p>}>
                <LazyForm
                  className="formpack-form"
                  schema={schema}
                  uiSchema={translatedUiSchema}
                  validator={validator}
                  formData={formData}
                  onChange={handleFormChange}
                  onSubmit={handleFormSubmit}
                  noHtml5Validate
                  showErrorList={false}
                >
                  <div className="formpack-form__actions">
                    <button
                      type="button"
                      className="app__button"
                      onClick={() => setFormData({})}
                    >
                      {t('formpackFormReset')}
                    </button>
                  </div>
                </LazyForm>
              </Suspense>
            )}
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackFormPreviewHeading')}</h3>
            <pre className="formpack-preview">
              {Object.keys(formData).length
                ? JSON.stringify(formData, null, 2)
                : t('formpackFormPreviewEmpty')}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
