export const OFFLABEL_MEDICATION_KEYS = [
  'agomelatin',
  'ivabradine',
  'vortioxetine',
  'other',
] as const;

export type MedicationKey = (typeof OFFLABEL_MEDICATION_KEYS)[number];
export type StandardMedicationKey = Exclude<MedicationKey, 'other'>;
export type MedicationVisibility = 'public' | 'dev';

export type MedicationLocale = 'de' | 'en';

type MedicationLocalizedFacts = {
  label: string;
  diagnosisNominative: string;
  diagnosisDative: string;
  point2ConfirmationSentence: string;
  targetSymptoms: string;
};

export type MedicationIndication = {
  key: string;
  texts: Record<MedicationLocale, MedicationLocalizedFacts>;
};

type MedicationAutoFacts = {
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
  visibility: MedicationVisibility;
  indications: MedicationIndication[];
  isOther: boolean;
  requiresManualFields: boolean;
  requiresPriorMeasures: boolean;
  infoBoxI18nKey: string;
  autoFacts?: MedicationAutoFactsByLocale;
};

type MedicationAutoFactsTuple = readonly [
  doseAndDuration: string,
  monitoringAndStop: string,
  priorMeasuresDefault: string,
];

type StandardMedicationInput = {
  key: StandardMedicationKey;
  displayNameDe: string;
  displayNameEn: string;
  visibility?: MedicationVisibility;
  infoBoxI18nKey: string;
  expertSourceDate: string;
  indications: MedicationIndication[];
  autoFacts: {
    de: MedicationAutoFactsTuple;
    en: MedicationAutoFactsTuple;
  };
};

const PRIOR_MEASURES_DEFAULT: Record<MedicationLocale, string> = {
  de: 'Bisherige symptomorientierte Maßnahmen wurden ausgeschöpft bzw. waren nicht ausreichend wirksam oder nicht verträglich.',
  en: 'Prior symptom-oriented measures have been exhausted, were insufficient, or were not tolerated.',
};

const AGOMELATIN_MECFS_FATIGUE_EN = 'post-infectious ME/CFS with fatigue';
const AGOMELATIN_LONG_POST_COVID_FATIGUE_DE = 'Long-/Post-COVID mit Fatigue';
const AGOMELATIN_LONG_POST_COVID_FATIGUE_EN = 'long/post-COVID with fatigue';
const VORTIOXETINE_COGNITIVE_DE =
  'Long/Post-COVID mit kognitiven Beeinträchtigungen';
const VORTIOXETINE_COGNITIVE_EN = 'long/post-COVID with cognitive impairment';
const VORTIOXETINE_DEPRESSIVE_DE = 'Long/Post-COVID mit depressiven Symptomen';
const VORTIOXETINE_DEPRESSIVE_EN = 'long/post-COVID with depressive symptoms';

const createIndication = (
  key: string,
  texts: Record<MedicationLocale, MedicationLocalizedFacts>,
): MedicationIndication => ({
  key,
  texts,
});

