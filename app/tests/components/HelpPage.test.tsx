import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
