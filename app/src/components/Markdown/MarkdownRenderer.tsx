import { memo, ComponentPropsWithoutRef } from 'react';
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
// It must also be environment-agnostic (not rely on `window`).
const isSafeHref = (href: string) => {
  try {
    // Use a dummy base to handle relative URLs correctly. The base itself
    // is irrelevant; we only care about the resulting protocol.
    const url = new URL(href, 'https://dummy.base');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    // Malformed URLs are considered unsafe.
    return false;
  }
};

const isExternalHref = (href: string) => {
  // An external link is one that starts with a protocol. This is a simpler
  // and more robust check than trying to compare origins.
  return /^(?:https?|mailto):|^\/\//i.test(href);
};

// PERFORMANCE: The `components` object is defined outside the component to
// ensure it has a stable reference. If it were defined inside, it would be a
// new object on every render, causing `ReactMarkdown` to re-render
// unnecessarily, even if the props haven't changed.
const MARKDOWN_COMPONENTS = {
  a({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
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
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;
