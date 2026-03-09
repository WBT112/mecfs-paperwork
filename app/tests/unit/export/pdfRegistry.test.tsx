import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import type { DocumentModel } from '../../../src/export/pdf/types';
import { getPdfExportConfig } from '../../../src/export/pdf/pdfExportRegistry';

describe('getPdfExportConfig', () => {
  it('returns null for unknown formpacks', async () => {
    await expect(getPdfExportConfig('unknown-pack')).resolves.toBeNull();
  });

  it('returns a configured export for doctor-letter', async () => {
    const config = await getPdfExportConfig('doctor-letter');
    expect(config).not.toBeNull();
    if (!config) {
      return;
    }

    const exportedAt = new Date('2026-02-02T00:00:00.000Z');
    const model = config.buildModel({
      formData: {},
      locale: 'en',
      exportedAt,
    });

    expect(model.meta?.createdAtIso).toBe(exportedAt.toISOString());
    expect(model.meta?.locale).toBe('en');

    const element = config.renderDocument(model) as ReactElement<{
      model: DocumentModel;
    }>;
    expect(element.props.model).toBe(model);
  }, 15_000);

  it('returns a configured export for offlabel-antrag', async () => {
    const config = await getPdfExportConfig('offlabel-antrag');
    expect(config).not.toBeNull();
    if (!config) {
      return;
    }

    const exportedAt = new Date('2026-02-02T00:00:00.000Z');
    const model = config.buildModel({
      formData: {
        request: {
          drug: 'ivabradine',
        },
      },
      locale: 'de',
      exportedAt,
    });

    expect(model.meta?.createdAtIso).toBe(exportedAt.toISOString());
    expect(model.meta?.locale).toBe('de');

    const element = config.renderDocument(model) as ReactElement<{
      model: DocumentModel;
    }>;
    expect(element.props.model).toBe(model);
  }, 15_000);
});
