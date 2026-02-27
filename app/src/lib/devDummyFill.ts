import { isRecord } from './utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const FIRST_NAME_VALUES = [
  'Anna',
  'Lukas',
  'Mira',
  'Jonas',
  'Lea',
  'Noah',
  'Sofia',
  'Emil',
  'Clara',
  'Felix',
];

const LAST_NAME_VALUES = [
  'Schneider',
  'Meyer',
  'Wagner',
  'Becker',
  'Hoffmann',
  'Schulz',
  'Fischer',
  'Keller',
  'Braun',
  'Hartmann',
];

const STREET_VALUES = [
  'Lindenstrasse 12',
  'Musterweg 4',
  'Bahnhofstrasse 29',
  'Gartenallee 8',
  'Sonnenweg 15',
  'Parkstrasse 3',
  'Birkenweg 22',
  'Hauptstrasse 41',
  'Schulstrasse 7',
  'Uferweg 18',
];

const POSTAL_CODE_VALUES = [
  '10115',
  '20095',
  '30159',
  '40213',
  '50667',
  '60311',
  '70173',
  '80331',
  '90402',
  '01067',
];

const CITY_VALUES = [
  'Berlin',
  'Hamburg',
  'Hannover',
  'Duesseldorf',
  'Koeln',
  'Frankfurt am Main',
  'Stuttgart',
  'Muenchen',
  'Nuernberg',
  'Dresden',
];

const PHONE_VALUES = [
  '+49 30 1234567',
  '+49 40 2345678',
  '+49 511 3456789',
  '+49 211 4567890',
  '+49 221 5678901',
  '+49 69 6789012',
  '+49 711 7890123',
  '+49 89 8901234',
  '+49 911 9012345',
  '+49 351 9123456',
];

const EMAIL_VALUES = [
  'anna.schneider@example.org',
  'lukas.meyer@example.org',
  'mira.wagner@example.org',
  'jonas.becker@example.org',
  'lea.hoffmann@example.org',
  'noah.schulz@example.org',
  'sofia.fischer@example.org',
  'emil.keller@example.org',
  'clara.braun@example.org',
  'felix.hartmann@example.org',
];

const INSURANCE_NUMBER_VALUES = [
  'A123456789',
  'B234567891',
  'C345678912',
  'D456789123',
  'E567891234',
  'F678912345',
  'G789123456',
  'H891234567',
  'I912345678',
  'K123498765',
];

const PRACTICE_VALUES = [
  'Hausarztpraxis am Markt',
  'Praxisgemeinschaft Nord',
  'Internistische Praxis Mitte',
  'MVZ Sonnenhof',
  'Praxis Dr. Weber',
  'Gemeinschaftspraxis Sued',
  'Praxis am Stadtpark',
  'Facharztzentrum Rhein',
  'Medizinisches Zentrum Ost',
  'Praxis am Hafen',
];

const INSURER_VALUES = [
  'Beispiel Krankenkasse',
  'MusterKasse Nord',
  'GesundPlus Kasse',
  'Regionale Krankenkasse Mitte',
  'AktivKasse Rhein',
  'BuergerKasse West',
  'SicherGesund Kasse',
  'VersorgungsKasse Sued',
  'PrimaKasse Ost',
  'KompaktKasse',
];

const MEDICATION_VALUES = [
  'Ivabradin',
  'Midodrin',
  'Fludrocortison',
  'Bisoprolol',
  'Metoprolol',
  'Propranolol',
  'Pyridostigmin',
  'Desmopressin',
  'Naltrexon niedrig dosiert',
  'Amitriptylin niedrig dosiert',
];

const NOTE_VALUES = [
  'Belastungsintoleranz mit PEM seit mehreren Monaten.',
  'Orthostatische Beschwerden mit deutlicher Alltagseinschraenkung.',
  'Symptome verschlechtern sich nach geringer Aktivitaet.',
  'Mehrere Standardmassnahmen wurden bereits ausgeschopft.',
  'Schlaf ist nicht erholsam trotz konsequenter Schlafhygiene.',
  'Kognitive Belastung fuehrt zu schneller Erschoepfung.',
  'Der aktuelle Schweregrad ist im Verlauf dokumentiert.',
  'Eine symptomorientierte Therapie ist medizinisch begruendet.',
  'Nebenwirkungsrisiken wurden mit der Praxis besprochen.',
  'Die Behandlung soll engmaschig kontrolliert werden.',
];

const DEFAULT_TEXT_VALUES = [
  'Beispielwert A',
  'Beispielwert B',
  'Beispielwert C',
  'Beispielwert D',
  'Beispielwert E',
  'Beispielwert F',
  'Beispielwert G',
  'Beispielwert H',
  'Beispielwert I',
  'Beispielwert J',
];

const DEFAULT_DATE_VALUES = [
  '1965-01-15',
  '1970-03-22',
  '1978-07-09',
  '1984-11-30',
  '1990-05-14',
  '1995-09-01',
  '2000-12-19',
  '2003-04-27',
  '2007-08-05',
  '2011-10-13',
];

