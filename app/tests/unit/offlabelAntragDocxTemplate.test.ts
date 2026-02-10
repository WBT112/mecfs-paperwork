import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

const loadOfflabelTemplateXml = async (): Promise<string> => {
  const docxPath = path.resolve(
    process.cwd(),
    'public',
    'formpacks',
    'offlabel-antrag',
    'templates',
    'a4.docx',
  );
  const buffer = await readFile(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) {
    throw new Error(
      'word/document.xml not found in offlabel-antrag A4 template.',
    );
  }
  return xml;
};

describe('offlabel-antrag A4 DOCX template', () => {
  it('contains loops for both letter parts and attachment lists', async () => {
    const xml = await loadOfflabelTemplateXml();

    expect(xml).toContain('{{FOR p IN kk.paragraphs}}');
    expect(xml).toContain('{{FOR item IN kk.attachments}}');
    expect(xml).toContain('{{FOR p2 IN arzt.paragraphs}}');
    expect(xml).toContain('{{FOR aItem IN arzt.attachments}}');
  });

  it('contains conditional blocks for optional part 2 and sources', async () => {
    const xml = await loadOfflabelTemplateXml();

    expect(xml).toContain('{{IF hasPart2}}');
    expect(xml).toContain('{{END-IF}}');
    expect(xml).toContain('{{IF hasSources}}');
    expect(xml).toContain('{{sourcesHeading}}');
  });

  it('contains a page break between part 1 and part 2', async () => {
    const xml = await loadOfflabelTemplateXml();

    expect(xml).toContain('<w:br w:type="page"/>');
  });
});
