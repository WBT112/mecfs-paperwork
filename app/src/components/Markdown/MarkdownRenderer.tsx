import { memo } from 'react';
import ReactMarkdown from 'react-markdown';

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

// RATIONALE: To prevent XSS attacks, we must ensure that link URLs do not
// contain dangerous protocols like `javascript:`. This check ensures that only
// safe, whitelisted protocols are allowed in rendered links.
const isSafeHref = (href: string) => {
  try {
    const url = new URL(href, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    // Malformed URLs are considered unsafe.
    return false;
  }
};

const isExternalHref = (href: string) => {
  // We can leverage the safety check here as well. If it's not a safe
  // protocol, it's not a valid external link.
  if (!isSafeHref(href)) return false;

  try {
    const resolved = new URL(href, window.location.origin);
    return resolved.origin !== window.location.origin;
  } catch {
    // Should not happen due to isSafeHref, but as a fallback.
    return false;
  }
};

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
          // SECURITY: To prevent XSS, we must validate the href. If it's
          // missing or unsafe, render a non-interactive span instead of a link.
          if (!href || !isSafeHref(href)) {
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
