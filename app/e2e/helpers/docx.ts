import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

const decodeXmlEntities = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

export const extractDocxDocumentXml = async (docxPath: string) => {
  const buffer = await readFile(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('DOCX document.xml was not found in the export.');
  }

  return documentXml;
};

export const extractDocxTextFromXml = (documentXml: string) =>
  decodeXmlEntities(
    Array.from(documentXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
      .map((match) => match[1])
      .join(''),
  );

export const extractDocxParagraphTexts = (documentXml: string): string[] =>
  Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g))
    .map((paragraphMatch) => paragraphMatch[0])
    .map((paragraphXml) =>
      Array.from(paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((textMatch) => textMatch[1])
        .join(''),
    )
    .map(decodeXmlEntities);
