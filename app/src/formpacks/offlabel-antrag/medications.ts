export const OFFLABEL_MEDICATION_KEYS = [
  'agomelatin',
  'ivabradine',
  'vortioxetine',
  'other',
] as const;

export type MedicationKey = (typeof OFFLABEL_MEDICATION_KEYS)[number];
export type StandardMedicationKey = Exclude<MedicationKey, 'other'>;

type MedicationAutoFacts = {
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  priorMeasuresDefault: string;
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
  isOther: boolean;
  requiresManualFields: boolean;
  requiresPriorMeasures: boolean;
  infoBoxI18nKey: string;
  autoFacts?: MedicationAutoFactsByLocale;
};

type MedicationFactsInput = readonly [
  diagnosisMain: string,
  targetSymptoms: string,
  doseAndDuration: string,
  monitoringAndStop: string,
  priorMeasuresDefault: string,
  expertSourceText: string,
  expertAttachmentText: string,
];

type StandardMedicationProfileInput = {
  key: StandardMedicationKey;
  displayNameDe: string;
  displayNameEn: string;
  infoBoxI18nKey: string;
  de: MedicationFactsInput;
  en: MedicationFactsInput;
};

const buildAutoFacts = (input: MedicationFactsInput): MedicationAutoFacts => {
  const [
    diagnosisMain,
    targetSymptoms,
    doseAndDuration,
    monitoringAndStop,
    priorMeasuresDefault,
    expertSourceText,
    expertAttachmentText,
  ] = input;

  return {
    diagnosisMain,
    targetSymptoms,
    doseAndDuration,
    monitoringAndStop,
    priorMeasuresDefault,
    expertSourceText,
    expertAttachmentText,
  };
};

const buildLocalizedAutoFacts = (
  de: MedicationFactsInput,
  en: MedicationFactsInput,
): MedicationAutoFactsByLocale => ({
  de: buildAutoFacts(de),
  en: buildAutoFacts(en),
});

const createStandardMedicationProfile = ({
  key,
  displayNameDe,
  displayNameEn,
  infoBoxI18nKey,
  de,
  en,
}: StandardMedicationProfileInput): MedicationProfile => ({
  key,
  displayNameDe,
  displayNameEn,
  isOther: false,
  requiresManualFields: false,
  requiresPriorMeasures: false,
  infoBoxI18nKey,
  autoFacts: buildLocalizedAutoFacts(de, en),
});

const PRIOR_MEASURES_DEFAULT_DE =
  'Bisherige symptomorientierte Maßnahmen wurden ausgeschöpft bzw. waren nicht ausreichend wirksam oder nicht verträglich.';
const PRIOR_MEASURES_DEFAULT_EN =
  'Prior symptom-oriented measures have been exhausted, were insufficient, or were not tolerated.';

const MEDICATION_PROFILE_INPUTS: readonly StandardMedicationProfileInput[] = [
  {
    key: 'agomelatin',
    displayNameDe: 'Agomelatin',
    displayNameEn: 'Agomelatine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.agomelatine',
    de: [
      'postinfektiösem ME/CFS und/oder Long-/Post-COVID mit Fatigue',
      'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
      '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
      'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
      PRIOR_MEASURES_DEFAULT_DE,
      'Bewertung Agomelatin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 02.12.2025).',
      'Bewertung: Agomelatin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 02.12.2025)',
    ],
    en: [
      'post-infectious ME/CFS and/or long/post-COVID with fatigue',
      'improvement of fatigue and health-related quality of life (HRQoL)',
      '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
      'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
      PRIOR_MEASURES_DEFAULT_EN,
      'Assessment agomelatine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-12-02).',
      'Assessment: Agomelatine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-12-02)',
    ],
  },
  {
    key: 'ivabradine',
    displayNameDe: 'Ivabradin',
    displayNameEn: 'Ivabradine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ivabradine',
    de: [
      'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
      'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
      'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
      'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
      'Betablocker wurden bereits eingesetzt, waren nicht verträglich oder nicht geeignet; weitere symptomorientierte Maßnahmen waren unzureichend.',
      'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).',
      'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    ],
    en: [
      'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
      'heart-rate reduction and improved health-related quality of life (HRQoL)',
      'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
      'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
      'Beta blockers were already used but not tolerated or not suitable; further symptom-oriented measures were insufficient.',
      'Assessment ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15).',
      'Assessment: Ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15)',
    ],
  },
  {
    key: 'vortioxetine',
    displayNameDe: 'Vortioxetin',
    displayNameEn: 'Vortioxetine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.vortioxetine',
    de: [
      'Long/Post-COVID mit kognitiven Beeinträchtigungen und/oder depressiven Symptomen',
      'Verbesserung von Kognition und/oder depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
      '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
      'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen; Hinweis: in Deutschland nicht verfügbar, Import/Verfügbarkeit prüfen',
      PRIOR_MEASURES_DEFAULT_DE,
      'Bewertung Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).',
      'Bewertung: Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    ],
    en: [
      'long/post-COVID with cognitive impairment and/or depressive symptoms',
      'improvement of cognition and/or depressive symptoms, plus health-related quality of life (HRQoL)',
      '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
      'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events; note: not available in Germany, verify import/availability',
      PRIOR_MEASURES_DEFAULT_EN,
      'Assessment vortioxetine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15).',
      'Assessment: Vortioxetine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15)',
    ],
  },
] as const;

const STANDARD_MEDICATION_PROFILES = Object.fromEntries(
  MEDICATION_PROFILE_INPUTS.map((input) => [
    input.key,
    createStandardMedicationProfile(input),
  ]),
) as Record<StandardMedicationKey, MedicationProfile>;

const OTHER_MEDICATION_PROFILE: MedicationProfile = {
  key: 'other',
  displayNameDe: 'anderes Medikament oder andere Indikation',
  displayNameEn: 'other medication or other indication',
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
  OFFLABEL_MEDICATION_KEYS.some((candidate) => candidate === value);

export const resolveMedicationProfile = (
  value: unknown,
): MedicationProfile | null =>
  isMedicationKey(value) ? MEDICATIONS[value] : null;
