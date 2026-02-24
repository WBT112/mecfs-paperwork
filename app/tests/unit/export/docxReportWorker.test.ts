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
});
