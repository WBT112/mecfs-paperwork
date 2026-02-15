import { describe, expect, it } from 'vitest';
import { buildOfflabelDocuments } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

describe('buildOfflabelDocuments', () => {
  it('builds three parts and includes section2-specific points for known medication', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'ivabradine',
        indicationFullyMetOrDoctorConfirms: 'no',
        applySection2Abs1a: true,
      },
      severity: {
        gdb: '50',
        mobilityLevel: 'bedbound',
      },
    });

    expect(docs).toHaveLength(3);
    expect(docs.map((doc) => doc.id)).toEqual(['part1', 'part2', 'part3']);

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain('Punkt 2: Die Diagnose ist gesichert');
    expect(part1Text).toContain('Punkt 7:');
    expect(part1Text).toContain('Punkt 9:');
    expect(part1Text).toContain(
      'Die Erkenntnisse lassen sich auf meine Diagnosen übertragen',
    );

    const part3Text = docs[2].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');
    expect(part3Text).toContain(
      'Der Patient leidet an den typischen Symptomen der Indikation [XYZ].',
    );
  });

  it('builds coherent other-medication flow without section2 points', () => {
    const docs = buildOfflabelDocuments({
      request: {
        drug: 'other',
        applySection2Abs1a: true,
      },
    });

    const part1Text = docs[0].blocks
      .filter((block) => block.kind === 'paragraph')
      .map((block) => block.text)
      .join('\n');

    expect(part1Text).toContain(
      'Punkt 1: Das Medikament anderes Medikament oder andere Indikation ist in Deutschland nicht indikationszogen zugelassen',
    );
    expect(part1Text).not.toContain('Punkt 7:');
    expect(part1Text).not.toContain('Punkt 9:');
    expect(part1Text).toContain(
      'Hinweis: Bei Auswahl „anderes Medikament oder andere Indikation“',
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
  });
});
