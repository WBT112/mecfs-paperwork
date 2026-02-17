export const OFFLABEL_MEDICATION_KEYS = [
  'agomelatin',
  'ivabradine',
  'vortioxetine',
  'other',
] as const;

export type MedicationKey = (typeof OFFLABEL_MEDICATION_KEYS)[number];
export type StandardMedicationKey = Exclude<MedicationKey, 'other'>;

type LocalizedText = {
  de: string;
  en: string;
};

type MedicationFactsWithoutSources = {
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  priorMeasuresDefault: string;
};

type MedicationAutoFacts = MedicationFactsWithoutSources & {
  expertSourceText: string;
  expertAttachmentText: string;
};

type MedicationAutoFactsByLocale = {
  de: MedicationAutoFacts;
  en: MedicationAutoFacts;
};

export type MedicationProfile = {
  key: MedicationKey;
  displayNameDe: string;
  displayNameEn: string;
  point2DiagnosisSentenceDe: string;
  point2DiagnosisSentenceEn: string;
  hasAnnouncedAmrlEntry: boolean;
  isOther: boolean;
  requiresManualFields: boolean;
  requiresPriorMeasures: boolean;
  infoBoxI18nKey: string;
  autoFacts?: MedicationAutoFactsByLocale;
};

type MedicationFactsTuple = readonly [
  diagnosisMain: string,
  targetSymptoms: string,
  doseAndDuration: string,
  monitoringAndStop: string,
  priorMeasuresDefault: string,
];

type MedicationInputTuple = readonly [
  key: StandardMedicationKey,
  displayNameDe: string,
  displayNameEn: string,
  point2DiagnosisSentenceDe: string,
  point2DiagnosisSentenceEn: string,
  hasAnnouncedAmrlEntry: boolean,
  infoBoxI18nKey: string,
  expertSourceDate: string,
  deFacts: MedicationFactsTuple,
  enFacts: MedicationFactsTuple,
];

const PRIOR_MEASURES_DEFAULT: LocalizedText = {
  de: 'Bisherige symptomorientierte Maßnahmen wurden ausgeschöpft bzw. waren nicht ausreichend wirksam oder nicht verträglich.',
  en: 'Prior symptom-oriented measures have been exhausted, were insufficient, or were not tolerated.',
};

const MEDICATION_INPUTS: readonly MedicationInputTuple[] = [
  [
    'agomelatin',
    'Agomelatin',
    'Agomelatine',
    'Die Diagnose Fatigue bei postinfektiöser myalgischer Enzephalomyelitis/ Chronischem Fatigue-Syndrom (ME/CFS) und bei Long/Post-COVID ist gesichert (siehe Befunde)',
    'The diagnosis of fatigue in post-infectious myalgic encephalomyelitis/chronic fatigue syndrome (ME/CFS) and in long/post-COVID is established (see findings).',
    false,
    'offlabel-antrag.ui.infobox.drug.agomelatine',
    '02.12.2025',
    [
      'postinfektiösem ME/CFS und/oder Long-/Post-COVID mit Fatigue',
      'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
      '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
      'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
      PRIOR_MEASURES_DEFAULT.de,
    ],
    [
      'post-infectious ME/CFS and/or long/post-COVID with fatigue',
      'improvement of fatigue and health-related quality of life (HRQoL)',
      '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
      'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
      PRIOR_MEASURES_DEFAULT.en,
    ],
  ],
  [
    'ivabradine',
    'Ivabradin',
    'Ivabradine',
    'Die Diagnose: COVID-19 assoziiertes PoTS ist gesichert (siehe Befunde)',
    'The diagnosis of COVID-19 associated PoTS is established (see findings).',
    true,
    'offlabel-antrag.ui.infobox.drug.ivabradine',
    '15.10.2025',
    [
      'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
      'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
      'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
      'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
      'Betablocker wurden bereits eingesetzt, waren nicht verträglich oder nicht geeignet; weitere symptomorientierte Maßnahmen waren unzureichend.',
    ],
    [
      'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
      'heart-rate reduction and improved health-related quality of life (HRQoL)',
      'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
      'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
      'Beta blockers were already used but not tolerated or not suitable; further symptom-oriented measures were insufficient.',
    ],
  ],
  [
    'vortioxetine',
    'Vortioxetin',
    'Vortioxetine',
    'Die Diagnose kognitive Beeinträchtigungen und/oder depressive Symptome im Rahmen von Long/Post-COVID ist gesichert',
    'The diagnosis of cognitive impairment and/or depressive symptoms in long/post-COVID is established.',
    false,
    'offlabel-antrag.ui.infobox.drug.vortioxetine',
    '15.10.2025',
    [
      'Long/Post-COVID mit kognitiven Beeinträchtigungen und/oder depressiven Symptomen',
      'Verbesserung von Kognition und/oder depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
      '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
      'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen; Hinweis: in Deutschland nicht verfügbar, Import/Verfügbarkeit prüfen',
      PRIOR_MEASURES_DEFAULT.de,
    ],
    [
      'long/post-COVID with cognitive impairment and/or depressive symptoms',
      'improvement of cognition and/or depressive symptoms, plus health-related quality of life (HRQoL)',
      '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
      'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events; note: not available in Germany, verify import/availability',
      PRIOR_MEASURES_DEFAULT.en,
    ],
  ],
] as const;

