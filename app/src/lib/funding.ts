import { FUNDING_URL } from './funding.generated';

export const getSponsorUrl = (): string | null => {
  if (FUNDING_URL === null) {
    return null;
  }

  const trimmed = FUNDING_URL.trim();
  return trimmed.length > 0 ? trimmed : null;
};
