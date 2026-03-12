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
  it('uses a landscape 2x2 fold layout instead of the legacy linear document', async () => {
    const xml = await loadNotfallpassTemplateXml();

    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('w:orient="landscape"');
    expect(xml.match(/<w:tr>/g) ?? []).toHaveLength(2);
    expect(xml.match(/<w:tc>/g) ?? []).toHaveLength(4);
  });

  it('contains the four fold panels with the required placeholders and loops', async () => {
    const xml = await loadNotfallpassTemplateXml();

    expect(xml).toContain('{{t.notfallpass.export.foldHint}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.support.title}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.alerts.title}}');
    expect(xml).toContain('{{t.notfallpass.export.panel.medications.title}}');
    expect(xml).toContain('{{FOR c IN contacts}}');
    expect(xml).toContain('{{FOR m IN medications}}');
    expect(xml).toContain('{{FOR p IN diagnosisParagraphs}}');
  });
});