const buildExpertTexts = (
  locale: MedicationLocale,
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

const buildAutoFacts = (
  tuple: MedicationAutoFactsTuple,
): Omit<MedicationAutoFacts, 'expertSourceText' | 'expertAttachmentText'> => {
  const [doseAndDuration, monitoringAndStop, priorMeasuresDefault] = tuple;

  return {
    doseAndDuration,
    monitoringAndStop,
    priorMeasuresDefault,
  };
};

const MEDICATION_INPUTS: readonly StandardMedicationInput[] = [
  {
    key: 'agomelatin',
    displayNameDe: 'Agomelatin',
    displayNameEn: 'Agomelatine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.agomelatine',
    expertSourceDate: '02.12.2025',
    indications: [
      createIndication('agomelatin.mecfs_fatigue', {
        de: {
          label: 'postinfektiöse ME/CFS mit Fatigue',
          diagnosisNominative: 'postinfektiöse ME/CFS mit Fatigue',
          diagnosisDative: 'postinfektiöser ME/CFS mit Fatigue',
          point2ConfirmationSentence:
            'Die Diagnose Fatigue bei postinfektiöser myalgischer Enzephalomyelitis/chronischem Fatigue-Syndrom (ME/CFS) ist gesichert (siehe Befunde).',
          targetSymptoms:
            'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
        },
        en: {
          label: AGOMELATIN_MECFS_FATIGUE_EN,
          diagnosisNominative: AGOMELATIN_MECFS_FATIGUE_EN,
          diagnosisDative: AGOMELATIN_MECFS_FATIGUE_EN,
          point2ConfirmationSentence:
            'The diagnosis of fatigue in post-infectious myalgic encephalomyelitis/chronic fatigue syndrome (ME/CFS) is established (see findings).',
          targetSymptoms:
            'improvement of fatigue and health-related quality of life (HRQoL)',
        },
      }),
      createIndication('agomelatin.long_post_covid_fatigue', {
        de: {
          label: AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          diagnosisNominative: AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          diagnosisDative: AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          point2ConfirmationSentence:
            'Die Diagnose Fatigue bei Long-/Post-COVID ist gesichert (siehe Befunde).',
          targetSymptoms:
            'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
        },
        en: {
          label: AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          diagnosisNominative: AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          diagnosisDative: AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          point2ConfirmationSentence:
            'The diagnosis of fatigue in long/post-COVID is established (see findings).',
          targetSymptoms:
            'improvement of fatigue and health-related quality of life (HRQoL)',
        },
      }),
    ],
    autoFacts: {
      de: [
        '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
        'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      en: [
        '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
        'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    },
  },
  {
    key: 'ivabradine',
    displayNameDe: 'Ivabradin',
    displayNameEn: 'Ivabradine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ivabradine',
    expertSourceDate: '15.10.2025',
    indications: [
      createIndication('ivabradine.pots_long_post_covid', {
        de: {
          label:
            'postinfektiöses PoTS bei Long/Post-COVID (insbesondere bei Betablocker-Unverträglichkeit)',
          diagnosisNominative:
            'postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
          diagnosisDative:
            'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
          point2ConfirmationSentence:
            'Die Diagnose COVID-19-assoziiertes PoTS ist gesichert (siehe Befunde).',
          targetSymptoms:
            'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
        },
        en: {
          label:
            'post-infectious PoTS in long/post-COVID (especially with beta-blocker intolerance)',
          diagnosisNominative:
            'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
          diagnosisDative:
            'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
          point2ConfirmationSentence:
            'The diagnosis of COVID-19 associated PoTS is established (see findings).',
          targetSymptoms:
            'heart-rate reduction and improved health-related quality of life (HRQoL)',
        },
      }),
    ],
    autoFacts: {
      de: [
        'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
        'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
        'Betablocker wurden bereits eingesetzt, waren nicht verträglich oder nicht geeignet; weitere symptomorientierte Maßnahmen waren unzureichend.',
      ],
      en: [
        'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
        'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
        'Beta blockers were already used but not tolerated or not suitable; further symptom-oriented measures were insufficient.',
      ],
    },
  },
  {
    key: 'vortioxetine',
    displayNameDe: 'Vortioxetin',
    displayNameEn: 'Vortioxetine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.vortioxetine',
    expertSourceDate: '15.10.2025',
    indications: [
      createIndication('vortioxetine.long_post_covid_cognitive', {
        de: {
          label: VORTIOXETINE_COGNITIVE_DE,
          diagnosisNominative: VORTIOXETINE_COGNITIVE_DE,
          diagnosisDative: VORTIOXETINE_COGNITIVE_DE,
          point2ConfirmationSentence:
            'Die Diagnose kognitive Beeinträchtigungen im Rahmen von Long/Post-COVID ist gesichert.',
          targetSymptoms:
            'Verbesserung von Kognition sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
        },
        en: {
          label: VORTIOXETINE_COGNITIVE_EN,
          diagnosisNominative: VORTIOXETINE_COGNITIVE_EN,
          diagnosisDative: VORTIOXETINE_COGNITIVE_EN,
          point2ConfirmationSentence:
            'The diagnosis of cognitive impairment in long/post-COVID is established.',
          targetSymptoms:
            'improvement of cognition and health-related quality of life (HRQoL)',
        },
      }),
      createIndication('vortioxetine.long_post_covid_depressive', {
        de: {
          label: VORTIOXETINE_DEPRESSIVE_DE,
          diagnosisNominative: VORTIOXETINE_DEPRESSIVE_DE,
          diagnosisDative: VORTIOXETINE_DEPRESSIVE_DE,
          point2ConfirmationSentence:
            'Die Diagnose depressive Symptome im Rahmen von Long/Post-COVID ist gesichert.',
          targetSymptoms:
            'Verbesserung depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
        },
        en: {
          label: VORTIOXETINE_DEPRESSIVE_EN,
          diagnosisNominative: VORTIOXETINE_DEPRESSIVE_EN,
          diagnosisDative: VORTIOXETINE_DEPRESSIVE_EN,
          point2ConfirmationSentence:
            'The diagnosis of depressive symptoms in long/post-COVID is established.',
          targetSymptoms:
            'improvement of depressive symptoms and health-related quality of life (HRQoL)',
        },
      }),
    ],
    autoFacts: {
      de: [
        '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
        'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen; Hinweis: in Deutschland nicht verfügbar, Import/Verfügbarkeit prüfen',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      en: [
        '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
        'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events; note: not available in Germany, verify import/availability',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    },
  },
] as const;

const createStandardMedicationProfile = (
  input: StandardMedicationInput,
): MedicationProfile => {
  const [deAutoFacts, enAutoFacts] = [input.autoFacts.de, input.autoFacts.en];

  return {
    key: input.key,
    displayNameDe: input.displayNameDe,
    displayNameEn: input.displayNameEn,
    visibility: input.visibility ?? 'public',
    indications: [...input.indications],
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey: input.infoBoxI18nKey,
    autoFacts: {
      de: {
        ...buildAutoFacts(deAutoFacts),
        ...buildExpertTexts('de', input.displayNameDe, input.expertSourceDate),
      },
      en: {
        ...buildAutoFacts(enAutoFacts),
        ...buildExpertTexts('en', input.displayNameEn, input.expertSourceDate),
      },
    },
  };
};

const STANDARD_MEDICATION_PROFILES = Object.fromEntries(
  MEDICATION_INPUTS.map((input) => {
    return [input.key, createStandardMedicationProfile(input)];
  }),
) as Record<StandardMedicationKey, MedicationProfile>;

const OTHER_MEDICATION_PROFILE: MedicationProfile = {
  key: 'other',
  displayNameDe: 'anderes Medikament',
  displayNameEn: 'other medication',
  visibility: 'public',
  indications: [],
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

export const normalizeMedicationKey = (value: unknown): MedicationKey => {
  if (isMedicationKey(value)) {
    return value;
  }
  return 'other';
};

export const resolveMedicationProfile = (value: unknown): MedicationProfile =>
  MEDICATIONS[normalizeMedicationKey(value)];

export const isMedicationVisible = (
  value: unknown,
  showDevMedications = false,
): boolean => {
  const profile = resolveMedicationProfile(value);
  return profile.visibility === 'public' || showDevMedications;
};

export const getVisibleMedicationKeys = (
  showDevMedications = false,
): MedicationKey[] =>
  OFFLABEL_MEDICATION_KEYS.filter((key) =>
    isMedicationVisible(key, showDevMedications),
  );

export const getMedicationDisplayName = (
  key: MedicationKey,
  locale: MedicationLocale,
): string => {
  const profile = MEDICATIONS[key];
  return locale === 'de' ? profile.displayNameDe : profile.displayNameEn;
};

export const getVisibleMedicationOptions = (
  locale: MedicationLocale,
  showDevMedications = false,
): Array<{ key: MedicationKey; label: string }> =>
  getVisibleMedicationKeys(showDevMedications).map((key) => ({
    key,
    label: getMedicationDisplayName(key, locale),
  }));

export type MedicationIndicationOption = {
  key: string;
  label: string;
};

export type ResolvedMedicationIndication = MedicationLocalizedFacts & {
  key: string;
};

const getMedicationIndicationsInternal = (
  profile: MedicationProfile,
  locale: MedicationLocale,
): MedicationIndicationOption[] =>
  profile.indications.map((indication) => ({
    key: indication.key,
    label: indication.texts[locale].label,
  }));

export const getMedicationIndications = (
  value: unknown,
  locale: MedicationLocale,
): MedicationIndicationOption[] =>
  getMedicationIndicationsInternal(resolveMedicationProfile(value), locale);

export const hasMultipleMedicationIndications = (
  profile: MedicationProfile,
): boolean => profile.indications.length > 1;

export const resolveMedicationIndication = (
  profile: MedicationProfile,
  selectedIndicationKey: unknown,
  locale: MedicationLocale,
): ResolvedMedicationIndication | null => {
  if (profile.indications.length === 0) {
    return null;
  }

  const selectedKey =
    typeof selectedIndicationKey === 'string' ? selectedIndicationKey : '';
  const indication =
    profile.indications.find((entry) => entry.key === selectedKey) ??
    profile.indications[0];
  const texts = indication.texts[locale];

  return {
    key: indication.key,
    label: texts.label,
    diagnosisNominative: texts.diagnosisNominative,
    diagnosisDative: texts.diagnosisDative,
    point2ConfirmationSentence: texts.point2ConfirmationSentence,
    targetSymptoms: texts.targetSymptoms,
  };
};
