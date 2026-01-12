/* eslint-env node */
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
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--id') {
      result.id = args[index + 1] ?? null;
      index += 1;
    } else if (token === '--title') {
      result.title = args[index + 1] ?? null;
      index += 1;
    } else if (token === '--register') {
      result.register = true;
    }
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
  const idsMatch = content.match(/FORMPACK_IDS\s*=\s*\[([\s\S]*?)\]/);
  if (!idsMatch) {
    throw new Error('Could not find FORMPACK_IDS in registry.ts');
  }

  const idsBlock = idsMatch[1];
  const ids = idsBlock
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/['",]/g, '').trim())
    .filter(Boolean);

  if (ids.includes(formpackId)) {
    return;
  }

  ids.push(formpackId);
  ids.sort();

  const formattedIds = ids.map((id) => `  '${id}',`).join('\n');
  const updated = content.replace(
    /FORMPACK_IDS\\s*=\\s*\\[[\\s\\S]*?\\]/,
    `FORMPACK_IDS = [\n${formattedIds}\n]`,
  );

  await fs.writeFile(registryPath, updated, 'utf8');
};

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
    properties: {
      person: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: `t:${id}.person.name`,
          },
        },
      },
    },
  };

  const uiSchema = {
    person: {
      name: {
        'ui:placeholder': `t:${id}.person.name.placeholder`,
      },
    },
  };

  const example = {
    person: {
      name: 'Beispiel',
    },
  };

  const i18nDe = {
    [`${id}.title`]: titleValue,
    [`${id}.description`]: `${titleValue} Beschreibung`,
    [`${id}.person.name`]: 'Name',
    [`${id}.person.name.placeholder`]: 'Name eingeben',
  };

  const i18nEn = {
    [`${id}.title`]: titleValue,
    [`${id}.description`]: `${titleValue} description`,
    [`${id}.person.name`]: 'Name',
    [`${id}.person.name.placeholder`]: 'Enter name',
  };

  const mapping = {
    version: 1,
    fields: [{ var: 'person.name', path: 'person.name' }],
    loops: [],
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
