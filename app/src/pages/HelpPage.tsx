import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';
import helpContent from '../content/help/help.md?raw';

export default function HelpPage() {
  return (
    <section className="app__card legal-page help-page">
      <MarkdownRenderer className="legal-page__content" content={helpContent} />
    </section>
  );
}
