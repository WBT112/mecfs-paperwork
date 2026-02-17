import { describe, expect, it } from 'vitest';
import { buildOfflabelDocuments } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const IVABRADIN_DIAGNOSIS_TEXT =
  'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit';
const SECTION_2A_TEXT = '§ 2 Abs. 1a SGB V';
const IVABRADINE_EXPERT_SOURCE =
  'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).';
const CASE_TRANSFER_YES_TEXT =
  'Diese Erkenntnisse sind auf meinen Einzelfall übertragbar.';
const EVIDENCE_NOTE_TEXT =
  'Die beigefügten Quellen sind eine Auswahl und erheben keinen Anspruch auf Vollständigkeit;';
const HILFSANTRAG_INTRO_TEXT =
  'Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V.';
const POINT_10_BRIDGE_TEXT =
  'Selbst wenn eine formelle Zulassungsreife im engeren Sinne verneint würde';
const POINT_10_SAFETY_TEXT =
  'Die beantragte Therapie erfolgt entsprechend der dargestellten evidenzbasierten Empfehlungen ärztlich kontrolliert, befristet und unter klar definierten Abbruchkriterien.';
const POINT_7_SAFETY_TEXT =
  'Die beantragte Therapie erfolgt im Rahmen einer sorgfältigen individuellen Nutzen-Risiko-Abwägung, ärztlich überwacht und zeitlich befristet.';

describe('buildOfflabelDocuments', () => {
  it('builds three parts and includes point-10 evidence text for known medication', () => {
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

    expect(part1Text).toContain('Punkt 2: Die Diagnose ist gesichert');
    expect(part1Text).not.toContain('Punkt 7:');
    expect(part1Text).not.toContain('Punkt 9:');
    expect(part1Text).toContain('Punkt 10:');
    expect(part1Text).toContain(`Indikation: ${IVABRADIN_DIAGNOSIS_TEXT}`);
    expect(part1Text).toContain('Dosierung/Dauer: Start 2,5 mg morgens');
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
      'Die Leitlinie enthält keine positiven Empfehlungen zur medikamentösen Therapie.',
    );
    expect(part1Text).toContain('Mit freundlichen Grüßen');

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part3Text).toContain(
      `Der Patient leidet an den typischen Symptomen der Indikation ${IVABRADIN_DIAGNOSIS_TEXT}.`,
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

    expect(part1Text).toContain('Mit freundlichen Grüßen');
    expect(part1Text).toContain('Max Mustermann');
  });

  it('builds coherent other-medication flow with point-9 text and user diagnosis', () => {
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

    expect(part1Text).toContain(
      'Punkt 1: Das Medikament anderes Medikament oder andere Indikation ist in Deutschland nicht indikationszogen zugelassen',
    );
    expect(part1Text).toContain(
      'Punkt 2: Die Diagnose Seltene XYZ-Indikation ist gesichert',
    );
    expect(part1Text).toContain('Punkt 7:');
    expect(part1Text).toContain('Punkt 9:');
    expect(part1Text).not.toContain('Punkt 10:');
    expect(part1Text).toContain('Indikation: Seltene XYZ-Indikation');
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
    expect(part1Text).toContain(POINT_7_SAFETY_TEXT);
    expect(part1Text).toContain(
      'Zusätzlich wurden folgende Therapieversuche unternommen:',
    );

    const part1ListItems = docs[0].blocks
      .filter((block) => block.kind === 'list')
      .flatMap((block) => block.items);
    expect(part1ListItems).toContain('Betablocker (nicht verträglich)');
    expect(part1ListItems).toContain(
      'Kompressionstherapie ohne ausreichenden Effekt',
    );

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
      line.includes('Mein Bell-Score liegt bei 30.'),
    );
    expect(bellLine).toBeDefined();
    expect(bellLine).toContain('Der Bell-Score ist eine zentrale Kennzahl');
    expect(bellLine).toContain('hausgebunden');
    expect(bellLine).toContain('mehrtägige Erholungsphasen');
    expect(bellLine).toContain('soziale');
    expect(bellLine).toContain('grundsätzlich und dauerhaft eingeschränkt');
    expect(part1ListItems).toContain(
      'Zudem wurden mir die Merkzeichen G, H, B zuerkannt.',
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
      'Zudem wurden mir die Merkzeichen G, aG, H, B zuerkannt.',
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

  it('uses user-entered medication name for other in part 1 and part 2', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'other',
        otherDrugName: 'Midodrin',
        otherIndication: 'Orthostatische Intoleranz',
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

    expect(part1Text).toContain(
      'Punkt 1: Das Medikament Midodrin ist in Deutschland nicht indikationszogen zugelassen',
    );
    expect(part2Text).toContain(
      'für eine Off-Label-Verordnung von Midodrin wegen meiner ME/CFS',
    );
    expect(part2Text).toContain(
      'sowie die Begleitung bei der Behandlung. Gern können Sie den von mir formulierten Vorschlag verwenden oder anpassen.',
    );
    expect(part2Text).toContain(
      'nicht für meine Indikation zugelassenen Medikament Midodrin („Off-Label-Use“)',
    );
  });

  it('adds point 7 for standard medication when §2 checkbox is enabled', () => {
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
    expect(part1Text).toContain('Punkt 7:');
    expect(part1Text).toContain(
      'Punkt 7: Im Rahmen des hilfsweise gestellten Antrags nach § 2 Abs. 1a SGB V sind die Voraussetzungen in meinem Fall erfüllt.',
    );
    expect(part1Text).toContain(SECTION_2A_TEXT);
    expect(part1Text).toContain(POINT_10_BRIDGE_TEXT);
    expect(part1Text).toContain(POINT_10_SAFETY_TEXT);
    expect(part1Text).toContain(POINT_7_SAFETY_TEXT);
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
    expect(part1Text).toContain('Punkt 10:');
  });

  it('maps legacy drug keys to standard medication facts in preview', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradin',
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(
      'Punkt 1: Das Medikament Ivabradin ist in Deutschland nicht indikationszogen zugelassen',
    );
    expect(part1Text).toContain('Punkt 10:');
    expect(part1Text).toContain(CASE_TRANSFER_YES_TEXT);
    expect(part1Text).toContain(EVIDENCE_NOTE_TEXT);
    expect(part1Text).toContain('Bewertung Ivabradin');
    const yesPathSourceIndex = part1Text.indexOf(IVABRADINE_EXPERT_SOURCE);
    const yesPathTransferIndex = part1Text.indexOf(CASE_TRANSFER_YES_TEXT);
    expect(yesPathSourceIndex).toBeGreaterThan(-1);
    expect(yesPathTransferIndex).toBeGreaterThan(yesPathSourceIndex);
    expect(part1Text).not.toContain(
      '[bitte medikamentenspezifische Quelle ergänzen]',
    );
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
    expect(part3Text).toContain(
      'Diagnose: postinfektiösem ME/CFS und/oder Long-/Post-COVID mit Fatigue',
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

    expect(part1Text).toContain('Punkt 1: Das Medikament Ivabradin');
    expect(part1Text).toContain('Punkt 10:');
  });
});
