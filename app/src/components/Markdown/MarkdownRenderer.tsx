import { memo, ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { isExternalHref, isSafeHref } from './markdownLinks';

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

const ALLOWED_ELEMENTS = [
  'a',
  'blockquote',
  'br',
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

const BR_TAG_PATTERN = /<br\s*\/?>/gi;

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
  // NOTE: Support explicit <br> inputs without enabling raw HTML rendering.
  const normalizedContent = content.replaceAll(BR_TAG_PATTERN, '  \n');

  return (
    <ReactMarkdown
      className={className}
      skipHtml
      allowedElements={ALLOWED_ELEMENTS}
      components={MARKDOWN_COMPONENTS}
    >
      {normalizedContent}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;
