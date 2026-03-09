import type { FormpackManifest } from './types';

const env = import.meta.env as {
  DEV: boolean;
  VITE_SHOW_DEV_FORMPACKS?: string;
};

export const getShowDevFormpacks = (
  isDev: boolean = env.DEV,
  override: string | undefined = env.VITE_SHOW_DEV_FORMPACKS,
): boolean => isDev || override === 'true';

export const getDevUiEnabled = (
  isDev: boolean = env.DEV,
  override: string | undefined = env.VITE_SHOW_DEV_FORMPACKS,
): boolean => isDev || override === 'true';

export const isDevUiEnabled = getDevUiEnabled();

export const showDevFormpacks = getShowDevFormpacks();

export const isFormpackVisible = (
  manifest: Pick<FormpackManifest, 'visibility'>,
  showDev: boolean = showDevFormpacks,
): boolean => manifest.visibility !== 'dev' || showDev;

export const filterVisibleFormpacks = (
  manifests: FormpackManifest[],
  showDev: boolean = showDevFormpacks,
): FormpackManifest[] =>
  manifests.filter((manifest) => isFormpackVisible(manifest, showDev));
