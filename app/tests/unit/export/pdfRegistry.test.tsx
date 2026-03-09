import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import type { DocumentModel } from '../../../src/export/pdf/types';
import { getPdfExportConfig } from '../../../src/export/pdf/pdfExportRegistry';

const EXPORTED_AT_ISO = '2026-02-02T00:00:00.000Z';

const expectConfiguredExport = async (
  formpackId: string,
  options: {
    formData: Record<string, unknown>;
    locale: 'de' | 'en';
  },
) => {
  const config = await getPdfExportConfig(formpackId);
  expect(config).not.toBeNull();
  if (!config) {
    throw new Error(`Expected PDF export config for ${formpackId}`);
  }

  const exportedAt = new Date(EXPORTED_AT_ISO);
  const model = config.buildModel({
    formData: options.formData,
    locale: options.locale,
    exportedAt,
  });

  expect(model.meta?.createdAtIso).toBe(exportedAt.toISOString());
  expect(model.meta?.locale).toBe(options.locale);

  const element = config.renderDocument(model) as ReactElement<{
    model: DocumentModel;
  }>;
  expect(element.props.model).toBe(model);
};

describe('getPdfExportConfig', () => {
  it('returns null for unknown formpacks', async () => {
    await expect(getPdfExportConfig('unknown-pack')).resolves.toBeNull();
  });

  it('returns a configured export for doctor-letter', async () => {
    await expectConfiguredExport('doctor-letter', {
      formData: {},
      locale: 'en',
    });
  }, 15_000);

  it('returns a configured export for offlabel-antrag', async () => {
    await expectConfiguredExport('offlabel-antrag', {
      formData: {
        request: {
          drug: 'ivabradine',
        },
      },
      locale: 'de',
    });
  }, 15_000);

  it('returns a configured export for pacing-ampelkarten', async () => {
    await expectConfiguredExport('pacing-ampelkarten', {
      formData: {
        meta: { variant: 'child' },
        child: {
          cards: {
            green: {
              canDo: ['Short chat'],
              needHelp: [],
              visitRules: [],
              stimuli: [],
              hint: 'Friendly reminder',
              thanks: 'Thanks',
            },
            yellow: {
              canDo: ['Rest more'],
              needHelp: [],
              visitRules: [],
              stimuli: [],
              hint: 'Slow day',
              thanks: 'Thanks',
            },
            red: {
              canDo: ['Please no calls'],
              needHelp: [],
              visitRules: [],
              stimuli: [],
              hint: 'Rest day',
              thanks: 'Thanks',
            },
          },
        },
        notes: {
          title: 'Notes',
          items: ['No doorbell'],
        },
        sender: {
          signature: 'Love, ...',
        },
      },
      locale: 'en',
    });
  }, 15_000);
});
