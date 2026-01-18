import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FormpackListPage from '../../src/pages/FormpackListPage';

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: vi.fn().mockResolvedValue([
    {
      id: 'formpack-1',
      titleKey: 'Formpack 1',
      descriptionKey: 'Description 1',
    },
    {
      id: 'formpack-2',
      titleKey: 'Formpack 2',
      descriptionKey: 'Description 2',
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
    render(
      <MemoryRouter initialEntries={['/']}>
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
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
    });

    const formpack1Link = await screen.findByText('Formpack 1');
    await userEvent.click(formpack1Link);

    await waitFor(() => {
      expect(screen.getByText('Formpack Detail Page')).toBeInTheDocument();
    });
  });
});
