import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import './formpackListPage.mockSetup';
import FormpackListPage from '../../src/pages/FormpackListPage';
import { TestRouter } from '../setup/testRouter';

const TITLE_INSURER = 'Insurer Pack';
const TITLE_DOCTOR = 'Doctor Pack';
const TITLE_PLAIN = 'Plain Pack';

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: vi.fn().mockResolvedValue([
    {
      id: 'formpack-insurer',
      version: '1.0.0',
      defaultLocale: 'de',
      locales: ['de'],
      titleKey: 'Insurer Pack',
      descriptionKey: 'Insurer description',
      exports: ['json'],
      visibility: 'public',
      meta: { category: 'insurer', keywords: ['kasse', 'antrag'] },
    },
    {
      id: 'formpack-doctor',
      version: '1.0.0',
      defaultLocale: 'de',
      locales: ['de'],
      titleKey: 'Doctor Pack',
      descriptionKey: 'Doctor description',
      exports: ['json'],
      visibility: 'public',
      meta: { category: 'doctor', keywords: ['arzt', 'brief'] },
    },
    {
      id: 'formpack-plain',
      version: '1.0.0',
      defaultLocale: 'en',
      locales: ['en'],
      titleKey: 'Plain Pack',
      descriptionKey: 'Plain description',
      exports: ['json'],
      visibility: 'public',
    },
  ]),
}));

const renderPage = () =>
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

const waitForLoaded = async () => {
  await waitFor(() => {
    expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
  });
};

describe('FormpackListPage', () => {
  it('renders formpacks grouped by category', async () => {
    renderPage();
    await waitForLoaded();

    expect(screen.getByText('formpackCategoryInsurer')).toBeInTheDocument();
    expect(screen.getByText('formpackCategoryDoctor')).toBeInTheDocument();
    expect(screen.getByText('formpackCategoryOther')).toBeInTheDocument();

    expect(screen.getByText(TITLE_INSURER)).toBeInTheDocument();
    expect(screen.getByText(TITLE_DOCTOR)).toBeInTheDocument();
    expect(screen.getByText(TITLE_PLAIN)).toBeInTheDocument();
  });

  it('navigates to the detail page on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForLoaded();

    const link = screen.getByText(TITLE_INSURER).closest('a');
    expect(link).toBeTruthy();
    await user.click(link as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Formpack Detail Page')).toBeInTheDocument();
    });
  });

  it('filters formpacks by search query', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(
      'formpackSearchPlaceholder',
    );
    await user.type(searchInput, 'kasse');

    await waitFor(() => {
      expect(screen.queryByText(TITLE_DOCTOR)).not.toBeInTheDocument();
    });
    expect(screen.getByText(TITLE_INSURER)).toBeInTheDocument();
    expect(screen.queryByText(TITLE_PLAIN)).not.toBeInTheDocument();
  });

  it('shows empty state when search yields no results', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(
      'formpackSearchPlaceholder',
    );
    await user.type(searchInput, 'xyznonexistent');

    expect(screen.getByText('formpackSearchEmpty')).toBeInTheDocument();
    expect(screen.queryByText(TITLE_INSURER)).not.toBeInTheDocument();
  });

  it('restores all formpacks when search is cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(
      'formpackSearchPlaceholder',
    );
    await user.type(searchInput, 'kasse');
    await waitFor(() => {
      expect(screen.queryByText(TITLE_DOCTOR)).not.toBeInTheDocument();
    });

    await user.clear(searchInput);
    await waitFor(() => {
      expect(screen.getByText(TITLE_DOCTOR)).toBeInTheDocument();
    });
    expect(screen.getByText(TITLE_INSURER)).toBeInTheDocument();
  });

  it('matches multiple search tokens with AND logic', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(
      'formpackSearchPlaceholder',
    );
    // "insurer" matches title, "antrag" matches keyword
    await user.type(searchInput, 'insurer antrag');
    await waitFor(() => {
      expect(screen.queryByText(TITLE_DOCTOR)).not.toBeInTheDocument();
    });
    expect(screen.getByText(TITLE_INSURER)).toBeInTheDocument();
  });

  it('renders a search input when formpacks exist', async () => {
    renderPage();
    await waitForLoaded();

    expect(
      screen.getByPlaceholderText('formpackSearchPlaceholder'),
    ).toBeInTheDocument();
  });
});
