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

export const MEDICATIONS: Record<MedicationKey, MedicationProfile> = {
  agomelatin: {
    key: 'agomelatin',
    displayNameDe: 'Agomelatin',
    displayNameEn: 'Agomelatine',
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.agomelatine',
    autoFacts: {
      de: {
        diagnosisMain:
          'postinfektiösem ME/CFS und/oder Long-/Post-COVID mit Fatigue',
        targetSymptoms:
          'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
        doseAndDuration:
          '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
        monitoringAndStop:
          'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
        priorMeasuresDefault:
          'Bisherige symptomorientierte Maßnahmen wurden ausgeschöpft bzw. waren nicht ausreichend wirksam oder nicht verträglich.',
        expertSourceText:
          'Bewertung Agomelatin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 02.12.2025).',
        expertAttachmentText:
          'Bewertung: Agomelatin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 02.12.2025)',
      },
      en: {
        diagnosisMain:
          'post-infectious ME/CFS and/or long/post-COVID with fatigue',
        targetSymptoms:
          'improvement of fatigue and health-related quality of life (HRQoL)',
        doseAndDuration:
          '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
        monitoringAndStop:
          'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
        priorMeasuresDefault:
          'Prior symptom-oriented measures have been exhausted, were insufficient, or were not tolerated.',
        expertSourceText:
          'Assessment agomelatine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-12-02).',
        expertAttachmentText:
          'Assessment: Agomelatine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-12-02)',
      },
    },
  },
  ivabradine: {
    key: 'ivabradine',
    displayNameDe: 'Ivabradin',
    displayNameEn: 'Ivabradine',
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.ivabradine',
    autoFacts: {
      de: {
        diagnosisMain:
          'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
        targetSymptoms:
          'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
        doseAndDuration:
          'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
        monitoringAndStop:
          'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
        priorMeasuresDefault:
          'Betablocker wurden bereits eingesetzt, waren nicht verträglich oder nicht geeignet; weitere symptomorientierte Maßnahmen waren unzureichend.',
        expertSourceText:
          'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).',
        expertAttachmentText:
          'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
      },
      en: {
        diagnosisMain:
          'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
        targetSymptoms:
          'heart-rate reduction and improved health-related quality of life (HRQoL)',
        doseAndDuration:
          'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
        monitoringAndStop:
          'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
        priorMeasuresDefault:
          'Beta blockers were already used but not tolerated or not suitable; further symptom-oriented measures were insufficient.',
        expertSourceText:
          'Assessment ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15).',
        expertAttachmentText:
          'Assessment: Ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15)',
      },
    },
  },
  vortioxetine: {
    key: 'vortioxetine',
    displayNameDe: 'Vortioxetin',
    displayNameEn: 'Vortioxetine',
    isOther: false,
    requiresManualFields: false,
    requiresPriorMeasures: false,
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.vortioxetine',
    autoFacts: {
      de: {
        diagnosisMain:
          'Long/Post-COVID mit kognitiven Beeinträchtigungen und/oder depressiven Symptomen',
        targetSymptoms:
          'Verbesserung von Kognition und/oder depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
        doseAndDuration:
          '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
        monitoringAndStop:
          'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen; Hinweis: in Deutschland nicht verfügbar, Import/Verfügbarkeit prüfen',
        priorMeasuresDefault:
          'Bisherige symptomorientierte Maßnahmen wurden ausgeschöpft bzw. waren nicht ausreichend wirksam oder nicht verträglich.',
        expertSourceText:
          'Bewertung Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).',
        expertAttachmentText:
          'Bewertung: Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
      },
      en: {
        diagnosisMain:
          'long/post-COVID with cognitive impairment and/or depressive symptoms',
        targetSymptoms:
          'improvement of cognition and/or depressive symptoms, plus health-related quality of life (HRQoL)',
        doseAndDuration:
          '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
        monitoringAndStop:
          'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events; note: not available in Germany, verify import/availability',
        priorMeasuresDefault:
          'Prior symptom-oriented measures have been exhausted, were insufficient, or were not tolerated.',
        expertSourceText:
          'Assessment vortioxetine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15).',
        expertAttachmentText:
          'Assessment: Vortioxetine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15)',
      },
    },
  },
  other: {
    key: 'other',
    displayNameDe: 'anderes Medikament oder andere Indikation',
    displayNameEn: 'other medication or other indication',
    isOther: true,
    requiresManualFields: true,
    requiresPriorMeasures: true,
    infoBoxI18nKey: 'offlabel-antrag.ui.infobox.drug.other',
  },
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
