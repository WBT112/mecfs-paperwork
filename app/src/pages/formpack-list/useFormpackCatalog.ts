import { useEffect, useState } from 'react';
import { loadFormpackI18n } from '../../i18n/formpack';
import { createAsyncGuard } from '../../lib/asyncGuard';
import { listFormpacks } from '../../formpacks/loader';
import { filterVisibleFormpacks } from '../../formpacks/visibility';
import type { FormpackManifest } from '../../formpacks/types';
import type { SupportedLocale } from '../../i18n/locale';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type UseFormpackCatalogArgs = {
  locale: SupportedLocale;
  translate: TranslateFn;
};

/**
 * Loads visible formpacks and primes their translation namespaces for the list page.
 *
 * @param args - Locale and translation access needed for loading and error handling.
 * @returns Local list loading state and visible manifests.
 * @remarks
 * NOTE: `args.locale` controls namespace preloading, while `args.translate`
 * is only used for the translated fallback error state.
 */
export const useFormpackCatalog = ({
  locale,
  translate,
}: UseFormpackCatalogArgs) => {
  const [manifests, setManifests] = useState<FormpackManifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    const guard = createAsyncGuard();

    const loadManifests = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await listFormpacks();
        if (!guard.isActive()) {
          return;
        }

        setManifests(filterVisibleFormpacks(data));
      } catch {
        if (!guard.isActive()) {
          return;
        }

        setErrorMessage(translate('formpackListErrorFallback'));
      } finally {
        if (guard.isActive()) {
          setIsLoading(false);
        }
      }
    };

    loadManifests().catch(() => undefined);

    return guard.deactivate;
  }, [translate]);

  useEffect(() => {
    const guard = createAsyncGuard();

    const loadTranslations = async () => {
      if (!manifests.length) {
        setIsI18nReady(true);
        return;
      }

      setIsI18nReady(false);

      await Promise.all(
        manifests.map((manifest) => loadFormpackI18n(manifest.id, locale)),
      );

      if (guard.isActive()) {
        setIsI18nReady(true);
      }
    };

    loadTranslations().catch(() => undefined);

    return guard.deactivate;
  }, [locale, manifests]);

  return {
    manifests,
    isLoading,
    errorMessage,
    isI18nReady,
  };
};
