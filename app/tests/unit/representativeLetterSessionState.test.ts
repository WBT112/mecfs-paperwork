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

const LEGACY_V2_KEY = 'mecfs-paperwork.representative-letter.state.v2';
const LEGACY_V1_KEY = 'mecfs-paperwork.representative-letter.state.v1';

const createMemoryStorage = (): RepresentativeLetterSessionStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const createPopulatedState = (): RepresentativeLetterState => ({
  version: 3,
  recipientId: 'representative-example',
  bodyLength: 'long',
});

describe('representative-letter session state', () => {
  it('creates a minimal privacy-preserving default state', () => {
    expect(createDefaultRepresentativeLetterState()).toEqual({
      version: 3,
      recipientId: null,
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
    ['recipient', { ...createPopulatedState(), recipientId: 2 }],
    ['empty recipient', { ...createPopulatedState(), recipientId: ' ' }],
    ['body length', { ...createPopulatedState(), bodyLength: 'medium' }],
  ])('rejects an invalid %s value', (_label, value) => {
    const storage = createMemoryStorage();
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(value));

    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it('accepts the short length and a null recipient', () => {
    const storage = createMemoryStorage();
    const state = createDefaultRepresentativeLetterState();
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(state));

    expect(readRepresentativeLetterState(storage)).toEqual(state);
  });

  it('migrates only recipient and length from the health-related v2 state', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LEGACY_V2_KEY,
      JSON.stringify({
        version: 2,
        view: 'information',
        recipientId: 'representative-example',
        severityId: 'severe',
        careStatusId: 'level-4',
        customExperience: 'Synthetic health detail',
        bodyLength: 'long',
      }),
    );
    storage.setItem(LEGACY_V1_KEY, 'obsolete');

    expect(readRepresentativeLetterState(storage)).toEqual(
      createPopulatedState(),
    );
    expect(storage.getItem(LEGACY_V2_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V1_KEY)).toBeNull();
    expect(storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY)).toBe(
      JSON.stringify(createPopulatedState()),
    );
  });

  it.each([
    ['non-object', 'legacy'],
    ['wrong version', { version: 1, recipientId: null, bodyLength: 'short' }],
    ['invalid recipient', { version: 2, recipientId: [], bodyLength: 'short' }],
    ['invalid length', { version: 2, recipientId: null, bodyLength: 'medium' }],
  ])('discards an invalid legacy %s state', (_label, value) => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_V2_KEY, JSON.stringify(value));

    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(storage.getItem(LEGACY_V2_KEY)).toBeNull();
  });

  it('clears current and legacy keys while retaining unrelated data', () => {
    const storage = createMemoryStorage();
    const unrelatedKey = 'unrelated';
    storage.setItem(unrelatedKey, 'keep');
    storage.setItem(LEGACY_V2_KEY, 'obsolete');
    storage.setItem(LEGACY_V1_KEY, 'obsolete');
    writeRepresentativeLetterState(createPopulatedState(), storage);

    expect(clearRepresentativeLetterState(storage)).toBe(true);
    expect(storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V1_KEY)).toBeNull();
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
