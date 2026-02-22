import { describe, expect, it } from 'vitest';
import { buildOfflabelDocuments } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const IVABRADIN_DIAGNOSIS_TEXT =
  'postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit';
const IVABRADIN_DIAGNOSIS_DATIVE_TEXT =
  'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit';
const SECTION_2A_TEXT = '§ 2 Abs. 1a SGB V';
const IVABRADINE_EXPERT_SOURCE =
  'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).';
const CASE_TRANSFER_YES_TEXT =
  'Diese Erkenntnisse sind auf meinen Einzelfall übertragbar.';
const EVIDENCE_NOTE_TEXT =
  'Die beigefügten Quellen sind eine Auswahl und erheben keinen Anspruch auf Vollständigkeit;';
const EVIDENCE_SUFFICIENT_TEXT =
  'Es gibt Erkenntnisse, die einer zulassungsreifen Datenlage entsprechen';
const EVIDENCE_NOT_SUFFICIENT_TEXT =
  'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild';
const DIRECT_SECTION_2A_REQUEST_TEXT =
  'Ich beantrage eine Genehmigung nach § 2 Abs. 1a SGB V.';
const HILFSANTRAG_INTRO_TEXT =
  'Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V.';
const POINT_10_BRIDGE_TEXT =
  'Selbst wenn eine formelle Zulassungsreife im engeren Sinne verneint würde';
const THERAPY_SAFETY_TEXT =
  'Die beantragte Therapie erfolgt im Rahmen einer sorgfältigen individuellen Nutzen-Risiko-Abwägung, ärztlich überwacht und zeitlich befristet.';
const CLOSING_GREETING_TEXT = 'Mit freundlichen Grüßen';

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

    expect(part1ListItems).toContain('Die Diagnose ist gesichert.');
    expect(part1Text).not.toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).not.toContain(EVIDENCE_NOT_SUFFICIENT_TEXT);
    expect(part1Text).toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
    expect(part1ListItems).toContain(
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
    expect(part1Text).toContain(
      'Die Erkenntnisse lassen sich auf meinen Einzelfall übertragen',
    );
    expect(part1Text).toContain(
      'Zudem wird auf die große Heterogenität der Patientenkollektive in den jeweiligen Studien hingewiesen',
    );
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
    expect(part1Text).not.toContain(
      'Übertragbarkeit auf den Einzelfall (Gleiche Erkrankung/Gleiche Anwendung).',
    );
    expect(part1Text).not.toContain(CASE_TRANSFER_YES_TEXT);
    const noPathSourceIndex = part1Text.indexOf(IVABRADINE_EXPERT_SOURCE);
    const noPathTransferIndex = part1Text.indexOf(
      'Die Erkenntnisse lassen sich auf meinen Einzelfall übertragen',
    );
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
    expect(part1Text).toContain(CLOSING_GREETING_TEXT);

    const part2Text = docs[1].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part2Text).toContain(
      'Die klinische Symptomatik ist mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit vergleichbar.',
    );
    expect(part2Text).not.toContain(
      'mit der Indikation postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part3Text).toContain(
      `Die klinische Symptomatik ist mit ${IVABRADIN_DIAGNOSIS_DATIVE_TEXT} vergleichbar; die abschließende diagnostische Einordnung wird ärztlich weitergeführt.`,
    );
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
      'Die Diagnose Seltene XYZ-Indikation ist gesichert',
    );
    expect(part1Text).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1Text).not.toContain(
      'Ich beantrage hilfsweise eine Genehmigung nach § 2 Abs. 1a SGB V.',
    );
    expect(part1Text).toContain(EVIDENCE_NOT_SUFFICIENT_TEXT);
    expect(part1Text).not.toContain(EVIDENCE_SUFFICIENT_TEXT);
    expect(part1Text).not.toMatch(/Punkt \d+:/);
    expect(part1Text).toContain(THERAPY_SAFETY_TEXT);
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
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
    expect(bellLine).toContain('Der Bell-Score ist eine zentrale Kennzahl');
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
    expect(part2Text).toContain(
      'für eine Off-Label-Verordnung von Midodrin mit der Indikation Orthostatische Intoleranz',
    );
    expect(part2Text).toContain(
      'Ich bitte Sie um Unterstützung bei der medizinischen Einordnung und Begleitung des Antrags, insbesondere durch:',
    );
    expect(part2ListItems).toContain(
      'Die ärztliche Begleitung der Behandlung im Verlauf',
    );
    expect(part2Text).toContain('Sehr geehrte Damen und Herren,');
    expect(part2Text).toContain(
      'Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen. Vielen Dank für Ihre Unterstützung.',
    );
    expect(part2Text).toContain(
      'nicht für meine Indikation zugelassenen Medikament Midodrin („Off-Label-Use“)',
    );
    expect(part2Text).toContain(
      'Haftungsansprüche gegenüber meiner Ärztin/meinem Arzt.',
    );
    expect(part2Headings).toContain(
      'Haftungsausschluss (vom Patienten zu unterzeichnen)',
    );
    const greetingBlockIndex = docs[1].blocks.findIndex(
      (block) =>
        block.kind === 'paragraph' && block.text === CLOSING_GREETING_TEXT,
    );
    const liabilityHeadingIndex = docs[1].blocks.findIndex(
      (block) =>
        block.kind === 'heading' &&
        block.text === 'Haftungsausschluss (vom Patienten zu unterzeichnen)',
    );
    expect(greetingBlockIndex).toBeGreaterThan(-1);
    expect(liabilityHeadingIndex).toBeGreaterThan(greetingBlockIndex);
    expect(part2Text).toContain(CLOSING_GREETING_TEXT);
    expect(part2Text).toContain('Max Mustermann');
  });

  it('uses a gender-specific liability phrase for female doctors in part 2', () => {
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

    expect(part2Text).toContain('Sehr geehrte Frau Muster,');
    expect(part2Text).toContain('Haftungsansprüche gegenüber meiner Ärztin.');
  });

  it('uses a gender-specific liability phrase for male doctors in part 2', () => {
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

    expect(part2Text).toContain('Sehr geehrter Herr Muster,');
    expect(part2Text).toContain('Haftungsansprüche gegenüber meinem Arzt.');
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
    expect(part1Text).toContain(
      'Ich beantrage hilfsweise eine Genehmigung nach § 2 Abs. 1a SGB V.',
    );
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain(POINT_10_BRIDGE_TEXT);
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
      'Die Diagnose Fatigue bei Long-/Post-COVID ist gesichert (siehe Befunde)',
    );
    expect(part1ListItems).toContain(
      'Indikation: Long-/Post-COVID mit Fatigue',
    );
    expect(part1Text).not.toContain('und/oder');
    expect(part2Text).toContain(
      'für eine Off-Label-Verordnung von Agomelatin mit der Indikation Long-/Post-COVID mit Fatigue',
    );
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
      'Die Diagnose depressive Symptome im Rahmen von Long/Post-COVID ist gesichert',
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
});
