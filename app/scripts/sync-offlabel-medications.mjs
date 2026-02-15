/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MEDICATIONS,
  OFFLABEL_MEDICATION_KEYS,
} from '../src/formpacks/offlabel-antrag/medications.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const formpackRoot = path.join(
  appRoot,
  'public',
  'formpacks',
  'offlabel-antrag',
);

const schemaPath = path.join(formpackRoot, 'schema.json');
const uiSchemaPath = path.join(formpackRoot, 'ui.schema.json');
const manifestPath = path.join(formpackRoot, 'manifest.json');

const readJson = async (targetPath) => {
  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw);
};

const writeJson = async (targetPath, payload) =>
  fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const syncSchema = (schema) => {
  const requestProps = schema?.properties?.request?.properties;
  if (!requestProps?.drug) {
    throw new Error('offlabel schema is missing request.drug');
  }
  requestProps.drug.enum = [...OFFLABEL_MEDICATION_KEYS];
  return schema;
};

const syncUiSchema = (uiSchema) => {
  const requestDrugUi = uiSchema?.request?.drug;
  if (!requestDrugUi) {
    throw new Error('offlabel ui schema is missing request.drug');
  }
  requestDrugUi['ui:enumNames'] = OFFLABEL_MEDICATION_KEYS.map(
    (key) => `offlabel-antrag.request.drug.option.${key}`,
  );
  return uiSchema;
};

const buildDrugInfoBoxes = () =>
  OFFLABEL_MEDICATION_KEYS.map((key) => ({
    id: `drug-${key}`,
    anchor: 'request.drug',
    enabled: true,
    i18nKey: MEDICATIONS[key].infoBoxI18nKey,
    format: 'markdown',
    showIf: [
      {
        path: 'request.drug',
        op: 'eq',
        value: key,
      },
    ],
  }));

const syncManifest = (manifest) => {
  const ui = manifest.ui ?? {};
  const infoBoxes = Array.isArray(ui.infoBoxes) ? ui.infoBoxes : [];
  const nonDrugInfoBoxes = infoBoxes.filter(
    (entry) =>
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.id !== 'string' ||
      !entry.id.startsWith('drug-'),
  );

  ui.infoBoxes = [...buildDrugInfoBoxes(), ...nonDrugInfoBoxes];
  manifest.ui = ui;
  return manifest;
};

const main = async () => {
  const [schema, uiSchema, manifest] = await Promise.all([
    readJson(schemaPath),
    readJson(uiSchemaPath),
    readJson(manifestPath),
  ]);

  await Promise.all([
    writeJson(schemaPath, syncSchema(schema)),
    writeJson(uiSchemaPath, syncUiSchema(uiSchema)),
    writeJson(manifestPath, syncManifest(manifest)),
  ]);

  console.log(
    `Synced offlabel medication metadata for ${OFFLABEL_MEDICATION_KEYS.length} medication entries.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
