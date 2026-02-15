export type DrugKey = 'ivabradine' | 'agomelatin' | 'vortioxetine' | 'other';

export type DrugConfig = {
  key: DrugKey;
  displayName: string;
  point2DiagnosisSentence: string;
  hasAnnouncedAmrlEntry: boolean;
};

export const DRUGS: Record<DrugKey, DrugConfig> = {
  ivabradine: {
    key: 'ivabradine',
    displayName: 'Ivabradin',
    point2DiagnosisSentence:
      'Die Diagnose: COVID-19 assoziiertes PoTS ist gesichert (siehe Befunde)',
    hasAnnouncedAmrlEntry: true,
  },
  agomelatin: {
    key: 'agomelatin',
    displayName: 'Agomelatin',
    point2DiagnosisSentence:
      'Die Diagnose Fatigue bei postinfektiöser myalgischer Enzephalomyelitis/ Chronischem Fatigue-Syndrom (ME/CFS) und bei Long/Post-COVID ist gesichert (siehe Befunde)',
    hasAnnouncedAmrlEntry: false,
  },
  vortioxetine: {
    key: 'vortioxetine',
    displayName: 'Vortioxetin',
    point2DiagnosisSentence:
      'Die Diagnose kognitive Beeinträchtigungen und/oder depressive Symptome im Rahmen von Long/Post-COVID ist gesichert',
    hasAnnouncedAmrlEntry: false,
  },
  other: {
    key: 'other',
    displayName: 'anderes Medikament oder andere Indikation',
    point2DiagnosisSentence: '',
    hasAnnouncedAmrlEntry: false,
  },
};
