export const OFFLABEL_MEDICATION_KEYS = [
  'agomelatin',
  'ivabradine',
  'vortioxetine',
  'ldn',
  'aripiprazole',
  'methylphenidate',
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
  selectionNameDe: string;
  selectionNameEn: string;
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
  selectionNameDe: string;
  selectionNameEn: string;
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
const LDN_LONG_POST_COVID_DE = 'Long/Post-COVID mit Fatigue';
const LDN_LONG_POST_COVID_EN = 'long/post-COVID with fatigue';
const LDN_TARGET_SYMPTOMS_DE =
  'Verbesserung von Fatigue, Belastbarkeit und gesundheitsbezogener Lebensqualität (HRQoL)';
const LDN_TARGET_SYMPTOMS_EN =
  'improvement of fatigue, functional capacity, and health-related quality of life (HRQoL)';
const ARIPIPRAZOLE_MECFS_DE = 'postinfektiöse ME/CFS mit Fatigue und PEM';
const ARIPIPRAZOLE_MECFS_EN = 'post-infectious ME/CFS with fatigue and PEM';
const ARIPIPRAZOLE_LONG_POST_COVID_DE = 'Long/Post-COVID mit Fatigue und PEM';
const ARIPIPRAZOLE_LONG_POST_COVID_EN = 'long/post-COVID with fatigue and PEM';
const METHYLPHENIDATE_MECFS_DE =
  'postinfektiöse ME/CFS mit Fatigue und kognitiven Beeinträchtigungen';
const METHYLPHENIDATE_MECFS_EN =
  'post-infectious ME/CFS with fatigue and cognitive impairment';
const METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_DE =
  'Long/Post-COVID mit kognitiven Beeinträchtigungen (Brain Fog)';
const METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_EN =
  'long/post-COVID with cognitive impairment (brain fog)';
const METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_DE =
  'Long/Post-COVID mit Hypersomnie/Tagesschläfrigkeit';
const METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_EN =
  'long/post-COVID with hypersomnia/daytime sleepiness';
const AGOMELATIN_BFARM_TITLE_DE =
  'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Agomelatin zur Behandlung der Fatigue bei postinfektiöser myalgischer Enzephalomyelitis/Chronischem Fatigue-Syndrom (ME/CFS) und bei Long/Post-COVID (Stand 02.12.2025).';
const AGOMELATIN_BFARM_TITLE_EN =
  'Assessment by the Long COVID Off-Label-Use Expert Group under Section 35c para. 1 SGB V on the use of agomelatine for the treatment of fatigue in post-infectious myalgic encephalomyelitis/chronic fatigue syndrome (ME/CFS) and in long/post-COVID (status 2025-12-02).';
const IVABRADINE_BFARM_TITLE_DE =
  'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Ivabradin bei Patientinnen und Patienten mit COVID-19-assoziiertem Posturalem orthostatischem Tachykardiesyndrom (PoTS), die eine Therapie mit Betablockern nicht tolerieren oder für diese nicht geeignet sind (Stand 15.10.2025).';
const IVABRADINE_BFARM_TITLE_EN =
  'Assessment by the Long COVID Off-Label-Use Expert Group under Section 35c para. 1 SGB V on the use of ivabradine in patients with COVID-19-associated postural orthostatic tachycardia syndrome (PoTS) who do not tolerate beta-blocker therapy or are not suitable for it (status 2025-10-15).';
const VORTIOXETINE_BFARM_TITLE_DE =
  'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Vortioxetin bei kognitiven Beeinträchtigungen und/oder depressiven Symptomen im Rahmen von Long/Post-COVID (Stand 15.10.2025).';
const VORTIOXETINE_BFARM_TITLE_EN =
  'Assessment by the Long COVID Off-Label-Use Expert Group under Section 35c para. 1 SGB V on the use of vortioxetine for cognitive impairment and/or depressive symptoms in long/post-COVID (status 2025-10-15).';

const createIndication = (
  key: string,
  texts: Record<MedicationLocale, MedicationLocalizedFacts>,
): MedicationIndication => ({
  key,
  texts,
});

type MedicationLocalizedFactsTuple = readonly [
  label: string,
  diagnosisNominative: string,
  diagnosisDative: string,
  point2ConfirmationSentence: string,
  targetSymptoms: string,
];

const buildLocalizedFactsFromTuple = (
  tuple: MedicationLocalizedFactsTuple,
): MedicationLocalizedFacts => {
  const [
    label,
    diagnosisNominative,
    diagnosisDative,
    point2ConfirmationSentence,
    targetSymptoms,
  ] = tuple;

  return {
    label,
    diagnosisNominative,
    diagnosisDative,
    point2ConfirmationSentence,
    targetSymptoms,
  };
};

const createTupleIndication = (
  key: string,
  deTuple: MedicationLocalizedFactsTuple,
  enTuple: MedicationLocalizedFactsTuple,
): MedicationIndication =>
  createIndication(key, {
    de: buildLocalizedFactsFromTuple(deTuple),
    en: buildLocalizedFactsFromTuple(enTuple),
  });

const createAutoFactsByLocale = (
  de: MedicationAutoFactsTuple,
  en: MedicationAutoFactsTuple,
): StandardMedicationInput['autoFacts'] => ({
  de,
  en,
});

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

const mapLocaleRecord = <T>(
  factory: (locale: MedicationLocale) => T,
): Record<MedicationLocale, T> => ({
  de: factory('de'),
  en: factory('en'),
});

const MEDICATION_INPUTS: readonly StandardMedicationInput[] = [
  {
    key: 'agomelatin',
    displayNameDe: 'Agomelatin',
    displayNameEn: 'Agomelatine',
    selectionNameDe: 'Agomelatin',
    selectionNameEn: 'Agomelatine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.agomelatine',
    expertSourceDate: '02.12.2025',
    expertSourceTextOverride: {
      de: AGOMELATIN_BFARM_TITLE_DE,
      en: AGOMELATIN_BFARM_TITLE_EN,
    },
    indications: [
      createTupleIndication(
        'agomelatin.mecfs_fatigue',
        [
          MECFS_FATIGUE_DE,
          MECFS_FATIGUE_DE,
          'postinfektiöser ME/CFS mit Fatigue',
          'Die Diagnose postinfektiöse ME/CFS ist gesichert (siehe Befunde). Fatigue ist als Leitsymptom dokumentiert.',
          'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
        ],
        [
          AGOMELATIN_MECFS_FATIGUE_EN,
          AGOMELATIN_MECFS_FATIGUE_EN,
          AGOMELATIN_MECFS_FATIGUE_EN,
          'The diagnosis of post-infectious ME/CFS is established (see findings). Fatigue is documented as a leading symptom.',
          'improvement of fatigue and health-related quality of life (HRQoL)',
        ],
      ),
      createTupleIndication(
        'agomelatin.long_post_covid_fatigue',
        [
          AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          AGOMELATIN_LONG_POST_COVID_FATIGUE_DE,
          'Die Diagnose Long-/Post-COVID ist gesichert (siehe Befunde). Fatigue ist als Leitsymptom dokumentiert.',
          'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
        ],
        [
          AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          AGOMELATIN_LONG_POST_COVID_FATIGUE_EN,
          'The diagnosis of long/post-COVID is established (see findings). Fatigue is documented as a leading symptom.',
          'improvement of fatigue and health-related quality of life (HRQoL)',
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
        'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      [
        '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
        'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    ),
  },
  {
    key: 'ivabradine',
    displayNameDe: 'Ivabradin',
    displayNameEn: 'Ivabradine',
    selectionNameDe: 'Ivabradin',
    selectionNameEn: 'Ivabradine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ivabradine',
    expertSourceDate: '15.10.2025',
    expertSourceTextOverride: {
      de: IVABRADINE_BFARM_TITLE_DE,
      en: IVABRADINE_BFARM_TITLE_EN,
    },
    indications: [
      createTupleIndication(
        'ivabradine.pots_long_post_covid',
        [
          'postinfektiöses PoTS bei Long/Post-COVID (insbesondere bei Betablocker-Unverträglichkeit)',
          'postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
          'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
          'Die Diagnose COVID-19-assoziiertes PoTS ist gesichert (siehe Befunde).',
          'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
        ],
        [
          'post-infectious PoTS in long/post-COVID (especially with beta-blocker intolerance)',
          'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
          'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
          'The diagnosis of COVID-19 associated PoTS is established (see findings).',
          'heart-rate reduction and improved health-related quality of life (HRQoL)',
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
        'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
        'Betablocker wurden bereits eingesetzt, waren nicht verträglich oder nicht geeignet; weitere symptomorientierte Maßnahmen waren unzureichend.',
      ],
      [
        'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
        'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
        'Beta blockers were already used but not tolerated or not suitable; further symptom-oriented measures were insufficient.',
      ],
    ),
  },
  {
    key: 'vortioxetine',
    displayNameDe: 'Vortioxetin',
    displayNameEn: 'Vortioxetine',
    selectionNameDe: 'Vortioxetin',
    selectionNameEn: 'Vortioxetine',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.vortioxetine',
    expertSourceDate: '15.10.2025',
    expertSourceTextOverride: {
      de: VORTIOXETINE_BFARM_TITLE_DE,
      en: VORTIOXETINE_BFARM_TITLE_EN,
    },
    indications: [
      createTupleIndication(
        'vortioxetine.long_post_covid_cognitive',
        [
          VORTIOXETINE_COGNITIVE_DE,
          VORTIOXETINE_COGNITIVE_DE,
          VORTIOXETINE_COGNITIVE_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Kognitive Beeinträchtigungen sind dokumentiert.',
          'Verbesserung von Kognition sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
        ],
        [
          VORTIOXETINE_COGNITIVE_EN,
          VORTIOXETINE_COGNITIVE_EN,
          VORTIOXETINE_COGNITIVE_EN,
          'The diagnosis of long/post-COVID is established (see findings). Cognitive impairment is documented.',
          'improvement of cognition and health-related quality of life (HRQoL)',
        ],
      ),
      createTupleIndication(
        'vortioxetine.long_post_covid_depressive',
        [
          VORTIOXETINE_DEPRESSIVE_DE,
          VORTIOXETINE_DEPRESSIVE_DE,
          VORTIOXETINE_DEPRESSIVE_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Depressive Symptome sind dokumentiert.',
          'Verbesserung depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
        ],
        [
          VORTIOXETINE_DEPRESSIVE_EN,
          VORTIOXETINE_DEPRESSIVE_EN,
          VORTIOXETINE_DEPRESSIVE_EN,
          'The diagnosis of long/post-COVID is established (see findings). Depressive symptoms are documented.',
          'improvement of depressive symptoms and health-related quality of life (HRQoL)',
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
        'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen.',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      [
        '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
        'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events.',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    ),
  },
  {
    key: 'ldn',
    displayNameDe: 'Low-Dose Naltrexon (LDN)',
    displayNameEn: 'Low-Dose Naltrexone (LDN)',
    selectionNameDe: 'Low-Dose Naltrexon (LDN)',
    selectionNameEn: 'Low-Dose Naltrexone (LDN)',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ldn',
    expertSourceDate: '24.02.2026',
    expertSourceTextOverride: {
      de: 'Long-COVID/PCC: O’Kelly B et al. Safety and efficacy of low dose naltrexone in a long covid cohort (Brain Behav Immun Health. 2022;24:100485. DOI: 10.1016/j.bbih.2022.100485); ME/CFS: Polo O, Pesonen A-K, Tuominen A et al. Low-dose naltrexone in myalgic encephalomyelitis/chronic fatigue syndrome (Fatigue. 2019. DOI: 10.1080/21641846.2019.1692770); laufende randomisierte Studie bei Post-COVID-Fatigue: NCT05430152.',
      en: 'Long-COVID/PCC: O’Kelly B et al. Safety and efficacy of low dose naltrexone in a long covid cohort (Brain Behav Immun Health. 2022;24:100485. DOI: 10.1016/j.bbih.2022.100485); ME/CFS: Polo O, Pesonen A-K, Tuominen A et al. Low-dose naltrexone in myalgic encephalomyelitis/chronic fatigue syndrome (Fatigue. 2019. DOI: 10.1080/21641846.2019.1692770); ongoing randomized post-COVID fatigue trial: NCT05430152.',
    },
    indications: [
      createTupleIndication(
        'ldn.mecfs_fatigue',
        [
          LDN_MECFS_DE,
          LDN_MECFS_DE,
          'postinfektiöser ME/CFS mit Fatigue',
          'Die Diagnose postinfektiöse ME/CFS ist gesichert (siehe Befunde). Fatigue ist als Leitsymptom dokumentiert.',
          LDN_TARGET_SYMPTOMS_DE,
        ],
        [
          LDN_MECFS_EN,
          LDN_MECFS_EN,
          LDN_MECFS_EN,
          'The diagnosis of post-infectious ME/CFS is established (see findings). Fatigue is documented as a core symptom.',
          LDN_TARGET_SYMPTOMS_EN,
        ],
      ),
      createTupleIndication(
        'ldn.long_post_covid_fatigue',
        [
          LDN_LONG_POST_COVID_DE,
          LDN_LONG_POST_COVID_DE,
          LDN_LONG_POST_COVID_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Fatigue ist als Leitsymptom dokumentiert.',
          LDN_TARGET_SYMPTOMS_DE,
        ],
        [
          LDN_LONG_POST_COVID_EN,
          LDN_LONG_POST_COVID_EN,
          LDN_LONG_POST_COVID_EN,
          'The diagnosis of long/post-COVID is established (see findings). Fatigue is documented as a core symptom.',
          LDN_TARGET_SYMPTOMS_EN,
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        'Start 1,0 mg 1x täglich; stufenweise Titration (z. B. +0,5-1,0 mg pro 1-2 Wochen) bis 4,5 mg/Tag oder maximal verträgliche Dosis; Therapieversuch 12-16 Wochen',
        'Engmaschiges Monitoring von Schlafstörungen/lebhaften Träumen, Übelkeit, Kopfschmerz, gastrointestinalen Beschwerden sowie Leberwerten bei Risikoprofil; keine gleichzeitige Opioid-Einnahme; Abbruch bei klinisch relevanter Verschlechterung, nicht tolerierbaren Nebenwirkungen oder ausbleibendem Nutzen nach 12-16 Wochen',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      [
        'start at 1.0 mg once daily; stepwise titration (e.g. +0.5-1.0 mg every 1-2 weeks) up to 4.5 mg/day or maximally tolerated dose; treatment trial for 12-16 weeks',
        'close monitoring for insomnia/vivid dreams, nausea, headache, gastrointestinal adverse effects, and liver parameters in at-risk patients; no concomitant opioid use; discontinue with clinically relevant worsening, intolerable adverse effects, or lack of meaningful benefit after 12-16 weeks',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    ),
  },
  {
    key: 'aripiprazole',
    displayNameDe: 'Aripiprazol (LDA)',
    displayNameEn: 'Aripiprazole (LDA)',
    selectionNameDe: 'Aripiprazol (LDA)',
    selectionNameEn: 'Aripiprazole (LDA)',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.aripiprazole',
    expertSourceDate: '24.02.2026',
    expertSourceTextOverride: {
      de: 'Crosby LD et al. Off label use of Aripiprazole in ME/CFS (J Transl Med. 2021;19:50. DOI: 10.1186/s12967-021-02721-9) sowie Cui J et al. Low-Dose Aripiprazole in Long COVID (Open Forum Infect Dis. 2026;13(Suppl 1):ofaf695.1788. DOI: 10.1093/ofid/ofaf695.1788).',
      en: 'Crosby LD et al. Off label use of Aripiprazole in ME/CFS (J Transl Med. 2021;19:50. DOI: 10.1186/s12967-021-02721-9) and Cui J et al. Low-Dose Aripiprazole in Long COVID (Open Forum Infect Dis. 2026;13(Suppl 1):ofaf695.1788. DOI: 10.1093/ofid/ofaf695.1788).',
    },
    indications: [
      createTupleIndication(
        'aripiprazole.mecfs_fatigue_pem',
        [
          ARIPIPRAZOLE_MECFS_DE,
          ARIPIPRAZOLE_MECFS_DE,
          'postinfektiöser ME/CFS mit Fatigue und PEM',
          'Die Diagnose postinfektiöse ME/CFS ist gesichert (siehe Befunde). Fatigue und PEM sind dokumentiert.',
          'Verbesserung von Fatigue, PEM-Frequenz, kognitiver Symptomatik und funktionellem Status (HRQoL)',
        ],
        [
          ARIPIPRAZOLE_MECFS_EN,
          ARIPIPRAZOLE_MECFS_EN,
          ARIPIPRAZOLE_MECFS_EN,
          'The diagnosis of post-infectious ME/CFS is established (see findings). Fatigue and PEM are documented.',
          'improvement of fatigue, PEM frequency, cognitive symptoms, and functional status (HRQoL)',
        ],
      ),
      createTupleIndication(
        'aripiprazole.long_post_covid_fatigue_pem',
        [
          ARIPIPRAZOLE_LONG_POST_COVID_DE,
          ARIPIPRAZOLE_LONG_POST_COVID_DE,
          ARIPIPRAZOLE_LONG_POST_COVID_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Fatigue und PEM sind dokumentiert.',
          'Verbesserung von Fatigue, PEM-Frequenz, kognitiver Symptomatik und funktionellem Status (HRQoL)',
        ],
        [
          ARIPIPRAZOLE_LONG_POST_COVID_EN,
          ARIPIPRAZOLE_LONG_POST_COVID_EN,
          ARIPIPRAZOLE_LONG_POST_COVID_EN,
          'The diagnosis of long/post-COVID is established (see findings). Fatigue and PEM are documented.',
          'improvement of fatigue, PEM frequency, cognitive symptoms, and functional status (HRQoL)',
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        'Start 0,1-0,25 mg 1x täglich; langsame Titration in 0,25-mg-Schritten bis max. 2 mg/Tag; Nutzen-Risiko-Re-Evaluation nach 6-12 Wochen',
        'Engmaschiges Monitoring von Unruhe/Akathisie, Insomnie, orthostatischer Verträglichkeit, Tagesmüdigkeit und Gewicht; Abbruch bei klinisch relevanter Verschlechterung, ausgeprägter Agitation/Akathisie oder fehlendem Nutzen nach 6-12 Wochen',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      [
        'start at 0.1-0.25 mg once daily; slow titration in 0.25 mg steps up to max. 2 mg/day; re-evaluate benefit-risk after 6-12 weeks',
        'close monitoring of agitation/akathisia, insomnia, orthostatic tolerance, daytime somnolence, and weight; discontinue with clinically relevant worsening, marked agitation/akathisia, or no meaningful benefit after 6-12 weeks',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    ),
  },
  {
    key: 'methylphenidate',
    displayNameDe: 'Methylphenidat',
    displayNameEn: 'Methylphenidate',
    selectionNameDe: 'Methylphenidat (Medikinet, Ritalin)',
    selectionNameEn: 'Methylphenidate (Medikinet, Ritalin)',
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.methylphenidate',
    expertSourceDate: '02.03.2026',
    expertSourceTextOverride: {
      de: 'ME/CFS: Blockmans D et al. Does methylphenidate reduce the symptoms of chronic fatigue syndrome? (Am J Med. 2006;119(2):167.e23-30. DOI: 10.1016/j.amjmed.2005.07.047); Long-COVID: Clark P et al. Methylphenidate for the Treatment of Post-COVID Cognitive Dysfunction (J Med Cases. 2024;15(8):195-200. DOI: 10.14740/jmc4254) sowie Morelli-Zaher C et al. Post-COVID central hypersomnia, a treatable trait in long COVID: 4 case reports (Front Neurol. 2024. DOI: 10.3389/fneur.2024.1349486).',
      en: 'ME/CFS: Blockmans D et al. Does methylphenidate reduce the symptoms of chronic fatigue syndrome? (Am J Med. 2006;119(2):167.e23-30. DOI: 10.1016/j.amjmed.2005.07.047); long-COVID: Clark P et al. Methylphenidate for the Treatment of Post-COVID Cognitive Dysfunction (J Med Cases. 2024;15(8):195-200. DOI: 10.14740/jmc4254) and Morelli-Zaher C et al. Post-COVID central hypersomnia, a treatable trait in long COVID: 4 case reports (Front Neurol. 2024. DOI: 10.3389/fneur.2024.1349486).',
    },
    indications: [
      createTupleIndication(
        'methylphenidate.mecfs_fatigue_cognitive',
        [
          METHYLPHENIDATE_MECFS_DE,
          METHYLPHENIDATE_MECFS_DE,
          'postinfektiöser ME/CFS mit Fatigue und kognitiven Beeinträchtigungen',
          'Die Diagnose postinfektiöse ME/CFS ist gesichert (siehe Befunde). Fatigue und kognitive Beeinträchtigungen sind dokumentiert.',
          'Verbesserung von Fatigue, Kognition und alltagsrelevanter Funktionsfähigkeit (HRQoL)',
        ],
        [
          METHYLPHENIDATE_MECFS_EN,
          METHYLPHENIDATE_MECFS_EN,
          METHYLPHENIDATE_MECFS_EN,
          'The diagnosis of post-infectious ME/CFS is established (see findings). Fatigue and cognitive impairment are documented.',
          'improvement of fatigue, cognition, and day-to-day functional capacity (HRQoL)',
        ],
      ),
      createTupleIndication(
        'methylphenidate.long_post_covid_cognitive',
        [
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_DE,
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_DE,
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Kognitive Beeinträchtigungen sind dokumentiert.',
          'Verbesserung von Aufmerksamkeit, Gedächtnisleistung und Fatigue-bedingter Alltagseinschränkung',
        ],
        [
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_EN,
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_EN,
          METHYLPHENIDATE_LONG_POST_COVID_COGNITIVE_EN,
          'The diagnosis of long/post-COVID is established (see findings). Cognitive impairment is documented.',
          'improvement of attention, memory performance, and fatigue-related daily limitations',
        ],
      ),
      createTupleIndication(
        'methylphenidate.long_post_covid_hypersomnia',
        [
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_DE,
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_DE,
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_DE,
          'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Klinisch relevante Hypersomnie bzw. Tagesschläfrigkeit ist dokumentiert.',
          'Reduktion von Tagesschläfrigkeit und Verbesserung der funktionellen Belastbarkeit',
        ],
        [
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_EN,
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_EN,
          METHYLPHENIDATE_LONG_POST_COVID_HYPERSOMNIA_EN,
          'The diagnosis of long/post-COVID is established (see findings). Clinically relevant hypersomnia or daytime sleepiness is documented.',
          'reduction of daytime sleepiness and improvement of functional capacity',
        ],
      ),
    ],
    autoFacts: createAutoFactsByLocale(
      [
        'Start 5 mg morgens; je nach Verträglichkeit Steigerung in 5-mg-Schritten bis 10 mg 2x täglich (max. 20 mg/Tag); erster Wirksamkeits-Check nach ca. 4 Wochen',
        'Engmaschiges Monitoring von Blutdruck, Herzfrequenz, Gewicht, Schlaf und psychischen Nebenwirkungen; Abbruch bei fehlendem klinisch relevantem Nutzen nach 4 Wochen unter ausreichender Dosis oder bei nicht tolerierbaren Nebenwirkungen (z. B. Agitiertheit, Palpitationen, deutliche RR/Puls-Erhöhung)',
        PRIOR_MEASURES_DEFAULT.de,
      ],
      [
        'start at 5 mg in the morning; titrate in 5 mg steps as tolerated up to 10 mg twice daily (max. 20 mg/day); first efficacy check after about 4 weeks',
        'close monitoring of blood pressure, heart rate, weight, sleep, and psychiatric adverse effects; discontinue when there is no clinically meaningful benefit after 4 weeks at an adequate dose or when adverse effects are not tolerated (e.g. agitation, palpitations, marked BP/HR increase)',
        PRIOR_MEASURES_DEFAULT.en,
      ],
    ),
  },
] as const;

const createStandardMedicationProfile = (
  input: StandardMedicationInput,
): MedicationProfile => {
  const autoFacts = mapLocaleRecord((locale) => {
    const localeAutoFacts = input.autoFacts[locale];
    const expertTexts = buildExpertTextsFromOverride(
      input.expertSourceTextOverride![locale],
    );

    return {
      ...buildAutoFacts(localeAutoFacts),
      ...expertTexts,
    };
  });

  return {
    key: input.key,
    displayNameDe: input.displayNameDe,
    displayNameEn: input.displayNameEn,
    selectionNameDe: input.selectionNameDe,
    selectionNameEn: input.selectionNameEn,
    visibility: input.visibility ?? 'public',
    indications: [...input.indications],
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey: input.infoBoxI18nKey,
    autoFacts,
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
  selectionNameDe: 'anderes Medikament',
  selectionNameEn: 'other medication',
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

export const getMedicationSelectionName = (
  key: MedicationKey,
  locale: MedicationLocale,
): string => {
  const profile = MEDICATIONS[key];
  return locale === 'de' ? profile.selectionNameDe : profile.selectionNameEn;
};

export const getVisibleMedicationOptions = (
  locale: MedicationLocale,
  showDevMedications = false,
): Array<{ key: MedicationKey; label: string }> =>
  getVisibleMedicationKeys(showDevMedications).map((key) => ({
    key,
    label: getMedicationSelectionName(key, locale),
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
