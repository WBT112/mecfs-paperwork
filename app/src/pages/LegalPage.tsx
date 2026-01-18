import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';

type LegalPageProps = {
  content: string;
};

export default function LegalPage({ content }: LegalPageProps) {
  return (
    <section className="app__card legal-page">
      <MarkdownRenderer className="legal-page__content" content={content} />
    </section>
  );
}
