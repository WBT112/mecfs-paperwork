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

const isExternalHref = (href: string) => {
  if (href.startsWith('/')) return false;
  if (href.startsWith('#')) return false;
  if (href.startsWith('mailto:')) return false;

  try {
    const resolved = new URL(href, window.location.origin);
    return resolved.origin !== window.location.origin;
  } catch {
    return false;
  }
};

// By defining the components object outside the component, we ensure it's not
// recreated on every render, which prevents unnecessary re-rendering cycles
// in the ReactMarkdown component.
const MARKDOWN_COMPONENTS = {
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
