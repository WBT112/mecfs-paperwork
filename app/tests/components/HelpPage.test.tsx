import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HelpPage from '../../src/pages/HelpPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/lib/version', () => ({
  APP_VERSION: 'abc1234',
  BUILD_DATE_ISO: '2026-02-07T12:00:00.000Z',
  formatBuildDate: () => 'Feb 7, 2026, 12:00 PM',
}));

describe('HelpPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('renders the main help heading from markdown', () => {
    render(<HelpPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /hilfe/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'versionInfoTitle' }),
    ).toBeVisible();
    expect(screen.getByText('abc1234')).toBeVisible();
  });

  it('copies version information to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<HelpPage />);

    fireEvent.click(screen.getByRole('button', { name: 'versionInfoCopy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'versionInfoAppVersion: abc1234\nversionInfoBuildDate: 2026-02-07T12:00:00.000Z',
      );
    });
    expect(
      screen.getByRole('button', { name: 'versionInfoCopied' }),
    ).toBeInTheDocument();
  });

  it('handles clipboard write failures without showing copied state', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<HelpPage />);

    fireEvent.click(screen.getByRole('button', { name: 'versionInfoCopy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByRole('button', { name: 'versionInfoCopy' }),
    ).toBeInTheDocument();
  });
});
