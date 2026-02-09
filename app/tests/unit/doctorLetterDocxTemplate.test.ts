import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

const loadDoctorLetterTemplateXml = async (): Promise<string> => {
  const docxPath = path.resolve(
    process.cwd(),
    'public',
    'formpacks',
    'doctor-letter',
    'templates',
    'a4.docx',
  );
  const buffer = await readFile(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) {
    throw new Error(
      'word/document.xml not found in doctor-letter A4 template.',
    );
  }
  return xml;
};

describe('doctor-letter A4 DOCX template', () => {
  it('uses decision.caseParagraphs loop instead of legacy decision.caseText placeholder', async () => {
    const xml = await loadDoctorLetterTemplateXml();

    expect(xml).toContain('{{FOR p IN decision.caseParagraphs}}');
    expect(xml).toContain('{{INS $p}}');
    expect(xml).toContain('{{END-FOR p}}');
    expect(xml).not.toContain('{{decision.caseText}}');
  });

  it('keeps loop commands in dedicated DOCX paragraphs', async () => {
    const xml = await loadDoctorLetterTemplateXml();
    const loopParagraphs = Array.from(
      xml.matchAll(
        /<w:p\b[\s\S]*?<w:t>\{\{(?:FOR p IN decision\.caseParagraphs|INS \$p|END-FOR p)\}\}<\/w:t>[\s\S]*?<\/w:p>/g,
      ),
    ).map((match) => match[0]);

    expect(loopParagraphs).toHaveLength(3);
    expect(loopParagraphs[0]).toContain('{{FOR p IN decision.caseParagraphs}}');
    expect(loopParagraphs[1]).toContain('{{INS $p}}');
    expect(loopParagraphs[2]).toContain('{{END-FOR p}}');
  });
});
