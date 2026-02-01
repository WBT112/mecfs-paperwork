import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImprintPage from '../../src/pages/ImprintPage';
import PrivacyPage from '../../src/pages/PrivacyPage';

describe('Legal pages', () => {
  it('renders the imprint content', () => {
    render(<ImprintPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /impressum/i }),
    ).toBeInTheDocument();
  });

  it('renders the privacy policy content', () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /datenschutzerklärung/i }),
    ).toBeInTheDocument();
  });
});
