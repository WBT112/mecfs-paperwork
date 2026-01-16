/**
 * Provides sponsorship-related utility functions, such as resolving the sponsor URL.
 */

import { FUNDING_URL } from './funding.generated';
import { emptyStringToNull } from './utils';

export const getSponsorUrl = (): string | null => {
  if (FUNDING_URL === null) {
    return null;
  }

  return emptyStringToNull(FUNDING_URL);
};
