export const OFFLABEL_MEDICATION_KEYS = [
  'agomelatin',
  'ivabradine',
  'vortioxetine',
  'ldn',
  'aripiprazole',
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
  expertSourceTextOverride?: Record<MedicationLocale, string>;
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

const MECFS_FATIGUE_DE = 'postinfektiöse ME/CFS mit Fatigue';
const AGOMELATIN_MECFS_FATIGUE_EN = 'post-infectious ME/CFS with fatigue';
const AGOMELATIN_LONG_POST_COVID_FATIGUE_DE = 'Long-/Post-COVID mit Fatigue';
const AGOMELATIN_LONG_POST_COVID_FATIGUE_EN = 'long/post-COVID with fatigue';
const VORTIOXETINE_COGNITIVE_DE =
  'Long/Post-COVID mit kognitiven Beeinträchtigungen';
const VORTIOXETINE_COGNITIVE_EN = 'long/post-COVID with cognitive impairment';
const VORTIOXETINE_DEPRESSIVE_DE = 'Long/Post-COVID mit depressiven Symptomen';
const VORTIOXETINE_DEPRESSIVE_EN = 'long/post-COVID with depressive symptoms';
const LDN_MECFS_DE = MECFS_FATIGUE_DE;
const LDN_MECFS_EN = 'post-infectious ME/CFS with fatigue';
const LDN_LONG_POST_COVID_DE = 'Long/Post-COVID mit Fatigue (PCC/PCFS)';
const LDN_LONG_POST_COVID_EN = 'long/post-COVID with fatigue (PCC/PCFS)';
const LDN_TARGET_SYMPTOMS_DE =
  'Verbesserung von Fatigue, Belastbarkeit und gesundheitsbezogener Lebensqualität (HRQoL)';
const LDN_TARGET_SYMPTOMS_EN =
  'improvement of fatigue, functional capacity, and health-related quality of life (HRQoL)';
const ARIPIPRAZOLE_MECFS_DE = 'postinfektiöse ME/CFS mit Fatigue und PEM';
const ARIPIPRAZOLE_MECFS_EN = 'post-infectious ME/CFS with fatigue and PEM';
const ARIPIPRAZOLE_LONG_POST_COVID_DE = 'Long/Post-COVID mit Fatigue und PEM';
const ARIPIPRAZOLE_LONG_POST_COVID_EN = 'long/post-COVID with fatigue and PEM';

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

const buildExpertTextsFromOverride = (
  sourceText: string,
): Pick<MedicationAutoFacts, 'expertSourceText' | 'expertAttachmentText'> => ({
  expertSourceText: sourceText,
  expertAttachmentText: sourceText,
});

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
          label: MECFS_FATIGUE_DE,
          diagnosisNominative: MECFS_FATIGUE_DE,
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
        'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen.',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      en: [
        '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
        'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events.',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    },
  },
  {
    key: 'ldn',
    displayNameDe: 'Low-Dose Naltrexon (LDN)',
    displayNameEn: 'Low-Dose Naltrexone (LDN)',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ldn',
    expertSourceDate: '24.02.2026',
    expertSourceTextOverride: {
      de: 'Long-COVID/PCC: O’Kelly B et al. Safety and efficacy of low dose naltrexone in a long covid cohort (Brain Behav Immun Health. 2022;24:100485. DOI: 10.1016/j.bbih.2022.100485); ME/CFS: Polo O, Pesonen A-K, Tuominen A et al. Low-dose naltrexone in myalgic encephalomyelitis/chronic fatigue syndrome (Fatigue. 2019. DOI: 10.1080/21641846.2019.1692770); laufende randomisierte Studie bei Post-COVID-Fatigue: NCT05430152.',
      en: 'Long-COVID/PCC: O’Kelly B et al. Safety and efficacy of low dose naltrexone in a long covid cohort (Brain Behav Immun Health. 2022;24:100485. DOI: 10.1016/j.bbih.2022.100485); ME/CFS: Polo O, Pesonen A-K, Tuominen A et al. Low-dose naltrexone in myalgic encephalomyelitis/chronic fatigue syndrome (Fatigue. 2019. DOI: 10.1080/21641846.2019.1692770); ongoing randomized post-COVID fatigue trial: NCT05430152.',
    },
    indications: [
      createIndication('ldn.mecfs_fatigue', {
        de: {
          label: LDN_MECFS_DE,
          diagnosisNominative: LDN_MECFS_DE,
          diagnosisDative: 'postinfektiöser ME/CFS mit Fatigue',
          point2ConfirmationSentence:
            'Die Diagnose postinfektiöse ME/CFS mit Fatigue ist gesichert (siehe Befunde).',
          targetSymptoms: LDN_TARGET_SYMPTOMS_DE,
        },
        en: {
          label: LDN_MECFS_EN,
          diagnosisNominative: LDN_MECFS_EN,
          diagnosisDative: LDN_MECFS_EN,
          point2ConfirmationSentence:
            'The diagnosis of post-infectious ME/CFS with fatigue is established (see findings).',
          targetSymptoms: LDN_TARGET_SYMPTOMS_EN,
        },
      }),
      createIndication('ldn.long_post_covid_fatigue', {
        de: {
          label: LDN_LONG_POST_COVID_DE,
          diagnosisNominative: LDN_LONG_POST_COVID_DE,
          diagnosisDative: LDN_LONG_POST_COVID_DE,
          point2ConfirmationSentence:
            'Die Diagnose Long/Post-COVID mit Fatigue ist gesichert (siehe Befunde).',
          targetSymptoms: LDN_TARGET_SYMPTOMS_DE,
        },
        en: {
          label: LDN_LONG_POST_COVID_EN,
          diagnosisNominative: LDN_LONG_POST_COVID_EN,
          diagnosisDative: LDN_LONG_POST_COVID_EN,
          point2ConfirmationSentence:
            'The diagnosis of long/post-COVID with fatigue is established (see findings).',
          targetSymptoms: LDN_TARGET_SYMPTOMS_EN,
        },
      }),
    ],
    autoFacts: {
      de: [
        'Start 1,0 mg 1x täglich; stufenweise Titration (z. B. +0,5-1,0 mg pro 1-2 Wochen) bis 4,5 mg/Tag oder maximal verträgliche Dosis; Therapieversuch 12-16 Wochen',
        'Engmaschiges Monitoring von Schlafstörungen/lebhaften Träumen, Übelkeit, Kopfschmerz, gastrointestinalen Beschwerden sowie Leberwerten bei Risikoprofil; keine gleichzeitige Opioid-Einnahme; Abbruch bei klinisch relevanter Verschlechterung, nicht tolerierbaren Nebenwirkungen oder ausbleibendem Nutzen nach 12-16 Wochen',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      en: [
        'start at 1.0 mg once daily; stepwise titration (e.g. +0.5-1.0 mg every 1-2 weeks) up to 4.5 mg/day or maximally tolerated dose; treatment trial for 12-16 weeks',
        'close monitoring for insomnia/vivid dreams, nausea, headache, gastrointestinal adverse effects, and liver parameters in at-risk patients; no concomitant opioid use; discontinue with clinically relevant worsening, intolerable adverse effects, or lack of meaningful benefit after 12-16 weeks',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    },
  },
  {
    key: 'aripiprazole',
    displayNameDe: 'Aripiprazol (LDA)',
    displayNameEn: 'Aripiprazole (LDA)',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.aripiprazole',
    expertSourceDate: '24.02.2026',
    expertSourceTextOverride: {
      de: 'Crosby LD et al. Off label use of Aripiprazole in ME/CFS (J Transl Med. 2021;19:50. DOI: 10.1186/s12967-021-02721-9) sowie Cui J et al. Low-Dose Aripiprazole in Long COVID (Open Forum Infect Dis. 2026;13(Suppl 1):ofaf695.1788. DOI: 10.1093/ofid/ofaf695.1788).',
      en: 'Crosby LD et al. Off label use of Aripiprazole in ME/CFS (J Transl Med. 2021;19:50. DOI: 10.1186/s12967-021-02721-9) and Cui J et al. Low-Dose Aripiprazole in Long COVID (Open Forum Infect Dis. 2026;13(Suppl 1):ofaf695.1788. DOI: 10.1093/ofid/ofaf695.1788).',
    },
    indications: [
      createIndication('aripiprazole.mecfs_fatigue_pem', {
        de: {
          label: ARIPIPRAZOLE_MECFS_DE,
          diagnosisNominative: ARIPIPRAZOLE_MECFS_DE,
          diagnosisDative: 'postinfektiöser ME/CFS mit Fatigue und PEM',
          point2ConfirmationSentence:
            'Die Diagnose postinfektiöse ME/CFS mit Fatigue und PEM ist gesichert (siehe Befunde).',
          targetSymptoms:
            'Verbesserung von Fatigue, PEM-Frequenz, kognitiver Symptomatik und funktionellem Status (HRQoL)',
        },
        en: {
          label: ARIPIPRAZOLE_MECFS_EN,
          diagnosisNominative: ARIPIPRAZOLE_MECFS_EN,
          diagnosisDative: ARIPIPRAZOLE_MECFS_EN,
          point2ConfirmationSentence:
            'The diagnosis of post-infectious ME/CFS with fatigue and PEM is established (see findings).',
          targetSymptoms:
            'improvement of fatigue, PEM frequency, cognitive symptoms, and functional status (HRQoL)',
        },
      }),
      createIndication('aripiprazole.long_post_covid_fatigue_pem', {
        de: {
          label: ARIPIPRAZOLE_LONG_POST_COVID_DE,
          diagnosisNominative: ARIPIPRAZOLE_LONG_POST_COVID_DE,
          diagnosisDative: ARIPIPRAZOLE_LONG_POST_COVID_DE,
          point2ConfirmationSentence:
            'Die Diagnose Long/Post-COVID mit Fatigue und PEM ist gesichert (siehe Befunde).',
          targetSymptoms:
            'Verbesserung von Fatigue, PEM-Frequenz, kognitiver Symptomatik und funktionellem Status (HRQoL)',
        },
        en: {
          label: ARIPIPRAZOLE_LONG_POST_COVID_EN,
          diagnosisNominative: ARIPIPRAZOLE_LONG_POST_COVID_EN,
          diagnosisDative: ARIPIPRAZOLE_LONG_POST_COVID_EN,
          point2ConfirmationSentence:
            'The diagnosis of long/post-COVID with fatigue and PEM is established (see findings).',
          targetSymptoms:
            'improvement of fatigue, PEM frequency, cognitive symptoms, and functional status (HRQoL)',
        },
      }),
    ],
    autoFacts: {
      de: [
        'Start 0,1-0,25 mg 1x täglich; langsame Titration in 0,25-mg-Schritten bis max. 2 mg/Tag; Nutzen-Risiko-Re-Evaluation nach 6-12 Wochen',
        'Engmaschiges Monitoring von Unruhe/Akathisie, Insomnie, orthostatischer Verträglichkeit, Tagesmüdigkeit und Gewicht; Abbruch bei klinisch relevanter Verschlechterung, ausgeprägter Agitation/Akathisie oder fehlendem Nutzen nach 6-12 Wochen',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      en: [
        'start at 0.1-0.25 mg once daily; slow titration in 0.25 mg steps up to max. 2 mg/day; re-evaluate benefit-risk after 6-12 weeks',
        'close monitoring of agitation/akathisia, insomnia, orthostatic tolerance, daytime somnolence, and weight; discontinue with clinically relevant worsening, marked agitation/akathisia, or no meaningful benefit after 6-12 weeks',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    },
  },
] as const;

const createStandardMedicationProfile = (
  input: StandardMedicationInput,
): MedicationProfile => {
  const [deAutoFacts, enAutoFacts] = [input.autoFacts.de, input.autoFacts.en];
  const deExpertTexts = input.expertSourceTextOverride?.de
    ? buildExpertTextsFromOverride(input.expertSourceTextOverride.de)
    : buildExpertTexts('de', input.displayNameDe, input.expertSourceDate);
  const enExpertTexts = input.expertSourceTextOverride?.en
    ? buildExpertTextsFromOverride(input.expertSourceTextOverride.en)
    : buildExpertTexts('en', input.displayNameEn, input.expertSourceDate);

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
        ...deExpertTexts,
      },
      en: {
        ...buildAutoFacts(enAutoFacts),
        ...enExpertTexts,
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
