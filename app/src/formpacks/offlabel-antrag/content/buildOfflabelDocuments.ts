import {
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

const LSG_REFERENCE_TEXT =
  'Beschluss des LSG Niedersachsen-Bremen vom 14.10.2022 (L 4 KR 373/22 B ER)';

const POINT_HILFSANTRAG_INTRO = `Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V. Dies gilt insbesondere für den Fall, dass eine zulassungsreife Datenlage im engeren Sinne verneint wird. Zur wertungsmäßigen Einordnung verweise ich ergänzend auf den ${LSG_REFERENCE_TEXT}.`;

const POINT_7_NOTSTAND = `Ich beantrage hilfsweise eine Genehmigung nach § 2 Abs. 1a SGB V. Es handelt sich um eine lebensbedrohliche oder regelmäßig tödlich verlaufende Erkrankung. Die Voraussetzungen des § 2 Abs. 1a SGB V sind in meinem Fall erfüllt. Bezüglich der Wertung von ME/CFS als eben solche Erkrankung verweise ich auf den ${LSG_REFERENCE_TEXT}. Die Schwere der Erkrankung folgt bei ME/CFS als Systemerkrankung aus der Breite der Betroffenheit mehrerer lebensfunktionaler Bereiche wie körperlicher Mobilität, Verrichtungen des täglichen Lebens und Einschränkung der Leistungsfähigkeit im sozialen Umgang. Diese Lebensbereiche sind bei mir stark betroffen. Bei ME/CFS handelt es sich um eine chronische Erkrankung bisher ungeklärter Ätiologie. Chronische Erkrankungen sind per Definition nicht heilbar; viele chronische Erkrankungen haben einen progredienten Verlauf. Das bedeutet, der Gesundheitszustand verschlechtert sich im Zeitverlauf. Dies ist auch bei meiner Erkrankung der Fall. Es ist mit einer weiteren Verschlechterung zu rechnen bis hin zu einer kritischen Phase mit Verlust von Selbstständigkeit, Pflegebedürftigkeit und deutlicher Zunahme der Beschwerden. Im Vergleich mit anderen Betroffenen ist meine Situation bereits jetzt kritisch und durch Verlust von Selbstständigkeit sowie Pflegebedürftigkeit geprägt. Damit ist eine wertungsmäßig vergleichbar schwere Erkrankung bereits jetzt bei mir gegeben. Aus meiner Sicht ergibt sich die Vergleichbarkeit zur unmittelbaren Lebensbedrohlichkeit auch daraus, dass ME/CFS als Systemerkrankung progredient verläuft, Verschlechterungen in Schüben auftreten können und Zeitpunkt sowie Schwere des nächsten Schubes nicht exakt vorhersehbar sind. Eine exakte Zeitangabe ist zur Erfüllung der Wertungsgleichheit nicht erforderlich. ME/CFS verläuft häufig schubförmig und ist insoweit mit anderen chronischen Erkrankungen wie Multipler Sklerose vergleichbar. Ein weiterer Schub kann jederzeit eintreten; der Zeitraum einer erneuten erheblichen Verschlechterung ist innerhalb der nächsten Monate anzusetzen und die Wahrscheinlichkeit des Eintretens ist hoch. Damit ist insgesamt die Voraussetzung einer wertungsmäßig vergleichbaren Schwere der Erkrankung im Sinne von § 2 Abs. 1a SGB V bei mir erfüllt.`;

const POINT_7_NOTSTAND_THERAPY_SAFETY =
  'Die beantragte Therapie erfolgt im Rahmen einer sorgfältigen individuellen Nutzen-Risiko-Abwägung, ärztlich überwacht und zeitlich befristet. Eine engmaschige Verlaufskontrolle ist vorgesehen. Bei fehlender Wirksamkeit oder relevanten Nebenwirkungen wird die Behandlung unverzüglich beendet. Die Therapie dient der Verhinderung einer weiteren Verschlechterung sowie der Erzielung einer spürbaren positiven Einwirkung auf den Krankheitsverlauf.';

const POINT_8_STANDARD =
  'Für die Versorgung meiner Erkrankung stehen keine sog. Standard-Therapien des gKV-Leistungskatalogs zur Verfügung. In der Wissenschaft werden allein symptombezogene Versorgungen diskutiert. Die am ehesten einschlägige Leitlinie: „Müdigkeit“ der Arbeitsgemeinschaft der Wissenschaftlichen Medizinischen Fachgesellschaften e. V. spricht in eben jener Leitlinie davon, dass für die kausale Behandlung des ME/CFS bislang keine Medikamente zugelassen sind und verweist auf die britische NICE-Richtlinie. In dieser wird neben Energiemanagment vor allem das Lindern der Symptome in den Fokus gerückt um eine spürbare Beeinflussung des Krankheitsverlaufes oder eine Verhütung der Verschlimmerung zu erreichen. Die Leitlinie enthält keine positiven Empfehlungen zur medikamentösen Therapie. Aufgelistet und diskutiert werden zahlreiche Therapieversuche mit sehr unterschiedlichen Ansätzen. Explizit wird zusammengefasst, dass es keine belastbare evidenzbasierte Grundlage für den Einsatz bestimmter Arzneimittel gibt. Das begehrte Offlabel Medikament ist für die Erreichung dieser Ziele geeignet. Zusammengefasst ist keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.';

const POINT_10_EVIDENCE_NOTE =
  'Die beigefügten Quellen sind eine Auswahl und erheben keinen Anspruch auf Vollständigkeit; ich bitte um eine vollständige sozialmedizinische Würdigung einschließlich ggf. ergänzender Literaturrecherche im Einzelfall.';

const POINT_10_NO_2A = `Die Erkenntnisse lassen sich auf meinen Einzelfall übertragen. Ich weise darauf hin, dass erst seit kurzem einheitliche und differenzierte Diagnoseschlüssel existieren und sich im ärztlichen Bereich noch etablieren müssen. Eine korrekte Verschlüsselung von Diagnosen ist und war damit nicht immer gegeben. Zudem wird auf die große Heterogenität der Patientenkollektive in den jeweiligen Studien hingewiesen, insbesondere aufgrund unterschiedlicher Ursachen und Komorbiditäten. Das trifft auch auf Patientinnen und Patienten mit Long-/Post-COVID zu. ${POINT_10_EVIDENCE_NOTE}`;
const POINT_10_YES_2A = `Diese Erkenntnisse sind auf meinen Einzelfall übertragbar. ${POINT_10_EVIDENCE_NOTE}`;
const POINT_10_SECTION_2A_BRIDGE = `Selbst wenn eine formelle Zulassungsreife im engeren Sinne verneint würde, bestehen jedenfalls veröffentlichte Erkenntnisse, die eine zuverlässige Nutzen-Risiko-Abwägung ermöglichen; hilfsweise wird daher die Leistung nach § 2 Abs. 1a SGB V begehrt. Zur wertungsmäßigen Einordnung verweise ich ergänzend auf den ${LSG_REFERENCE_TEXT}.`;
const POINT_10_STANDARD_THERAPY_SAFETY =
  'Die beantragte Therapie erfolgt entsprechend der dargestellten evidenzbasierten Empfehlungen ärztlich kontrolliert, befristet und unter klar definierten Abbruchkriterien. Eine regelmäßige Verlaufskontrolle sowie eine dokumentierte Nutzen-Risiko-Abwägung sind vorgesehen. Bei fehlender Wirksamkeit oder nicht tolerierbaren Nebenwirkungen wird die Behandlung unverzüglich beendet.';

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
    'Ich beziehe eine Erwerbsminderungsrente, weil meine krankheitsbedingte Leistungsminderung so ausgeprägt ist, dass die Anforderungen des allgemeinen Arbeitsmarktes dauerhaft nicht mehr erfüllbar sind.',
  'EM-Rente':
    'Ich beziehe eine Erwerbsminderungsrente, weil meine krankheitsbedingte Leistungsminderung so ausgeprägt ist, dass die Anforderungen des allgemeinen Arbeitsmarktes dauerhaft nicht mehr erfüllbar sind.',
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
  if (!drugProfile.isOther && localeFacts) {
    return {
      displayName: drugProfile.displayNameDe,
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
    displayName: otherDrugName || drugProfile.displayNameDe,
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
    const activityExamples = BELL_SCORE_ACTIVITY_EXAMPLES[bellScore];
    lines.push(
      activityExamples
        ? `Der Bell-Score ist eine zentrale Kennzahl für meinen funktionellen Schweregrad. Mein Bell-Score liegt bei ${bellScore}. Meine soziale, gesellschaftliche und berufliche Teilhabe ist aufgrund der Erkrankung grundsätzlich und dauerhaft eingeschränkt. Das zeigt sich im Alltag unter anderem daran, dass ${activityExamples}`
        : `Der Bell-Score ist eine zentrale Kennzahl für meinen funktionellen Schweregrad. Mein Bell-Score liegt bei ${bellScore}. Meine soziale, gesellschaftliche und berufliche Teilhabe ist aufgrund der Erkrankung grundsätzlich und dauerhaft eingeschränkt.`,
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
      WORK_STATUS_SEVERITY_LINES[workStatus] ??
        `Meine Erwerbsfähigkeit ist krankheitsbedingt deutlich eingeschränkt; aktuell ist mein Arbeitsstatus ${workStatus}.`,
    );
  }

  return lines;
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
  const standardCareText = getText(request.standardOfCareTriedFreeText);
  const standardCareItems =
    drugKey === 'other' ? parseMultilineItems(standardCareText) : [];
  const facts = resolvePreviewMedicationFacts(request, drug);
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
      ? 'Die vorgegebene Diagnose/Indikation ist noch nicht vollständig bestätigt und wird ärztlich nachgereicht.'
      : drug.point2DiagnosisSentenceDe;
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
    ...(applySection2Abs1a
      ? ([
          {
            kind: 'paragraph' as const,
            text: POINT_HILFSANTRAG_INTRO,
          },
        ] satisfies OfflabelRenderedDocument['blocks'])
      : []),
    {
      kind: 'paragraph',
      text: 'Zur Prüfung meines Antrags habe ich die maßgeblichen Punkte nachfolgend strukturiert dargestellt:',
    },
    {
      kind: 'paragraph',
      text: `Punkt 1: Das Medikament ${facts.displayName} ist in Deutschland nicht indikationsbezogen zugelassen`,
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
  if (includePoint7) {
    blocks.push({
      kind: 'paragraph',
      text: POINT_7_NOTSTAND_THERAPY_SAFETY,
    });
  }

  if (drugKey === 'other') {
    blocks.push(
      {
        kind: 'paragraph',
        text: `Punkt 9: Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild sowie eine positive Risiko-Nutzen-Bewertung (siehe Arztbefund). ${POINT_10_EVIDENCE_NOTE}`,
      },
      {
        kind: 'paragraph',
        text: `Geplant ist eine Behandlung wie folgt: Indikation: ${facts.diagnosisMain}. Behandlungsziel: ${facts.targetSymptoms}. Dosierung/Dauer: ${facts.doseAndDuration}. Überwachung/Abbruch: ${facts.monitoringAndStop}.`,
      },
    );
  } else {
    const point10Sources = [facts.expertSourceText].filter(Boolean);
    const point10CaseTransferText = point2aNo
      ? POINT_10_NO_2A
      : POINT_10_YES_2A;
    const point10BridgeText = applySection2Abs1a
      ? ` ${POINT_10_SECTION_2A_BRIDGE}`
      : '';
    const point10BaseText = `Punkt 10: Es gibt Erkenntnisse, die einer zulassungsreifen Datenlage entsprechen, die eine zuverlässige und wissenschaftlich überprüfbare Aussage zulassen. Hierzu verweise ich auf: ${point10Sources.join(' ')} ${point10CaseTransferText}${point10BridgeText} Geplant ist eine Behandlung wie folgt: Indikation: ${facts.diagnosisMain}. Behandlungsziel: ${facts.targetSymptoms}. Dosierung/Dauer: ${facts.doseAndDuration}. Überwachung/Abbruch: ${facts.monitoringAndStop}. ${POINT_10_STANDARD_THERAPY_SAFETY}`;
    blocks.push({
      kind: 'paragraph',
      text: point10BaseText,
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
  const { profile: drugProfile } = resolveMedicationProfileOrThrow(
    request.drug,
  );
  const facts = resolvePreviewMedicationFacts(request, drugProfile);
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
        text: `ich bereite einen Antrag auf Kostenübernahme (Teil 1) bei meiner Krankenkasse für eine Off-Label-Verordnung von ${drug} wegen meiner Erkrankung (${facts.diagnosisMain}) vor. Ich bitte Sie um Ihre Unterstützung in Form einer kurzen ärztlichen Stellungnahme/Befundzusammenfassung (Indikation, medizinische Notwendigkeit, Schweregrad, Behandlungsziel, bisherige Maßnahmen, erwarteter Nutzen, Monitoring, Abbruch bei fehlendem Nutzen oder relevanten Nebenwirkungen) sowie die Begleitung bei der Behandlung. Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen.`,
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
        text: `Der Patient leidet an einer schwerwiegenden, die Lebensqualität auf Dauer nachhaltig beeinträchtigenden Erkrankung. Die aktuelle Indikation lautet ${facts.diagnosisMain}.`,
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
