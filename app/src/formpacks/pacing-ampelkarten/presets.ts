type SupportedLocale = 'de' | 'en';
type PacingAmpelkartenVariant = 'adult' | 'child';

interface BaseCardPreset {
  canDo: string[];
  needHelp: string[];
  hint: string;
}

interface VariantCardsPreset<TCard extends BaseCardPreset> {
  green: TCard;
  yellow: TCard;
  red: TCard;
}

interface PacingAmpelkartenPreset {
  meta: {
    introAccepted: boolean;
    variant: PacingAmpelkartenVariant;
  };
  adult: {
    cards: VariantCardsPreset<BaseCardPreset>;
  };
  child: {
    cards: VariantCardsPreset<BaseCardPreset>;
  };
}

const createCardPreset = (
  canDo: string[],
  needHelp: string[],
  hint: string,
): BaseCardPreset => ({
  canDo,
  needHelp,
  hint,
});

const createVariantCardsPreset = (
  green: BaseCardPreset,
  yellow: BaseCardPreset,
  red: BaseCardPreset,
): VariantCardsPreset<BaseCardPreset> => ({
  green,
  yellow,
  red,
});

const createLocalePreset = (
  adultCards: VariantCardsPreset<BaseCardPreset>,
  childCards: VariantCardsPreset<BaseCardPreset>,
) => ({
  adult: { cards: adultCards },
  child: { cards: childCards },
});

const DE_PRESET = createLocalePreset(
  createVariantCardsPreset(
    createCardPreset(
      [
        'Kurze Gespräche sind möglich (ca. 10-20 Minuten).',
        'Kleine Aufgaben gehen (z. B. kurz Küche aufräumen).',
        'Kurze Nachrichten beantworten ist ok.',
        'Kurz an die frische Luft (5-10 Minuten), wenn es ruhig ist.',
      ],
      ['Wenn möglich: eine Aufgabe abnehmen (z. B. Einkauf oder Telefonat).'],
      'Pausen gehören zu meinem Pacing - ich schütze damit meine Energie.',
    ),
    createCardPreset(
      [
        'Nur kurze Gespräche (max. 5-10 Minuten).',
        'Lieber schriftlich als telefonisch.',
        'Viele Pausen und Rückzug.',
      ],
      [
        'Bitte übernimm heute Organisationskram (Telefonate/Termine/Rückfragen).',
        'Hilfe bei Haushalt/Kochen wäre toll.',
      ],
      'Weniger Kontakt heißt nicht weniger Wertschätzung. Ich brauche heute Ruhe, um keinen Crash auszulösen.',
    ),
    createCardPreset(
      ['Ich brauche Ruhe. Sprechen ist heute schwer.'],
      [
        'Bitte stelle Essen und Trinken bereit.',
        'Bitte übernimm Telefon, Klingel oder kurze Rückfragen.',
        'Bitte halte den Tag für mich möglichst reizarm und ruhig.',
      ],
      'Mein System ist heute im Alarmmodus. Ruhe hilft am meisten.',
    ),
  ),
  createVariantCardsPreset(
    createCardPreset(
      [
        'Heute ist ein guter Tag für kurze Gespräche oder eine kleine Sache zusammen.',
        'Kurze Nachrichten lesen oder beantworten geht oft gut.',
        'Ein kurzer ruhiger Moment draußen kann möglich sein.',
      ],
      ['Bitte hilf trotzdem beim Planen und erinnere mich an Pausen.'],
      'Heute ist ein guter Tag. Trotzdem helfen Pausen.',
    ),
    createCardPreset(
      [
        'Heute gehen nur kurze Gespräche oder Nachrichten.',
        'Ich brauche viele Pausen und möchte mich zwischendurch hinlegen.',
      ],
      [
        'Bitte übernimm heute Dinge, die anstrengend sind.',
        'Hilf mir dabei, dass alles ruhig und langsam bleibt.',
      ],
      'Heute ist ein vorsichtiger Tag. Bitte langsam und leise.',
    ),
    createCardPreset(
      ['Heute brauche ich ganz viel Ruhe.'],
      [
        'Bitte bring mir etwas zu trinken oder zu essen.',
        'Bitte halte Tür oder Telefon für mich ab, wenn es geht.',
        'Bitte hilf mit, dass alles leise und langsam bleibt.',
      ],
      'Heute ist ein Ruhetag. Bitte nichts erwarten.',
    ),
  ),
);

