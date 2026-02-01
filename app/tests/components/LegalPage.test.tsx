import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalPage from '../../src/pages/LegalPage';

const LEGAL_CONTENT = '# Sample Legal\n\nSome content.';

describe('LegalPage', () => {
  it('renders provided markdown content', () => {
    render(<LegalPage content={LEGAL_CONTENT} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sample Legal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Some content.')).toBeInTheDocument();
  });
});
