import { vi } from 'vitest';

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/formpacks/visibility', () => ({
  filterVisibleFormpacks: vi.fn((data: unknown): unknown[] =>
    Array.isArray(data) ? data : [],
  ),
}));

vi.mock('react-i18next', () => {
  // Stable reference to avoid infinite re-renders from useEffect([t]).
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
    initReactI18next: { type: '3rdParty', init: () => undefined },
  };
});

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({ locale: 'de' }),
}));
