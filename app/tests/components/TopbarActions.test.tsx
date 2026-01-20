import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TopbarActions from '../../src/components/TopbarActions';

const translations: Record<string, string> = {
  topbarActionsLabel: 'Top bar actions',
  feedbackAction: 'Feedback',
  feedbackAriaLabel: 'Send feedback via email',
  feedbackSubject: 'mecfs-paperwork feedback: {{context}}',
  feedbackIntro: 'Please do not include any patient or health data.',
  feedbackDebugLabel: 'Debug info',
  feedbackPrompt: 'Describe the issue below:',
  feedbackUnknown: 'unknown',
  'feedbackField.appVersion': 'App version',
  'feedbackField.appCommit': 'Commit',
  'feedbackField.mode': 'Mode',
  'feedbackField.path': 'Path',
  shareAction: 'Share',
  shareAriaLabel: 'Share formpack link',
  shareTitle: 'Share formpack',
  shareText: 'Link to the formpack',
  shareFallbackTitle: 'Share this link',
  shareCopyInstructions: 'Copy the link below to share it.',
  shareCopiedLabel: 'Link copied',
  shareCopiedDescription:
    'The link is in your clipboard. Share it with others.',
  shareUrlLabel: 'Share URL',
  'common.close': 'Close',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'feedbackSubject' && options?.context) {
        return `mecfs-paperwork feedback: ${options.context}`;
      }
      return translations[key] ?? key;
    },
  }),
}));

const renderActions = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <TopbarActions />
    </MemoryRouter>,
  );

afterEach(() => {
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    configurable: true,
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  });
});

describe('TopbarActions', () => {
  it('renders a feedback mailto link with the current path', () => {
    renderActions('/formpacks/alpha');

    const feedbackLink = screen.getByRole('link', {
      name: 'Send feedback via email',
    });
    const href = feedbackLink.getAttribute('href');
    expect(href).toContain('mailto:info@mecfs-paperwork.de?');

    const query = href?.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe(
      'mecfs-paperwork feedback: /formpacks/alpha',
    );
    expect(params.get('body')).toContain('Path: /formpacks/alpha');
  });

  it('uses the Web Share API when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    });

    const user = userEvent.setup();
    renderActions('/formpacks/alpha');
    const origin = window.location.origin;

    await user.click(
      screen.getByRole('button', { name: 'Share formpack link' }),
    );

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({
        title: 'Share formpack',
        text: 'Link to the formpack',
        url: `${origin}/formpacks/alpha`,
      });
    });
  });

  it('falls back to clipboard sharing when Web Share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    const user = userEvent.setup();
    renderActions('/formpacks/alpha');
    const origin = window.location.origin;

    await user.click(
      screen.getByRole('button', { name: 'Share formpack link' }),
    );

    expect(screen.getByText('Link copied')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(`${origin}/formpacks/alpha`),
    ).toBeInTheDocument();
  });
});