const EN_PRESET = createLocalePreset(
  createVariantCardsPreset(
    createCardPreset(
      [
        'Short conversations are possible (around 10-20 minutes).',
        'Small tasks are manageable (for example tidying up the kitchen a little).',
        'Replying to short messages is usually fine.',
        'A short quiet moment outside (5-10 minutes) may be possible.',
      ],
      [
        'If possible, please take one task off my plate (for example shopping or a phone call).',
      ],
      'Rest breaks are part of my pacing and help me protect my energy.',
    ),
    createCardPreset(
      [
        'Only short conversations are possible today (around 5-10 minutes).',
        'Written messages are better than phone calls.',
        'I need lots of breaks and time alone.',
      ],
      [
        'Please take over admin tasks today (calls, appointments, follow-up questions).',
        'Help with cooking or household tasks would really help.',
      ],
      'Less contact does not mean less appreciation. I need extra quiet today to avoid a crash.',
    ),
    createCardPreset(
      ['I need rest. Talking is very hard today.'],
      [
        'Please make sure food and drinks are within reach.',
        'Please handle the door, phone, or quick questions for me.',
        'Please help keep everything as calm and low-stimulation as possible.',
      ],
      'My system is on high alert today. Rest helps the most.',
    ),
  ),
  createVariantCardsPreset(
    createCardPreset(
      [
        'Today is a better day for a short chat or one small activity together.',
        'Short messages are usually okay.',
        'A calm moment outside might be possible.',
      ],
      ['Please still help me pace and remind me to rest before I overdo it.'],
      'Today is a better day. I still need breaks.',
    ),
    createCardPreset(
      [
        'Today I can only manage short chats or messages.',
        'I need lots of breaks and time to lie down quietly.',
      ],
      [
        'Please take over the tiring things today.',
        'Please help keep everything calm and slow.',
      ],
      'Today is a careful day. Please go slowly and keep things quiet.',
    ),
    createCardPreset(
      ['Today I need a lot of rest.'],
      [
        'Please bring me drinks or food if I need them.',
        'Please answer the door or phone for me if possible.',
        'Please help keep everything quiet and very low-key.',
      ],
      'Today is a rest day. Please do not expect anything from me.',
    ),
  ),
);

const PRESETS_BY_LOCALE = {
  de: DE_PRESET,
  en: EN_PRESET,
} as const;

const cloneCardPreset = (card: BaseCardPreset): BaseCardPreset => ({
  canDo: [...card.canDo],
  needHelp: [...card.needHelp],
  hint: card.hint,
});

const cloneVariantCardsPreset = (
  cards: VariantCardsPreset<BaseCardPreset>,
): VariantCardsPreset<BaseCardPreset> => ({
  green: cloneCardPreset(cards.green),
  yellow: cloneCardPreset(cards.yellow),
  red: cloneCardPreset(cards.red),
});

/**
 * Builds the initial pacing-card form data for the requested locale and variant.
 *
 * @param locale - Active UI locale used to pick locale-aware example content.
 * @param variant - Initial card variant that should be preselected in the form.
 * @returns A deep-cloned form-data object with editable defaults for both adult and child cards.
 * @remarks
 * RATIONALE: The preset contains both adult and child data so users can switch
 * variants later without losing the other example set. Only the selected
 * variant flag is locale-sensitive at creation time.
 */
export const buildPacingAmpelkartenPreset = (
  locale: SupportedLocale,
  variant: PacingAmpelkartenVariant,
): PacingAmpelkartenPreset => {
  const preset = PRESETS_BY_LOCALE[locale];
  const resolvedPreset: PacingAmpelkartenPreset = {
    meta: {
      introAccepted: false,
      variant,
    },
    adult: {
      cards: cloneVariantCardsPreset(preset.adult.cards),
    },
    child: {
      cards: cloneVariantCardsPreset(preset.child.cards),
    },
  };

  return resolvedPreset;
};
