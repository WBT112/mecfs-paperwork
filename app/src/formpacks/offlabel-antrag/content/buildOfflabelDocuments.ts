import { DRUGS, type DrugKey } from './drugConfig';
import { resolveMedicationProfile } from '../medications';
import type { SupportedLocale } from '../../../i18n/locale';
import { buildOffLabelAntragDocumentModel } from '../export/documentModel';

export type OfflabelRenderedDocument = {
  id: 'part1' | 'part2' | 'part3';
  title: string;
  blocks: Array<
    | { kind: 'heading'; text: string }
    | { kind: 'paragraph'; text: string }
    | { kind: 'list'; items: string[] }
    | { kind: 'pageBreak' }
  >;
};

type FormData = Record<string, unknown>;
type PreviewMedicationFacts = {
  displayName: string;
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  expertSourceText: string;
};

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1;

const formatBirthDate = (value: string): string => {
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!ymdMatch) {
    return value;
  }
  return `${ymdMatch[3]}.${ymdMatch[2]}.${ymdMatch[1]}`;
};

const joinLines = (values: string[]): string =>
  values.filter(Boolean).join('\n');

const combineDoseAndDuration = (dose: string, duration: string): string => {
  if (dose && duration) {
    return `${dose}; ${duration}`;
  }
  return dose || duration;
};

const parseMultilineItems = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s+/, '')
        .trim(),
    )
    .filter((line) => line.length > 0);

const POINT_7_NOTSTAND =
  'Es handelt sich um eine schwerwiegende, die Lebensqualität auf Dauer nachhaltig beeinträchtigende Erkrankung. Die Voraussetzungen des § 2 Abs. 1a SGB V sind in meinem Fall erfüllt. Zur wertungsmäßigen Einordnung bei fehlender Standardtherapie verweise ich ergänzend auf den Beschluss des LSG Niedersachsen-Bremen vom 14.10.2022 (L 4 KR 373/22 B ER).';

const POINT_8_STANDARD =
  'Für die Versorgung meiner Erkrankung stehen keine sog. Standard-Therapien des gKV-Leistungskatalogs zur Verfügung. In der Wissenschaft werden allein symptombezogene Versorgungen diskutiert. Die am ehesten einschlägige Leitlinie: „Müdigkeit“ der Arbeitsgemeinschaft der Wissenschaftlichen Medizinischen Fachgesellschaften e. V. spricht in eben jener Leitlinie davon, dass für die kausale Behandlung des ME/CFS bislang keine Medikamente zugelassen sind und verweist auf die britische NICE-Richtlinie. In dieser wird neben Energiemanagment vor allem das Lindern der Symptome in den Fokus gerückt um eine spürbare Beeinflussung des Krankheitsverlaufes oder eine Verhütung der Verschlimmerung zu erreichen. Das begehrte Offlabel Medikament ist für die Erreichung dieser Ziele geeignet. Zusammengefasst ist keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.';

const POINT_10_NO_2A =
  'Die Erkenntnisse lassen sich auf meine Diagnosen übertragen. Ich weise darauf hin, dass erst seit kurzem einheitliche und differenzierte Diagnoseschlüssel existieren und sich im ärztlichen Bereich noch etablieren müssen. Eine korrekte Verschlüsselung von Diagnosen ist und war damit nicht immer gegeben.';
const POINT_10_MD_SOURCE =
  'Medizinischer Dienst Bund: Begutachtungsanleitung / Begutachtungsmaßstäbe Off-Label-Use (Stand 05/2022).';

