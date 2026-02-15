import { DRUGS, type DrugKey } from './drugConfig';

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

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getBool = (value: unknown): boolean => value === true;

const formatBirthDate = (value: string): string => {
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!ymdMatch) {
    return value;
  }
  return `${ymdMatch[3]}.${ymdMatch[2]}.${ymdMatch[1]}`;
};

const joinLines = (values: string[]): string =>
  values.filter(Boolean).join('\n');

const POINT_7_NOTSTAND =
  'Es handelt sich um eine lebensbedrohende oder regelmäßig tödlich verlaufende Erkrankung. Die Vorrausetzungen des § 2 Abs. 1a SGB V ist in meinem Fall erfüllt. Bezüglich der Wertung von ME/CFS als eben solche Erkrankung verweise ich auf das Urteil des LSG Niedersachsen-Bremen, Beschluss vom 14.10.2022 - L 4 KR 373/22 B ER. Die Schwere der Erkrankung folgt bei ME/CFS als Systemerkrankung aus der Breite der einer Systemerkrankung immanenten Betroffenheit mehrerer lebensfunktionaler Bereiche wie körperlicher Mobilität, Verrichtungen des täglichen Lebens und Einschränkung der Leistungsfähigkeit im sozialen Umgang. Diese Lebensbereiche sind bei mir stark betroffen. Bei ME/CFS handelt es sich um eine chronische Erkrankung bisher ungeklärter Ätiologie. Chronische Erkrankungen sind per definitionem nicht heilbar, viele chronische Erkrankungen haben einen sogenannten "progredienten Verlauf". Dies bedeutet, der Zustand des Patienten verschlechtert sich im Verlauf der Zeit. Dies ist auch bei meiner Erkrankung der Fall. Es ist ebenfalls regelhaft mit einer Verschlechterung des Gesundheitszustandes zu rechnen bis am Ende eine kritische Phase eintritt, der mit Verlust der Selbstständigkeit, Pflegebedürftigkeit und Zunahme der Beschwerden bis zur Grenze des erträglichen und darüber hinaus zu rechnen ist. Wenn man andere Patienten mit der Erkrankung zum Vergleich heranzieht, so ist meine Situation jetzt schon als kritisch zu bezeichnen, meine Situation ist bereits jetzt vom Verlust von Selbstständigkeit und Pflegebedrütigkeit gekennzeichnet. Damit ist eine wertungsmäßig vergleichbar schwere Erkrankung bereits jetzt bei mir gegeben. Aus meiner Sicht ergibt sich die Vergleichbarkeit zur unmittelbaren Lebensbedrohlichkeit auch daraus, dass ME/CFS als Systemerkrankung progredient verläuft, Verschlechterungen in Schüben auftreten können Zeitpunkt und Schwere des nächsten Schubes – sprich: der nächsten erheblichen abermaligen Verschlechterung – nicht exakt vorhersehbar sind. Eine exakte Zeitangabe ist indes zur Erfüllung der Wertungsgleichheit nicht erforderlich. ME/CFS ist eine Erkrankung, die meist schubförmig verläuft. Hier ist sie mit anderen chronischen Erkrankungen, zum Beispiel der Multiplen Sklerose, vergleichbar. Mein Zustand ist heute schon als kritisch zu bezeichnen. Ein weiterer Schub von ME/CFS kann jederzeit eintreten. Der Zeitraum, in dem eine solche Verschlechterung eintritt, ist innerhalb der nächsten Monate anzusetzen, die Wahrscheinlichkeit des Eintretens einer solchen deutlichen Verschlechterung ist hoch. Damit ist insgesamt die Voraussetzung einer wertungsmäßig vergleichbaren Schwere der Erkrankung iSv § 2 Abs. 1 a SGB V bei mir gegeben.';

const POINT_8_STANDARD =
  'Für die Versorgung meiner Erkrankung stehen keine sog. Standard-Therapien des gKV-Leistungskatalogs zur Verfügung. In der Wissenschaft werden allein symptombezogene Versorgungen diskutiert. Die am ehesten einschlägige Leitlinie: „Müdigkeit“ der Arbeitsgemeinschaft der Wissenschaftlichen Medizinischen Fachgesellschaften e. V. spricht in eben jener Leitlinie davon, dass für die kausale Behandlung des ME/CFS bislang keine Medikamente zugelassen sind und verweist auf die britische NICE-Richtlinie. In dieser wird neben Energiemanagment vor allem das Lindern der Symptome in den Fokus gerückt um eine spürbare Beeinflussung des Krankheitsverlaufes oder eine Verhütung der Verschlimmerung zu erreichen. Das begehrte Offlabel Medikament ist für die Erreichung dieser Ziele geeignet. Zusammengefasst ist keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.';

