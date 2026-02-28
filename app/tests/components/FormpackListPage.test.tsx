import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './formpackListPage.mockSetup';
import FormpackListPage from '../../src/pages/FormpackListPage';
import { TestRouter } from '../setup/testRouter';
import { listFormpacks } from '../../src/formpacks/loader';
import type { FormpackManifest } from '../../src/formpacks/types';

const TITLE_INSURER = 'Insurer Pack';
const TITLE_DOCTOR = 'Doctor Pack';
const TITLE_PLAIN = 'Plain Pack';
const FORMPACK_ID_INSURER = 'formpack-insurer';

vi.mock('../../src/formpacks/loader', () => {
  const formpackVersion = '1.0.0';
  const localeDe = 'de';
  const localeEn = 'en';
  const exportJson = 'json';
  const visibilityPublic = 'public';
  const formpackIdInsurer = 'formpack-insurer';
  const formpackIdDoctor = 'formpack-doctor';
  const formpackIdPlain = 'formpack-plain';
  const titleInsurer = 'Insurer Pack';
  const titleDoctor = 'Doctor Pack';
  const titlePlain = 'Plain Pack';

  return {
    listFormpacks: vi.fn().mockResolvedValue([
      {
        id: formpackIdInsurer,
        version: formpackVersion,
        defaultLocale: localeDe,
        locales: [localeDe],
        titleKey: titleInsurer,
        descriptionKey: 'Insurer description',
        exports: [exportJson],
        visibility: visibilityPublic,
        meta: { category: 'insurer', keywords: ['kasse', 'antrag'] },
      },
      {
        id: formpackIdDoctor,
        version: formpackVersion,
        defaultLocale: localeDe,
        locales: [localeDe],
        titleKey: titleDoctor,
        descriptionKey: 'Doctor description',
        exports: [exportJson],
        visibility: visibilityPublic,
        meta: { category: 'doctor', keywords: ['arzt', 'brief'] },
      },
      {
        id: formpackIdPlain,
        version: formpackVersion,
        defaultLocale: localeEn,
        locales: [localeEn],
        titleKey: titlePlain,
        descriptionKey: 'Plain description',
        exports: [exportJson],
        visibility: visibilityPublic,
      },
    ]),
  };
});

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
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

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

  it('renders a resume shortcut when a last active draft exists', async () => {
    window.localStorage.setItem(
      'mecfs-paperwork.lastActiveFormpackId',
      FORMPACK_ID_INSURER,
    );
    window.localStorage.setItem(
      'mecfs-paperwork.activeRecordId.formpack-insurer',
      'record-1',
    );

    renderPage();
    await waitForLoaded();

    expect(screen.getByText('formpackResumeLast')).toBeInTheDocument();
  });

  it('hides the resume shortcut when the active record marker is missing', async () => {
    window.localStorage.setItem(
      'mecfs-paperwork.lastActiveFormpackId',
      FORMPACK_ID_INSURER,
    );

    renderPage();
    await waitForLoaded();

    expect(screen.queryByText('formpackResumeLast')).not.toBeInTheDocument();
  });

  it('shows empty registry message and no search input when no formpacks exist', async () => {
    vi.mocked(listFormpacks).mockResolvedValueOnce([]);

    renderPage();
    await waitForLoaded();

    expect(screen.getByText('formpackListEmpty')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('formpackSearchPlaceholder'),
    ).not.toBeInTheDocument();
  });

  it('groups multiple formpacks in the same category', async () => {
    vi.mocked(listFormpacks).mockResolvedValueOnce([
      {
        id: 'formpack-insurer-a',
        version: '1.0.0',
        defaultLocale: 'de',
        locales: ['de'],
        titleKey: 'Insurer Pack A',
        descriptionKey: 'Insurer A description',
        exports: ['json'],
        visibility: 'public',
        meta: { category: 'insurer', keywords: ['kasse'] },
      },
      {
        id: 'formpack-insurer-b',
        version: '1.0.0',
        defaultLocale: 'de',
        locales: ['de'],
        titleKey: 'Insurer Pack B',
        descriptionKey: 'Insurer B description',
        exports: ['json'],
        visibility: 'public',
        meta: { category: 'insurer', keywords: ['antrag'] },
      },
    ]);

    renderPage();
    await waitForLoaded();

    expect(screen.getByText('Insurer Pack A')).toBeInTheDocument();
    expect(screen.getByText('Insurer Pack B')).toBeInTheDocument();
    expect(screen.getByText('formpackCategoryInsurer')).toBeInTheDocument();
  });

  it('does not update state when loading resolves after unmount', async () => {
    let resolveList: ((value: FormpackManifest[]) => void) | undefined;
    vi.mocked(listFormpacks).mockReturnValueOnce(
      new Promise<FormpackManifest[]>((resolve) => {
        resolveList = resolve;
      }),
    );

    const view = renderPage();
    view.unmount();

    await act(async () => {
      resolveList?.([]);
      await Promise.resolve();
    });

    expect(listFormpacks).toHaveBeenCalledTimes(1);
  });

  it('does not update state when loading rejects after unmount', async () => {
    let rejectList: ((reason?: unknown) => void) | undefined;
    vi.mocked(listFormpacks).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectList = reject;
      }),
    );

    const view = renderPage();
    view.unmount();

    await act(async () => {
      rejectList?.(new Error('late rejection'));
      await Promise.resolve();
    });

    expect(listFormpacks).toHaveBeenCalledTimes(1);
  });
});
