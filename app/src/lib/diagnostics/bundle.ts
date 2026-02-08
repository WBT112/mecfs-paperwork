import { collectDiagnosticsBundle } from './collectors';
import type { DiagnosticsBundle } from './types';

const BUNDLE_FILENAME = 'mecfs-diagnostics.json';

export const generateDiagnosticsBundle =
  async (): Promise<DiagnosticsBundle> => collectDiagnosticsBundle();

export const downloadDiagnosticsBundle = async (): Promise<void> => {
  const bundle = await generateDiagnosticsBundle();
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = BUNDLE_FILENAME;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Clean up after a brief delay to ensure download initiates
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 100);
};

export const copyDiagnosticsToClipboard = async (): Promise<boolean> => {
  if (!('clipboard' in navigator)) {
    return false;
  }

  try {
    const bundle = await generateDiagnosticsBundle();
    const json = JSON.stringify(bundle, null, 2);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
};