const BELL_SCORE_ASSESSMENTS: Record<string, string> = {
  '100':
    'Trotz vorübergehender Beschwerdestabilität bin ich wegen ME/CFS weiterhin auf striktes Pacing angewiesen, um Rückfälle und deutliche Zustandsverschlechterungen zu vermeiden (z. B. feste Belastungsobergrenzen, konsequente Ruhefenster nach Terminen).',
  '90': 'Schon moderat erhöhte körperliche oder kognitive Belastungen können spürbare Beschwerden auslösen; Aktivitäten und soziale Teilhabe sind nur mit enger Selbstbegrenzung möglich (z. B. Terminplanung mit Erholungszeit, Vermeidung von Reizüberflutung, reduzierte spontane Alltagsaktivität).',
  '80': 'Im Alltag bestehen bereits klare funktionelle Einschränkungen mit Belastungsverschlechterung; Teilhabe ist nur reduziert und nicht verlässlich planbar möglich (z. B. Haushaltsaufgaben nur abschnittsweise, soziale Kontakte nur kurz und selten, Wege außer Haus nur mit anschließender Erholung).',
  '70': 'Meine Funktionsfähigkeit ist deutlich eingeschränkt; regelmäßige Alltagsaktivitäten gelingen nur in reduziertem Umfang und mit hohem Erholungsbedarf (z. B. Einkäufe nur begleitet oder stark verkürzt, administrative Aufgaben nur in kurzen Intervallen, häufige Liegephasen tagsüber).',
  '60': 'Die Erkrankung führt zu einer erheblichen und dauerhaften Teilhabeeinschränkung; eine belastbare Erwerbstätigkeit ist faktisch kaum möglich (z. B. Tätigkeiten nur kurzzeitig, wiederkehrende Leistungseinbrüche nach geringer Belastung, verlässliche Tagesstruktur nicht stabil aufrechterhaltbar).',
  '50': 'Ich habe auch in Ruhe relevante Symptome; selbst leichte Tätigkeiten sind nur für kurze Zeit mit zwingenden Ruhepausen möglich (z. B. kurze Schreibtischtätigkeit oder einfache Haushaltsaufgabe, danach ausgeprägte Erschöpfung, kognitive Einbrüche und Rückzug für den restlichen Tag).',
  '40': 'Mein Aktivitätsniveau ist stark reduziert; bereits geringe Belastungen führen zu schwerer Erschöpfung und massiver Einschränkung der Teilhabe (z. B. nur wenige Stunden sehr leichte Tätigkeiten, keine verlässliche Terminwahrnehmung, wiederholte Verschlechterungen trotz Schonung).',
  '30': 'Ich bin weitgehend hausgebunden und in zentralen Lebensbereichen massiv eingeschränkt; selbst niedrige Belastungen verschlechtern den Zustand deutlich und anhaltend (z. B. außerhäusige Termine nur ausnahmsweise, danach mehrtägige Erholungsphasen, Kommunikation und Konzentration nur kurz möglich).',
  '20': 'Ich bin nahezu vollständig von gesellschaftlicher Teilhabe ausgeschlossen; das Verlassen des Hauses ist fast nie möglich, große Tagesanteile sind bettlägerig (z. B. Konzentration oft nur kurzzeitig, Basisaktivitäten wie Körperpflege oder Nahrungsaufnahme nur mit Unterstützung, ausgeprägte Reizempfindlichkeit).',
  '10': 'Es besteht ein hochgradig schwerer Verlauf mit überwiegender Bettlägerigkeit; ich kann das Haus nicht verlassen und bin in nahezu allen Alltagsaktivitäten auf Hilfe angewiesen (z. B. Körperpflege, Nahrungszubereitung, Organisation von Terminen und Kommunikation nur mit Unterstützung).',
  '0': 'Es liegt ein Extremverlauf mit dauerhafter Bettlägerigkeit vor; eigenständige Aktivitäten und soziale Teilhabe sind faktisch aufgehoben (z. B. selbst einfachste Pflegemaßnahmen nicht mehr selbstständig möglich, durchgehend Hilfe bei Versorgung und Kommunikation erforderlich).',
};

const ALLOWED_MERKZEICHEN = new Set(['G', 'aG', 'H', 'B']);
const ALLOWED_MERKZEICHEN_COMBINATIONS = new Set([
  'G',
  'aG',
  'G|H',
  'G|B',
  'G|H|B',
  'aG|B',
  'aG|H',
  'aG|H|B',
]);
const MERKZEICHEN_ORDER = ['G', 'aG', 'H', 'B'] as const;

const parseMerkzeichen = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [...new Set(value)]
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => ALLOWED_MERKZEICHEN.has(entry))
    .sort(
      (left, right) =>
        MERKZEICHEN_ORDER.indexOf(left as (typeof MERKZEICHEN_ORDER)[number]) -
        MERKZEICHEN_ORDER.indexOf(right as (typeof MERKZEICHEN_ORDER)[number]),
    );

  return ALLOWED_MERKZEICHEN_COMBINATIONS.has(normalized.join('|'))
    ? normalized
    : [];
};