const DEFAULT_NUMBER_VALUES = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50];
const ATTACHMENTS_ASSISTANT_DUMMY_VALUES = [
  'Arztbefunde',
  'Ärztliche Stellungnahme zum Off-Label-Antrag',
  'Pflegegrad-Bescheid',
  'GdB-Bescheid',
  'Rentenbescheid',
  'Medikamentenplan / Unverträglichkeiten',
  'Symptom-/Funktionsprotokoll',
  'Reha-/Klinikbericht',
] as const;

type DummyFillRuntimeOptions = {
  rng: () => number;
  arrayMin: number;
  arrayMax: number;
};

export type DummyFillOptions = {
  rng?: () => number;
  arrayMin?: number;
  arrayMax?: number;
};

const toRuntimeOptions = (
  options: DummyFillOptions,
): DummyFillRuntimeOptions => {
  const arrayMin =
    Number.isInteger(options.arrayMin) && (options.arrayMin ?? 0) >= 1
      ? (options.arrayMin as number)
      : 1;
  const arrayMaxCandidate =
    Number.isInteger(options.arrayMax) && (options.arrayMax ?? 0) >= arrayMin
      ? (options.arrayMax as number)
      : 3;

  return {
    rng: options.rng ?? Math.random,
    arrayMin,
    arrayMax: Math.max(arrayMin, arrayMaxCandidate),
  };
};

const getRandomIndex = (length: number, rng: () => number): number => {
  if (length <= 1) {
    return 0;
  }
  const value = rng();
  const normalized =
    Number.isFinite(value) && value >= 0 ? Math.min(value, 0.999999999999) : 0;
  return Math.floor(normalized * length);
};

const pickRandom = <T>(values: readonly T[], rng: () => number): T =>
  values[getRandomIndex(values.length, rng)];

const getSchemaType = (schema: RJSFSchema): string | null => {
  if (typeof schema.type === 'string') {
    return schema.type;
  }
  if (Array.isArray(schema.type)) {
    return schema.type.find((entry) => entry !== 'null') ?? null;
  }
  return null;
};

const isUiHidden = (uiSchema: unknown): boolean =>
  isRecord(uiSchema) && uiSchema['ui:widget'] === 'hidden';

const isUiReadonly = (uiSchema: unknown): boolean =>
  isRecord(uiSchema) && uiSchema['ui:readonly'] === true;

const hasReadonlySchema = (schema: RJSFSchema): boolean =>
  schema.readOnly === true;

const resolveArrayItemSchema = (schema: RJSFSchema): RJSFSchema | null => {
  if (Array.isArray(schema.items)) {
    const first = schema.items[0];
    return isRecord(first) ? (first as RJSFSchema) : null;
  }
  return isRecord(schema.items) ? (schema.items as RJSFSchema) : null;
};

const resolveArrayItemUiSchema = (uiSchema: unknown): unknown => {
  if (!isRecord(uiSchema)) {
    return undefined;
  }
  const items = uiSchema.items;
  if (Array.isArray(items)) {
    return items[0];
  }
  return items;
};

const toNormalizedPath = (path: readonly string[]): string =>
  path
    .filter((segment) => !/^\d+$/.test(segment))
    .join('.')
    .toLowerCase();

const resolveTextPool = (path: readonly string[]): readonly string[] => {
  const normalizedPath = toNormalizedPath(path);

  if (normalizedPath.endsWith('firstname')) {
    return FIRST_NAME_VALUES;
  }
  if (
    normalizedPath.endsWith('lastname') ||
    normalizedPath.endsWith('birthname') ||
    normalizedPath.endsWith('surname') ||
    normalizedPath.endsWith('familyname')
  ) {
    return LAST_NAME_VALUES;
  }
  if (
    normalizedPath.endsWith('streetandnumber') ||
    normalizedPath.endsWith('street')
  ) {
    return STREET_VALUES;
  }
  if (
    normalizedPath.endsWith('postalcode') ||
    normalizedPath.endsWith('zipcode') ||
    normalizedPath.endsWith('plz')
  ) {
    return POSTAL_CODE_VALUES;
  }
  if (normalizedPath.endsWith('city') || normalizedPath.endsWith('town')) {
    return CITY_VALUES;
  }
  if (
    normalizedPath.endsWith('phone') ||
    normalizedPath.endsWith('telephone') ||
    normalizedPath.endsWith('mobile') ||
    normalizedPath.endsWith('tel')
  ) {
    return PHONE_VALUES;
  }
  if (normalizedPath.endsWith('email') || normalizedPath.endsWith('mail')) {
    return EMAIL_VALUES;
  }
  if (
    normalizedPath.endsWith('insurancenumber') ||
    normalizedPath.endsWith('insuranceid') ||
    normalizedPath.endsWith('policynumber')
  ) {
    return INSURANCE_NUMBER_VALUES;
  }
  if (
    normalizedPath.endsWith('practice') ||
    normalizedPath.endsWith('clinic')
  ) {
    return PRACTICE_VALUES;
  }
  if (
    normalizedPath.endsWith('insurer.name') ||
    normalizedPath.endsWith('healthinsurance.name')
  ) {
    return INSURER_VALUES;
  }
  if (
    normalizedPath.includes('drug') ||
    normalizedPath.includes('medication') ||
    normalizedPath.includes('wirkstoff')
  ) {
    return MEDICATION_VALUES;
  }
  if (
    normalizedPath.includes('note') ||
    normalizedPath.includes('comment') ||
    normalizedPath.includes('reason') ||
    normalizedPath.includes('symptom') ||
    normalizedPath.includes('details')
  ) {
    return NOTE_VALUES;
  }
  if (normalizedPath.endsWith('name')) {
    return LAST_NAME_VALUES;
  }

  return DEFAULT_TEXT_VALUES;
};

const buildObjectValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
  path: readonly string[],
): Record<string, unknown> | undefined => {
  if (!isRecord(schema.properties)) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, childSchemaNode] of Object.entries(schema.properties)) {
    if (!isRecord(childSchemaNode)) {
      continue;
    }
    const childUiSchema = isRecord(uiSchema) ? uiSchema[key] : undefined;
    const childPath = [...path, key];
    const childValue = buildValue(
      childSchemaNode as RJSFSchema,
      childUiSchema,
      options,
      childPath,
    );
    if (childValue !== undefined) {
      result[key] = childValue;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const buildArrayValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
  path: readonly string[],
): unknown[] => {
  const itemSchema = resolveArrayItemSchema(schema);
  if (!itemSchema) {
    return [];
  }

  const itemUiSchema = resolveArrayItemUiSchema(uiSchema);
  const span = options.arrayMax - options.arrayMin + 1;
  const itemCount = options.arrayMin + getRandomIndex(span, options.rng);
  const values: unknown[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const item = buildValue(itemSchema, itemUiSchema, options, [
      ...path,
      String(index),
    ]);
    if (item !== undefined) {
      values.push(item);
    }
  }

  return values;
};

const buildStringValue = (
  schema: RJSFSchema,
  options: DummyFillRuntimeOptions,
  path: readonly string[],
): string => {
  const normalizedPath = toNormalizedPath(path);
  if (normalizedPath.endsWith('attachmentsfreetext')) {
    const selectedCount = getRandomIndex(
      ATTACHMENTS_ASSISTANT_DUMMY_VALUES.length + 1,
      options.rng,
    );
    if (selectedCount === 0) {
      return '';
    }

    const shuffledValues = [...ATTACHMENTS_ASSISTANT_DUMMY_VALUES];
    for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
      const swapIndex = getRandomIndex(index + 1, options.rng);
      [shuffledValues[index], shuffledValues[swapIndex]] = [
        shuffledValues[swapIndex],
        shuffledValues[index],
      ];
    }

    return shuffledValues
      .slice(0, selectedCount)
      .map((line) => `- ${line}`)
      .join('\n');
  }

  if (schema.format === 'date') {
    return pickRandom(DEFAULT_DATE_VALUES, options.rng);
  }
  if (schema.format === 'email') {
    return pickRandom(EMAIL_VALUES, options.rng);
  }
  return pickRandom(resolveTextPool(path), options.rng);
};

const withOptionalEmptyEnum = (
  enumValues: readonly unknown[],
): readonly unknown[] => {
  if (enumValues.includes('')) {
    return enumValues;
  }
  return [...enumValues, ''];
};

const buildValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
  path: readonly string[],
): unknown => {
  if (
    isUiHidden(uiSchema) ||
    isUiReadonly(uiSchema) ||
    hasReadonlySchema(schema)
  ) {
    return undefined;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return pickRandom(withOptionalEmptyEnum(schema.enum), options.rng);
  }

  const type = getSchemaType(schema);
  switch (type) {
    case 'object':
      return buildObjectValue(schema, uiSchema, options, path);
    case 'array':
      return buildArrayValue(schema, uiSchema, options, path);
    case 'boolean':
      return options.rng() < 0.5;
    case 'integer':
      return Math.trunc(pickRandom(DEFAULT_NUMBER_VALUES, options.rng));
    case 'number':
      return pickRandom(DEFAULT_NUMBER_VALUES, options.rng);
    case 'string':
      return buildStringValue(schema, options, path);
    default:
      return undefined;
  }
};

export const buildRandomDummyPatch = (
  schema: RJSFSchema | null,
  uiSchema: UiSchema | null,
  options: DummyFillOptions = {},
): Record<string, unknown> => {
  if (!schema) {
    return {};
  }

  const value = buildValue(schema, uiSchema, toRuntimeOptions(options), []);
  return isRecord(value) ? value : {};
};
