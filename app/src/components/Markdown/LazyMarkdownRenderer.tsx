import { Suspense, lazy, memo } from 'react';

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

type LazyMarkdownRendererProps = {
  content: string;
  className?: string;
};

/**
 * PERFORMANCE: Lazy-loaded wrapper for MarkdownRenderer.
 * This defers loading the react-markdown library until actually needed,
 * reducing the initial bundle size for form pages.
 */
const LazyMarkdownRenderer = memo(function LazyMarkdownRenderer({
  content,
  className,
}: LazyMarkdownRendererProps) {
  return (
    <Suspense fallback={<div className={className}>{content}</div>}>
      <MarkdownRenderer content={content} className={className} />
    </Suspense>
  );
});

export default LazyMarkdownRenderer;
