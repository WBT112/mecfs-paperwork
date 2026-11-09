import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRepresentativeLetterState } from '../../src/features/representative-letter/model';
import {
  REPRESENTATIVE_LETTER_SESSION_KEY,
  clearRepresentativeLetterState,
  readRepresentativeLetterState,
  writeRepresentativeLetterState,
  type RepresentativeLetterSessionStorage,
} from '../../src/features/representative-letter/sessionState';

const PREVIOUS_KEY = 'mecfs-paperwork.representative-letter.state.v4';
const RECIPIENT_ID = 'representative-example';
const createMemoryStorage = (): RepresentativeLetterSessionStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const createPopulatedState = () => ({
  ...createDefaultRepresentativeLetterState(),
  recipientId: RECIPIENT_ID,
});

describe('representative-letter session state', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0));
  afterEach(() => vi.restoreAllMocks());

  it('creates only current schema fields and restores them unchanged', () => {
    const storage = createMemoryStorage();
    const state = createPopulatedState();
    expect(state).toEqual({
      version: 5,
      recipientId: RECIPIENT_ID,
      variant: createDefaultRepresentativeLetterState().variant,
    });
    expect(writeRepresentativeLetterState(state, storage)).toBe(true);
    expect(readRepresentativeLetterState(storage)).toEqual(state);
  });

  it('uses browser storage when no storage is supplied', () => {
    const state = createPopulatedState();
    expect(writeRepresentativeLetterState(state)).toBe(true);
    expect(readRepresentativeLetterState()).toEqual(state);
    expect(clearRepresentativeLetterState()).toBe(true);
  });

  it('recovers when obtaining browser storage itself throws', () => {
    vi.spyOn(globalThis, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    expect(readRepresentativeLetterState()).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(writeRepresentativeLetterState(createPopulatedState())).toBe(false);
    expect(clearRepresentativeLetterState()).toBe(false);
  });

  it('keeps separate tab storage independent and initializes empty storage', () => {
    const firstTab = createMemoryStorage();
    const secondTab = createMemoryStorage();
    writeRepresentativeLetterState(createPopulatedState(), firstTab);
    expect(readRepresentativeLetterState(firstTab)).toEqual(
      createPopulatedState(),
    );
    expect(readRepresentativeLetterState(secondTab)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it.each([
    null,
    'invalid',
    [],
    { version: 9, recipientId: null },
    { version: 5, recipientId: 2 },
    { version: 5, recipientId: ' ' },
  ])('rejects invalid current state %j', (value) => {
    const storage = createMemoryStorage();
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(value));
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });

  it('preserves a null recipient in current state', () => {
    const storage = createMemoryStorage();
    const state = createDefaultRepresentativeLetterState();
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(state));
    expect(readRepresentativeLetterState(storage)).toEqual(state);
  });

  it.each([RECIPIENT_ID, null])(
    'migrates the immediately previous schema with recipient %s',
    (recipientId) => {
      const storage = createMemoryStorage();
      storage.setItem(
        PREVIOUS_KEY,
        JSON.stringify({ version: 4, recipientId }),
      );
      const expected = {
        ...createDefaultRepresentativeLetterState(),
        recipientId,
      };
      expect(readRepresentativeLetterState(storage)).toEqual(expected);
      expect(storage.getItem(PREVIOUS_KEY)).toBeNull();
      expect(storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY)).toBe(
        JSON.stringify(expected),
      );
    },
  );

  it.each([
    null,
    { version: 3, recipientId: RECIPIENT_ID },
    { version: 4, recipientId: [] },
  ])('discards invalid previous state %j', (value) => {
    const storage = createMemoryStorage();
    storage.setItem(PREVIOUS_KEY, JSON.stringify(value));
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(storage.getItem(PREVIOUS_KEY)).toBeNull();
  });

  it('discards retired values without reading or parsing their contents', () => {
    const storage = createMemoryStorage();
    const retiredKeys = [1, 2, 3].map(
      (version) => `mecfs-paperwork.representative-letter.state.v${version}`,
    );
    for (const key of retiredKeys) storage.setItem(key, 'retired');
    const getItem = vi.spyOn(storage, 'getItem');
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    for (const key of retiredKeys) {
      expect(getItem).not.toHaveBeenCalledWith(key);
      expect(storage.getItem(key)).toBeNull();
    }
  });

  it('resamples obsolete variants while preserving the recipient', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      REPRESENTATIVE_LETTER_SESSION_KEY,
      JSON.stringify({
        ...createPopulatedState(),
        variant: {
          ...createPopulatedState().variant,
          catalogVersion: 'obsolete',
        },
      }),
    );
    expect(readRepresentativeLetterState(storage)).toEqual(
      createPopulatedState(),
    );
  });

  it('migrates only the recipient from v4 even if extra fields are present', () => {
    const storage = createMemoryStorage();
    const variant = {
      ...createPopulatedState().variant,
      subjectId: 'subject-30',
      bodyId: 'body-30',
    };
    storage.setItem(
      PREVIOUS_KEY,
      JSON.stringify({
        version: 4,
        recipientId: RECIPIENT_ID,
        variant,
        unused: 'discard',
      }),
    );
    expect(readRepresentativeLetterState(storage)).toEqual(
      createPopulatedState(),
    );
  });

  it.each([REPRESENTATIVE_LETTER_SESSION_KEY, PREVIOUS_KEY])(
    'recovers from malformed JSON at %s',
    (key) => {
      const storage = createMemoryStorage();
      storage.setItem(key, '{');
      expect(readRepresentativeLetterState(storage)).toEqual(
        createDefaultRepresentativeLetterState(),
      );
    },
  );

  it('clears supported and retired tool data while retaining unrelated data', () => {
    const storage = createMemoryStorage();
    const keys = [
      REPRESENTATIVE_LETTER_SESSION_KEY,
      PREVIOUS_KEY,
      ...[1, 2, 3].map(
        (version) => `mecfs-paperwork.representative-letter.state.v${version}`,
      ),
    ];
    for (const key of keys) storage.setItem(key, 'tool');
    storage.setItem('unrelated', 'keep');
    expect(clearRepresentativeLetterState(storage)).toBe(true);
    for (const key of keys) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('handles inaccessible storage and reports write and removal failures', () => {
    const storage: RepresentativeLetterSessionStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(),
    };
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(
      writeRepresentativeLetterState(createPopulatedState(), storage),
    ).toBe(false);
    vi.mocked(storage.removeItem).mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
    expect(clearRepresentativeLetterState(storage)).toBe(false);
  });

  it('recovers when the previous state cannot be persisted', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      PREVIOUS_KEY,
      JSON.stringify({ version: 4, recipientId: RECIPIENT_ID }),
    );
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readRepresentativeLetterState(storage)).toEqual(
      createDefaultRepresentativeLetterState(),
    );
  });
});
