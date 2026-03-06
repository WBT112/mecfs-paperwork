import { useEffect, useRef, useState } from 'react';
import type { SupportedLocale } from '../../../i18n/locale';
import { createAsyncGuard } from '../../../lib/asyncGuard';
import {
  USER_TIMING_NAMES,
  startUserTiming,
} from '../../../lib/performance/userTiming';
import type { FormpackManifest } from '../../../formpacks';
import { formpackAssetHelpers } from '../helpers/formpackAssetHelpers';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Dependencies required to load the currently selected formpack assets.
 *
 * @remarks
 * RATIONALE: The route parameter and locale together define which static
 * assets must be available before the detail page can render the form.
 */
export interface UseFormpackLoaderOptions {
  formpackId?: string;
  locale: SupportedLocale;
  onFormpackChanged: () => void;
  refreshToken?: number;
  t: (key: string) => string;
}

/**
 * Result state for the formpack asset loader hook.
 */
export interface UseFormpackLoaderResult {
  errorMessage: string | null;
  isLoading: boolean;
  manifest: FormpackManifest | null;
  schema: RJSFSchema | null;
  uiSchema: UiSchema | null;
}

/**
 * Loads manifest, schema, and UI schema for the active formpack route.
 *
 * @remarks
 * RATIONALE: `FormpackDetailPage` should not manage static asset orchestration
 * inline because that obscures business workflows such as import/export and
 * record management. This hook keeps the page focused on composition.
 *
 * @param options - Route and locale context required to resolve static formpack assets.
 * @returns The current asset-loading state for the active formpack.
 */
export const useFormpackLoader = ({
  formpackId,
  locale,
  onFormpackChanged,
  refreshToken = 0,
  t,
}: UseFormpackLoaderOptions): UseFormpackLoaderResult => {
  const [manifest, setManifest] = useState<FormpackManifest | null>(null);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFormpackIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const guard = createAsyncGuard();

    const resetFormpack = () => {
      setManifest(null);
      setSchema(null);
      setUiSchema(null);
    };

    const loadManifest = async (requestedFormpackId: string) => {
      const timing = startUserTiming(USER_TIMING_NAMES.formpackLoadTotal);
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await formpackAssetHelpers.loadFormpackAssets(
          requestedFormpackId,
          locale,
          t,
        );
        if (!guard.isActive()) {
          return;
        }

        if (result.errorMessage) {
          resetFormpack();
          setErrorMessage(result.errorMessage);
          return;
        }

        const shouldResetFormData =
          lastFormpackIdRef.current !== requestedFormpackId;
        setManifest(result.manifest);
        setSchema(result.schema);
        setUiSchema(result.uiSchema);
        if (shouldResetFormData) {
          onFormpackChanged();
          lastFormpackIdRef.current = requestedFormpackId;
        }
      } finally {
        timing.end();
        if (guard.isActive()) {
          setIsLoading(false);
        }
      }
    };

    if (formpackId) {
      loadManifest(formpackId).catch((error: unknown) => {
        if (!guard.isActive()) {
          return;
        }

        resetFormpack();
        setErrorMessage(formpackAssetHelpers.buildErrorMessage(error, t));
      });
    } else {
      resetFormpack();
      lastFormpackIdRef.current = undefined;
      setErrorMessage(t('formpackMissingId'));
      setIsLoading(false);
    }

    return guard.deactivate;
  }, [formpackId, locale, onFormpackChanged, refreshToken, t]);

  return {
    errorMessage,
    isLoading,
    manifest,
    schema,
    uiSchema,
  };
};
