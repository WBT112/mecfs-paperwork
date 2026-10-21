import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { representativeLetterContent } from '../../src/features/representative-letter/data/letterContent';
import { constituencyLocationCatalog } from '../../src/features/representative-letter/data/constituencyLocationCatalog';
import { representativeCatalog } from '../../src/features/representative-letter/data/representativeCatalog';
import { MAX_MAILTO_URL_LENGTH } from '../../src/features/representative-letter/mailto';
import RepresentativeLetterPage from '../../src/features/representative-letter/pages/RepresentativeLetterPage';
import { createDefaultRepresentativeLetterState } from '../../src/features/representative-letter/model';
import {
  REPRESENTATIVE_LETTER_SESSION_KEY,
  readRepresentativeLetterState,
} from '../../src/features/representative-letter/sessionState';
import { TestRouter } from '../setup/testRouter';

const START_BUTTON = 'representativeLetter.start';
const LONG_BODY_BUTTON = 'representativeLetter.longBody';
const RECIPIENT_LABEL = 'representativeLetter.recipientLabel';
const BODY_LABEL = 'representativeLetter.bodyLabel';
const SEARCH_LABEL = 'representativeLetter.searchLabel';
const LOCATION_SEARCH_LABEL = 'representativeLetter.locationSearchLabel';
const SELECT_CONSTITUENCY_BUTTON =
  'representativeLetter.selectConstituencyNamed';
const SELECT_RECIPIENT_BUTTON = 'representativeLetter.selectRecipientNamed';
const OPEN_MAIL_CLIENT = 'representativeLetter.openMailClient';
const INCLUDE_PERSONAL = 'representativeLetter.includePersonalInShortBody';
const CUSTOM_EXPERIENCE = 'Synthetische eigene Erfahrung.';
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

