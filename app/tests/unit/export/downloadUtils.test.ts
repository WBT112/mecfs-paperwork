import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBlobExport,
  sanitizeFilenamePart,
} from '../../../src/export/downloadUtils';

describe('downloadUtils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('normalizes Uint8Array payloads and dotless extensions without duplicating suffixes', () => {
    vi.useFakeTimers();
    const createdUrl = 'blob:download-utils';
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue(createdUrl);
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickedDownloads: string[] = [];

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function handleClick(this: HTMLAnchorElement) {
        clickedDownloads.push(this.download);
      },
    );

    downloadBlobExport({
      blob: new Uint8Array([1, 2, 3]),
      filename: 'archive.pdf',
      mimeType: 'application/pdf',
      defaultExtension: 'pdf',
    });

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickedDownloads).toEqual(['archive.pdf']);
    vi.runAllTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith(createdUrl);
  });

  it('throws the default error message when no payload can be downloaded', () => {
    expect(() =>
      downloadBlobExport({
        filename: 'missing',
        mimeType: 'application/pdf',
        defaultExtension: 'pdf',
      }),
    ).toThrow('Export could not be generated.');
  });

  it('returns an empty filename segment for nullish values', () => {
    expect(sanitizeFilenamePart(undefined)).toBe('');
  });
});
