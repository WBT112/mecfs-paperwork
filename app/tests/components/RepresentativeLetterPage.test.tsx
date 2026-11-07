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

const LONG_BODY_BUTTON = 'representativeLetter.longBody';
const RECIPIENT_LABEL = 'representativeLetter.recipientLabel';
const SUBJECT_LABEL = 'representativeLetter.subjectLabel';
const BODY_LABEL = 'representativeLetter.bodyLabel';
const SEARCH_LABEL = 'representativeLetter.searchLabel';
const LOCATION_SEARCH_LABEL = 'representativeLetter.locationSearchLabel';
const SELECT_CONSTITUENCY_BUTTON =
  'representativeLetter.selectConstituencyNamed';
const SELECT_RECIPIENT_BUTTON = 'representativeLetter.selectRecipientNamed';
const SEND_EMAIL = 'representativeLetter.sendEmail';
const COPY_RECIPIENT = 'representativeLetter.copyRecipient';
const COPY_SUBJECT = 'representativeLetter.copySubject';
const COPY_BODY = 'representativeLetter.copyBody';
const COPY_SUCCEEDED = 'representativeLetter.copySucceeded';
const PRESSED_ATTRIBUTE = 'aria-pressed';
const EXPANDED_ATTRIBUTE = 'aria-expanded';
const PROCESS_TITLE = 'representativeLetter.processTitle';
const DATA_PROCESSING_TITLE = 'representativeLetter.dataProcessingTitle';
const ORIGINAL_SIGN_OFF = representativeLetterContent.template.signOff;
const VERIFIED_RECIPIENT = representativeCatalog.representatives.find(
  ({ email }) => email !== null,
);
const ALTERNATE_VERIFIED_RECIPIENT = representativeCatalog.representatives.find(
  ({ email, id }) => email !== null && id !== VERIFIED_RECIPIENT?.id,
);
const MISSING_RECIPIENT = representativeCatalog.representatives.find(
  ({ email }) => email === null,
);
const RECIPIENT_WITHOUT_CONSTITUENCY =
  representativeCatalog.representatives.find(
    ({ constituency }) => constituency === null,
  );
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
let clipboardWrite: ReturnType<typeof vi.fn>;

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

const installClipboardMock = () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
};

