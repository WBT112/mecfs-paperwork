/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const formpacksDir = path.join(repoRoot, 'formpacks');
const skeletonDir = path.join(repoRoot, 'tools', 'formpack-skeleton');

const parseArgs = (args) => {
  const result = { id: null, title: null, register: false };
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--id') {
      result.id = args[index + 1] ?? null;
      index += 1;
    } else if (token.startsWith('--id=')) {
      result.id = token.slice('--id='.length) || null;
    } else if (token === '--title') {
      result.title = args[index + 1] ?? null;
      index += 1;
    } else if (token.startsWith('--title=')) {
      result.title = token.slice('--title='.length) || null;
    } else if (token === '--register') {
      result.register = true;
    } else if (!token.startsWith('--')) {
      positional.push(token);
    }
  }

  const normalizeConfigValue = (value) => {
    if (!value) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === 'true' || trimmed === 'false') {
      return null;
    }
    return trimmed;
  };

  const envId = normalizeConfigValue(process.env.npm_config_id);
  const envTitle = normalizeConfigValue(process.env.npm_config_title);

  if (!result.register && process.env.npm_config_register !== undefined) {
    const envValue = process.env.npm_config_register;
    result.register = envValue !== '0' && envValue !== 'false';
  }

  if (!result.id) {
    result.id = positional[0] ?? null;
  }

  if (!result.title) {
    result.title = positional[1] ?? null;
  }

  if (!result.id && envId) {
    result.id = envId;
  }

  if (!result.title && envTitle) {
    result.title = envTitle;
  }

  return result;
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const copySkeletonTemplate = async (targetPath) => {
  const sourcePath = path.join(skeletonDir, 'templates', 'a4.docx');
  await fs.copyFile(sourcePath, targetPath);
};

const updateRegistry = async (formpackId) => {
  const registryPath = path.join(
    repoRoot,
    'app',
    'src',
    'formpacks',
    'registry.ts',
  );
  const content = await fs.readFile(registryPath, 'utf8');
  const registryPattern =
    /(export const FORMPACK_IDS\s*=\s*)\[([\s\S]*?)\](\s*as const;)/;
  const idsMatch = content.match(registryPattern);
  if (!idsMatch) {
    throw new Error('Could not find FORMPACK_IDS in registry.ts');
  }

  const idsBlock = idsMatch[2];
  const ids = [];
  const idPattern = /'([^']+)'|"([^"]+)"/g;
  let idMatch = idPattern.exec(idsBlock);
  while (idMatch) {
    ids.push(idMatch[1] ?? idMatch[2]);
    idMatch = idPattern.exec(idsBlock);
  }

  if (ids.includes(formpackId)) {
    return;
  }

  ids.push(formpackId);
  ids.sort();

  const formattedIds = ids.map((id) => `  '${id}',`).join('\n');
  const updated = content.replace(
    registryPattern,
    (_match, prefix, _idsBlock, suffix) =>
      `${prefix}[\n${formattedIds}\n]${suffix}`,
  );

  await fs.writeFile(registryPath, updated, 'utf8');
};

/**
 * Creates a new "formpack" - a self-contained directory with all assets
 * needed to render a form and its corresponding exports (e.g., DOCX).
 *
 * Each formpack contains:
 * - manifest.json: Metadata (ID, version, locales).
 * - schema.json: Data structure (JSON Schema).
 * - ui.schema.json: Form layout rules (react-jsonschema-form).
 * - i18n/*.json: Localization files.
 * - docx/mapping.json: Maps schema fields to DOCX template variables.
 * - templates/*.docx: The MS Word template for export.
 * - examples/*.json: Sample data for testing and previews.
 */
