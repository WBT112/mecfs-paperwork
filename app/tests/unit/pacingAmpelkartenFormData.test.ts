import { describe, expect, it } from 'vitest';
import { mergePacingFormData } from '../../src/formpacks/pacing-ampelkarten/formData';

describe('mergePacingFormData', () => {
  it('keeps the hidden child section when visible-only adult changes omit it', () => {
    const current = {
      meta: {
        introAccepted: true,
        variant: 'adult',
      },
      adult: {
        cards: {
          green: {
            canDo: ['Adult text'],
          },
        },
      },
      child: {
        cards: {
          green: {
            canDo: ['Child text'],
          },
        },
      },
      notes: {
        items: ['Current note'],
      },
      sender: {
        signature: 'Current signature',
      },
    };

    const incoming = {
      meta: {
        variant: 'adult',
      },
      adult: {
        cards: {
          green: {
            canDo: ['Updated adult text'],
          },
        },
      },
      notes: {
        items: ['Incoming note'],
      },
      sender: {
        signature: 'Incoming signature',
      },
    };

    const result = mergePacingFormData(current, incoming, 'de');

    expect(result.meta).toEqual({
      introAccepted: true,
      variant: 'adult',
    });
    expect(result.adult).toEqual(incoming.adult);
    expect(result.child).toEqual(current.child);
    expect(result.notes).toEqual(incoming.notes);
    expect(result.sender).toEqual(incoming.sender);
  });

  it('hydrates missing sections from German defaults when neither state contains them', () => {
    const result = mergePacingFormData(
      {
        meta: {
          variant: 'child',
        },
      },
      {
        meta: {
          variant: 'child',
        },
      },
      'de',
    );

    expect(result.child).toMatchObject({
      cards: {
        green: {},
      },
    });
    expect(
      (result.child as { cards: { green: { canDo: string[] } } }).cards.green
        .canDo,
    ).toContain(
      'Heute ist ein guter Tag für kurze Gespräche oder eine kleine Sache zusammen.',
    );
    expect(result.sender).toEqual({
      signature: 'Deine / Dein ...',
    });
    expect(result.notes).toMatchObject({
      title: 'Notizen / individuelle Regeln',
    });
  });

  it('hydrates missing sections from English defaults for adult mode', () => {
    const result = mergePacingFormData(
      {},
      {
        meta: {
          variant: 'adult',
        },
      },
      'en',
    );

    expect(result.meta).toEqual({
      variant: 'adult',
    });
    expect(result.adult).toMatchObject({
      cards: {
        green: {},
      },
    });
    expect(
      (result.adult as { cards: { green: { canDo: string[] } } }).cards.green
        .canDo,
    ).toContain('Short conversations are possible (around 10-20 minutes).');
    expect(result.sender).toEqual({
      signature: 'Love, ...',
    });
  });

  it('defaults to adult presets when the incoming variant is missing', () => {
    const result = mergePacingFormData({}, {}, 'de');

    expect(result.meta).toEqual({
      variant: 'adult',
    });
    expect(result.adult).toMatchObject({
      cards: {
        green: {},
      },
    });
    expect(
      (result.adult as { cards: { green: { canDo: string[] } } }).cards.green
        .canDo,
    ).toContain('Kurze Gespräche sind möglich (ca. 10-20 Minuten).');
  });
});
