import { memo } from 'react';
import MarkdownRenderer from './Markdown/MarkdownRenderer';

interface InfoBoxProps {
  readonly message: string;
  readonly className?: string;
  readonly format?: 'text' | 'markdown';
}

/**
 * InfoBox component renders a callout/hint message.
 * Used for maintainer-controlled informational messages in forms.
 */
export const InfoBox = memo(function InfoBox({
  message,
  className = '',
  format = 'text',
}: InfoBoxProps) {
  const content =
    format === 'markdown' ? <MarkdownRenderer content={message} /> : message;

  return (
    <div
      className={['info-box', className].filter(Boolean).join(' ')}
      role="note"
    >
      <span className="info-box__icon" aria-hidden="true">
        ℹ️
      </span>
      <div className="info-box__content">{content}</div>
    </div>
  );
});
