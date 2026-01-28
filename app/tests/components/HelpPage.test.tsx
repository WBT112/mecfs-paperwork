import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpPage from '../../src/pages/HelpPage';

describe('HelpPage', () => {
  it('renders the main help heading from markdown', () => {
    render(<HelpPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /help/i }),
    ).toBeInTheDocument();
  });
});
