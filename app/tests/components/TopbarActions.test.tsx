import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TopbarActions from '../../src/components/TopbarActions';
import { TestRouter } from '../setup/testRouter';

const SHARE_LINK_LABEL = 'Share formpack link';
const SHARE_FALLBACK_TITLE = 'Share this link';
const TEST_FORMPACK_PATH = '/formpacks/alpha';
const FEEDBACK_LINK_LABEL = 'Send feedback via email';

const translations: Record<string, string> = {
  topbarActionsLabel: 'Top bar actions',
  feedbackAction: 'Feedback',
  feedbackAriaLabel: FEEDBACK_LINK_LABEL,
  feedbackSubject: 'mecfs-paperwork feedback: {{context}}',
  feedbackIntro: 'Please do not include any patient or health data.',
  feedbackDebugLabel: 'Debug info',
  feedbackPrompt: 'Describe the issue below:',
  feedbackUnknown: 'unknown',
  'feedbackField.appVersion': 'App version',
  'feedbackField.buildDate': 'Build date',
  'feedbackField.appCommit': 'Commit',
  'feedbackField.mode': 'Mode',
  'feedbackField.path': 'Path',
  shareAction: 'Share',
  shareAriaLabel: SHARE_LINK_LABEL,
  shareTitle: 'Share formpack',
  shareText: 'Link to the formpack',
  shareFallbackTitle: SHARE_FALLBACK_TITLE,
  shareCopyInstructions: 'Copy the link below to share it.',
  shareCopiedLabel: 'Link copied',
  shareCopiedDescription:
    'The link is in your clipboard. Share it with others.',
  shareUrlLabel: 'Share URL',
  'common.close': 'Close',
};

const versionMockState = vi.hoisted(() => ({
  appVersion: 'abc1234',
  buildDate: 'Feb 7, 2026, 12:00 PM',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'feedbackSubject' && options?.context) {
        return `mecfs-paperwork feedback: ${options.context}`;
      }
      return translations[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/lib/version', () => ({
  get APP_VERSION() {
    return versionMockState.appVersion;
  },
  formatBuildDate: () => versionMockState.buildDate,
}));

const renderActions = (route: string) =>
  render(
    <TestRouter initialEntries={[route]}>
      <TopbarActions />
    </TestRouter>,
  );

afterEach(() => {
  versionMockState.appVersion = 'abc1234';
  versionMockState.buildDate = 'Feb 7, 2026, 12:00 PM';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    configurable: true,
  });
});

describe('TopbarActions', () => {
  it('renders a feedback mailto link with the current path', () => {
    renderActions(TEST_FORMPACK_PATH);

    const feedbackLink = screen.getByRole('link', {
      name: FEEDBACK_LINK_LABEL,
    });
    const href = feedbackLink.getAttribute('href');
    expect(href).toContain('mailto:info@mecfs-paperwork.de?');

    const query = href?.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe(
      `mecfs-paperwork feedback: ${TEST_FORMPACK_PATH}`,
    );
    expect(params.get('body')).toContain('App version: abc1234');
    expect(params.get('body')).toContain('Build date: Feb 7, 2026, 12:00 PM');
    expect(params.get('body')).toContain(`Path: ${TEST_FORMPACK_PATH}`);
  });

  it('uses the Web Share API when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    });

    const user = userEvent.setup();
    renderActions(TEST_FORMPACK_PATH);
    const origin = globalThis.location.origin;

    await user.click(screen.getByRole('button', { name: SHARE_LINK_LABEL }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({
        title: 'Share formpack',
        text: 'Link to the formpack',
        url: `${origin}${TEST_FORMPACK_PATH}`,
      });
    });
  });

  it('falls back to clipboard sharing when Web Share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderActions(TEST_FORMPACK_PATH);
    const origin = globalThis.location.origin;

    await user.click(screen.getByRole('button', { name: SHARE_LINK_LABEL }));

    expect(screen.getByText('Link copied')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(`${origin}${TEST_FORMPACK_PATH}`),
    ).toBeInTheDocument();
  });

  it('shows manual copy fallback when native share and clipboard copy both fail', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('share unavailable')),
      configurable: true,
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('blocked'),
    );

    const user = userEvent.setup();
    renderActions(TEST_FORMPACK_PATH);
    const shareButton = screen.getByRole('button', { name: SHARE_LINK_LABEL });

    await user.click(shareButton);

    expect(screen.getByText(SHARE_FALLBACK_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Copy the link below to share it.')).toBeVisible();
  });

  it('shows manual copy fallback when clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {
      share: undefined,
    } as unknown as Navigator);

    renderActions(TEST_FORMPACK_PATH);
    fireEvent.click(screen.getByRole('button', { name: SHARE_LINK_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(SHARE_FALLBACK_TITLE)).toBeVisible();
    });
  });

  it('closes the share fallback dialog and selects the URL on focus', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('no clipboard'),
    );

    const selectSpy = vi
      .spyOn(HTMLInputElement.prototype, 'select')
      .mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderActions(TEST_FORMPACK_PATH);
    await user.click(screen.getByRole('button', { name: SHARE_LINK_LABEL }));

    const urlInput = screen.getByRole('textbox', { name: 'Share URL' });
    await user.click(urlInput);

    expect(selectSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(SHARE_FALLBACK_TITLE)).not.toBeInTheDocument();

    selectSpy.mockRestore();
  });

  it('closes the share fallback with Escape and restores focus', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('no clipboard'),
    );

    const user = userEvent.setup();
    renderActions(TEST_FORMPACK_PATH);
    const shareButton = screen.getByRole('button', { name: SHARE_LINK_LABEL });

    await user.click(shareButton);
    expect(screen.getByText(SHARE_FALLBACK_TITLE)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    await user.keyboard('{Escape}');

    expect(screen.queryByText(SHARE_FALLBACK_TITLE)).not.toBeInTheDocument();
    expect(shareButton).toHaveFocus();
  });

  it('uses custom feedback email and commit from environment when provided', () => {
    vi.stubEnv('VITE_FEEDBACK_EMAIL', 'support@example.org');
    vi.stubEnv('VITE_APP_COMMIT', 'commit-sha');

    renderActions(TEST_FORMPACK_PATH);

    const feedbackLink = screen.getByRole('link', {
      name: FEEDBACK_LINK_LABEL,
    });
    const href = feedbackLink.getAttribute('href') ?? '';

    expect(href).toContain('mailto:support@example.org?');

    const query = href.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    expect(params.get('body')).toContain('Commit: commit-sha');
  });

  it('uses unknown fallbacks for app version and build date and omits them from feedback fields', () => {
    versionMockState.appVersion = 'unknown';
    versionMockState.buildDate = 'unknown';

    renderActions(TEST_FORMPACK_PATH);

    const feedbackLink = screen.getByRole('link', {
      name: FEEDBACK_LINK_LABEL,
    });
    const href = feedbackLink.getAttribute('href') ?? '';
    const query = href.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    const body = params.get('body') ?? '';

    expect(body).not.toContain('App version:');
    expect(body).not.toContain('Build date:');
  });
});
