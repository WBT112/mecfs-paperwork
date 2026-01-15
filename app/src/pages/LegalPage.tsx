import { useMemo } from 'react';
import { parseMarkdown } from '../lib/markdown';

const renderHeading = (level: 1 | 2 | 3, text: string, key: string) => {
  if (level === 1) {
    return <h1 key={key}>{text}</h1>;
  }

  if (level === 2) {
    return <h2 key={key}>{text}</h2>;
  }

  return <h3 key={key}>{text}</h3>;
};

export default function LegalPage({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <section className="app__card legal-page">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'heading') {
          return renderHeading(block.level, block.text, key);
        }

        if (block.type === 'list') {
          return (
            <ul key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={key}>{block.text}</p>;
      })}
    </section>
  );
}
