import { describe, expect, it } from 'vitest';
import { buildOfflabelDocuments } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const IVABRADIN_DIAGNOSIS_TEXT =
  'postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit';
const IVABRADIN_DIAGNOSIS_DATIVE_TEXT =
  'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit';
const SECTION_2A_TEXT = '§ 2 Abs. 1a SGB V';
const IVABRADINE_EXPERT_SOURCE =
  'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Ivabradin';
const CASE_TRANSFER_YES_TEXT =
  'Diese Erkenntnisse sind auf meinen Einzelfall übertragbar.';
const EVIDENCE_NOTE_TEXT =
  'Die beigefügten Quellen sind eine Auswahl und erheben keinen Anspruch auf Vollständigkeit;';
const EVIDENCE_SUFFICIENT_TEXT =
  'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.';
const EVIDENCE_NOT_SUFFICIENT_TEXT =
  'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild';
const OTHER_EVIDENCE_REFERENCE_TEXT = 'Musterstudie 2024, doi:10.1000/example';
const DIRECT_SECTION_2A_REQUEST_TEXT =
  'Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.';
const HILFSWEISE_SECTION_2A_REQUEST_TEXT =
  'Hilfsweise beantrage ich Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.';
const HILFSANTRAG_INTRO_TEXT =
  'Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V.';
const POINT_10_BRIDGE_TEXT =
  'Selbst wenn eine formelle Zulassungsreife im engeren Sinne verneint würde, bestehen jedenfalls veröffentlichte Erkenntnisse, die eine zuverlässige Nutzen-Risiko-Abwägung ermöglichen.';
const DUPLICATE_SECTION_2A_BRIDGE_CLAUSE =
  'hilfsweise wird daher die Leistung nach § 2 Abs. 1a SGB V begehrt';
const SECTION_2A_EVIDENCE_INTRO_TEXT =
  'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben; sollte eine Zulassungsreife im engeren Sinne abweichend bewertet werden, ermöglichen diese Erkenntnisse jedenfalls eine wissenschaftlich nachvollziehbare Nutzen-Risiko-Abwägung im Rahmen eines befristeten Therapieversuchs.';
const LEGACY_SECTION_2A_EVIDENCE_INTRO_TEXT =
  'Es liegen Erkenntnisse vor, die – je nach sozialmedizinischer Einordnung – eine zulassungsreife Datenlage begründen können oder jedenfalls eine zuverlässige, wissenschaftlich nachvollziehbare Nutzen-Risiko-Abwägung für einen befristeten, ärztlich überwachten Therapieversuch zulassen.';
const DIAGNOSIS_SECURED_NO_TEXT =
  'Die zugrunde liegende Erkrankung ist diagnostisch gesichert und ärztlich dokumentiert.';
const DIAGNOSIS_EVIDENCE_BRIDGE_TEXT =
  'Die in der Literatur/Studien verwendete Indikationsbezeichnung ist mit der gesicherten Diagnose nicht vollständig deckungsgleich.';
const CASE_TRANSFER_NO_TEXT =
  'Auf dieser Grundlage sind die herangezogenen Erkenntnisse für meinen Einzelfall im Rahmen einer wissenschaftlich nachvollziehbaren Nutzen-Risiko-Abwägung übertragbar.';
const THERAPY_SAFETY_TEXT =
  'Nach ärztlicher Einschätzung ist im Rahmen eines befristeten Therapieversuchs ein vertretbares Nutzen-Risiko-Verhältnis anzunehmen; bei fehlender Wirksamkeit oder Nebenwirkungen erfolgt Abbruch.';
const CLOSING_GREETING_TEXT = 'Mit freundlichen Grüßen';
const CONSENT_HEADING_MIDODRIN =
  'Aufklärung und Einwilligung zum Off-Label-Use: Midodrin';
const CONSENT_HEADING_IVABRADIN =
  'Aufklärung und Einwilligung zum Off-Label-Use: Ivabradin';