const buildFactsWithoutSources = (
  tuple: MedicationFactsTuple,
): MedicationFactsWithoutSources => {
  const [
    diagnosisMain,
    targetSymptoms,
    doseAndDuration,
    monitoringAndStop,
    priorMeasuresDefault,
  ] = tuple;

  return {
    diagnosisMain,
    targetSymptoms,
    doseAndDuration,
    monitoringAndStop,
    priorMeasuresDefault,
  };
};

const buildExpertTexts = (
  locale: keyof LocalizedText,
  displayName: string,
  standDate: string,
): Pick<MedicationAutoFacts, 'expertSourceText' | 'expertAttachmentText'> => {
  if (locale === 'de') {
    return {
      expertSourceText: `Bewertung ${displayName} – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand ${standDate}).`,
      expertAttachmentText: `Bewertung: ${displayName} – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand ${standDate})`,
    };
  }

  const dateIso = standDate.split('.').reverse().join('-');
  return {
    expertSourceText: `Assessment ${displayName.toLowerCase()} – Expert Group Long COVID Off-Label-Use at BfArM (status ${dateIso}).`,
    expertAttachmentText: `Assessment: ${displayName} – Expert Group Long COVID Off-Label-Use at BfArM (status ${dateIso})`,
  };
};

const createStandardMedicationProfile = (
  input: MedicationInputTuple,
): MedicationProfile => {
  const [
    key,
    displayNameDe,
    displayNameEn,
    point2DiagnosisSentenceDe,
    point2DiagnosisSentenceEn,
    hasAnnouncedAmrlEntry,
    infoBoxI18nKey,
    expertSourceDate,
    deFacts,
    enFacts,
  ] = input;

  return {
    key,
    displayNameDe,
    displayNameEn,
    point2DiagnosisSentenceDe,
    point2DiagnosisSentenceEn,
    hasAnnouncedAmrlEntry,
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey,
    autoFacts: {
      de: {
        ...buildFactsWithoutSources(deFacts),
        ...buildExpertTexts('de', displayNameDe, expertSourceDate),
      },
      en: {
        ...buildFactsWithoutSources(enFacts),
        ...buildExpertTexts('en', displayNameEn, expertSourceDate),
      },
    },
  };
};

const STANDARD_MEDICATION_PROFILES = Object.fromEntries(
  MEDICATION_INPUTS.map((input) => {
    const [key] = input;
    return [key, createStandardMedicationProfile(input)];
  }),
) as Record<StandardMedicationKey, MedicationProfile>;

const OTHER_MEDICATION_PROFILE: MedicationProfile = {
  key: 'other',
  displayNameDe: 'anderes Medikament oder andere Indikation',
  displayNameEn: 'other medication or other indication',
  point2DiagnosisSentenceDe: '',
  point2DiagnosisSentenceEn: '',
  hasAnnouncedAmrlEntry: false,
  isOther: true,
  requiresManualFields: true,
  requiresPriorMeasures: true,
  infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.other',
};

export const MEDICATIONS: Record<MedicationKey, MedicationProfile> = {
  ...STANDARD_MEDICATION_PROFILES,
  other: OTHER_MEDICATION_PROFILE,
};

export const STANDARD_MEDICATION_KEYS = OFFLABEL_MEDICATION_KEYS.filter(
  (key): key is StandardMedicationKey => key !== 'other',
);

export const isMedicationKey = (value: unknown): value is MedicationKey =>
  typeof value === 'string' &&
  OFFLABEL_MEDICATION_KEYS.includes(value as MedicationKey);

const LEGACY_MEDICATION_KEY_ALIASES: Partial<Record<string, MedicationKey>> = {
  ivabradin: 'ivabradine',
  vortioxetin: 'vortioxetine',
};

export const normalizeMedicationKey = (value: unknown): MedicationKey => {
  if (isMedicationKey(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const aliasMatch = LEGACY_MEDICATION_KEY_ALIASES[value];
    if (aliasMatch) {
      return aliasMatch;
    }
  }
  return 'other';
};

export const resolveMedicationProfile = (value: unknown): MedicationProfile =>
  MEDICATIONS[normalizeMedicationKey(value)];
