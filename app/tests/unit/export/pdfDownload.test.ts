import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPdfExportFilename,
  downloadPdfExport,
} from '../../../src/export/pdf/download';

const fixedDate = new Date('2026-02-02T00:00:00.000Z');

describe('buildPdfExportFilename', () => {
  it('formats the date and sanitizes the formpack id', () => {
    expect(buildPdfExportFilename('doctor-letter', fixedDate)).toBe(
      'doctor-letter-pdf-20260202.pdf',
    );
    expect(buildPdfExportFilename('  doctor / letter  ', fixedDate)).toBe(
      'doctor-letter-pdf-20260202.pdf',
    );
  });
});

describe('downloadPdfExport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates an object URL when given a blob', () => {
    vi.useFakeTimers();
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:pdf');
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickedDownloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function handleClick(this: HTMLAnchorElement) {
        clickedDownloads.push(this.download);
      },
    );

    downloadPdfExport({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'export',
    });

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickedDownloads).toEqual(['export.pdf']);
    vi.runAllTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pdf');
  });

  it('uses the provided URL without creating a new object URL', () => {
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:pdf');
    const clickedDownloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function handleClick(this: HTMLAnchorElement) {
        clickedDownloads.push(this.download);
      },
    );

    downloadPdfExport({ url: 'blob:existing', filename: 'export.pdf' });

    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(clickedDownloads).toEqual(['export.pdf']);
  });

  it('throws when no blob or url is provided', () => {
    expect(() => downloadPdfExport({ filename: 'export.pdf' })).toThrow(
      'PDF export could not be generated.',
    );
  });
});
