import { pdf } from '@react-pdf/renderer';

type ReadableLike = {
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

const isReadableLike = (value: unknown): value is ReadableLike =>
  typeof value === 'object' &&
  value !== null &&
  'on' in value &&
  typeof value.on === 'function';

export const renderPdfToLatin1Text = async (
  document: Parameters<typeof pdf>[0],
): Promise<string> => {
  const output = await pdf(document).toBuffer();

  if (output instanceof Uint8Array) {
    return Buffer.from(output).toString('latin1');
  }

  if (!isReadableLike(output)) {
    throw new Error('Unsupported PDF output type');
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    output.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    output.on('end', () => resolve());
    output.on('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });

  return Buffer.concat(chunks).toString('latin1');
};