describe('RepresentativeLetterPage', () => {
  beforeEach(() => {
    localeState.current = 'de';
    window.sessionStorage.clear();
    clipboardWrite = vi.fn().mockResolvedValue(undefined);
    installClipboardMock();
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
    representativeLetterContent.template.signOff = ORIGINAL_SIGN_OFF;
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
    vi.unstubAllGlobals();
  });

  it('shows the generator immediately and keeps information in disclosures below it', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'representativeLetter.title' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL).value,
    ).toContain(representativeLetterContent.template.signOff);
    await screen.findByLabelText(SEARCH_LABEL);
    expect(
      screen.queryByText('representativeLetter.locationPrivacyHint'),
    ).not.toBeVisible();

    const processDisclosure = screen.getByRole('button', {
      name: PROCESS_TITLE,
    });
    const privacyDisclosure = screen.getByRole('button', {
      name: DATA_PROCESSING_TITLE,
    });
    expect(processDisclosure).toHaveAttribute(EXPANDED_ATTRIBUTE, 'false');
    expect(privacyDisclosure).toHaveAttribute(EXPANDED_ATTRIBUTE, 'false');

    processDisclosure.focus();
    await user.keyboard('[Enter]');
    expect(screen.getByText('representativeLetter.processCopy')).toBeVisible();
    privacyDisclosure.focus();
    await user.keyboard('[Space]');
    expect(
      screen.getByText('representativeLetter.backgroundText'),
    ).toBeVisible();
    expect(
      screen.getByText('representativeLetter.locationPrivacyHint'),
    ).toBeVisible();

    const body = screen.getByLabelText(BODY_LABEL);
    expect(
      body.compareDocumentPosition(processDisclosure) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      processDisclosure.compareDocumentPosition(privacyDisclosure) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: 'representativeLetter.informationTab',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'representativeLetter.start' }),
    ).not.toBeInTheDocument();
  });

  it('renders exactly the three selectable plain-text outputs without export actions', async () => {
    renderPage();

    const recipient = screen.getByLabelText(RECIPIENT_LABEL);
    const subject = screen.getByLabelText(SUBJECT_LABEL);
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
    expect(screen.queryByRole('button', { name: SEND_EMAIL })).toBeNull();
    expect(screen.queryByRole('link', { name: SEND_EMAIL })).toBeNull();
    expect(screen.getByRole('button', { name: COPY_RECIPIENT })).toBeDisabled();
    expect(screen.getByRole('button', { name: COPY_SUBJECT })).toBeEnabled();
    expect(screen.getByRole('button', { name: COPY_BODY })).toBeEnabled();
    expect(
      screen.queryByLabelText('representativeLetter.severityLabel'),
    ).toBeNull();
    expect(
      screen.queryByLabelText('representativeLetter.careStatusLabel'),
    ).toBeNull();
  });

  it('searches locally and retains an explicitly selected verified recipient', async () => {
    const user = userEvent.setup();
    renderPage();

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
    const recipientDisclosure = screen.getByRole('button', {
      name: VERIFIED_RECIPIENT!.fullName,
    });
    expect(recipientDisclosure).toHaveAttribute(EXPANDED_ATTRIBUTE, 'false');
    expect(
      screen.getByText('representativeLetter.emailVerified'),
    ).not.toBeVisible();

    recipientDisclosure.focus();
    await user.keyboard('[Enter]');
    expect(recipientDisclosure).toHaveAttribute(EXPANDED_ATTRIBUTE, 'true');
    expect(
      screen.getByText('representativeLetter.emailVerified'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'representativeLetter.officialProfile',
      }),
    ).toHaveAttribute('href', VERIFIED_RECIPIENT!.officialProfileUrl);
    expect(
      screen.getByRole('link', {
        name: 'representativeLetter.abgeordnetenwatchProfile',
      }),
    ).toHaveAttribute('href', VERIFIED_RECIPIENT!.abgeordnetenwatchProfileUrl);
    expect(readRepresentativeLetterState().recipientId).toBe(
      VERIFIED_RECIPIENT!.id,
    );
    const mailtoLink = screen.getByRole('link', {
      name: SEND_EMAIL,
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

  it('copies each visible field exactly and resets feedback after recipient changes', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    renderPage();

    const search = await screen.findByLabelText(SEARCH_LABEL);
    await user.type(search, VERIFIED_RECIPIENT!.fullName);
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );

    const recipient =
      screen.getByLabelText<HTMLTextAreaElement>(RECIPIENT_LABEL);
    const subject = screen.getByLabelText<HTMLInputElement>(SUBJECT_LABEL);
    const body = screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL);
    await user.click(screen.getByRole('button', { name: COPY_RECIPIENT }));
    await user.click(screen.getByRole('button', { name: COPY_SUBJECT }));
    await user.click(
      screen.getAllByRole('button', { name: COPY_BODY }).at(-1)!,
    );

    expect(clipboardWrite.mock.calls).toEqual([
      [recipient.value],
      [subject.value],
      [body.value],
    ]);
    expect(screen.getAllByText(COPY_SUCCEEDED)).toHaveLength(3);

    await user.clear(search);
    await user.type(search, ALTERNATE_VERIFIED_RECIPIENT!.fullName);
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );
    await waitFor(() => {
      expect(screen.queryAllByText(COPY_SUCCEEDED)).toHaveLength(1);
    });
    const updatedBody = screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL);
    expect(updatedBody.value).toContain(
      `Guten Tag ${ALTERNATE_VERIFIED_RECIPIENT!.fullName},`,
    );
    await user.click(
      screen.getAllByRole('button', { name: COPY_BODY }).at(-1)!,
    );
    expect(clipboardWrite).toHaveBeenLastCalledWith(updatedBody.value);
  });

  it('copies the visible body from the primary action and selects it as a fallback', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    renderPage();

    await user.type(
      await screen.findByLabelText(SEARCH_LABEL),
      VERIFIED_RECIPIENT!.fullName,
    );
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );

    const body = screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL);
    const primaryCopyButton = screen.getAllByRole('button', {
      name: COPY_BODY,
    })[0];
    await user.click(primaryCopyButton);
    expect(clipboardWrite).toHaveBeenLastCalledWith(body.value);
    expect(screen.getByText(COPY_SUCCEEDED)).toBeVisible();

    clipboardWrite.mockRejectedValueOnce(new Error('blocked'));
    await user.click(primaryCopyButton);
    expect(body).toHaveFocus();
    expect(body.selectionStart).toBe(0);
    expect(body.selectionEnd).toBe(body.value.length);
    expect(
      screen.getByText('representativeLetter.copyManualFallback'),
    ).toBeVisible();
  });

  it('selects input and textarea content when clipboard access fails', async () => {
    const user = userEvent.setup();
    clipboardWrite.mockRejectedValue(new Error('blocked'));
    installClipboardMock();
    renderPage();

    const subject = screen.getByLabelText<HTMLInputElement>(SUBJECT_LABEL);
    await user.click(screen.getByRole('button', { name: COPY_SUBJECT }));
    expect(subject).toHaveFocus();
    expect(subject.selectionStart).toBe(0);
    expect(subject.selectionEnd).toBe(subject.value.length);

    const body = screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL);
    await user.click(screen.getByRole('button', { name: COPY_BODY }));
    expect(body).toHaveFocus();
    expect(body.selectionStart).toBe(0);
    expect(body.selectionEnd).toBe(body.value.length);
    expect(
      screen.getAllByText('representativeLetter.copyManualFallback'),
    ).toHaveLength(2);
    expect(screen.queryByText(COPY_SUCCEEDED)).toBeNull();
  });

  it('shows the official contact fallback when no email is verified', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText(SEARCH_LABEL),
      MISSING_RECIPIENT!.fullName,
    );
    await user.click(
      screen.getByRole('button', {
        name: SELECT_RECIPIENT_BUTTON,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: MISSING_RECIPIENT!.fullName }),
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
        name: SEND_EMAIL,
      }),
    ).toBeDisabled();
  });

  it('filters by federal state, limits broad results, and supports entries without a constituency', async () => {
    const user = userEvent.setup();
    renderPage();

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
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => undefined));
    const loadingRender = renderPage();
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

  it('retains the body length and shows the generator after remount', async () => {
    const user = userEvent.setup();
    const firstRender = renderPage();
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));

    await waitFor(() => {
      expect(readRepresentativeLetterState().bodyLength).toBe('long');
    });
    firstRender.unmount();
    renderPage();

    expect(screen.getByLabelText(BODY_LABEL)).toBeVisible();
    expect(
      screen.getByRole('button', { name: LONG_BODY_BUTTON }),
    ).toHaveAttribute(PRESSED_ATTRIBUTE, 'true');
  });

  it('supports body-length and disclosure controls independently', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.shortBody' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: PROCESS_TITLE,
      }),
    );

    expect(screen.getByText(PROCESS_TITLE)).toBeVisible();
    expect(readRepresentativeLetterState().bodyLength).toBe('short');
  });

  it('passes the complete visible long body to the email application', async () => {
    const user = userEvent.setup();
    renderPage();
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
      name: SEND_EMAIL,
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
    representativeLetterContent.template.signOff = 'x'.repeat(
      MAX_MAILTO_URL_LENGTH,
    );
    window.sessionStorage.setItem(
      REPRESENTATIVE_LETTER_SESSION_KEY,
      JSON.stringify({
        ...createDefaultRepresentativeLetterState(),
        recipientId: VERIFIED_RECIPIENT!.id,
        bodyLength: 'long',
      }),
    );
    renderPage();

    expect(
      screen.getByLabelText<HTMLTextAreaElement>(BODY_LABEL).value,
    ).toContain('x'.repeat(MAX_MAILTO_URL_LENGTH));
    expect(
      await screen.findByRole('link', {
        name: SEND_EMAIL,
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
    const search = await screen.findByLabelText(SEARCH_LABEL);
    await user.type(search, VERIFIED_RECIPIENT!.fullName);
    await user.click(
      screen.getByRole('button', { name: SELECT_RECIPIENT_BUTTON }),
    );
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.reset' }),
    );

    expect(screen.getByLabelText(BODY_LABEL)).toBeVisible();
    expect(search).toHaveValue('');
    expect(screen.getByLabelText(RECIPIENT_LABEL)).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'representativeLetter.shortBody' }),
    ).toHaveAttribute(PRESSED_ATTRIBUTE, 'true');
    expect(
      screen.getByRole('button', {
        name: PROCESS_TITLE,
      }),
    ).toHaveAttribute(EXPANDED_ATTRIBUTE, 'false');
    expect(
      screen.getByRole('button', {
        name: DATA_PROCESSING_TITLE,
      }),
    ).toHaveAttribute(EXPANDED_ATTRIBUTE, 'false');
    expect(
      window.sessionStorage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY),
    ).toBeNull();
    expect(window.sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('does not duplicate the support overview link inside the tool card', () => {
    renderPage();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
