/**
 * Provides repository-related utility functions, such as resolving the repo URL.
 */

import { emptyStringToNull } from './utils';

export const DEFAULT_REPO_URL = 'https://github.com/WBT112/mecfs-paperwork/';

export const getRepoUrl = (): string => {
  const env = import.meta.env as { VITE_REPO_URL?: string };
  const repoUrl = env.VITE_REPO_URL;

  return emptyStringToNull(repoUrl) ?? DEFAULT_REPO_URL;
};
