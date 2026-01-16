/**
 * Provides repository-related utility functions, such as resolving the repo URL.
 */

import { emptyStringToNull } from './utils';

export const DEFAULT_REPO_URL = 'https://github.com/WBT112/mecfs-paperwork/';

export const getRepoUrl = (): string | null => {
  const repoUrl = import.meta.env.VITE_REPO_URL;

  if (repoUrl === undefined) {
    return DEFAULT_REPO_URL;
  }

  return emptyStringToNull(repoUrl);
};
