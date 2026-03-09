import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { buildPacingAmpelkartenPreset } from '../../src/formpacks/pacing-ampelkarten/presets';

const schemaPath = path.resolve(
  process.cwd(),
  'public/formpacks/pacing-ampelkarten/schema.json',
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('buildPacingAmpelkartenPreset', () => {
  it.each([
    ['de', 'adult'],
    ['de', 'child'],
    ['en', 'adult'],
    ['en', 'child'],
  ] as const)(
    'returns schema-valid form data for %s / %s',
    (locale, variant) => {
      const preset = buildPacingAmpelkartenPreset(locale, variant);

      expect(validate(preset)).toBe(true);
      expect(preset.meta).toEqual({
        introAccepted: false,
        variant,
      });
      expect(preset.adult.cards.green.canDo.length).toBeGreaterThan(0);
      expect(preset.child.cards.red.canDo.length).toBeGreaterThan(0);
      expect(preset.notes.items.length).toBe(2);
    },
  );

  it('uses German pacing language for the German preset', () => {
    const preset = buildPacingAmpelkartenPreset('de', 'adult');

    expect(preset.sender.signature).toBe('Deine / Dein ...');
    expect(preset.adult.cards.yellow.hint).toContain(
      'Weniger Kontakt heißt nicht weniger Wertschätzung.',
    );
    expect(preset.notes.title).toBe('Notizen / individuelle Regeln');
  });

  it('uses natural English copy for the English preset', () => {
    const preset = buildPacingAmpelkartenPreset('en', 'child');

    expect(preset.sender.signature).toBe('Love, ...');
    expect(preset.adult.cards.yellow.hint).toContain(
      'Less contact does not mean less appreciation.',
    );
    expect(preset.child.cards.green.hint).toBe(
      'Today is a better day. I still need breaks.',
    );
  });

  it('returns a fresh copy on every call', () => {
    const first = buildPacingAmpelkartenPreset('de', 'adult');
    const second = buildPacingAmpelkartenPreset('de', 'adult');

    first.notes.items.push('Additional note');
    first.child.cards.green.canDo[0] = 'Changed';

    expect(second.notes.items).toHaveLength(2);
    expect(second.child.cards.green.canDo[0]).not.toBe('Changed');
  });
});
