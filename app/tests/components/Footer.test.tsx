import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Footer from '../../src/components/Footer';
import { getSponsorUrl } from '../../src/lib/funding';
import { DEFAULT_REPO_URL } from '../../src/lib/repo';

const translations: Record<string, string> = {
  footerNavLabel: 'Footer navigation',
  footerImprint: 'Imprint',
  footerPrivacy: 'Privacy Policy',
  footerHelp: 'Help',
  footerGithub: 'GitHub',
  footerSponsor: 'Sponsor',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('../../src/lib/funding', () => ({
  getSponsorUrl: vi.fn(),
}));

describe('Footer', () => {
  const mockedGetSponsorUrl = vi.mocked(getSponsorUrl);

  it('renders imprint, privacy, sponsor, and GitHub links', () => {
    mockedGetSponsorUrl.mockReturnValue('https://example.com/sponsor');
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
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
  });

  it('hides the sponsor link when no funding URL is available', () => {
    mockedGetSponsorUrl.mockReturnValue(null);

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Sponsor' })).toBeNull();
  });
});