const { localeState } = vi.hoisted(() => ({
  localeState: { current: 'de' },
}));

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
      vi.fn(async (input: RequestInfo | URL) => {
        const payload = String(input).includes('constituency-locations')
          ? constituencyLocationCatalog
          : representativeCatalog;
        return new Response(JSON.stringify(payload), {
          headers: { 'content-type': 'application/json' },
        });
      }),
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
    const body = screen.getByLabelText(BODY_LABEL);
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
    const mailtoLink = screen.getByRole('link', {
      name: OPEN_MAIL_CLIENT,
    });
    expect(mailtoLink).toHaveAttribute(
      'href',
      expect.stringContaining(
        `mailto:${VERIFIED_RECIPIENT!.email}?subject=${encodeURIComponent(representativeLetterContent.subject)}`,
      ),
    );
    expect(
      decodeURIComponent(
        mailtoLink.getAttribute('href')?.split('&body=')[1] ?? '',
      ),
    ).toBe(
      screen
        .getByLabelText<HTMLTextAreaElement>(BODY_LABEL)
        .value.replaceAll('\n', '\r\n'),
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

  it('requires an explicit constituency choice for ambiguous postcodes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const locationSearch = await screen.findByLabelText(LOCATION_SEARCH_LABEL);
    await user.type(locationSearch, '97896');
    expect(
      screen.getByText('representativeLetter.locationAmbiguous'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    ).toBeNull();
    expect(
      screen.getAllByRole('button', {
        name: SELECT_CONSTITUENCY_BUTTON,
      }),
    ).toHaveLength(2);

    await user.selectOptions(
      screen.getByLabelText('representativeLetter.stateFilterLabel'),
      'BY',
    );
    expect(
      screen.getAllByRole('button', {
        name: SELECT_CONSTITUENCY_BUTTON,
      }),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole('button', {
        name: SELECT_CONSTITUENCY_BUTTON,
      }),
    );
    expect(
      screen.getAllByRole('button', { name: SELECT_RECIPIENT_BUTTON }).length,
    ).toBeGreaterThan(0);

    await user.clear(locationSearch);
    await user.type(locationSearch, '1234');
    expect(
      screen.getByText('representativeLetter.locationIncompletePostcode'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    ).toBeNull();
  });

  it('shows local place-search validation and keeps queries ephemeral', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const locationSearch = await screen.findByLabelText(LOCATION_SEARCH_LABEL);
    await user.type(locationSearch, 'ab');
    expect(
      screen.getByText('representativeLetter.locationIncompletePlace'),
    ).toBeVisible();
    await user.clear(locationSearch);
    await user.type(locationSearch, '12a45');
    expect(
      screen.getByText('representativeLetter.locationInvalidPostcode'),
    ).toBeVisible();
    await user.clear(locationSearch);
    await user.type(locationSearch, 'Ort der nicht existiert');
    expect(
      screen.getByText('representativeLetter.locationNotFound'),
    ).toBeVisible();
    await user.clear(locationSearch);
    await user.type(locationSearch, 'Bad');
    expect(
      screen.getByText('representativeLetter.refineLocationSearch'),
    ).toBeVisible();

    expect(window.location.search).toBe('');
    expect(
      window.sessionStorage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY),
    ).not.toContain('Ort der nicht existiert');
    expect(
      screen.getByRole('link', {
        name: 'representativeLetter.constituencyLookup',
      }),
    ).toHaveAttribute(
      'href',
      'https://www.bundestag.de/abgeordnete/wahlkreise/',
    );
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

  it('selects independent personal variants and includes them only after short-form opt-in', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const body = screen.getByLabelText(BODY_LABEL);
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.severityLabel'),
      'mild',
    );
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.severityVariantLabel'),
      '2',
    );
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.careStatusLabel'),
      'level-2',
    );
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.careVariantLabel'),
      '2',
    );

    expect((body as HTMLTextAreaElement).value).not.toContain(
      'Von außen sieht man mir die Erkrankung kaum an.',
    );
    await user.click(screen.getByText('representativeLetter.customizeTitle'));
    await user.type(
      screen.getByLabelText('representativeLetter.customExperienceLabel'),
      CUSTOM_EXPERIENCE,
    );
    await user.type(
      screen.getByLabelText('representativeLetter.customRequestLabel'),
      'Synthetische eigene Bitte.',
    );
    await user.click(
      screen.getByLabelText('representativeLetter.constituencyConfirmation'),
    );
    await user.click(screen.getByLabelText(INCLUDE_PERSONAL));

    const includedBody = (body as HTMLTextAreaElement).value;
    expect(includedBody).toContain(
      'Von außen sieht man mir die Erkrankung kaum an.',
    );
    expect(includedBody).toContain('Ich habe Pflegegrad 2.');
    expect(includedBody).toContain(CUSTOM_EXPERIENCE);
    expect(includedBody).toContain('Synthetische eigene Bitte.');
    expect(includedBody).toContain('Ich lebe in Ihrem Wahlkreis.');

    await user.click(screen.getByLabelText(INCLUDE_PERSONAL));
    expect((body as HTMLTextAreaElement).value).not.toContain(
      CUSTOM_EXPERIENCE,
    );
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.severityLabel'),
      '',
    );
    await user.selectOptions(
      screen.getByLabelText('representativeLetter.careStatusLabel'),
      '',
    );
    await user.click(
      screen.getByLabelText('representativeLetter.constituencyConfirmation'),
    );
    expect(readRepresentativeLetterState()).toMatchObject({
      severityId: null,
      careStatusId: null,
      includeConstituencyStatement: false,
    });
  });

  it('safely omits a stale variant that is not in the approved catalog', async () => {
    window.sessionStorage.setItem(
      REPRESENTATIVE_LETTER_SESSION_KEY,
      JSON.stringify({
        ...createDefaultRepresentativeLetterState(),
        view: 'letter',
        severityId: 'mild',
        severityVariantId: 'unknown',
      }),
    );
    renderPage();

    expect(
      screen.queryByLabelText('representativeLetter.severityVariantLabel'),
    ).toBeNull();
    expect(
      screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL).value,
    ).not.toContain('Ich bin leicht an ME erkrankt.');
  });

  it('passes the complete visible long body to the email application', async () => {
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

    const body = screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL).value;
    expect(body).toContain('Weiterführende Quellen:');
    const mailtoLink = screen.getByRole('link', {
      name: OPEN_MAIL_CLIENT,
    });
    expect(
      decodeURIComponent(
        mailtoLink.getAttribute('href')?.split('&body=')[1] ?? '',
      ),
    ).toBe(body.replaceAll('\n', '\r\n'));
    expect(
      screen.queryByText('representativeLetter.mailtoBodyTooLong'),
    ).toBeNull();
  });

  it('keeps a genuinely oversized body available while omitting it from mailto', async () => {
    window.sessionStorage.setItem(
      REPRESENTATIVE_LETTER_SESSION_KEY,
      JSON.stringify({
        ...createDefaultRepresentativeLetterState(),
        view: 'letter',
        recipientId: VERIFIED_RECIPIENT!.id,
        bodyLength: 'long',
        customExperience: 'x'.repeat(MAX_MAILTO_URL_LENGTH),
      }),
    );
    renderPage();

    expect(
      screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL).value,
    ).toContain('x'.repeat(MAX_MAILTO_URL_LENGTH));
    expect(
      await screen.findByRole('link', {
        name: OPEN_MAIL_CLIENT,
      }),
    ).toHaveAttribute(
      'href',
      `mailto:${VERIFIED_RECIPIENT!.email}?subject=${encodeURIComponent(representativeLetterContent.subject)}`,
    );
    expect(
      screen.getByText('representativeLetter.mailtoBodyTooLong'),
    ).toHaveProperty('tagName', 'OUTPUT');
  });

  it('discloses and consistently uses the approved German content in the English interface', async () => {
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
      screen.getByLabelText('representativeLetter.subjectLabel'),
    ).toHaveValue(representativeLetterContent.subject);
    expect(
      screen.getByText('representativeLetter.contentLanguageNotice'),
    ).toBeVisible();
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