const getDrugKey = (value: unknown): DrugKey => {
  if (
    value === 'ivabradine' ||
    value === 'ivabradin' ||
    value === 'agomelatin' ||
    value === 'vortioxetine' ||
    value === 'vortioxetin'
  ) {
    if (value === 'ivabradin') {
      return 'ivabradine';
    }
    if (value === 'vortioxetin') {
      return 'vortioxetine';
    }
    return value;
  }
  return 'other';
};

const resolvePreviewMedicationFacts = (
  request: Record<string, unknown>,
  drugKey: DrugKey,
): PreviewMedicationFacts => {
  const profile = resolveMedicationProfile(drugKey);
  const localeFacts = profile?.autoFacts?.de;

  if (profile && !profile.isOther && localeFacts) {
    return {
      displayName: profile.displayNameDe,
      diagnosisMain: localeFacts.diagnosisMain,
      targetSymptoms: localeFacts.targetSymptoms,
      doseAndDuration: localeFacts.doseAndDuration,
      monitoringAndStop: localeFacts.monitoringAndStop,
      expertSourceText: localeFacts.expertSourceText,
    };
  }

  const otherDrugName = getText(request.otherDrugName);
  const otherIndication = getText(request.otherIndication);
  const otherTreatmentGoal = getText(request.otherTreatmentGoal);
  const otherDose = getText(request.otherDose);
  const otherDuration = getText(request.otherDuration);
  const otherMonitoring = getText(request.otherMonitoring);

  return {
    displayName: otherDrugName || DRUGS[drugKey].displayName,
    diagnosisMain: otherIndication || '[bitte Indikation ergänzen]',
    targetSymptoms: otherTreatmentGoal || '[bitte Behandlungsziel ergänzen]',
    doseAndDuration:
      combineDoseAndDuration(otherDose, otherDuration) ||
      '[bitte Dosierung/Dauer ergänzen]',
    monitoringAndStop:
      otherMonitoring || '[bitte Monitoring/Abbruchkriterien ergänzen]',
    expertSourceText: '[bitte medikamentenspezifische Quelle ergänzen]',
  };
};

const buildSeverityLines = (severity: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const bellScore = getText(severity.bellScore);
  if (bellScore) {
    const assessment = BELL_SCORE_ASSESSMENTS[bellScore];
    lines.push(
      assessment
        ? `Mein Bell-Score liegt bei ${bellScore}. ${assessment}`
        : `Mein Bell-Score liegt bei ${bellScore}.`,
    );
  }
  const gdb = getText(severity.gdb);
  if (gdb) {
    lines.push(`Ich habe einen Grad der Behinderung von ${gdb}.`);
  }
  const merkzeichen = parseMerkzeichen(severity.merkzeichen).join(', ');
  if (merkzeichen) {
    lines.push(`Zudem wurden mir die Merkzeichen ${merkzeichen} zuerkannt.`);
  }
  const pflegegrad = getText(severity.pflegegrad);
  if (pflegegrad) {
    lines.push(`Mir wurde ein Pflegegrad ${pflegegrad} zuerkannt.`);
  }
  const workStatus = getText(severity.workStatus);
  if (workStatus) {
    lines.push(
      `Ich bin in meiner Erwerbsfähigkeit eingeschränkt, aktuell ${workStatus}`,
    );
  }

  return lines;
};

