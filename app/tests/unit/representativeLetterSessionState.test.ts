import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultRepresentativeLetterState,
  type RepresentativeLetterState,
} from '../../src/features/representative-letter/model';
import {
  REPRESENTATIVE_LETTER_SESSION_KEY,
  clearRepresentativeLetterState,
  readRepresentativeLetterState,
  writeRepresentativeLetterState,
  type RepresentativeLetterSessionStorage,
} from '../../src/features/representative-letter/sessionState';

const createMemoryStorage = (): RepresentativeLetterSessionStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const createPopulatedState = (): RepresentativeLetterState => ({
  ...createDefaultRepresentativeLetterState(),
  view: 'letter',
  recipientId: 'representative-example',
  severityId: 'severity-example',
  severityVariantId: 'alternative',
  careStatusId: 'care-status-example',
  careStatusVariantId: 'alternative',
  includePersonalDetailsInShortBody: true,
  bodyLength: 'long',
});

describe('representative-letter session state', () => {
  it('creates a privacy-preserving default state', () => {
    expect(createDefaultRepresentativeLetterState()).toEqual({
      version: 1,
      view: 'information',
      recipientId: null,
      severityId: null,
      severityVariantId: 'standard',
      careStatusId: null,
      careStatusVariantId: 'standard',
      includePersonalDetailsInShortBody: false,
      bodyLength: 'short',
    });
  });

  it('round-trips valid state in one tab-local storage instance', () => {
    const storage = createMemoryStorage();
    const state = createPopulatedState();

    expect(writeRepresentativeLetterState(state, storage)).toBe(true);
    expect(readRepresentativeLetterState(storage)).toEqual(state);
  });

  it('keeps separate tab-local storage instances independent', () => {
    const firstTab = createMemoryStorage();
    const secondTab = createMemoryStorage();
    const firstState = createPopulatedState();

    writeRepresentativeLetterState(firstState, firstTab);

    expect(readRepresentativeLetterState(firstTab)).toEqual(firstState);
    expect(readRepresentativeLetterState(secondTab)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it('uses the default state for malformed JSON and inaccessible storage', () => {
    const malformedStorage = createMemoryStorage();
    malformedStorage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, '{');
    const inaccessibleStorage: RepresentativeLetterSessionStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(readRepresentativeLetterState(malformedStorage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(readRepresentativeLetterState(inaccessibleStorage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it.each([
    ['null root', null],
    ['primitive root', 'invalid'],
    ['version', { ...createPopulatedState(), version: 2 }],
    ['view', { ...createPopulatedState(), view: 'invalid' }],
    ['recipient', { ...createPopulatedState(), recipientId: 2 }],
    ['empty recipient', { ...createPopulatedState(), recipientId: ' ' }],
    ['severity', { ...createPopulatedState(), severityId: false }],
    [
      'empty severity variant',
      { ...createPopulatedState(), severityVariantId: '' },
    ],
    [
      'severity variant type',
      { ...createPopulatedState(), severityVariantId: 1 },
    ],
    ['care status', { ...createPopulatedState(), careStatusId: [] }],
    [
      'empty care variant',
      { ...createPopulatedState(), careStatusVariantId: ' ' },
    ],
    [
      'care variant type',
      { ...createPopulatedState(), careStatusVariantId: null },
    ],
    [
      'personal-details flag',
      { ...createPopulatedState(), includePersonalDetailsInShortBody: 'yes' },
    ],
    ['body length', { ...createPopulatedState(), bodyLength: 'medium' }],
  ])('rejects an invalid %s value', (_label, value) => {
    const storage = createMemoryStorage();
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(value));

    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it('accepts both views, lengths, and null optional selections', () => {
    const storage = createMemoryStorage();
    const state: RepresentativeLetterState = {
      ...createDefaultRepresentativeLetterState(),
      view: 'information',
      bodyLength: 'short',
    };
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(state));

    expect(readRepresentativeLetterState(storage)).toEqual(state);
  });

  it('clears only its own key', () => {
    const storage = createMemoryStorage();
    const unrelatedKey = 'unrelated';
    storage.setItem(unrelatedKey, 'keep');
    writeRepresentativeLetterState(createPopulatedState(), storage);

    expect(clearRepresentativeLetterState(storage)).toBe(true);
    expect(storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY)).toBeNull();
    expect(storage.getItem(unrelatedKey)).toBe('keep');
  });

  it('reports blocked writes and removals without throwing', () => {
    const storage: RepresentativeLetterSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };

    expect(
      writeRepresentativeLetterState(createPopulatedState(), storage),
    ).toBe(false);
    expect(clearRepresentativeLetterState(storage)).toBe(false);
  });
});
