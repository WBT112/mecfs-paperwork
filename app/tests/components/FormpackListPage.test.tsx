import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FormpackListPage from '../../src/pages/FormpackListPage';
import { TestRouter } from '../setup/testRouter';

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: vi.fn().mockResolvedValue([
    {
      id: 'formpack-1',
      version: '1.0.0',
      defaultLocale: 'en',
      locales: ['en'],
      titleKey: 'Formpack 1',
      descriptionKey: 'Description 1',
      exports: ['json'],
      visibility: 'public',
    },
    {
      id: 'formpack-2',
      version: '1.0.0',
      defaultLocale: 'en',
      locales: ['en'],
      titleKey: 'Formpack 2',
      descriptionKey: 'Description 2',
      exports: ['json'],
      visibility: 'public',
    },
  ]),
}));

const mockT = (key: string) => key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'de' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

describe('FormpackListPage', () => {
  it('renders a list of formpacks and navigates to the detail page on click', async () => {
    const user = userEvent.setup();
    render(
      <TestRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FormpackListPage />} />
          <Route
            path="/formpacks/:id"
            element={
              <div>
                <h2>Formpack Detail Page</h2>
              </div>
            }
          />
        </Routes>
      </TestRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
    });

    const formpack1Heading = await screen.findByText('Formpack 1');
    const formpack1Link = formpack1Heading.closest('a');

    expect(formpack1Link).toBeTruthy();
    await user.click(formpack1Link as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Formpack Detail Page')).toBeInTheDocument();
    });
  });
});