const buildPart1 = (formData: FormData): OfflabelRenderedDocument => {
  const request = getRecord(formData.request);
  const severity = getRecord(formData.severity);
  const patient = getRecord(formData.patient);
  const drugKey = getDrugKey(request.drug);
  const drug = DRUGS[drugKey];
  const point2aNo =
    getText(request.indicationFullyMetOrDoctorConfirms) === 'no';
  const includePoint7 =
    drugKey === 'other' || getBool(request.applySection2Abs1a);
  const standardCareText = getText(request.standardOfCareTriedFreeText);
  const standardCareItems =
    drugKey === 'other' ? parseMultilineItems(standardCareText) : [];
  const facts = resolvePreviewMedicationFacts(request, drugKey);
  const patientName =
    [getText(patient.firstName), getText(patient.lastName)]
      .filter(Boolean)
      .join(' ') || '__________';
  const otherDiagnosis = getText(request.otherIndication);
  const point2Text = (() => {
    if (drugKey === 'other') {
      return otherDiagnosis
        ? `Die Diagnose ${otherDiagnosis} ist gesichert`
        : 'Die Diagnose ist gesichert';
    }
    return point2aNo
      ? 'Die Diagnose ist gesichert'
      : drug.point2DiagnosisSentence;
  })();

  const point4Text = drug.hasAnnouncedAmrlEntry
    ? 'Es gibt bisher keine Regelung für das Arzneimittel in dem beantragten Anwendungsgebiet in der AM-RL Anlage VI. Auch wenn diese in Aussicht ist, erlaubt es mein Gesundheitszustand nicht auf eine solche zu warten.'
    : 'Es gibt bisher keine Regelung für das Arzneimittel in dem beantragten Anwendungsgebiet in der AM-RL Anlage VI';

  const blocks: OfflabelRenderedDocument['blocks'] = [
    { kind: 'heading', text: 'Teil 1 – Antrag an die Krankenkasse' },
    {
      kind: 'paragraph',
      text: 'Sehr geehrte Damen und Herren,',
    },
    {
      kind: 'paragraph',
      text: `hiermit beantrage ich die Kostenübernahme für das Medikament ${facts.displayName} im Rahmen des Off-Label-Use zur Behandlung von ${facts.diagnosisMain}.`,
    },
    {
      kind: 'paragraph',
      text: 'Zur Prüfung meines Antrags habe ich die maßgeblichen Punkte nachfolgend strukturiert dargestellt:',
    },
    {
      kind: 'paragraph',
      text: `Punkt 1: Das Medikament ${facts.displayName} ist in Deutschland nicht indikationszogen zugelassen`,
    },
    {
      kind: 'paragraph',
      text: `Punkt 2: ${point2Text}`,
    },
    {
      kind: 'paragraph',
      text: 'Punkt 3: Für das Medikament ist kein (unter-)gesetzlicher Ausschluss vorhanden.',
    },
    { kind: 'paragraph', text: `Punkt 4: ${point4Text}` },
    {
      kind: 'paragraph',
      text: 'Punkt 5: Es handelt sich nicht um eine studienbedingte Medikation, ich benötige das Medikament dringend zur Behandlung meiner Erkrankung.',
    },
    {
      kind: 'paragraph',
      text: 'Punkt 6: Es handelt sich um eine lebensbedrohliche und die Lebensqualität auf Dauer nachhaltig beeinträchtigende Erkrankung. (Datenerhebung Lebensqualität DG ME Studie Hvidberg et al). Meine Erkrankung hebt sich durch ihre Schwere vom Durchschnitt der Erkrankungen deutlich ab.',
    },
    { kind: 'list', items: buildSeverityLines(severity) },
    {
      kind: 'paragraph',
      text: 'Die Schwere meiner Erkrankung erfüllt insofern die Definition des §33 AM-RL und der Urteile des BSG.',
    },
  ];

  if (includePoint7) {
    blocks.push({ kind: 'paragraph', text: `Punkt 7: ${POINT_7_NOTSTAND}` });
  }

  blocks.push({ kind: 'paragraph', text: `Punkt 8: ${POINT_8_STANDARD}` });
  if (standardCareItems.length > 0) {
    blocks.push(
      {
        kind: 'paragraph',
        text: 'Zusätzlich wurden folgende Therapieversuche unternommen:',
      },
      { kind: 'list', items: standardCareItems },
    );
  }

  if (drugKey === 'other') {
    blocks.push(
      {
        kind: 'paragraph',
        text: 'Punkt 9: Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild sowie eine positive Risko-Nutzen-Bewertung (siehe Arztbefund).',
      },
      {
        kind: 'paragraph',
        text: `Geplant ist eine Behandlung wie folgt: Indikation: ${facts.diagnosisMain}. Behandlungsziel: ${facts.targetSymptoms}. Dosierung/Dauer: ${facts.doseAndDuration}. Überwachung/Abbruch: ${facts.monitoringAndStop}.`,
      },
    );
  } else {
    const point10Sources = [POINT_10_MD_SOURCE, facts.expertSourceText];
    const point10BaseText = `Punkt 10: Es gibt Erkenntnisse, die einer zulassungsreifen Datenlage entsprechen, die eine zuverlässige und wissenschaftlich überprüfbare Aussage zulassen. Hierzu verweise ich auf: ${point10Sources.join(' ')} Übertragbarkeit auf den Einzelfall (Gleiche Erkrankung/Gleiche Anwendung). Geplant ist eine Behandlung wie folgt: Indikation: ${facts.diagnosisMain}. Behandlungsziel: ${facts.targetSymptoms}. Dosierung/Dauer: ${facts.doseAndDuration}. Überwachung/Abbruch: ${facts.monitoringAndStop}.`;
    blocks.push({
      kind: 'paragraph',
      text: point2aNo
        ? `${point10BaseText} ${POINT_10_NO_2A}`
        : point10BaseText,
    });
  }

  blocks.push(
    {
      kind: 'paragraph',
      text: 'Ich bitte um eine zeitnahe schriftliche Entscheidung. Für Rückfragen stehe ich gerne zur Verfügung.',
    },
    {
      kind: 'paragraph',
      text: 'Mit freundlichen Grüßen',
    },
    {
      kind: 'paragraph',
      text: patientName,
    },
  );

  return { id: 'part1', title: 'Part 1', blocks };
};

