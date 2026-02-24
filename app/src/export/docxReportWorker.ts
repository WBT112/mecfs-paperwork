/**
 * Web Worker that offloads the CPU-intensive DOCX template rendering
 * to a background thread, keeping the main thread responsive.
 */
import { createReport } from 'docx-templates/lib/browser.js';

type WorkerRequest = {
  id: number;
  template: Uint8Array;
  data: Record<string, unknown>;
  cmdDelimiter: [string, string];
  literalXmlDelimiter: string;
  processLineBreaks: boolean;
  failFast: boolean;
  /** Pre-resolved i18n translations for template expressions. */
  tContext: Record<string, unknown>;
  locale: string;
};

type WorkerResponse =
  | { id: number; result: Uint8Array }
  | { id: number; error: string };

const formatDate = (locale: string) => (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
};

const formatPhone = (value: string | null | undefined): string => {
  if (!value) return '';
  return String(value).trim();
};

const isAllowedMessageOrigin = (origin: string, appOrigin: string): boolean =>
  origin === 'null' || origin === appOrigin;

globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (!isAllowedMessageOrigin(event.origin, globalThis.location.origin)) {
    return;
  }

  const {
    id,
    template,
    data,
    cmdDelimiter,
    literalXmlDelimiter,
    processLineBreaks,
    failFast,
    tContext,
    locale,
  } = event.data;

  const tFn = ((key: string) => {
    const resolved = tContext[key];
    return typeof resolved === 'string' ? resolved : key;
  }) as ((key: string) => string) & Record<string, unknown>;
  Object.assign(tFn, tContext);

  const additionalJsContext = {
    t: tFn,
    formatDate: formatDate(locale),
    formatPhone,
  };

  createReport({
    template,
    data,
    cmdDelimiter,
    literalXmlDelimiter,
    processLineBreaks,
    additionalJsContext,
    failFast,
  }).then(
    (result) => {
      const response: WorkerResponse = { id, result };
      globalThis.postMessage(response, { transfer: [result.buffer] });
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const response: WorkerResponse = { id, error: message };
      globalThis.postMessage(response);
    },
  );
});
