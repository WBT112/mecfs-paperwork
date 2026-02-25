import {
  resolveMedicationIndication,
  normalizeMedicationKey,
  resolveMedicationProfile,
  type MedicationKey,
  type MedicationProfile,
} from '../medications';
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
  diagnosisNominative: string;
  diagnosisDative: string;
  point2ConfirmationSentence: string;
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

const joinGermanWithUnd = (values: string[]): string => {
  if (values.length === 0) {
    return '';
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} und ${values[1]}`;
  }
  const lastValue = values.at(-1);
  if (lastValue === undefined) {
    return '';
  }
  return `${values.slice(0, -1).join(', ')} und ${lastValue}`;
};

const resolveDoctorSalutation = (doctor: Record<string, unknown>): string => {
  const gender = getText(doctor.gender).toLowerCase();
  const rawTitle = getText(doctor.title);
  const title = rawTitle && rawTitle.toLowerCase() !== 'kein' ? rawTitle : '';
  const name = getText(doctor.name);
  const fullName = [title, name].filter(Boolean).join(' ').trim();

  if (gender === 'frau') {
    return fullName
      ? `Sehr geehrte Frau ${fullName},`
      : 'Sehr geehrte Frau Doktor,';
  }
  if (gender === 'herr') {
    return fullName
      ? `Sehr geehrter Herr ${fullName},`
      : 'Sehr geehrter Herr Doktor,';
  }

  return fullName ? `Guten Tag ${fullName},` : 'Sehr geehrte Damen und Herren,';
};

const LSG_REFERENCE_TEXT =
  'Beschluss des LSG Niedersachsen-Bremen vom 14.10.2022 (L 4 KR 373/22 B ER)';

const POINT_HILFSANTRAG_INTRO = `Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V. Dies gilt insbesondere für den Fall, dass eine zulassungsreife Datenlage im engeren Sinne verneint wird.`;

const POINT_7_NOTSTAND = `Hilfsweise beantrage ich Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.

§ 2 Abs. 1a SGB V erfasst neben lebensbedrohlichen oder regelmäßig tödlichen Erkrankungen auch Erkrankungen, die wertungsmäßig eine vergleichbare Schwere erreichen. Bei Myalgischer Enzephalomyelitis/Chronischem Fatigue-Syndrom (ME/CFS) handelt es sich um eine schwerwiegende, systemische Erkrankung. In schweren und sehr schweren Verläufen kann es zu gravierenden und anhaltenden Einschränkungen zentraler Lebensbereiche, insbesondere Mobilität, Selbstversorgung und Teilhabe, kommen.

Für die Anwendung des § 2 Abs. 1a SGB V ist nach der höchstrichterlichen Rechtsprechung zudem eine notstandsähnliche Extremsituation kennzeichnend, d. h. eine individuelle Notstandslage mit gegenwärtiger Gefahr für ein individuelles Rechtsgut und ein erheblicher Zeitdruck für einen bestehenden akuten Behandlungsbedarf. Bei schwerer ME/CFS ergibt sich ein solcher Zeitdruck krankheitsspezifisch aus der Belastungsintoleranz mit post-exertioneller Malaise (PEM): Bereits geringe körperliche, kognitive oder emotionale Belastungen können eine zeitverzögerte (Stunden bis Tage) und zur Auslöserbelastung unverhältnismäßige Verschlechterung auslösen. Diese Episoden können über Tage, Wochen oder länger anhalten und werden in der Versorgungspraxis als „Crash/Schub“ beschrieben.

Der zeitkritische Charakter folgt daraus, dass PEM-Episoden kurzfristig einen erheblichen Funktionsabfall bewirken können und zugleich das Risiko einer Folgekaskade erhöhen: Verlängerte Erholungsphasen reduzieren die Möglichkeiten zur Mobilität, Selbstversorgung und Teilhabe; gleichzeitig steigt bei fehlender zeitnaher Stabilisierung das Risiko weiterer Belastungsüberschreitungen und erneuter PEM-Episoden. Medizinisch vorrangig ist daher die Vermeidung weiterer PEM-Episoden sowie eine frühzeitige Stabilisierung, um zusätzlichen Funktionsverlust abzuwenden.

Eine allgemein anerkannte, kausale Standardtherapie steht für ME/CFS derzeit nicht zur Verfügung; die Behandlung erfolgt symptomorientiert. Vor diesem Hintergrund wird die beantragte Behandlung als zeitlich befristeter, ärztlich überwachter Therapieversuch mit klar definiertem Monitoring und Abbruchkriterien durchgeführt.

Ergänzend verweise ich auf den ${LSG_REFERENCE_TEXT}, der § 2 Abs. 1a SGB V im Kontext CFS/ME im Eilverfahren heranzieht.

Damit sind die Voraussetzungen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung sowie einer notstandsähnlichen Extremsituation mit Zeitdruck im Sinne von § 2 Abs. 1a SGB V dargelegt.`;
const POINT_7_NOTSTAND_DIRECT = `Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.

§ 2 Abs. 1a SGB V erfasst neben lebensbedrohlichen oder regelmäßig tödlichen Erkrankungen auch Erkrankungen, die wertungsmäßig eine vergleichbare Schwere erreichen. Bei Myalgischer Enzephalomyelitis/Chronischem Fatigue-Syndrom (ME/CFS) handelt es sich um eine schwerwiegende, systemische Erkrankung. In schweren und sehr schweren Verläufen kann es zu gravierenden und anhaltenden Einschränkungen zentraler Lebensbereiche, insbesondere Mobilität, Selbstversorgung und Teilhabe, kommen.

Für die Anwendung des § 2 Abs. 1a SGB V ist nach der höchstrichterlichen Rechtsprechung zudem eine notstandsähnliche Extremsituation kennzeichnend, d. h. eine individuelle Notstandslage mit gegenwärtiger Gefahr für ein individuelles Rechtsgut und ein erheblicher Zeitdruck für einen bestehenden akuten Behandlungsbedarf. Bei schwerer ME/CFS ergibt sich ein solcher Zeitdruck krankheitsspezifisch aus der Belastungsintoleranz mit post-exertioneller Malaise (PEM): Bereits geringe körperliche, kognitive oder emotionale Belastungen können eine zeitverzögerte (Stunden bis Tage) und zur Auslöserbelastung unverhältnismäßige Verschlechterung auslösen. Diese Episoden können über Tage, Wochen oder länger anhalten und werden in der Versorgungspraxis als „Crash/Schub“ beschrieben.

Der zeitkritische Charakter folgt daraus, dass PEM-Episoden kurzfristig einen erheblichen Funktionsabfall bewirken können und zugleich das Risiko einer Folgekaskade erhöhen: Verlängerte Erholungsphasen reduzieren die Möglichkeiten zur Mobilität, Selbstversorgung und Teilhabe; gleichzeitig steigt bei fehlender zeitnaher Stabilisierung das Risiko weiterer Belastungsüberschreitungen und erneuter PEM-Episoden. Medizinisch vorrangig ist daher die Vermeidung weiterer PEM-Episoden sowie eine frühzeitige Stabilisierung, um zusätzlichen Funktionsverlust abzuwenden.

Ergänzend verweise ich auf den ${LSG_REFERENCE_TEXT}, der § 2 Abs. 1a SGB V im Kontext CFS/ME im Eilverfahren heranzieht.

Damit sind die Voraussetzungen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung sowie einer notstandsähnlichen Extremsituation mit Zeitdruck im Sinne von § 2 Abs. 1a SGB V dargelegt.`;

const THERAPY_SAFETY_STATEMENT =
  'Nach ärztlicher Einschätzung ist im Rahmen eines befristeten Therapieversuchs ein vertretbares Nutzen-Risiko-Verhältnis anzunehmen; bei fehlender Wirksamkeit oder Nebenwirkungen erfolgt Abbruch.';

const PART2_TITLE = 'Teil 2 – Schreiben an die behandelnde Praxis';
const PART2_LIABILITY_HEADING =
  'Haftungsausschluss (vom Patienten zu unterzeichnen)';

const POINT_8_STANDARD =
  'Für die Versorgung meiner Erkrankung stehen keine Standardtherapien des GKV-Leistungskatalogs zur Verfügung. In der wissenschaftlichen Literatur werden derzeit vor allem symptombezogene Behandlungsansätze diskutiert. Die einschlägige AWMF-Leitlinie „Müdigkeit“ stellt ausdrücklich fest, dass für die kausale Behandlung von ME/CFS bislang keine Medikamente zugelassen sind, und verweist auf die britische NICE-Leitlinie. Diese fokussiert neben Energiemanagement insbesondere die Linderung von Symptomen, um den Krankheitsverlauf möglichst günstig zu beeinflussen und eine Verschlechterung zu vermeiden. Eine positive Empfehlung für eine medikamentöse Standardtherapie enthält die Leitlinie nicht. Vor diesem Hintergrund ist der beantragte Off-Label-Einsatz als medizinisch nachvollziehbarer und geeigneter Behandlungsversuch anzusehen. Eine der medizinischen Standardtherapie entsprechende Alternative ist nicht verfügbar.';

const POINT_10_EVIDENCE_NOTE =
  'Die beigefügten Quellen sind eine Auswahl und erheben keinen Anspruch auf Vollständigkeit; ich bitte um eine vollständige sozialmedizinische Würdigung einschließlich ggf. ergänzender Literaturrecherche im Einzelfall.';
const POINT_10_STANDARD_EVIDENCE_INTRO =
  'Es gibt Erkenntnisse, die einer zulassungsreifen Datenlage entsprechen, die eine zuverlässige und wissenschaftlich überprüfbare Aussage zulassen.';
const POINT_10_SECTION_2A_EVIDENCE_INTRO =
  'Es liegen Erkenntnisse vor, die – je nach sozialmedizinischer Einordnung – eine zulassungsreife Datenlage begründen können oder jedenfalls eine zuverlässige, wissenschaftlich nachvollziehbare Nutzen-Risiko-Abwägung für einen befristeten, ärztlich überwachten Therapieversuch zulassen.';
const POINT_2_NO_DIAGNOSIS_CORE =
  'Die zugrunde liegende Erkrankung ist diagnostisch gesichert und ärztlich dokumentiert.';
const POINT_2_NO_EVIDENCE_BRIDGE =
  'Die in der Literatur/Studien verwendete Indikationsbezeichnung ist mit der gesicherten Diagnose nicht vollständig deckungsgleich. Dies betrifft ausschließlich die Übertragbarkeit der Evidenz und deren Würdigung im Rahmen der Nutzen-Risiko-Abwägung, nicht die diagnostische Absicherung im Einzelfall. Die behandlungsrelevante Symptomatik (z. B. Fatigue/Belastungsintoleranz/PEM) ist in den herangezogenen Studienpopulationen in wesentlichen Merkmalen vergleichbar.';

const POINT_10_NO_2A = `Auf dieser Grundlage sind die herangezogenen Erkenntnisse für meinen Einzelfall im Rahmen einer wissenschaftlich nachvollziehbaren Nutzen-Risiko-Abwägung übertragbar. ${POINT_10_EVIDENCE_NOTE}`;
const POINT_10_YES_2A = `Diese Erkenntnisse sind auf meinen Einzelfall übertragbar. ${POINT_10_EVIDENCE_NOTE}`;
const POINT_10_SECTION_2A_BRIDGE = `Selbst wenn eine formelle Zulassungsreife im engeren Sinne verneint würde, bestehen jedenfalls veröffentlichte Erkenntnisse, die eine zuverlässige Nutzen-Risiko-Abwägung ermöglichen; hilfsweise wird daher die Leistung nach § 2 Abs. 1a SGB V begehrt.`;
const BELL_SCORE_ACTIVITY_EXAMPLES: Record<string, string> = {
  '100':
    'ich feste Belastungsobergrenzen einhalte, nach Terminen konsequente Ruhefenster plane und Belastungsspitzen vermeide, um Rückfälle zu verhindern.',
  '90': 'ich Termine nur mit anschließender Erholungszeit plane, Reizüberflutung vermeide und spontane Aktivitäten deutlich reduziere.',
  '80': 'ich Haushaltsaufgaben nur abschnittsweise erledigen kann, soziale Kontakte nur kurz und selten möglich sind und Wege außer Haus anschließende Erholung erfordern.',
  '70': 'Einkäufe nur begleitet oder stark verkürzt möglich sind, administrative Aufgaben nur in kurzen Intervallen gelingen und tagsüber häufige Liegephasen erforderlich sind.',
  '60': 'Tätigkeiten nur kurzzeitig möglich sind, nach geringer Belastung wiederkehrende Leistungseinbrüche auftreten und eine verlässliche Tagesstruktur nicht stabil aufrechterhaltbar ist.',
  '50': 'schon kurze Schreibtischtätigkeit oder einfache Haushaltsaufgaben zu ausgeprägter Erschöpfung, kognitiven Einbrüchen und Rückzug für den restlichen Tag führen.',
  '40': 'nur wenige Stunden sehr leichter Tätigkeit möglich sind, Termine nicht verlässlich wahrgenommen werden können und trotz Schonung wiederholte Verschlechterungen auftreten.',
  '30': 'ich weitgehend hausgebunden bin, außerhäusige Termine nur ausnahmsweise möglich sind, anschließend mehrtägige Erholungsphasen folgen und Kommunikation sowie Konzentration nur kurz möglich sind.',
  '20': 'das Haus fast nie verlassen werden kann, große Tagesanteile bettlägerig verbracht werden, Konzentration oft nur kurzzeitig möglich ist und Basisaktivitäten wie Körperpflege oder Nahrungsaufnahme nur mit Unterstützung gelingen.',
  '10': 'das Haus nicht verlassen werden kann und bei Körperpflege, Nahrungszubereitung, Terminorganisation und Kommunikation regelmäßig Hilfe erforderlich ist.',
  '0': 'selbst einfachste Pflegemaßnahmen nicht mehr selbstständig möglich sind und bei Versorgung sowie Kommunikation durchgehend Unterstützung erforderlich ist.',
};

const WORK_STATUS_SEVERITY_LINES: Record<string, string> = {
  Arbeitsunfähig:
    'Ich bin derzeit arbeitsunfähig; schon geringe körperliche oder kognitive Anforderungen führen zu einer relevanten Verschlechterung, sodass eine regelmäßige Erwerbstätigkeit nicht tragfähig möglich ist.',
  AU: 'Ich bin derzeit arbeitsunfähig; schon geringe körperliche oder kognitive Anforderungen führen zu einer relevanten Verschlechterung, sodass eine regelmäßige Erwerbstätigkeit nicht tragfähig möglich ist.',
  Erwerbsminderungsrente:
    'Ich beziehe eine Erwerbsminderungsrente, weil meine krankheitsbedingte Leistungsminderung so ausgeprägt ist, dass die Anforderungen des allgemeinen Arbeitsmarktes nicht mehr erfüllbar sind.',
  'EM-Rente':
    'Ich beziehe eine Erwerbsminderungsrente, weil meine krankheitsbedingte Leistungsminderung so ausgeprägt ist, dass die Anforderungen des allgemeinen Arbeitsmarktes nicht mehr erfüllbar sind.',
  'Teilzeit arbeitsfähig':
    'Ich bin nur eingeschränkt teilzeit arbeitsfähig; selbst in reduziertem Umfang sind engmaschige Pausen, flexible Belastungssteuerung und krankheitsbedingte Ausfallzeiten erforderlich.',
};

const ALLOWED_MERKZEICHEN = new Set(['G', 'aG', 'H', 'B']);
const MERKZEICHEN_ORDER = ['G', 'aG', 'H', 'B'] as const;

const parseMerkzeichen = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value)]
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => ALLOWED_MERKZEICHEN.has(entry))
    .sort(
      (left, right) =>
        MERKZEICHEN_ORDER.indexOf(left as (typeof MERKZEICHEN_ORDER)[number]) -
        MERKZEICHEN_ORDER.indexOf(right as (typeof MERKZEICHEN_ORDER)[number]),
    );
};

const resolveMedicationProfileOrThrow = (
  value: unknown,
): { key: MedicationKey; profile: MedicationProfile } => {
  const key = normalizeMedicationKey(value);
  const profile = resolveMedicationProfile(key);
  return { key, profile };
};

const resolvePreviewMedicationFacts = (
  request: Record<string, unknown>,
  drugProfile: MedicationProfile,
): PreviewMedicationFacts => {
  const localeFacts = drugProfile.autoFacts?.de;
  const selectedIndication = resolveMedicationIndication(
    drugProfile,
    request.selectedIndicationKey,
    'de',
  );
  if (!drugProfile.isOther && localeFacts && selectedIndication) {
    return {
      displayName: drugProfile.displayNameDe,
      diagnosisNominative: selectedIndication.diagnosisNominative,
      diagnosisDative: selectedIndication.diagnosisDative,
      point2ConfirmationSentence: selectedIndication.point2ConfirmationSentence,
      targetSymptoms: selectedIndication.targetSymptoms,
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
    displayName: otherDrugName || drugProfile.displayNameDe,
    diagnosisNominative: otherIndication || '[bitte Indikation ergänzen]',
    diagnosisDative: otherIndication || '[bitte Indikation ergänzen]',
    point2ConfirmationSentence: otherIndication
      ? `Die Diagnose ${otherIndication} ist gesichert.`
      : 'Die Diagnose ist gesichert.',
    targetSymptoms: otherTreatmentGoal || '[bitte Behandlungsziel ergänzen]',
    doseAndDuration:
      combineDoseAndDuration(otherDose, otherDuration) ||
      '[bitte Dosierung/Dauer ergänzen]',
    monitoringAndStop:
      otherMonitoring || '[bitte Monitoring/Abbruchkriterien ergänzen]',
    expertSourceText: '[bitte medikamentenspezifische Quelle ergänzen]',
  };
};

const buildTreatmentPlanItems = (
  facts: PreviewMedicationFacts,
  opts: {
    diagnosisMode?: 'indication' | 'comparableSymptoms';
    includeDiagnosisItem?: boolean;
  } = {},
): string[] => {
  const diagnosisMode = opts.diagnosisMode ?? 'indication';
  const includeDiagnosisItem = opts.includeDiagnosisItem ?? true;

  const diagnosisItem =
    diagnosisMode === 'comparableSymptoms'
      ? `Klinische Symptomatik (vergleichbar mit ${facts.diagnosisDative})`
      : `Indikation: ${facts.diagnosisNominative}`;
  const items = [
    `Behandlungsziel: ${facts.targetSymptoms}`,
    `Dosierung/Dauer: ${facts.doseAndDuration}`,
    `Überwachung/Abbruch: ${facts.monitoringAndStop}`,
  ];
  if (includeDiagnosisItem) {
    items.unshift(diagnosisItem);
  }

  return items;
};

const buildSeverityLines = (severity: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const bellScore = getText(severity.bellScore);
  if (bellScore) {
    const activityExamples = BELL_SCORE_ACTIVITY_EXAMPLES[bellScore];
    lines.push(
      `Der Bell-Score ist eine zentrale Kennzahl für den funktionellen Schweregrad der Erkrankung ME/CFS. Mein aktueller Bell-Score beträgt ${bellScore} und dokumentiert mein aktuelles Funktionsniveau.`,
      activityExamples
        ? `Meine soziale, gesellschaftliche und berufliche Teilhabe ist krankheitsbedingt grundsätzlich und dauerhaft eingeschränkt. Im Alltag zeigt sich dies unter anderem daran, dass ${activityExamples}`
        : 'Meine soziale, gesellschaftliche und berufliche Teilhabe ist krankheitsbedingt grundsätzlich und dauerhaft eingeschränkt.',
    );
  }

  const gdb = getText(severity.gdb);
  const merkzeichen = parseMerkzeichen(severity.merkzeichen).join(', ');
  const pflegegrad = getText(severity.pflegegrad);
  const objectiveIndicators: Array<{ text: string; isPlural: boolean }> = [];
  if (gdb) {
    objectiveIndicators.push({
      text: `ein Grad der Behinderung von ${gdb}`,
      isPlural: false,
    });
  }
  if (merkzeichen) {
    objectiveIndicators.push({
      text: `die Merkzeichen ${merkzeichen}`,
      isPlural: true,
    });
  }
  if (pflegegrad) {
    objectiveIndicators.push({
      text: `Pflegegrad ${pflegegrad}`,
      isPlural: false,
    });
  }

  if (objectiveIndicators.length === 1) {
    const [singleIndicator] = objectiveIndicators;
    lines.push(
      singleIndicator.isPlural
        ? `Als weiterer objektiver Schwereindikator sind bei mir ${singleIndicator.text} dokumentiert.`
        : `Als weiterer objektiver Schwereindikator liegt bei mir ${singleIndicator.text} vor.`,
    );
  } else if (objectiveIndicators.length > 1) {
    lines.push(
      `Als weitere objektive Schwereindikatoren liegen bei mir ${joinGermanWithUnd(
        objectiveIndicators.map((indicator) => indicator.text),
      )} vor.`,
    );
  } else {
    // No additional objective indicators provided.
  }

  const workStatus = getText(severity.workStatus);
  if (workStatus) {
    lines.push(
      WORK_STATUS_SEVERITY_LINES[workStatus] ??
        `Meine Erwerbsfähigkeit ist krankheitsbedingt deutlich eingeschränkt; aktuell ist mein Arbeitsstatus ${workStatus}.`,
    );
  }

  return lines;
};

const resolvePart1Point2Text = (params: {
  drugKey: MedicationKey;
  otherDiagnosis: string;
  point2aNo: boolean;
  facts: PreviewMedicationFacts;
}): string => {
  const { drugKey, otherDiagnosis, point2aNo, facts } = params;
  if (drugKey === 'other') {
    return otherDiagnosis
      ? `Die Diagnose ${otherDiagnosis} ist gesichert.`
      : 'Die Diagnose ist gesichert.';
  }
  return point2aNo
    ? POINT_2_NO_DIAGNOSIS_CORE
    : facts.point2ConfirmationSentence;
};

const resolvePart1OpeningRequestText = (params: {
  drugKey: MedicationKey;
  point2aNo: boolean;
  facts: PreviewMedicationFacts;
}): string => {
  const { drugKey, point2aNo, facts } = params;
  return drugKey !== 'other' && point2aNo
    ? `hiermit beantrage ich die Kostenübernahme für das Medikament ${facts.displayName} im Rahmen des Off-Label-Use zur symptomorientierten Behandlung bei einer klinischen Symptomatik, die mit ${facts.diagnosisDative} vergleichbar ist.`
    : `hiermit beantrage ich die Kostenübernahme für das Medikament ${facts.displayName} im Rahmen des Off-Label-Use zur Behandlung von ${facts.diagnosisDative}.`;
};

const buildPart1OptionalHilfsantragIntroBlocks = (
  applySection2Abs1a: boolean,
): OfflabelRenderedDocument['blocks'] =>
  applySection2Abs1a
    ? [{ kind: 'paragraph', text: POINT_HILFSANTRAG_INTRO }]
    : [];

const buildPart1NoDiagnosisBridgeBlocks = (
  point2aNo: boolean,
  drugKey: MedicationKey,
): OfflabelRenderedDocument['blocks'] =>
  point2aNo && drugKey !== 'other'
    ? [{ kind: 'paragraph', text: POINT_2_NO_EVIDENCE_BRIDGE }]
    : [];

const buildPart1Point7Blocks = (
  includePoint7: boolean,
  point7Text: string,
): OfflabelRenderedDocument['blocks'] =>
  includePoint7 ? [{ kind: 'paragraph', text: point7Text }] : [];

const buildPart1StandardCareBlocks = (
  standardCareItems: string[],
): OfflabelRenderedDocument['blocks'] =>
  standardCareItems.length > 0
    ? [
        {
          kind: 'paragraph',
          text: 'Zusätzlich wurden folgende Therapieversuche unternommen:',
        },
        { kind: 'list', items: standardCareItems },
      ]
    : [];

const buildPart1EvidenceAndTreatmentBlocks = (params: {
  drugKey: MedicationKey;
  facts: PreviewMedicationFacts;
  point2aNo: boolean;
  applySection2Abs1a: boolean;
  otherEvidenceReferenceText: string;
}): OfflabelRenderedDocument['blocks'] => {
  const {
    drugKey,
    facts,
    point2aNo,
    applySection2Abs1a,
    otherEvidenceReferenceText,
  } = params;
  if (drugKey === 'other') {
    return [
      {
        kind: 'paragraph',
        text: `Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild sowie eine positive Risiko-Nutzen-Bewertung (siehe Arztbefund; wissenschaftliche Erkenntnisse: ${otherEvidenceReferenceText}). ${POINT_10_EVIDENCE_NOTE}`,
      },
      {
        kind: 'paragraph',
        text: 'Geplant ist eine Behandlung wie folgt:',
      },
      { kind: 'list', items: buildTreatmentPlanItems(facts) },
      {
        kind: 'paragraph',
        text: THERAPY_SAFETY_STATEMENT,
      },
    ];
  }

  const point10Sources = [facts.expertSourceText].filter(Boolean);
  const point10CaseTransferText = point2aNo ? POINT_10_NO_2A : POINT_10_YES_2A;
  const point10BridgeText = applySection2Abs1a
    ? ` ${POINT_10_SECTION_2A_BRIDGE}`
    : '';
  const point10EvidenceIntro = applySection2Abs1a
    ? POINT_10_SECTION_2A_EVIDENCE_INTRO
    : POINT_10_STANDARD_EVIDENCE_INTRO;
  const point10BaseText = `${point10EvidenceIntro} Hierzu verweise ich auf: ${point10Sources.join(' ')} ${point10CaseTransferText}${point10BridgeText} Geplant ist eine Behandlung wie folgt:`;
  return [
    {
      kind: 'paragraph',
      text: point10BaseText,
    },
    {
      kind: 'list',
      items: buildTreatmentPlanItems(facts, {
        diagnosisMode: point2aNo ? 'comparableSymptoms' : 'indication',
        includeDiagnosisItem: !point2aNo,
      }),
    },
    {
      kind: 'paragraph',
      text: THERAPY_SAFETY_STATEMENT,
    },
  ];
};

const buildPart1 = (formData: FormData): OfflabelRenderedDocument => {
  const request = getRecord(formData.request);
  const severity = getRecord(formData.severity);
  const patient = getRecord(formData.patient);
  const { key: drugKey, profile: drug } = resolveMedicationProfileOrThrow(
    request.drug,
  );
  const point2aNo =
    getText(request.indicationFullyMetOrDoctorConfirms) === 'no';
  const applySection2Abs1a = getBool(request.applySection2Abs1a);
  const includePoint7 = drugKey === 'other' || applySection2Abs1a;
  const point7Text =
    drugKey === 'other' ? POINT_7_NOTSTAND_DIRECT : POINT_7_NOTSTAND;
  const standardCareText = getText(request.standardOfCareTriedFreeText);
  const otherEvidenceReferenceText =
    getText(request.otherEvidenceReference) ||
    '[bitte Verweis auf Studie/wissenschaftliche Erkenntnisse ergänzen]';
  const standardCareItems =
    drugKey === 'other' ? parseMultilineItems(standardCareText) : [];
  const facts = resolvePreviewMedicationFacts(request, drug);
  const patientName =
    [getText(patient.firstName), getText(patient.lastName)]
      .filter(Boolean)
      .join(' ') || '__________';
  const otherDiagnosis = getText(request.otherIndication);
  const point2Text = resolvePart1Point2Text({
    drugKey,
    otherDiagnosis,
    point2aNo,
    facts,
  });
  const openingRequestText = resolvePart1OpeningRequestText({
    drugKey,
    point2aNo,
    facts,
  });

  const point4Text =
    'Es gibt bisher keine Regelung für das Arzneimittel in dem beantragten Anwendungsgebiet in der AM-RL Anlage VI.';
  const point1To5Items = [
    `Das Medikament ${facts.displayName} ist in Deutschland nicht indikationsbezogen zugelassen.`,
    point2Text,
    'Für das Medikament ist kein (unter-)gesetzlicher Ausschluss vorhanden.',
    point4Text,
    'Es handelt sich nicht um eine studienbedingte Medikation, ich benötige das Medikament dringend zur Behandlung meiner Erkrankung.',
  ];

  const blocks: OfflabelRenderedDocument['blocks'] = [
    { kind: 'heading', text: 'Teil 1 – Antrag an die Krankenkasse' },
    {
      kind: 'paragraph',
      text: 'Sehr geehrte Damen und Herren,',
    },
    {
      kind: 'paragraph',
      text: openingRequestText,
    },
    ...buildPart1OptionalHilfsantragIntroBlocks(applySection2Abs1a),
    {
      kind: 'paragraph',
      text: 'Zur Prüfung meines Antrags habe ich die maßgeblichen Punkte nachfolgend strukturiert dargestellt:',
    },
    { kind: 'list', items: point1To5Items },
    ...buildPart1NoDiagnosisBridgeBlocks(point2aNo, drugKey),
    {
      kind: 'paragraph',
      text: 'Es handelt sich um eine lebensbedrohliche und die Lebensqualität auf Dauer nachhaltig beeinträchtigende Erkrankung. (Hvidberg MF, Brinth LS, Olesen AV, Petersen KD, Ehlers L. The Health-Related Quality of Life for Patients with Myalgic Encephalomyelitis / Chronic Fatigue Syndrome (ME/CFS). PLOS ONE. 2015;10(7):e0132421. doi:10.1371/journal.pone.0132421. PMID: 26147503; PMCID: PMC4492975). Meine Erkrankung hebt sich durch ihre Schwere vom Durchschnitt der Erkrankungen deutlich ab, was sich auch in meiner persönlichen Situation zeigt:',
    },
    { kind: 'list', items: buildSeverityLines(severity) },
    {
      kind: 'paragraph',
      text: 'Die Schwere meiner Erkrankung erfüllt insofern die Definition des §33 AM-RL und der Urteile des BSG.',
    },
  ];

  blocks.push(
    ...buildPart1Point7Blocks(includePoint7, point7Text),
    { kind: 'paragraph', text: POINT_8_STANDARD },
    ...buildPart1StandardCareBlocks(standardCareItems),
    ...buildPart1EvidenceAndTreatmentBlocks({
      drugKey,
      facts,
      point2aNo,
      applySection2Abs1a,
      otherEvidenceReferenceText,
    }),
    {
      kind: 'paragraph',
      text: 'Ich bitte um eine zeitnahe Entscheidung. Für Rückfragen stehe ich gerne zur Verfügung.',
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

  return { id: 'part1', title: 'Teil 1', blocks };
};

const buildPart2 = (formData: FormData): OfflabelRenderedDocument => {
  const doctor = getRecord(formData.doctor);
  const patient = getRecord(formData.patient);
  const request = getRecord(formData.request);
  const { profile: drugProfile } = resolveMedicationProfileOrThrow(
    request.drug,
  );
  const point2aNo =
    getText(request.indicationFullyMetOrDoctorConfirms) === 'no';
  const facts = resolvePreviewMedicationFacts(request, drugProfile);
  const drug = facts.displayName;
  const patientName =
    [getText(patient.firstName), getText(patient.lastName)]
      .filter(Boolean)
      .join(' ') || '__________';
  const patientBirthDate = formatBirthDate(getText(patient.birthDate));
  const liabilityDoctorLine = [getText(doctor.practice), getText(doctor.name)]
    .filter(Boolean)
    .join(', ');
  const salutation = resolveDoctorSalutation(doctor);
  const addressLines = joinLines([
    getText(doctor.name),
    getText(doctor.practice),
    getText(doctor.streetAndNumber),
    joinLines([getText(doctor.postalCode), getText(doctor.city)]),
  ]);

  return {
    id: 'part2',
    title: 'Teil 2',
    blocks: [
      { kind: 'heading', text: PART2_TITLE },
      {
        kind: 'paragraph',
        text: `Adressat:\n${addressLines || '________________'}`,
      },
      {
        kind: 'paragraph',
        text: salutation,
      },
      {
        kind: 'paragraph',
        text: point2aNo
          ? `Ich bereite einen Antrag auf Kostenübernahme bei meiner Krankenkasse für eine Off-Label-Verordnung von ${drug} vor. Die klinische Symptomatik ist mit ${facts.diagnosisDative} vergleichbar.`
          : `Ich bereite einen Antrag auf Kostenübernahme bei meiner Krankenkasse für eine Off-Label-Verordnung von ${drug} mit der Indikation ${facts.diagnosisNominative} vor.`,
      },
      {
        kind: 'paragraph',
        text: 'Ich bitte Sie um Unterstützung bei der medizinischen Einordnung und Begleitung des Antrags, insbesondere durch:',
      },
      {
        kind: 'list',
        items: [
          'Eine kurze ärztliche Stellungnahme/Befundzusammenfassung (Indikation, medizinische Notwendigkeit, Schweregrad, Behandlungsziel)',
          'Eine Darstellung bisheriger Maßnahmen, des erwarteten Nutzens sowie des geplanten Monitorings',
          'Die Festlegung klarer Abbruchkriterien bei fehlendem Nutzen oder relevanten Nebenwirkungen',
          'Die ärztliche Begleitung der Behandlung im Verlauf',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen. Vielen Dank für Ihre Unterstützung.',
      },
      {
        kind: 'paragraph',
        text: 'Mit freundlichen Grüßen',
      },
      {
        kind: 'paragraph',
        text: patientName,
      },
      {
        kind: 'heading',
        text: PART2_LIABILITY_HEADING,
      },
      {
        kind: 'paragraph',
        text: `Aufklärung und Einwilligung zum Off-Label-Use: ${drug}`,
      },
      {
        kind: 'paragraph',
        text: `Patient*in: ${patientName}, geb. ${patientBirthDate || '__________'}`,
      },
      {
        kind: 'paragraph',
        text: `Behandelnde Praxis/Ärzt*in: ${liabilityDoctorLine || '___________________________'}`,
      },
      {
        kind: 'paragraph',
        text: 'Datum: _______________________',
      },
      {
        kind: 'paragraph',
        text: '1. Hintergrund',
      },
      {
        kind: 'paragraph',
        text: `Mir wurde erläutert, dass ${drug} für die bei mir beabsichtigte Anwendung nicht zugelassen ist (Off-Label-Use). Der Einsatz erfolgt als individueller, zeitlich befristeter Therapieversuch.`,
      },
      {
        kind: 'paragraph',
        text: '2. Aufklärung über Nutzen, Risiken und Alternativen',
      },
      {
        kind: 'paragraph',
        text: 'Ich wurde verständlich informiert über:',
      },
      {
        kind: 'list',
        items: [
          'Ziel der Behandlung (z. B. Verbesserung von Fatigue, Belastbarkeit und Lebensqualität),',
          'den unsicheren Evidenzgrad und dass ein Behandlungserfolg nicht garantiert werden kann,',
          'mögliche Nebenwirkungen (z. B. Schlafstörungen/lebhafte Träume, Übelkeit, Kopfschmerzen, gastrointestinale Beschwerden),',
          'Kontraindikationen/Wechselwirkungen, insbesondere: keine gleichzeitige Opioid-Einnahme,',
          'geplantes Monitoring und Abbruchkriterien (z. B. nicht tolerierbare Nebenwirkungen, klinisch relevante Verschlechterung, fehlender Nutzen nach definierter Dauer),',
          'alternative Maßnahmen der symptomorientierten Behandlung und Nicht-Behandlung.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Ich hatte ausreichend Gelegenheit, Fragen zu stellen. Meine Fragen wurden beantwortet.',
      },
      {
        kind: 'paragraph',
        text: '3. Einwilligung',
      },
      {
        kind: 'paragraph',
        text: `Ich erkläre, dass ich die Aufklärung verstanden habe und in den Off-Label-Einsatz von ${drug} einwillige. Mir ist bekannt, dass ich meine Einwilligung jederzeit ohne Angabe von Gründen widerrufen kann.`,
      },
      {
        kind: 'paragraph',
        text: '4. Hinweise zur Anwendung (falls vereinbart)',
      },
      {
        kind: 'paragraph',
        text: 'Geplante Dosierung/Titration (falls relevant): ______________________________________',
      },
      {
        kind: 'paragraph',
        text: 'Geplanter Zeitraum des Therapieversuchs: ________________________________________',
      },
      {
        kind: 'paragraph',
        text: 'Geplante Kontrollen/Monitoring: ________________________________________________',
      },
      {
        kind: 'paragraph',
        text: 'Ort/Datum: _______________________',
      },
      {
        kind: 'paragraph',
        text: 'Unterschrift Patient*in: _______________________________',
      },
      {
        kind: 'paragraph',
        text: 'Unterschrift Ärzt*in (Bestätigung der Aufklärung): _______________________________',
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
  const { key: drugKey, profile: drugProfile } =
    resolveMedicationProfileOrThrow(request.drug);
  const facts = resolvePreviewMedicationFacts(request, drugProfile);
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
    title: 'Teil 3',
    blocks: [
      {
        kind: 'heading',
        text: 'Teil 3 – Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)',
      },
      {
        kind: 'paragraph',
        text: `Patient: ${patientName}, geb. ${resolvedBirthDate}; Versichertennr.: ${resolvedInsuranceNumber}`,
      },
      ...(point2aNo
        ? []
        : ([
            {
              kind: 'paragraph' as const,
              text: `Diagnose: ${facts.diagnosisNominative}`,
            },
          ] satisfies OfflabelRenderedDocument['blocks'])),
      {
        kind: 'paragraph',
        text: 'Die versicherte Person leidet an einer schwerwiegenden, die Lebensqualität auf Dauer nachhaltig beeinträchtigenden Erkrankung.',
      },
      {
        kind: 'paragraph',
        text: point2aNo
          ? `Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von ${facts.displayName} zur symptomorientierten Behandlung der vorliegenden klinischen Symptomatik medizinisch nachvollziehbar, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.`
          : `Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von ${facts.displayName} zur Behandlung der Indikation ${facts.diagnosisNominative} sinnvoll, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.`,
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
      ...(point2aNo
        ? ([
            {
              kind: 'paragraph' as const,
              text: `Die klinische Symptomatik ist mit ${facts.diagnosisDative} vergleichbar; die abschließende diagnostische Einordnung wird ärztlich weitergeführt.`,
            },
          ] satisfies OfflabelRenderedDocument['blocks'])
        : []),
      {
        kind: 'paragraph',
        text: 'Bisherige Behandlung/Versorgung: Es besteht keine kausale Standardtherapie; die Behandlung erfolgt symptomorientiert. Daher ist auch keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.',
      },
      {
        kind: 'list',
        items: [
          `Behandlungsziel: ${facts.targetSymptoms}`,
          ...(point2aNo ? [] : [`Indikation: ${facts.diagnosisNominative}`]),
          `Dosierung/Dauer: ${facts.doseAndDuration}`,
          `Monitoring/Abbruchkriterien: ${facts.monitoringAndStop}`,
          `Erwarteter Nutzen / Therapieziel im Einzelfall: ${facts.targetSymptoms}`,
          'Insgesamt ist von einem positiven Nutzen-Risiko-Verhältnis auszugehen.',
          'Informationen für die Krankenkasse:',
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
        ...(model.arzt.liabilityHeading &&
        model.arzt.liabilityParagraphs &&
        model.arzt.liabilityParagraphs.length > 0
          ? ([
              {
                kind: 'heading' as const,
                text: model.arzt.liabilityHeading,
              },
              ...model.arzt.liabilityParagraphs.map((text) => ({
                kind: 'paragraph' as const,
                text,
              })),
              {
                kind: 'paragraph' as const,
                text: `Date: ${model.arzt.liabilityDateLine ?? ''}`,
              },
              {
                kind: 'paragraph' as const,
                text: `Patient name: ${model.arzt.liabilitySignerName ?? ''}`,
              },
            ] satisfies OfflabelRenderedDocument['blocks'])
          : []),
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
