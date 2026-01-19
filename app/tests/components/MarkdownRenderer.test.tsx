import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownRenderer from '../../src/components/Markdown/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders headings, lists, and links', () => {
    const content = `# Heading\n\n- First\n- Second\n\n[Home](/privacy)`;

    render(<MarkdownRenderer content={content} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/privacy');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('blocks raw HTML and secures external links', () => {
    const content =
      '# Title\n\n<script>window.alert("nope")</script>\n\n[External](https://example.com)';

    const { container } = render(<MarkdownRenderer content={content} />);

    expect(container.querySelector('script')).toBeNull();

    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute(
      'rel',
      expect.stringMatching(/noreferrer.*noopener|noopener.*noreferrer/),
    );
  });

  it('handles invalid markdown and strips inline HTML XSS payloads', () => {
    const content =
      '# Title\n\n[Broken Link](javascript:alert(1)\n\n<img src=x onerror="alert(1)" />';

    const { container } = render(<MarkdownRenderer content={content} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    expect(
      screen.queryByRole('link', { name: 'Broken Link' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('[Broken Link](javascript:alert(1)'),
    ).toBeInTheDocument();
  });
});
