import { describe, expect, it } from 'vitest';
import schemaJson from '../../public/formpacks/offlabel-antrag/schema.json';
import uiSchemaJson from '../../public/formpacks/offlabel-antrag/ui.schema.json';
import manifestJson from '../../public/formpacks/offlabel-antrag/manifest.json';
import {
  MEDICATIONS,
  OFFLABEL_MEDICATION_KEYS,
} from '../../src/formpacks/offlabel-antrag/medications';

type JsonObject = Record<string, unknown>;

describe('offlabel medication sync drift guard', () => {
  it('keeps schema enum in sync with medication keys', () => {
    const schema = schemaJson as JsonObject;
    const request = schema.properties as JsonObject;
    const requestSchema = (request.request as JsonObject)
      .properties as JsonObject;
    const drug = requestSchema.drug as JsonObject;
    const selectedIndicationKey =
      requestSchema.selectedIndicationKey as JsonObject;

    expect(drug.enum).toEqual([...OFFLABEL_MEDICATION_KEYS]);
    expect(selectedIndicationKey.enum).toEqual(
      OFFLABEL_MEDICATION_KEYS.flatMap((key) =>
        MEDICATIONS[key].indications.map((indication) => indication.key),
      ),
    );
  });

  it('keeps ui enum names in sync with medication keys', () => {
    const uiSchema = uiSchemaJson as JsonObject;
    const request = uiSchema.request as JsonObject;
    const drug = request.drug as JsonObject;

    expect(drug['ui:enumNames']).toEqual(
      OFFLABEL_MEDICATION_KEYS.map(
        (key) => `offlabel-antrag.request.drug.option.${key}`,
      ),
    );
  });

  it('keeps manifest drug info boxes in sync with medication registry', () => {
    const manifest = manifestJson as JsonObject;
    const ui = manifest.ui as JsonObject;
    const infoBoxes = (ui.infoBoxes as JsonObject[]).filter((entry) =>
      String(entry.id).startsWith('drug-'),
    );

    expect(infoBoxes).toHaveLength(OFFLABEL_MEDICATION_KEYS.length);

    for (const key of OFFLABEL_MEDICATION_KEYS) {
      const infoBox = infoBoxes.find((entry) => entry.id === `drug-${key}`);
      expect(infoBox).toBeDefined();
      expect(infoBox?.i18nKey).toBe(MEDICATIONS[key].infoBoxI18nKey);
      expect(infoBox?.anchor).toBe('request.drug');
      expect(infoBox?.enabled).toBe(true);
      const showIf = infoBox?.showIf as JsonObject[] | undefined;
      expect(showIf?.[0]).toMatchObject({
        path: 'request.drug',
        op: 'eq',
        value: key,
      });
    }
  });
});