const buildPart2 = (formData: FormData): OfflabelRenderedDocument => {
  const doctor = getRecord(formData.doctor);
  const request = getRecord(formData.request);
  const drugKey = getDrugKey(request.drug);
  const facts = resolvePreviewMedicationFacts(request, drugKey);
  const drug = facts.displayName;
  const addressLines = joinLines([
    getText(doctor.name),
    getText(doctor.practice),
    getText(doctor.streetAndNumber),
    joinLines([getText(doctor.postalCode), getText(doctor.city)]),
  ]);

  return {
    id: 'part2',
    title: 'Part 2',
    blocks: [
      { kind: 'heading', text: 'Teil 2 – Schreiben an die behandelnde Praxis' },
      {
        kind: 'paragraph',
        text: `Adressat:\n${addressLines || '________________'}`,
      },
      {
        kind: 'paragraph',
        text: `ich bereite einen Antrag auf Kostenübernahme (Teil 1) bei meiner Krankenkasse für eine Off-Label-Verordnung von ${drug} wegen meiner ME/CFS vor. Ich bitte Sie um Ihre Unterstützung in Form einer kurzen ärztlichen Stellungnahme/Befundzusammenfassung (Indikation, medizinische Notwendigkeit, Schweregrad, Behandlungsziel, bisherige Maßnahmen, erwarteter Nutzen, Monitoring, Abbruch bei fehlendem Nutzen oder relevanten Nebenwirkungen) sowie die Begleitung bei der Behandlung. Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen.`,
      },
      {
        kind: 'paragraph',
        text: 'Zu Ihrer Absicherung unterschreibe ich zudem nach ausführlicher Beratung folgenden Haftungsausschluss:',
      },
      {
        kind: 'paragraph',
        text: `Ich erkläre hiermit, dass ich ausführlich über die Risiken und möglichen Nebenwirkungen der Behandlung mit einem nicht für meine Indikation zugelassenen Medikament ${drug} („Off-Label-Use“) informiert wurde und ausreichend Gelegenheit hatte Fragen zu stellen. Ich fühle mich ausreichend aufgeklärt und stimme einer Behandlung zu. Außerdem verzichte ich aufgrund der Behandlung mit dem Medikament entstehenden Haftungsansprüche gegenüber meiner Ärztin/meinem Arzt.`,
      },
      { kind: 'pageBreak' },
    ],
  };
};

