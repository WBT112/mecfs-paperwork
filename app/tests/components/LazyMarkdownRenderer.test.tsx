import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LazyMarkdownRenderer from '../../src/components/Markdown/LazyMarkdownRenderer';

describe('LazyMarkdownRenderer', () => {
  it('renders markdown content when lazy loaded', async () => {
    render(<LazyMarkdownRenderer content="**Bold text**" />);

    // Wait for lazy-loaded MarkdownRenderer to render
    await waitFor(() => {
      expect(screen.getByText('Bold text')).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    const { container } = render(
      <LazyMarkdownRenderer content="Test content" className="custom-class" />,
    );

    // Wait for lazy-loaded MarkdownRenderer to render
    await waitFor(() => {
      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });

  it('shows fallback text while loading', () => {
    const { container } = render(
      <LazyMarkdownRenderer content="Test content" className="test-fallback" />,
    );

    // The fallback should show the raw content
    expect(container.textContent).toContain('Test content');
  });
});
