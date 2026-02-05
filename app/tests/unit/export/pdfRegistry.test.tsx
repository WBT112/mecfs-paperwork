import { describe, expect, it } from 'vitest';
import { getPdfExportConfig } from '../../../src/export/pdf/registry';

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

    const element = config.renderDocument(model);
    expect(element.props.model).toBe(model);
  });
});
