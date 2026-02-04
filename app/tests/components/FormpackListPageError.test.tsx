import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FormpackListPage from '../../src/pages/FormpackListPage';
import { TestRouter } from '../setup/testRouter';
import { listFormpacks } from '../../src/formpacks/loader';

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: vi.fn(),
}));

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/formpacks/visibility', () => ({
  filterVisibleFormpacks: vi.fn((data: unknown): unknown[] =>
    Array.isArray(data) ? data : [],
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
  }),
}));

describe('FormpackListPage Error State', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders an error message when formpacks fail to load', async () => {
    const errorMessage = 'Failed to load formpacks';
    vi.mocked(listFormpacks).mockRejectedValue(new Error(errorMessage));

    render(
      <TestRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FormpackListPage />} />
        </Routes>
      </TestRouter>,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
    });

    // Check for error message
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('formpackListTitle')).toBeInTheDocument();
  });
});
