import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import LegalPage from '../../src/pages/LegalPage';

const LEGAL_CONTENT = '# Sample Legal\n\nSome content.';
const ROBOTS_META_SELECTOR = 'meta[name="robots"]';

describe('LegalPage', () => {
  afterEach(() => {
    cleanup();
    // Remove any leftover meta tags
    document
      .querySelectorAll(ROBOTS_META_SELECTOR)
      .forEach((el) => el.remove());
  });

  it('renders provided markdown content', () => {
    render(<LegalPage content={LEGAL_CONTENT} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sample Legal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Some content.')).toBeInTheDocument();
  });

  it('adds a noindex robots meta tag on mount', () => {
    render(<LegalPage content={LEGAL_CONTENT} />);

    const meta = document.querySelector<HTMLMetaElement>(ROBOTS_META_SELECTOR);
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('removes the robots meta tag on unmount when it was created', () => {
    const { unmount } = render(<LegalPage content={LEGAL_CONTENT} />);

    expect(document.querySelector(ROBOTS_META_SELECTOR)).not.toBeNull();

    unmount();

    expect(document.querySelector(ROBOTS_META_SELECTOR)).toBeNull();
  });

  it('restores previous robots content on unmount when meta already existed', () => {
    // Pre-create a robots meta tag
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'robots');
    existingMeta.setAttribute('content', 'index, follow');
    document.head.appendChild(existingMeta);

    const { unmount } = render(<LegalPage content={LEGAL_CONTENT} />);

    // While mounted, content should be noindex
    expect(existingMeta.getAttribute('content')).toBe('noindex, nofollow');

    unmount();

    // After unmount, should restore original content
    expect(existingMeta.getAttribute('content')).toBe('index, follow');
  });

  it('removes content attribute on unmount when pre-existing meta had no content', () => {
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'robots');
    // No content attribute set
    document.head.appendChild(existingMeta);

    const { unmount } = render(<LegalPage content={LEGAL_CONTENT} />);
    unmount();

    expect(existingMeta.hasAttribute('content')).toBe(false);
  });
});
