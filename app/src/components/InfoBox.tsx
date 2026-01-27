import MarkdownRenderer from './Markdown/MarkdownRenderer';

interface InfoBoxProps {
  message: string;
  className?: string;
  format?: 'text' | 'markdown';
}

/**
 * InfoBox component renders a callout/hint message.
 * Used for maintainer-controlled informational messages in forms.
 */
export function InfoBox({
  message,
  className = '',
  format = 'text',
}: InfoBoxProps) {
  const content =
    format === 'markdown' ? <MarkdownRenderer content={message} /> : message;

  return (
    <div
      className={`info-box ${className}`}
      style={{
        backgroundColor: 'var(--color-info-bg, #e3f2fd)',
        border: '1px solid var(--color-info-border, #2196f3)',
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        marginTop: '0.5rem',
        marginBottom: '0.5rem',
        fontSize: '0.9rem',
        color: 'var(--color-info-text, #0d47a1)',
      }}
      role="note"
      aria-live="polite"
    >
      <span style={{ marginRight: '0.5rem' }}>ℹ️</span>
      {content}
    </div>
  );
}
