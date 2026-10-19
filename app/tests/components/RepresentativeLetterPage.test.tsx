import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { representativeCatalog } from '../../src/features/representative-letter/data/representativeCatalog';
import RepresentativeLetterPage from '../../src/features/representative-letter/pages/RepresentativeLetterPage';
import {
  REPRESENTATIVE_LETTER_SESSION_KEY,
  readRepresentativeLetterState,
} from '../../src/features/representative-letter/sessionState';
import { TestRouter } from '../setup/testRouter';

const START_BUTTON = 'representativeLetter.start';
const LONG_BODY_BUTTON = 'representativeLetter.longBody';
const RECIPIENT_LABEL = 'representativeLetter.recipientLabel';
const SEARCH_LABEL = 'representativeLetter.searchLabel';
const SELECT_RECIPIENT_BUTTON = 'representativeLetter.selectRecipientNamed';
const OPEN_MAIL_CLIENT = 'representativeLetter.openMailClient';
const VERIFIED_RECIPIENT = representativeCatalog.representatives.find(
  ({ email }) => email !== null,
);
const MISSING_RECIPIENT = representativeCatalog.representatives.find(
  ({ email }) => email === null,
);
const RECIPIENT_WITHOUT_CONSTITUENCY =
  representativeCatalog.representatives.find(
    ({ constituency }) => constituency === null,
  );

const { SUBJECT, SHORT_BODY, LONG_BODY, localeState } = vi.hoisted(() => ({
  SUBJECT: 'Synthetic subject: ä & test',
  SHORT_BODY: 'Synthetic short body\nSecond line',
  LONG_BODY: 'x'.repeat(2_000),
  localeState: { current: 'de' },
}));

vi.mock(
  '../../src/features/representative-letter/data/catalogs',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../src/features/representative-letter/data/catalogs')
      >();
    return {
      ...actual,
      representativeLetterTextCatalogs: {
        de: {
          version: 'test',
          subject: SUBJECT,
          shortBody: SHORT_BODY,
          longBody: LONG_BODY,
        },
        en: {
          version: 'test',
          subject: 'Synthetic English subject',
          shortBody: 'Synthetic English body',
          longBody: LONG_BODY,
        },
      },
    };
  },
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({ locale: localeState.current }),
}));

const renderPage = () =>
  render(
    <TestRouter initialEntries={['/tools/representative-letter']}>
      <Routes>
        <Route
          path="/tools/representative-letter"
          element={<RepresentativeLetterPage />}
        />
        <Route path="/formpacks" element={<div>Overview</div>} />
      </Routes>
    </TestRouter>,
  );

