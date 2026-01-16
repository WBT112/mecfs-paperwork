import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Footer from '../../src/components/Footer';
import { DEFAULT_REPO_URL } from '../../src/lib/repo';

const translations: Record<string, string> = {
  footerNavLabel: 'Footer navigation',
  footerImprint: 'Imprint',
  footerPrivacy: 'Privacy Policy',
  footerGithub: 'GitHub',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe('Footer', () => {
  it('renders imprint, privacy, and GitHub links', () => {
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

    const githubLink = screen.getByRole('link', { name: 'GitHub' });
    expect(githubLink).toHaveAttribute('href', DEFAULT_REPO_URL);
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noreferrer noopener');
  });
});