const buildPart3 = (formData: FormData): OfflabelRenderedDocument => {
  const request = getRecord(formData.request);
  const patient = getRecord(formData.patient);
  const point2aNo =
    getText(request.indicationFullyMetOrDoctorConfirms) === 'no';
  const drugKey = getDrugKey(request.drug);
  const facts = resolvePreviewMedicationFacts(request, drugKey);
  const standardCareItems =
    drugKey === 'other'
      ? parseMultilineItems(getText(request.standardOfCareTriedFreeText))
      : [];
  const patientName =
    [getText(patient.firstName), getText(patient.lastName)]
      .filter(Boolean)
      .join(' ') || '__________';
  const patientBirthDate = formatBirthDate(getText(patient.birthDate));
  const insuranceNumber = getText(patient.insuranceNumber);
  const resolvedBirthDate = patientBirthDate || '__________';
  const resolvedInsuranceNumber = insuranceNumber || '__________';

  return {
    id: 'part3',
    title: 'Part 3',
    blocks: [
      {
        kind: 'heading',
        text: 'Teil 3 – Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)',
      },
      {
        kind: 'paragraph',
        text: `Patient: ${patientName}, geb. ${resolvedBirthDate}; Versichertennr.: ${resolvedInsuranceNumber}`,
      },
      {
        kind: 'paragraph',
        text: `Diagnose: ${facts.diagnosisMain}`,
      },
      {
        kind: 'paragraph',
        text: 'Der Patient leidet an ME/CFS, einer lebensbedrohlichen und die Lebensqualität auf Dauer nachhaltig beeinträchtigenden Erkrankung. Die Diagnose ist gesichert.',
      },
      {
        kind: 'paragraph',
        text: `Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von ${facts.displayName} zur Behandlung von ${facts.diagnosisMain} sinnvoll, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.`,
      },
      ...(standardCareItems.length > 0
        ? ([
            {
              kind: 'paragraph' as const,
              text: 'Zusätzlich wurden folgende Therapieversuche unternommen:',
            },
            { kind: 'list' as const, items: standardCareItems },
          ] satisfies OfflabelRenderedDocument['blocks'])
        : []),
      {
        kind: 'paragraph',
        text: point2aNo
          ? `Der Patient leidet an den typischen Symptomen der Indikation ${facts.diagnosisMain}.`
          : `Auch die Indikation ${facts.diagnosisMain} liegt vor.`,
      },
      {
        kind: 'paragraph',
        text: 'Bisherige Behandlung/Versorgung: Es besteht keine kausale Standardtherapie; die Behandlung erfolgt symptomorientiert. Daher ist auch keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.',
      },
      {
        kind: 'list',
        items: [
          `Behandlungsziel: ${facts.targetSymptoms}`,
          `Indikation: ${facts.diagnosisMain}`,
          `Dosierung/Dauer: ${facts.doseAndDuration}`,
          `Monitoring/Abbruchkriterien: ${facts.monitoringAndStop}`,
          `Erwarteter Nutzen / Therapieziel im Einzelfall: ${facts.targetSymptoms}`,
          'Insgesamt ist von einem positiven Risiko-Nutzen Verhältnis auszugehen.',
          'BSNR: __________',
          'LANR: __________',
        ],
      },
    ],
  };
};

const buildFromExportModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
): OfflabelRenderedDocument[] => {
  const model = buildOffLabelAntragDocumentModel(formData, locale);

  return [
    {
      id: 'part1',
      title: 'Part 1',
      blocks: [
        {
          kind: 'heading',
          text:
            locale === 'en'
              ? 'Part 1 – Application to the insurer'
              : 'Teil 1 – Antrag an die Krankenkasse',
        },
        ...model.kk.paragraphs.map((text) => ({
          kind: 'paragraph' as const,
          text,
        })),
      ],
    },
    {
      id: 'part2',
      title: 'Part 2',
      blocks: [
        {
          kind: 'heading',
          text:
            locale === 'en'
              ? 'Part 2 – Cover letter to the treating practice'
              : 'Teil 2 – Schreiben an die behandelnde Praxis',
        },
        ...model.arzt.paragraphs.map((text) => ({
          kind: 'paragraph' as const,
          text,
        })),
      ],
    },
    {
      id: 'part3',
      title: 'Part 3',
      blocks: [
        { kind: 'heading', text: model.part3.title },
        ...model.part3.paragraphs.map((text) => ({
          kind: 'paragraph' as const,
          text,
        })),
      ],
    },
  ];
};

export function buildOfflabelDocuments(
  formData: Record<string, unknown>,
  locale: SupportedLocale = 'de',
): OfflabelRenderedDocument[] {
  if (locale === 'en') {
    return buildFromExportModel(formData, locale);
  }
  return [buildPart1(formData), buildPart2(formData), buildPart3(formData)];
}
