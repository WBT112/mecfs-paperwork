import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

const loadNotfallpassTemplateXml = async (): Promise<string> => {
  const docxPath = path.resolve(
    process.cwd(),
    'public',
    'formpacks',
    'notfallpass',
    'templates',
    'a4.docx',
  );
  const buffer = await readFile(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) {
    throw new Error('word/document.xml not found in notfallpass A4 template.');
  }
  return xml;
};

describe('notfallpass A4 DOCX template', () => {
  it('uses a two-page landscape fold layout with four panels per page', async () => {
    const xml = await loadNotfallpassTemplateXml();

    expect(xml).toContain('w:orient="landscape"');
    expect(xml.match(/<w:tbl>/g) ?? []).toHaveLength(2);
    expect(xml.match(/<w:gridCol /g) ?? []).toHaveLength(8);
    expect(xml.match(/<w:tc>/g) ?? []).toHaveLength(8);
    expect(xml).toContain('<w:br w:type="page"/>');
  });

  it('contains the panel titles and loops required for the foldable export', async () => {
    const xml = await loadNotfallpassTemplateXml();

    expect(xml).toContain('{{t.notfallpass.export.panel.cover.title}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.contact.title}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.practice.title}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.treatment.title}}');
    expect(xml).toContain('{{FOR c IN contacts}}');
    expect(xml).toContain('{{FOR m IN medications}}');
    expect(xml).toContain('{{FOR p IN diagnosisParagraphs}}');
  });
});
