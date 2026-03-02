import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoBox } from '../../src/components/InfoBox';

describe('InfoBox', () => {
  it('renders with provided message', () => {
    render(<InfoBox message="Test information" />);
    expect(screen.getByText('Test information')).toBeInTheDocument();
  });

  it('renders as a div element with role note', () => {
    const { container } = render(<InfoBox message="Test info" />);
    const noteDiv = container.querySelector('[role="note"]');
    expect(noteDiv).toBeInTheDocument();
  });

  it('renders as a static note without aria-live announcements', () => {
    const { container } = render(<InfoBox message="Important note" />);
    const noteDiv = container.querySelector('[role="note"]');
    expect(noteDiv).not.toHaveAttribute('aria-live');
  });

  it('renders info icon emoji', () => {
    render(<InfoBox message="Test message" />);
    const noteDiv = screen.getByRole('note');
    expect(noteDiv.textContent).toContain('ℹ️');
  });

  it('applies custom className', () => {
    const { container } = render(
      <InfoBox message="Test" className="custom-class" />,
    );
    const noteDiv = container.querySelector('.info-box');
    expect(noteDiv).toHaveClass('custom-class');
  });

  it('renders multiline text', () => {
    const multilineText = 'Line 1\nLine 2\nLine 3';
    render(<InfoBox message={multilineText} />);
    const noteDiv = screen.getByRole('note');
    expect(noteDiv.textContent).toContain('Line 1');
    expect(noteDiv.textContent).toContain('Line 2');
    expect(noteDiv.textContent).toContain('Line 3');
  });

  it('renders markdown when format is markdown', () => {
    render(<InfoBox message="**Bold** text" format="markdown" />);
    const noteDiv = screen.getByRole('note');
    expect(noteDiv.querySelector('strong')).toBeInTheDocument();
  });
});
