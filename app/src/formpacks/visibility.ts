import type { FormpackManifest } from './types';

export const getShowDevFormpacks = (
  isDev: boolean = import.meta.env.DEV,
  override: string | undefined = import.meta.env.VITE_SHOW_DEV_FORMPACKS,
): boolean => isDev || override === 'true';

export const getDevUiEnabled = (
  isDev: boolean = import.meta.env.DEV,
): boolean => isDev;

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
