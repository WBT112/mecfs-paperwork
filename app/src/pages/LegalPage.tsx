import { useEffect } from 'react';
import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';

type LegalPageProps = Readonly<{
  content: string;
}>;

export default function LegalPage({ content }: LegalPageProps) {
  useEffect(() => {
    const name = 'robots';
    const contentValue = 'noindex, nofollow';
    const existingMeta = document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`,
    );
    const previousContent = existingMeta?.getAttribute('content') ?? null;
    const created = existingMeta === null;
    const meta = existingMeta ?? document.createElement('meta');

    if (created) {
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', contentValue);

    return () => {
      if (created) {
        meta.remove();
        return;
      }

      if (previousContent === null) {
        meta.removeAttribute('content');
        return;
      }

      meta.setAttribute('content', previousContent);
    };
  }, []);

  return (
    <section className="app__card legal-page">
      <MarkdownRenderer className="legal-page__content" content={content} />
    </section>
  );
}