const POINT_10_NO_2A =
  'Die Erkenntnisse lassen sich auf meine Diagnosen übertragen. Ich weise darauf hin, dass erst seit kurzem einheitliche und differenzierte Diagnoseschlüssel existieren und sich im ärztlichen Bereich noch etablieren müssen. Eine korrekte Verschlüsselung von Diagnosen ist und war damit nicht immer gegeben.';

const ALLOWED_MERKZEICHEN = new Set(['G', 'aG', 'H', 'B']);
const ALLOWED_MERKZEICHEN_COMBINATIONS = new Set([
  'G',
  'aG',
  'G|H',
  'B|G',
  'B|G|H',
  'B|aG',
  'H|aG',
  'B|H|aG',
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
    value === 'agomelatin' ||
    value === 'vortioxetine'
  ) {
    return value;
  }
  return 'other';
};

const buildSeverityLines = (severity: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  if (getText(severity.bellScore)) {
    lines.push('Lt. Leitfaden je nach Schwere');
  }
  const gdb = getText(severity.gdb);
  if (gdb) {
    lines.push(`Ich einen Grad der Behinderung von ${gdb}`);
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

  const mobility = getText(severity.mobilityLevel);
  if (mobility === 'housebound') {
    lines.push(
      'Durch die Schwere der Erkrankung kann ich das Haus nur in Ausnahmefällen verlassen. Ich bin in meinen Aktivitäten und der Teilhabe in allen Lebensbereichen massiv eingeschränkt. Diesen Brief kann ich nur mit Hilfe verfassen und muss mich hiervon mehrere Tage erholen.',
    );
  }
  if (mobility === 'bedbound') {
    lines.push(
      'Durch die Schwere meiner Erkrankung kann ich das Bett die meiste Zeit des Tages nicht verlassen. Ich bin in meinen Aktivitäten und der Teilhabe in allen Lebensbereichen extrem eingeschränkt. Diesen Brief kann ich nur mit Hilfe verfassen und werde hiervon eine Zustandsverschlechterung davontragen.',
    );
  }
  if (mobility === 'fullyBedbound') {
    lines.push(
      'Durch die Schwere meiner Erkrankung kann ich das Bett nicht mehr verlassen. Ich bin in jeglichen Aktivitäten vollständig eingeschränkt und die Teilhabe in allen Lebensbereichen ist nicht existent. Diesen Brief kann ich nicht selbst verfassen.',
    );
  }

  return lines;
};

const buildPart1 = (formData: FormData): OfflabelRenderedDocument => {
  const request = getRecord(formData.request);
  const severity = getRecord(formData.severity);
  const drugKey = getDrugKey(request.drug);
  const drug = DRUGS[drugKey];
  const point2aNo =
    getText(request.indicationFullyMetOrDoctorConfirms) === 'no';
  const applySection2 =
    drugKey !== 'other' && getBool(request.applySection2Abs1a);
  const standardCareText = getText(request.standardOfCareTriedFreeText);
  const otherWarning =
    'Hinweis: Bei Auswahl „anderes Medikament oder andere Indikation“ wird der Weg über den §2 Abs. 1a SGB V gewählt. Dieser setzt strenge Maßstäbe an Schwere und Dringlichkeit der Behandlung. Die Erfolgsaussichten sind hierbei wesentlich geringer. Für größtmögliche Erfolgschancen sollte der vorformulierte Text nicht 1:1 verwendet werden. Es sollten eigene Quellen und eine detailliertere Einschätzung des Arztes zu Risiko-Nutzen eingeholt werden.';

  const point4Text = drug.hasAnnouncedAmrlEntry
    ? 'Es gibt bisher keine Regelung für das Arzneimittel in dem beantragten Anwendungsgebiet in der AM-RL Anlage VI. Auch wenn diese in Aussicht ist, erlaubt es mein Gesundheitszustand nicht auf eine solche zu warten.'
    : 'Es gibt bisher keine Regelung für das Arzneimittel in dem beantragten Anwendungsgebiet in der AM-RL Anlage VI';

  const blocks: OfflabelRenderedDocument['blocks'] = [
    { kind: 'heading', text: 'Teil 1 – Antrag an die Krankenkasse' },
    {
      kind: 'paragraph',
      text: `Punkt 1: Das Medikament ${drug.displayName} ist in Deutschland nicht indikationszogen zugelassen`,
    },
    {
      kind: 'paragraph',
      text: `Punkt 2: ${point2aNo ? 'Die Diagnose ist gesichert' : drug.point2DiagnosisSentence}`,
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

  if (applySection2) {
    blocks.push({ kind: 'paragraph', text: `Punkt 7: ${POINT_7_NOTSTAND}` });
  }

  blocks.push({ kind: 'paragraph', text: `Punkt 8: ${POINT_8_STANDARD}` });
  if (standardCareText) {
    blocks.push({ kind: 'paragraph', text: standardCareText });
  }

  if (applySection2) {
    blocks.push(
      {
        kind: 'paragraph',
        text: 'Punkt 9: Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild sowie eine positive Risko-Nutzen-Bewertung (siehe Arztbefund).',
      },
      {
        kind: 'paragraph',
        text: 'Diese Erkenntnisse ergeben sich hieraus: Quellen angeben.',
      },
      {
        kind: 'paragraph',
        text: 'Geplant ist eine Behandlung wie folgt: Dosis, Dauer, Überwachung durch Arzt hier festlegen.',
      },
    );
  }

  const point10BaseText =
    'Punkt 10: Es gibt Erkenntnisse, die einer zulassungsreifen Datenlage entsprechen, die eine zuverlässige und wissenschaftlich überprüfbare Aussage zulassen. Hierzu verweise ich auf: (HTA-Bericht, Systematisches Review, inkl. Metaanylysen, Evidenzbasierte Richtlinien, randomisierte Kontrollierte Studien). Übertragbarkeit auf den Einzelfall (Gleiche Erkrankung/Gleiche Anwendung). Geplant ist eine Behandlung wie folgt: Indikation, Dosis, Dauer, Überwachung durch Arzt hier festlegen.';
  blocks.push({
    kind: 'paragraph',
    text: point2aNo ? `${point10BaseText} ${POINT_10_NO_2A}` : point10BaseText,
  });

  if (drugKey === 'other') {
    blocks.push({ kind: 'paragraph', text: otherWarning });
  }

  return { id: 'part1', title: 'Part 1', blocks };
};

const buildPart2 = (formData: FormData): OfflabelRenderedDocument => {
  const doctor = getRecord(formData.doctor);
  const drug = DRUGS[getDrugKey(getRecord(formData.request).drug)].displayName;
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
        text: `ich bereite einen Antrag auf Kostenübernahme (Teil 1) bei meiner Krankenkasse für eine Off-Label-Verordnung von ${drug} wegen meiner ME/CFS vor. Ich bitte Sie um Ihre Unterstützung in Form einer kurzen ärztlichen Stellungnahme/Befundzusammenfassung (Indikation, medizinische Notwendigkeit, Schweregrad, Behandlungsziel, bisherige Maßnahmen, erwarteter Nutzen, Monitoring, Abbruch bei fehlendem Nutzen oder relevanten Nebenwirkungen).`,
      },
      {
        kind: 'paragraph',
        text: 'Haftungshinweis: Die beigefügten Formulierungen sind eine Arbeitshilfe und müssen vor Nutzung medizinisch geprüft und individuell angepasst werden.',
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
  const drug = DRUGS[getDrugKey(request.drug)].displayName;
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
        text: 'Diagnose: postinfektiöses ME/CFS / Long COVID',
      },
      {
        kind: 'paragraph',
        text: 'Der Patient leidet an ME/CFS, einer lebensbedrohlichen und die Lebensqualität auf Dauer nachhaltig beeinträchtigenden Erkrankung. Die Diagnose ist gesichert.',
      },
      {
        kind: 'paragraph',
        text: `Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von ${drug} zur Behandlung von ME/CFS sinnvoll, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.`,
      },
      {
        kind: 'paragraph',
        text: point2aNo
          ? 'Der Patient leidet an den typischen Symptomen der Indikation [XYZ].'
          : 'Auch die Indikation [XYZ] liegt vor.',
      },
      {
        kind: 'paragraph',
        text: 'Bisherige Behandlung/Versorgung: Es besteht keine kausale Standardtherapie; die Behandlung erfolgt symptomorientiert. Daher ist auch keine der medizinischen Standardtherapie entsprechende Alternative verfügbar.',
      },
      {
        kind: 'list',
        items: [
          'Behandlungsziel: relevante Symptomlast lindern, Lebensqualität steigern',
          'Indikation: [aus Medikament übernehmen]',
          'Dosierung/Dauer: [entsprechend Studienergebnissen]',
          'Monitoring/Abbruchkriterien: engmaschige Verlaufskontrolle, Abbruch bei fehlendem Nutzen oder relevanten Nebenwirkungen',
          'Erwarteter Nutzen / Therapieziel im Einzelfall: [aus Medikament übernehmen]',
          'Insgesamt ist von einem positiven Risiko-Nutzen Verhältnis auszugehen.',
          'BSNR: __________',
          'LANR: __________',
        ],
      },
    ],
  };
};

export function buildOfflabelDocuments(
  formData: Record<string, unknown>,
): OfflabelRenderedDocument[] {
  return [buildPart1(formData), buildPart2(formData), buildPart3(formData)];
}
