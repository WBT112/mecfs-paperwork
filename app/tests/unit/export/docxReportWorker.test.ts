import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createReportMock = vi.fn();

vi.mock('docx-templates/lib/browser.js', () => ({
  createReport: createReportMock,
}));

type WorkerRequest = {
  id: number;
  template: Uint8Array;
  data: Record<string, unknown>;
  cmdDelimiter: [string, string];
  literalXmlDelimiter: string;
  processLineBreaks: boolean;
  failFast: boolean;
  tContext: Record<string, unknown>;
  locale: string;
};

const buildRequest = (): WorkerRequest => ({
  id: 1,
  template: new Uint8Array([1, 2, 3]),
  data: { name: 'Sample' },
  cmdDelimiter: ['{{', '}}'],
  literalXmlDelimiter: '||',
  processLineBreaks: true,
  failFast: true,
  tContext: { hello: 'Hallo' },
  locale: 'de',
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('docxReportWorker', () => {
  let messageHandler: ((event: MessageEvent<WorkerRequest>) => void) | null =
    null;

  beforeEach(() => {
    vi.resetModules();
    createReportMock.mockReset();
    messageHandler = null;

    vi.stubGlobal('postMessage', vi.fn());
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, listener: unknown) => {
        if (type === 'message' && typeof listener === 'function') {
          messageHandler = listener as (
            event: MessageEvent<WorkerRequest>,
          ) => void;
        }
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ignores messages from unexpected origins', async () => {
    createReportMock.mockResolvedValue(new Uint8Array([9]));
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: 'https://evil.example',
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).not.toHaveBeenCalled();
    expect(globalThis.postMessage).not.toHaveBeenCalled();
  });

  it('accepts null-origin messages and posts a transferable result', async () => {
    const rendered = new Uint8Array([4, 5, 6]);
    createReportMock.mockResolvedValue(rendered);
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: 'null',
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).toHaveBeenCalledTimes(1);
    expect(globalThis.postMessage).toHaveBeenCalledWith(
      { id: 1, result: rendered },
      { transfer: [rendered.buffer] },
    );
  });

  it('passes formatter and translation helpers into template context', async () => {
    const rendered = new Uint8Array([10, 11, 12]);
    createReportMock.mockImplementation(async (options) => {
      const candidate = (options as Record<string, unknown>)
        .additionalJsContext;
      expect(candidate).toBeTypeOf('object');
      expect(candidate).not.toBeNull();

      const ctx = candidate as {
        t: (key: string) => string;
        formatDate: (value: string | null | undefined) => string;
        formatPhone: (value: string | null | undefined) => string;
      };

      expect(ctx.t('hello')).toBe('Hallo');
      expect(ctx.t('missing')).toBe('missing');
      expect(ctx.formatPhone(' 0123 456 ')).toBe('0123 456');
      expect(ctx.formatPhone(undefined)).toBe('');
      expect(ctx.formatDate(undefined)).toBe('');
      expect(ctx.formatDate('not-a-date')).toBe('not-a-date');

      const formattedDate = ctx.formatDate('2026-02-24');
      expect(formattedDate.length).toBeGreaterThan(0);
      return rendered;
    });
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: globalThis.location.origin,
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).toHaveBeenCalledTimes(1);
    expect(globalThis.postMessage).toHaveBeenCalledWith(
      { id: 1, result: rendered },
      { transfer: [rendered.buffer] },
    );
  });

  it('accepts empty-origin messages used by dedicated workers', async () => {
    const rendered = new Uint8Array([7, 8, 9]);
    createReportMock.mockResolvedValue(rendered);
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: '',
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).toHaveBeenCalledTimes(1);
    expect(globalThis.postMessage).toHaveBeenCalledWith(
      { id: 1, result: rendered },
      { transfer: [rendered.buffer] },
    );
  });

  it('posts worker errors for allowed same-origin messages', async () => {
    createReportMock.mockRejectedValue(new Error('render failed'));
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: globalThis.location.origin,
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).toHaveBeenCalledTimes(1);
    expect(globalThis.postMessage).toHaveBeenCalledWith({
      id: 1,
      error: 'render failed',
    });
  });

  it('stringifies non-Error rejections before posting worker errors', async () => {
    createReportMock.mockRejectedValue('render failed as string');
    await import('../../../src/export/docxReportWorker');

    expect(messageHandler).not.toBeNull();
    messageHandler?.({
      origin: globalThis.location.origin,
      data: buildRequest(),
    } as MessageEvent<WorkerRequest>);
    await flushPromises();

    expect(createReportMock).toHaveBeenCalledTimes(1);
    expect(globalThis.postMessage).toHaveBeenCalledWith({
      id: 1,
      error: 'render failed as string',
    });
  });
});