describe('RepresentativeLetterPage', () => {
  beforeEach(() => {
    localeState.current = 'de';
    window.sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(
          new Response(JSON.stringify(representativeCatalog), {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the information view and optional background', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'representativeLetter.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('representativeLetter.processCopy')).toBeVisible();

    await user.click(
      screen.getByRole('button', {
        name: 'representativeLetter.backgroundTitle',
      }),
    );
    expect(
      screen.getByText('representativeLetter.backgroundText'),
    ).toBeVisible();
  });

  it('renders exactly the three selectable plain-text outputs without export actions', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const recipient = screen.getByLabelText(RECIPIENT_LABEL);
    const subject = screen.getByLabelText('representativeLetter.subjectLabel');
    const body = screen.getByLabelText('representativeLetter.bodyLabel');
    expect(recipient).toHaveAttribute('readonly');
    expect(subject).toHaveAttribute('readonly');
    expect(body).toHaveAttribute('readonly');
    expect(await screen.findByLabelText(SEARCH_LABEL)).toHaveAttribute(
      'type',
      'search',
    );
    expect(screen.queryByRole('link', { name: /download|export/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /download|export/i }),
    ).toBeNull();
    expect(
      screen.getByRole('button', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toBeDisabled();
  });

  it('searches locally and retains an explicitly selected verified recipient', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const search = await screen.findByLabelText(SEARCH_LABEL);
    await user.type(search, VERIFIED_RECIPIENT!.fullName);
    await user.click(
      screen.getByRole('button', {
        name: SELECT_RECIPIENT_BUTTON,
      }),
    );

    expect(screen.getByLabelText(RECIPIENT_LABEL)).toHaveValue(
      VERIFIED_RECIPIENT!.email,
    );
    expect(
      screen.getByText('representativeLetter.emailVerified'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'representativeLetter.officialProfile',
      }),
    ).toHaveAttribute('href', VERIFIED_RECIPIENT!.officialProfileUrl);
    expect(readRepresentativeLetterState().recipientId).toBe(
      VERIFIED_RECIPIENT!.id,
    );
    expect(
      screen.getByRole('link', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toHaveAttribute(
      'href',
      `mailto:${VERIFIED_RECIPIENT!.email}?subject=Synthetic%20subject%3A%20%C3%A4%20%26%20test&body=Synthetic%20short%20body%0D%0ASecond%20line`,
    );

    await user.clear(search);
    await user.type(search, 'no matching representative');
    expect(screen.getByText('representativeLetter.noResults')).toBeVisible();
    expect(screen.getByLabelText(RECIPIENT_LABEL)).toHaveValue(
      VERIFIED_RECIPIENT!.email,
    );
  });

  it('shows the official contact fallback when no email is verified', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    await user.type(
      await screen.findByLabelText(SEARCH_LABEL),
      MISSING_RECIPIENT!.fullName,
    );
    await user.click(
      screen.getByRole('button', {
        name: SELECT_RECIPIENT_BUTTON,
      }),
    );

    expect(screen.getByText('representativeLetter.emailMissing')).toBeVisible();
    expect(screen.getByLabelText(RECIPIENT_LABEL)).toHaveAttribute(
      'placeholder',
      'representativeLetter.recipientMissingPlaceholder',
    );
    expect(
      screen.getByRole('link', {
        name: 'representativeLetter.officialContact',
      }),
    ).toHaveAttribute('href', MISSING_RECIPIENT!.officialContactUrl);
    expect(
      screen.getByRole('button', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toBeDisabled();
  });

  it('filters by federal state, limits broad results, and supports entries without a constituency', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const stateFilter = await screen.findByLabelText(
      'representativeLetter.stateFilterLabel',
    );
    await user.selectOptions(stateFilter, 'NW');
    expect(screen.getByText('representativeLetter.refineSearch')).toBeVisible();

    await user.selectOptions(stateFilter, '');
    await user.type(
      screen.getByLabelText(SEARCH_LABEL),
      RECIPIENT_WITHOUT_CONSTITUENCY!.fullName,
    );
    await user.click(
      screen.getByRole('button', {
        name: SELECT_RECIPIENT_BUTTON,
      }),
    );
    expect(
      screen.getAllByText(RECIPIENT_WITHOUT_CONSTITUENCY!.fullName),
    ).toHaveLength(2);
  });

  it('shows loading and failure states for the bundled catalog asset', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => undefined));
    const loadingRender = renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    expect(
      screen.getByText('representativeLetter.catalogLoading'),
    ).toBeVisible();
    loadingRender.unmount();

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    renderPage();
    expect(
      await screen.findByText('representativeLetter.catalogLoadFailed'),
    ).toBeVisible();
  });

  it('retains the current view and body length across a same-tab remount', async () => {
    const user = userEvent.setup();
    const firstRender = renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));

    await waitFor(() => {
      expect(readRepresentativeLetterState().bodyLength).toBe('long');
    });
    firstRender.unmount();
    renderPage();

    expect(
      screen.getByRole('button', { name: 'representativeLetter.letterTab' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: LONG_BODY_BUTTON }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports both view and body-length controls', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.letterTab' }),
    );
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.shortBody' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'representativeLetter.informationTab',
      }),
    );

    expect(screen.getByText('representativeLetter.processTitle')).toBeVisible();
    expect(readRepresentativeLetterState().bodyLength).toBe('short');
  });

  it('keeps an oversized long body available while omitting it from mailto', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.type(
      await screen.findByLabelText(SEARCH_LABEL),
      VERIFIED_RECIPIENT!.fullName,
    );
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));

    expect(screen.getByLabelText('representativeLetter.bodyLabel')).toHaveValue(
      LONG_BODY,
    );
    expect(
      screen.getByRole('link', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toHaveAttribute(
      'href',
      `mailto:${VERIFIED_RECIPIENT!.email}?subject=Synthetic%20subject%3A%20%C3%A4%20%26%20test`,
    );
    expect(
      screen.getByText('representativeLetter.mailtoBodyTooLong'),
    ).toHaveProperty('tagName', 'OUTPUT');
  });

  it('uses the currently visible English subject and body in mailto', async () => {
    localeState.current = 'en';
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.type(
      await screen.findByLabelText(SEARCH_LABEL),
      VERIFIED_RECIPIENT!.fullName,
    );
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );

    expect(
      screen.getByRole('link', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toHaveAttribute(
      'href',
      `mailto:${VERIFIED_RECIPIENT!.email}?subject=Synthetic%20English%20subject&body=Synthetic%20English%20body`,
    );
  });

  it('resets only the tool state and leaves unrelated session data intact', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('unrelated', 'keep');
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.reset' }),
    );

    expect(screen.getByText('representativeLetter.processTitle')).toBeVisible();
    expect(
      window.sessionStorage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY),
    ).toBeNull();
    expect(window.sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('links back to the support overview', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('link', { name: 'representativeLetter.backToOverview' }),
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });
});
