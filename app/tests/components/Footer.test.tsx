import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Footer from '../../src/components/Footer';
import { getSponsorUrl } from '../../src/lib/funding';
import { DEFAULT_REPO_URL } from '../../src/lib/repoUrl';
import { TestRouter } from '../setup/testRouter';

const translations: Record<string, string> = {
  footerNavLabel: 'Footer navigation',
  footerImprint: 'Imprint',
  footerPrivacy: 'Privacy Policy',
  footerHelp: 'Help',
  footerGithub: 'GitHub',
  footerSponsor: 'Sponsor',
  footerVersionLabel: 'v{{version}} • {{date}}',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'footerVersionLabel' && options) {
        return `v${options.version} • ${options.date}`;
      }
      return translations[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/lib/funding', () => ({
  getSponsorUrl: vi.fn(),
}));

vi.mock('../../src/lib/version', () => ({
  APP_VERSION: 'abc1234',
  BUILD_DATE_ISO: '2026-02-07T12:00:00.000Z',
  formatBuildDate: () => 'Feb 7, 2026, 12:00 PM',
}));

describe('Footer', () => {
  const mockedGetSponsorUrl = vi.mocked(getSponsorUrl);

  it('renders imprint, privacy, sponsor, and GitHub links', () => {
    mockedGetSponsorUrl.mockReturnValue('https://example.com/sponsor');
    render(
      <TestRouter>
        <Footer />
      </TestRouter>,
    );

    expect(screen.getByRole('link', { name: 'Imprint' })).toHaveAttribute(
      'href',
      '/imprint',
    );
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute(
      'href',
      '/help',
    );

    const sponsorLink = screen.getByRole('link', { name: 'Sponsor' });
    expect(sponsorLink).toHaveAttribute('href', 'https://example.com/sponsor');
    expect(sponsorLink).toHaveAttribute('target', '_blank');
    expect(sponsorLink).toHaveAttribute('rel', 'noreferrer noopener');

    const githubLink = screen.getByRole('link', { name: 'GitHub' });
    expect(githubLink).toHaveAttribute('href', DEFAULT_REPO_URL);
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noreferrer noopener');
    expect(screen.getByText('vabc1234 • Feb 7, 2026, 12:00 PM')).toBeVisible();
  });

  it('hides the sponsor link when no funding URL is available', () => {
    mockedGetSponsorUrl.mockReturnValue(null);

    render(
      <TestRouter>
        <Footer />
      </TestRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Sponsor' })).toBeNull();
  });
});