const buildPart2Intro = (drug: string): string =>
  `Ich bereite mit Hilfe einen Antrag auf Kostenübernahme bei meiner Krankenkasse für einen Off-Label-Therapieversuch mit ${drug} vor und bitte Sie um Ihre ärztliche Unterstützung bei der medizinischen Einordnung und Begleitung, insbesondere durch:`;

describe('buildOfflabelDocuments', () => {
  it('builds three parts and includes evidence text for known medication', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
        indicationFullyMetOrDoctorConfirms: 'no',
      },
      severity: {
        gdb: '50',
      },
    });

    expect(docs).toHaveLength(3);
    expect(docs.map((doc) => doc.id)).toEqual(['part1', 'part2', 'part3']);

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(
      part1ListItems.some((item) => item.includes(DIAGNOSIS_SECURED_NO_TEXT)),
    ).toBe(true);
    expect(part1Text).not.toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).not.toContain(EVIDENCE_NOT_SUFFICIENT_TEXT);
    expect(part1Text).toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
    expect(part1ListItems).not.toContain(
      `Klinische Symptomatik (vergleichbar mit ${IVABRADIN_DIAGNOSIS_DATIVE_TEXT})`,
    );
    expect(part1ListItems).not.toContain(
      `Indikation: ${IVABRADIN_DIAGNOSIS_TEXT}`,
    );
    expect(
      part1ListItems.some((item) =>
        item.startsWith('Dosierung/Dauer: Start 2,5 mg morgens'),
      ),
    ).toBe(true);
    expect(part1Text).not.toContain('Medizinischer Dienst Bund');
    expect(part1Text).toContain(IVABRADINE_EXPERT_SOURCE);
    expect(part1Text).toContain(DIAGNOSIS_EVIDENCE_BRIDGE_TEXT);
    expect(part1Text).toContain(CASE_TRANSFER_NO_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
    expect(part1Text).not.toContain(
      'Übertragbarkeit auf den Einzelfall (Gleiche Erkrankung/Gleiche Anwendung).',
    );
    expect(part1Text).not.toContain(CASE_TRANSFER_YES_TEXT);
    const noPathSourceIndex = part1Text.indexOf(IVABRADINE_EXPERT_SOURCE);
    const noPathTransferIndex = part1Text.indexOf(CASE_TRANSFER_NO_TEXT);
    expect(noPathSourceIndex).toBeGreaterThan(-1);
    expect(noPathTransferIndex).toBeGreaterThan(noPathSourceIndex);
    expect(part1Text).not.toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain('Sehr geehrte Damen und Herren,');
    expect(part1Text).toContain(
      'hiermit beantrage ich die Kostenübernahme für das Medikament Ivabradin im Rahmen des Off-Label-Use',
    );
    expect(part1Text).toContain(
      'zur symptomorientierten Behandlung bei einer klinischen Symptomatik, die mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit vergleichbar ist',
    );
    expect(part1Text).not.toContain(
      'zur Behandlung von postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(part1Text).toContain(
      'Eine positive Empfehlung für eine medikamentöse Standardtherapie enthält die Leitlinie nicht.',
    );
    expect(part1Text).toContain(
      'Die Schwere meiner Erkrankung ist durch die vorstehenden Angaben und Unterlagen nachvollziehbar dokumentiert.',
    );
    expect(part1Text).not.toContain('§33 AM-RL');
    expect(part1Text).toContain(CLOSING_GREETING_TEXT);

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part2Text).toContain(buildPart2Intro('Ivabradin'));
    expect(part2Text).not.toContain(
      'mit der Indikation postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(part2Text).not.toContain('Die klinische Symptomatik ist mit');

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part3Text).toContain(
      `Die klinische Symptomatik ist mit ${IVABRADIN_DIAGNOSIS_DATIVE_TEXT} vergleichbar; die ärztliche Einordnung der Symptomatik und Zuordnung zur Indikationsbezeichnung wird fortgeführt.`,
    );
    expect(part3Text).toContain(
      'zur symptomorientierten Behandlung der vorliegenden klinischen Symptomatik medizinisch nachvollziehbar',
    );
    expect(part3Text).not.toContain(
      `zur Behandlung der Indikation ${IVABRADIN_DIAGNOSIS_TEXT}`,
    );
    expect(part3Text).not.toContain(`Diagnose: ${IVABRADIN_DIAGNOSIS_TEXT}`);
  });

  it('uses the patient name in part-1 closing line', () => {
    const docs = buildOfflabelDocuments({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
      },
      request: {
        drug: 'ivabradine',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(CLOSING_GREETING_TEXT);
    expect(part1Text).toContain('Max Mustermann');
  });

  it('builds coherent other-medication flow with user diagnosis', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'other',
        otherIndication: 'Seltene XYZ-Indikation',
        otherEvidenceReference: OTHER_EVIDENCE_REFERENCE_TEXT,
        standardOfCareTriedFreeText:
          '- Betablocker (nicht verträglich)\n• Kompressionstherapie ohne ausreichenden Effekt',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(
      part1ListItems.some((item) =>
        item.includes(
          'Das Medikament anderes Medikament ist in Deutschland nicht indikationsbezogen zugelassen',
        ),
      ),
    ).toBe(true);
    expect(part1ListItems).toContain(
      'Die Diagnose Seltene XYZ-Indikation ist gesichert.',
    );
    expect(part1Text).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).not.toContain(
      'Hilfsweise beantrage ich Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.',
    );
    expect(part1Text).toContain(EVIDENCE_NOT_SUFFICIENT_TEXT);
    expect(part1Text).not.toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
    expect(part1Text).toContain(THERAPY_SAFETY_TEXT);
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
    expect(part1Text).toContain(
      `wissenschaftliche Erkenntnisse: ${OTHER_EVIDENCE_REFERENCE_TEXT}`,
    );
    expect(part1Text).toContain(
      'Zusätzlich wurden folgende Therapieversuche unternommen:',
    );

    expect(part1ListItems).toContain('Betablocker (nicht verträglich)');
    expect(part1ListItems).toContain(
      'Kompressionstherapie ohne ausreichenden Effekt',
    );
    expect(part1ListItems).toContain('Indikation: Seltene XYZ-Indikation');

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part3Text).toContain(
      'Zusätzlich wurden folgende Therapieversuche unternommen:',
    );
  });

  it('ignores hidden stale flags when switching to other medication', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'other',
        otherDrugName: 'Midodrin',
        otherIndication: 'Orthostatische Intoleranz',
        applySection2Abs1a: true,
        indicationFullyMetOrDoctorConfirms: 'no',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).not.toContain(HILFSANTRAG_INTRO_TEXT);
    expect(part1Text).not.toContain(HILFSWEISE_SECTION_2A_REQUEST_TEXT);

    expect(part2Text).toContain(buildPart2Intro('Midodrin'));
    expect(part2Text).not.toContain('Die klinische Symptomatik ist mit');

    expect(part3Text).toContain('Diagnose: Orthostatische Intoleranz');
    expect(part3Text).toContain(
      'zur Behandlung der Indikation Orthostatische Intoleranz',
    );
    expect(part3Text).not.toContain(
      'Die klinische Symptomatik ist mit Orthostatische Intoleranz vergleichbar;',
    );
  });

  it('renders bell score and merkzeichen details in severity list', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        bellScore: '30',
        merkzeichen: ['G', 'H', 'B'],
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    const bellLine = part1ListItems.find((line) =>
      line.includes('Mein aktueller Bell-Score beträgt 30'),
    );
    expect(bellLine).toBeDefined();
    expect(bellLine).toBe(
      'Mein aktueller Bell-Score beträgt 30 und dokumentiert mein aktuelles Funktionsniveau.',
    );
    const participationLine = part1ListItems.find((line) =>
      line.startsWith(
        'Meine soziale, gesellschaftliche und berufliche Teilhabe',
      ),
    );
    expect(participationLine).toBeDefined();
    expect(participationLine).toContain('hausgebunden');
    expect(participationLine).toContain('mehrtägige Erholungsphasen');
    expect(participationLine).toContain(
      'grundsätzlich und dauerhaft eingeschränkt',
    );
    expect(part1ListItems).toContain(
      'Als weiterer objektiver Schwereindikator sind bei mir die Merkzeichen G, H, B dokumentiert.',
    );
    expect(part1ListItems).not.toContain('Lt. Leitfaden je nach Schwere');
  });

  it('renders all selected merkzeichen checkboxes without combo filtering', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        merkzeichen: ['aG', 'G', 'B', 'H'],
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(part1ListItems).toContain(
      'Als weiterer objektiver Schwereindikator sind bei mir die Merkzeichen G, aG, H, B dokumentiert.',
    );
  });

  it('uses singular grammar for one merkzeichen entry', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        merkzeichen: ['aG'],
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(part1ListItems).toContain(
      'Als weiterer objektiver Schwereindikator ist bei mir das Merkzeichen aG dokumentiert.',
    );
  });

  it('combines multiple objective severity indicators into one line', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        gdb: '80',
        merkzeichen: ['G', 'aG'],
        pflegegrad: '3',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    const combinedSeverityLine = part1ListItems.find((line) =>
      line.startsWith('Als weitere objektive Schwereindikatoren'),
    );
    expect(combinedSeverityLine).toBeDefined();
    expect(combinedSeverityLine).toContain('ein Grad der Behinderung von 80');
    expect(combinedSeverityLine).toContain('die Merkzeichen G, aG');
    expect(combinedSeverityLine).toContain('Pflegegrad 3');
  });

  it('joins exactly two objective severity indicators with und', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        gdb: '60',
        pflegegrad: '2',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(part1ListItems).toContain(
      'Als weitere objektive Schwereindikatoren liegen bei mir ein Grad der Behinderung von 60 und Pflegegrad 2 vor.',
    );
  });

  it('renders expanded work-status severity wording without bell-score duplication', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        workStatus: 'Arbeitsunfähig',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    const workStatusLine = part1ListItems.find((line) =>
      line.startsWith('Ich bin derzeit arbeitsunfähig;'),
    );
    expect(workStatusLine).toBeDefined();
    expect(workStatusLine).toContain('Erwerbstätigkeit');
    expect(workStatusLine).not.toContain('Bell-Score');
  });

  it('renders fallback severity lines for unknown bell score and work status', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
      },
      severity: {
        bellScore: '999',
        workStatus: 'Sonderstatus',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(part1ListItems).toContain(
      'Mein aktueller Bell-Score beträgt 999 und dokumentiert mein aktuelles Funktionsniveau.',
    );
    expect(part1ListItems).toContain(
      'Meine soziale, gesellschaftliche und berufliche Teilhabe ist krankheitsbedingt grundsätzlich und dauerhaft eingeschränkt.',
    );
    expect(part1ListItems).toContain(
      'Meine Erwerbsfähigkeit ist krankheitsbedingt deutlich eingeschränkt; aktuell ist mein Arbeitsstatus Sonderstatus.',
    );
  });

  it('uses user-entered medication name for other in part 1 and part 2', () => {
    const docs = buildOfflabelDocuments({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
      },
      request: {
        drug: 'other',
        otherDrugName: 'Midodrin',
        otherIndication: 'Orthostatische Intoleranz',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);
    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part2Headings = docs[1].blocks
      .filter((block) => block.kind === 'heading')
      .map((block) => block.text);
    const part2ListItems = docs[1].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(
      part1ListItems.some((item) =>
        item.includes(
          'Das Medikament Midodrin ist in Deutschland nicht indikationsbezogen zugelassen',
        ),
      ),
    ).toBe(true);
    expect(part2Text).toContain(buildPart2Intro('Midodrin'));
    expect(part2ListItems).toContain(
      'Die ärztliche Begleitung der Behandlung im Verlauf',
    );
    expect(part2Text).toContain('Sehr geehrte Damen und Herren,');
    expect(part2Text).toContain(
      'Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen. Vielen Dank für Ihre Unterstützung.',
    );
    expect(part2Headings).toContain(CONSENT_HEADING_MIDODRIN);
    expect(part2Text).toContain('1. Hintergrund');
    expect(part2Text).toContain(
      '2. Aufklärung über Nutzen, Risiken und Alternativen',
    );
    expect(part2Text).toContain('3. Einwilligung');
    expect(part2Text).toContain(
      'Mir wurde erläutert, dass Midodrin für die bei mir beabsichtigte Anwendung nicht zugelassen ist (Off-Label-Use).',
    );
    expect(part2Headings).toContain(CONSENT_HEADING_MIDODRIN);
    const greetingBlockIndex = docs[1].blocks.findIndex(
      (block) =>
        block.kind === 'paragraph' && block.text === CLOSING_GREETING_TEXT,
    );
    const liabilityHeadingIndex = docs[1].blocks.findIndex(
      (block) =>
        block.kind === 'heading' && block.text === CONSENT_HEADING_MIDODRIN,
    );
    expect(greetingBlockIndex).toBeGreaterThan(-1);
    expect(liabilityHeadingIndex).toBeGreaterThan(greetingBlockIndex);
    expect(part2Text).toContain(CLOSING_GREETING_TEXT);
    expect(part2Text).toContain('Max Mustermann');
  });

  it('combines other-dose and other-duration in treatment plan text', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'other',
        otherDrugName: 'Musterwirkstoff',
        otherIndication: 'Musterindikation',
        otherTreatmentGoal: 'Stabilisierung',
        otherDose: '10 mg täglich',
        otherDuration: 'für 12 Wochen',
      },
    });

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(part1ListItems).toContain(
      'Dosierung/Dauer: 10 mg täglich; für 12 Wochen',
    );
  });

  it('keeps female salutation and renders the updated consent text in part 2', () => {
    const docs = buildOfflabelDocuments({
      doctor: {
        gender: 'Frau',
        name: 'Muster',
      },
      request: {
        drug: 'ivabradine',
      },
    });

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part2Headings = docs[1].blocks
      .filter((block) => block.kind === 'heading')
      .map((block) => block.text);

    expect(part2Text).toContain('Sehr geehrte Frau Muster,');
    expect(part2Headings).toContain(CONSENT_HEADING_IVABRADIN);
  });

  it('keeps male salutation and renders the updated consent text in part 2', () => {
    const docs = buildOfflabelDocuments({
      doctor: {
        gender: 'Herr',
        name: 'Muster',
      },
      request: {
        drug: 'ivabradine',
      },
    });

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part2Headings = docs[1].blocks
      .filter((block) => block.kind === 'heading')
      .map((block) => block.text);

    expect(part2Text).toContain('Sehr geehrter Herr Muster,');
    expect(part2Headings).toContain(CONSENT_HEADING_IVABRADIN);
  });

  it('uses doctor fallback salutation when female name is missing', () => {
    const docs = buildOfflabelDocuments({
      doctor: {
        gender: 'Frau',
      },
      request: {
        drug: 'ivabradine',
      },
    });

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part2Text).toContain('Sehr geehrte Frau Doktor,');
  });

  it('uses doctor fallback salutation when male name is missing', () => {
    const docs = buildOfflabelDocuments({
      doctor: {
        gender: 'Herr',
      },
      request: {
        drug: 'ivabradine',
      },
    });

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part2Text).toContain('Sehr geehrter Herr Doktor,');
  });

  it('adds §2 wording for standard medication when checkbox is enabled', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
        applySection2Abs1a: true,
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(HILFSANTRAG_INTRO_TEXT);
    expect(part1Text).toContain(HILFSWEISE_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).toContain(SECTION_2A_EVIDENCE_INTRO_TEXT);
    expect(part1Text).not.toContain(LEGACY_SECTION_2A_EVIDENCE_INTRO_TEXT);
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).not.toContain(POINT_10_BRIDGE_TEXT);
    expect(part1Text).not.toContain(DUPLICATE_SECTION_2A_BRIDGE_CLAUSE);
    expect(part1Text).toContain(THERAPY_SAFETY_TEXT);
    expect(part1Text.split(THERAPY_SAFETY_TEXT)).toHaveLength(2);
  });

  it('ignores standard-of-care free text for standard medication previews', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
        standardOfCareTriedFreeText:
          'Dieser Text wurde im Other-Flow eingegeben und darf hier nicht erscheinen.',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).not.toContain(
      'Dieser Text wurde im Other-Flow eingegeben und darf hier nicht erscheinen.',
    );
    expect(part1Text).toContain(EVIDENCE_SUFFICIENT_TEXT);
  });

  it('falls back to the other path for unknown medication keys', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'unknown-drug',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);

    expect(
      part1ListItems.some((item) =>
        item.includes(
          'Das Medikament anderes Medikament ist in Deutschland nicht indikationsbezogen zugelassen',
        ),
      ),
    ).toBe(true);
    expect(part1Text).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOT_SUFFICIENT_TEXT);
    expect(part1Text).not.toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
  });

  it('fills patient birth date and insurance number in part 3', () => {
    const docs = buildOfflabelDocuments({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: '1970-01-02',
        insuranceNumber: 'X123456789',
      },
      request: {
        drug: 'agomelatin',
      },
    });

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part3Text).toContain(
      'Patient: Max Mustermann, geb. 02.01.1970; Versichertennr.: X123456789',
    );
    expect(part3Text).toContain('Diagnose: postinfektiöse ME/CFS mit Fatigue');
  });

  it('uses selected agomelatin indication consistently without "und/oder"', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'agomelatin',
        selectedIndicationKey: 'agomelatin.long_post_covid_fatigue',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);
    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(
      'zur Behandlung von Long-/Post-COVID mit Fatigue',
    );
    expect(part1ListItems).toContain(
      'Die Diagnose Long-/Post-COVID ist gesichert (siehe Befunde). Fatigue ist als Leitsymptom dokumentiert.',
    );
    expect(part1ListItems).toContain(
      'Indikation: Long-/Post-COVID mit Fatigue',
    );
    expect(part1Text).not.toContain('und/oder');
    expect(part2Text).toContain(buildPart2Intro('Agomelatin'));
    expect(part2Text).not.toContain('und/oder');
    expect(part3Text).toContain(
      'zur Behandlung der Indikation Long-/Post-COVID mit Fatigue',
    );
    expect(part3Text).not.toContain('Auch die Indikation');
    expect(part3Text).not.toContain('typischen Symptomen der Indikation');
    expect(part3Text).not.toContain('und/oder');
  });

  it('uses selected vortioxetin indication in preview and part 3', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'vortioxetine',
        selectedIndicationKey: 'vortioxetine.long_post_covid_depressive',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);
    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(
      'zur Behandlung von Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part1ListItems).toContain(
      'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Depressive Symptome sind dokumentiert.',
    );
    expect(part3Text).toContain(
      'Diagnose: Long/Post-COVID mit depressiven Symptomen',
    );
  });

  it('keeps workflow-canonical preview content for locale en', () => {
    const docs = buildOfflabelDocuments(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'en',
    );

    expect(docs).toHaveLength(3);

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(
      'Das Medikament Ivabradin ist in Deutschland nicht indikationsbezogen zugelassen',
    );
    expect(part1Text).toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
  });

  it('keeps liability footer block in locale en for unknown medication keys', () => {
    const docs = buildOfflabelDocuments(
      {
        request: {
          drug: 'unknown-drug',
        },
      },
      'en',
    );

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part2Text).toContain('Date: ');
    expect(part2Text).toContain('Patient name: ');
  });
});