const createFormpack = async ({ id, title, register }) => {
  if (!id) {
    throw new Error('Missing --id argument.');
  }

  const packDir = path.join(formpacksDir, id);
  const exists = await fs
    .access(packDir)
    .then(() => true)
    .catch(() => false);
  if (exists) {
    throw new Error(`Formpack already exists: ${id}`);
  }

  await ensureDir(packDir);
  await ensureDir(path.join(packDir, 'docx'));
  await ensureDir(path.join(packDir, 'examples'));
  await ensureDir(path.join(packDir, 'i18n'));
  await ensureDir(path.join(packDir, 'templates'));

  const titleValue = title || id;

  const manifest = {
    id,
    version: '0.1.0',
    defaultLocale: 'de',
    locales: ['de', 'en'],
    titleKey: `${id}.title`,
    descriptionKey: `${id}.description`,
    exports: ['docx', 'json'],
    docx: {
      templates: {
        a4: 'templates/a4.docx',
      },
      mapping: 'docx/mapping.json',
    },
  };

  const schema = {
    type: 'object',
    required: ['person'],
    properties: {
      person: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          birthDate: { type: 'string', format: 'date' },
          email: { type: 'string', format: 'email' },
          website: { type: 'string' },
        },
        additionalProperties: false,
      },
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            phone: { type: 'string' },
            relation: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      diagnoses: {
        type: 'object',
        properties: {
          formatted: { type: 'string' },
        },
        additionalProperties: false,
      },
      symptoms: { type: 'string' },
      medications: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            dosage: { type: 'string' },
            schedule: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      allergies: { type: 'string' },
      doctor: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  };

  const uiSchema = {
    'ui:order': [
      'person',
      'contacts',
      'diagnoses',
      'symptoms',
      'medications',
      'allergies',
      'doctor',
    ],
    person: {
      'ui:title': `${id}.section.person.title`,
      name: {
        'ui:title': `${id}.person.name.label`,
        'ui:help': `${id}.person.name.help`,
      },
      birthDate: {
        'ui:title': `${id}.person.birthDate.label`,
        'ui:help': `${id}.person.birthDate.help`,
      },
      email: {
        'ui:title': `${id}.person.email.label`,
        'ui:help': `${id}.person.email.help`,
      },
      website: {
        'ui:title': `${id}.person.website.label`,
        'ui:help': `${id}.person.website.help`,
      },
    },
    contacts: {
      'ui:title': `${id}.section.contacts.title`,
      'ui:options': {
        addable: true,
        orderable: false,
        removable: true,
      },
      items: {
        name: {
          'ui:title': `${id}.contacts.name.label`,
          'ui:help': `${id}.contacts.name.help`,
        },
        phone: {
          'ui:title': `${id}.contacts.phone.label`,
          'ui:help': `${id}.contacts.phone.help`,
        },
        relation: {
          'ui:title': `${id}.contacts.relation.label`,
          'ui:help': `${id}.contacts.relation.help`,
        },
      },
    },
    diagnoses: {
      'ui:title': `${id}.section.diagnoses.title`,
      formatted: {
        'ui:title': `${id}.diagnoses.formatted.label`,
        'ui:help': `${id}.diagnoses.formatted.help`,
        'ui:widget': 'textarea',
      },
    },
    symptoms: {
      'ui:title': `${id}.section.symptoms.title`,
      'ui:help': `${id}.symptoms.help`,
      'ui:widget': 'textarea',
    },
    medications: {
      'ui:title': `${id}.section.medications.title`,
      'ui:options': {
        addable: true,
        orderable: false,
        removable: true,
      },
      items: {
        name: {
          'ui:title': `${id}.medications.name.label`,
          'ui:help': `${id}.medications.name.help`,
        },
        dosage: {
          'ui:title': `${id}.medications.dosage.label`,
          'ui:help': `${id}.medications.dosage.help`,
        },
        schedule: {
          'ui:title': `${id}.medications.schedule.label`,
          'ui:help': `${id}.medications.schedule.help`,
        },
      },
    },
    allergies: {
      'ui:title': `${id}.section.allergies.title`,
      'ui:help': `${id}.allergies.help`,
      'ui:widget': 'textarea',
    },
    doctor: {
      'ui:title': `${id}.section.doctor.title`,
      name: {
        'ui:title': `${id}.doctor.name.label`,
        'ui:help': `${id}.doctor.name.help`,
      },
      phone: {
        'ui:title': `${id}.doctor.phone.label`,
        'ui:help': `${id}.doctor.phone.help`,
      },
    },
  };

  const example = {
    person: {
      name: 'Beispiel',
      birthDate: '1990-04-12',
      email: 'beispiel@example.com',
      website: 'https://example.com',
    },
    contacts: [
      {
        name: 'Kontakt A',
        phone: '+49 123 456',
        relation: 'Familie',
      },
      {
        name: 'Kontakt B',
        phone: '+49 987 654',
        relation: 'Freunde',
      },
    ],
    diagnoses: {
      formatted: 'Beispiel Diagnose',
    },
    symptoms: 'Beispiel Symptome',
    medications: [
      {
        name: 'Medikament A',
        dosage: '10 mg',
        schedule: 'morgens',
      },
    ],
    allergies: 'Keine',
    doctor: {
      name: 'Praxis Beispiel',
      phone: '+49 555 123',
    },
  };

  const i18nDe = {
    [`${id}.title`]: titleValue,
    [`${id}.description`]: `${titleValue} Beschreibung`,
    [`${id}.section.person.title`]: 'Person',
    [`${id}.section.contacts.title`]: 'Kontakte',
    [`${id}.section.diagnoses.title`]: 'Diagnosen',
    [`${id}.section.symptoms.title`]: 'Symptome',
    [`${id}.section.medications.title`]: 'Medikation',
    [`${id}.section.allergies.title`]: 'Allergien',
    [`${id}.section.doctor.title`]: 'Arzt',
    [`${id}.person.name.label`]: 'Name',
    [`${id}.person.name.help`]: 'Vollstaendiger Name',
    [`${id}.person.birthDate.label`]: 'Geburtsdatum',
    [`${id}.person.birthDate.help`]: 'TT-MM-JJJJ',
    [`${id}.person.email.label`]: 'E-Mail',
    [`${id}.person.email.help`]: 'Adresse fuer Rueckfragen',
    [`${id}.person.website.label`]: 'Webseite',
    [`${id}.person.website.help`]: 'Oeffentliche Profil-URL',
    [`${id}.contacts.entry.label`]: 'Kontakt',
    [`${id}.contacts.name.label`]: 'Name',
    [`${id}.contacts.name.help`]: 'Kontaktperson',
    [`${id}.contacts.phone.label`]: 'Telefon',
    [`${id}.contacts.phone.help`]: 'Telefonnummer',
    [`${id}.contacts.relation.label`]: 'Beziehung',
    [`${id}.contacts.relation.help`]: 'z.B. Familie',
    [`${id}.diagnoses.formatted.label`]: 'Diagnose (Freitext)',
    [`${id}.diagnoses.formatted.help`]: 'Optionale Diagnosebeschreibung',
    [`${id}.symptoms.help`]: 'Wichtige Symptome',
    [`${id}.medications.name.label`]: 'Medikament',
    [`${id}.medications.name.help`]: 'Name des Medikaments',
    [`${id}.medications.dosage.label`]: 'Dosierung',
    [`${id}.medications.dosage.help`]: 'z.B. 10 mg',
    [`${id}.medications.schedule.label`]: 'Einnahme',
    [`${id}.medications.schedule.help`]: 'z.B. morgens',
    [`${id}.allergies.help`]: 'Bekannte Allergien',
    [`${id}.doctor.name.label`]: 'Arzt',
    [`${id}.doctor.name.help`]: 'Name der Praxis',
    [`${id}.doctor.phone.label`]: 'Telefon',
    [`${id}.doctor.phone.help`]: 'Praxis-Telefon',
  };

  const i18nEn = {
    [`${id}.title`]: titleValue,
    [`${id}.description`]: `${titleValue} description`,
    [`${id}.section.person.title`]: 'Person',
    [`${id}.section.contacts.title`]: 'Contacts',
    [`${id}.section.diagnoses.title`]: 'Diagnoses',
    [`${id}.section.symptoms.title`]: 'Symptoms',
    [`${id}.section.medications.title`]: 'Medications',
    [`${id}.section.allergies.title`]: 'Allergies',
    [`${id}.section.doctor.title`]: 'Doctor',
    [`${id}.person.name.label`]: 'Name',
    [`${id}.person.name.help`]: 'Full name',
    [`${id}.person.birthDate.label`]: 'Birth date',
    [`${id}.person.birthDate.help`]: 'DD-MM-YYYY',
    [`${id}.person.email.label`]: 'Email',
    [`${id}.person.email.help`]: 'Contact email address',
    [`${id}.person.website.label`]: 'Website',
    [`${id}.person.website.help`]: 'Public profile URL',
    [`${id}.contacts.entry.label`]: 'Contact',
    [`${id}.contacts.name.label`]: 'Name',
    [`${id}.contacts.name.help`]: 'Contact person',
    [`${id}.contacts.phone.label`]: 'Phone',
    [`${id}.contacts.phone.help`]: 'Phone number',
    [`${id}.contacts.relation.label`]: 'Relation',
    [`${id}.contacts.relation.help`]: 'e.g. family',
    [`${id}.diagnoses.formatted.label`]: 'Diagnosis (free text)',
    [`${id}.diagnoses.formatted.help`]: 'Optional diagnosis summary',
    [`${id}.symptoms.help`]: 'Key symptoms',
    [`${id}.medications.name.label`]: 'Medication',
    [`${id}.medications.name.help`]: 'Medication name',
    [`${id}.medications.dosage.label`]: 'Dosage',
    [`${id}.medications.dosage.help`]: 'e.g. 10 mg',
    [`${id}.medications.schedule.label`]: 'Schedule',
    [`${id}.medications.schedule.help`]: 'e.g. mornings',
    [`${id}.allergies.help`]: 'Known allergies',
    [`${id}.doctor.name.label`]: 'Doctor',
    [`${id}.doctor.name.help`]: 'Practice name',
    [`${id}.doctor.phone.label`]: 'Phone',
    [`${id}.doctor.phone.help`]: 'Practice phone',
  };

  const mapping = {
    version: 1,
    fields: [
      { var: 'person.name', path: 'person.name' },
      { var: 'person.birthDate', path: 'person.birthDate' },
      { var: 'person.email', path: 'person.email' },
      { var: 'person.website', path: 'person.website' },
      { var: 'diagnoses.formatted', path: 'diagnoses.formatted' },
      { var: 'symptoms', path: 'symptoms' },
      { var: 'allergies', path: 'allergies' },
      { var: 'doctor.name', path: 'doctor.name' },
      { var: 'doctor.phone', path: 'doctor.phone' },
    ],
    loops: [
      { var: 'contacts', path: 'contacts' },
      { var: 'medications', path: 'medications' },
    ],
    i18n: {
      prefix: id,
    },
  };

  await writeJson(path.join(packDir, 'manifest.json'), manifest);
  await writeJson(path.join(packDir, 'schema.json'), schema);
  await writeJson(path.join(packDir, 'ui.schema.json'), uiSchema);
  await writeJson(path.join(packDir, 'examples', 'example.json'), example);
  await writeJson(path.join(packDir, 'i18n', 'de.json'), i18nDe);
  await writeJson(path.join(packDir, 'i18n', 'en.json'), i18nEn);
  await writeJson(path.join(packDir, 'docx', 'mapping.json'), mapping);
  await copySkeletonTemplate(path.join(packDir, 'templates', 'a4.docx'));

  if (register) {
    await updateRegistry(id);
  }

  console.log(`Created formpack at ${packDir}`);
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  await createFormpack(args);
};

await run();
