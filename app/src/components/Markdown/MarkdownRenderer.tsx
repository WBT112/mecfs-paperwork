import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { isExternalHref } from '../../lib/utils';

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

const ALLOWED_ELEMENTS = [
  'a',
  'blockquote',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
];

const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className={className}
      skipHtml
      allowedElements={ALLOWED_ELEMENTS}
      components={{
        a({ href, children, ...props }) {
          if (!href) {
            return <span {...props}>{children}</span>;
          }

          const external = isExternalHref(href);
          const rel = external ? 'noreferrer noopener' : undefined;
          const target = external ? '_blank' : undefined;

          return (
            <a href={href} rel={rel} target={target} {...props}>
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;
