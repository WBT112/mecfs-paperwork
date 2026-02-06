import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPdfExportFilename,
  downloadPdfExport,
} from '../../../src/export/pdf/download';

const fixedDate = new Date('2026-02-02T00:00:00.000Z');
const exportFilename = 'export.pdf';
const objectUrl = 'blob:pdf';

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
      .mockReturnValue(objectUrl);
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
    expect(clickedDownloads).toEqual([exportFilename]);
    vi.runAllTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith(objectUrl);
  });

  it('uses the provided URL without creating a new object URL', () => {
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue(objectUrl);
    const clickedDownloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function handleClick(this: HTMLAnchorElement) {
        clickedDownloads.push(this.download);
      },
    );

    downloadPdfExport({ url: 'blob:existing', filename: exportFilename });

    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(clickedDownloads).toEqual([exportFilename]);
  });

  it('throws when no blob or url is provided', () => {
    expect(() => downloadPdfExport({ filename: exportFilename })).toThrow(
      'PDF export could not be generated.',
    );
  });
});
