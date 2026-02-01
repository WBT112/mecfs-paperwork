// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownRenderer from '../../src/components/Markdown/MarkdownRenderer';
import { isSafeHref } from '../../src/components/Markdown/markdownLinks';

const EXTERNAL_LINK_REL = 'noreferrer noopener';

describe('MarkdownRenderer', () => {
  it('renders simple markdown correctly', () => {
    render(<MarkdownRenderer content="# Hello" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Hello');
  });

  it('renders safe links with correct attributes', () => {
    render(<MarkdownRenderer content="[External](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', EXTERNAL_LINK_REL);
  });

  it('renders internal links without target=_blank', () => {
    render(<MarkdownRenderer content="[Internal](/internal-page)" />);
    const link = screen.getByRole('link', { name: 'Internal' });
    expect(link).toHaveAttribute('href', '/internal-page');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  // SECURITY: This is the most critical test. It ensures that links
  // with dangerous protocols like `javascript:` are not rendered as
  // clickable `<a>` tags, preventing XSS vulnerabilities.
  it('does NOT render links with dangerous javascript: hrefs', () => {
    const maliciousContent = '[Malicious Link](javascript:alert("XSS"))';
    render(<MarkdownRenderer content={maliciousContent} />);

    // The link should NOT be rendered as a link.
    const potentialLink = screen.queryByRole('link');
    expect(potentialLink).not.toBeInTheDocument();

    // Instead, it should be rendered as a non-interactive span.
    const spanElement = screen.getByText('Malicious Link');
    expect(spanElement.tagName).toBe('SPAN');
    expect(spanElement).not.toHaveAttribute('href');
  });

  it('does NOT render links with other unsafe protocols', () => {
    const maliciousContent = '[Data Protocol](data:text/html,<html>...</html>)';
    render(<MarkdownRenderer content={maliciousContent} />);
    const potentialLink = screen.queryByRole('link');
    expect(potentialLink).not.toBeInTheDocument();
  });

  it('renders safe mailto links correctly', () => {
    render(<MarkdownRenderer content="[Contact](mailto:test@example.com)" />);
    const link = screen.getByRole('link', { name: 'Contact' });
    expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', EXTERNAL_LINK_REL);
  });

  it('renders protocol-relative URLs as external links', () => {
    render(<MarkdownRenderer content="[Proto Rel](//example.com)" />);
    const link = screen.getByRole('link', { name: 'Proto Rel' });
    expect(link).toHaveAttribute('href', '//example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', EXTERNAL_LINK_REL);
  });

  it('renders explicit <br> tags as hard line breaks', () => {
    const { container } = render(
      <MarkdownRenderer content="Line 1<br>Line 2" />,
    );
    expect(container.querySelector('br')).toBeInTheDocument();
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent('Line 1');
    expect(paragraph).toHaveTextContent('Line 2');
  });

  it('validates href protocols for safety checks', () => {
    expect(isSafeHref('https://example.com')).toBe(true);
    expect(isSafeHref('mailto:hello@example.com')).toBe(true);
    expect(isSafeHref('/relative/path')).toBe(true);
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
  });
});
