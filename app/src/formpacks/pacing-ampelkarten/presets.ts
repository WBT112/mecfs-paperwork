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
  sender: {
    signature: string;
  };
  adult: {
    cards: VariantCardsPreset<BaseCardPreset>;
  };
  child: {
    cards: VariantCardsPreset<BaseCardPreset>;
  };
}

const DE_PRESET = {
  sender: {
    signature: 'Deine / Dein ...',
  },
  adult: {
    cards: {
      green: {
        canDo: [
          'Kurze Gespräche sind möglich (ca. 10-20 Minuten).',
          'Kleine Aufgaben gehen (z. B. kurz Küche aufräumen).',
          'Kurze Nachrichten beantworten ist ok.',
          'Kurz an die frische Luft (5-10 Minuten), wenn es ruhig ist.',
        ],
        needHelp: [
          'Wenn möglich: eine Aufgabe abnehmen (z. B. Einkauf oder Telefonat).',
        ],
        hint: 'Pausen gehören zu meinem Pacing - ich schütze damit meine Energie.',
      },
      yellow: {
        canDo: [
          'Nur kurze Gespräche (max. 5-10 Minuten).',
          'Lieber schriftlich als telefonisch.',
          'Viele Pausen und Rückzug.',
        ],
        needHelp: [
          'Bitte übernimm heute Organisationskram (Telefonate/Termine/Rückfragen).',
          'Hilfe bei Haushalt/Kochen wäre toll.',
        ],
        hint: 'Weniger Kontakt heißt nicht weniger Wertschätzung. Ich brauche heute Ruhe, um keinen Crash auszulösen.',
      },
      red: {
        canDo: [
          'Ich brauche Ruhe. Sprechen ist heute schwer.',
          'Wenn möglich: nur kurze Nachrichten. Keine Anrufe.',
        ],
        needHelp: [
          'Essen/Trinken bereitstellen.',
          'Tür/Telefon abfangen, falls nötig.',
        ],
        hint: 'Mein System ist heute im Alarmmodus. Ruhe hilft am meisten.',
      },
    },
  },
  child: {
    cards: {
      green: {
        canDo: [
          'Heute ist ein guter Tag für kurze Gespräche oder eine kleine Sache zusammen.',
          'Kurze Nachrichten lesen oder beantworten geht oft gut.',
          'Ein kurzer ruhiger Moment draußen kann möglich sein.',
        ],
        needHelp: [
          'Bitte hilf trotzdem beim Planen und erinnere mich an Pausen.',
        ],
        hint: 'Heute ist ein guter Tag. Trotzdem helfen Pausen.',
      },
      yellow: {
        canDo: [
          'Heute gehen nur kurze Gespräche oder Nachrichten.',
          'Ich brauche viele Pausen und möchte mich zwischendurch hinlegen.',
        ],
        needHelp: [
          'Bitte übernimm heute Dinge, die anstrengend sind.',
          'Hilf mir dabei, dass alles ruhig und langsam bleibt.',
        ],
        hint: 'Heute ist ein vorsichtiger Tag. Bitte langsam und leise.',
      },
      red: {
        canDo: [
          'Heute brauche ich ganz viel Ruhe.',
          'Wenn überhaupt, dann nur ganz kurze Nachrichten statt Anrufen.',
        ],
        needHelp: [
          'Bitte bring mir etwas zu trinken oder zu essen.',
          'Bitte halte Tür oder Telefon für mich ab, wenn es geht.',
        ],
        hint: 'Heute ist ein Ruhetag. Bitte nichts erwarten.',
      },
    },
  },
};

const EN_PRESET = {
  sender: {
    signature: 'Love, ...',
  },
  adult: {
    cards: {
      green: {
        canDo: [
          'Short conversations are possible (around 10-20 minutes).',
          'Small tasks are manageable (for example tidying up the kitchen a little).',
          'Replying to short messages is usually fine.',
          'A short quiet moment outside (5-10 minutes) may be possible.',
        ],
        needHelp: [
          'If possible, please take one task off my plate (for example shopping or a phone call).',
        ],
        hint: 'Rest breaks are part of my pacing and help me protect my energy.',
      },
      yellow: {
        canDo: [
          'Only short conversations are possible today (around 5-10 minutes).',
          'Written messages are better than phone calls.',
          'I need lots of breaks and time alone.',
        ],
        needHelp: [
          'Please take over admin tasks today (calls, appointments, follow-up questions).',
          'Help with cooking or household tasks would really help.',
        ],
        hint: 'Less contact does not mean less appreciation. I need extra quiet today to avoid a crash.',
      },
      red: {
        canDo: [
          'I need rest. Talking is very hard today.',
          'If possible, please use short messages only. No calls.',
        ],
        needHelp: [
          'Please make sure food and drinks are within reach.',
          'Please handle the door or phone if needed.',
        ],
        hint: 'My system is on high alert today. Rest helps the most.',
      },
    },
  },
  child: {
    cards: {
      green: {
        canDo: [
          'Today is a better day for a short chat or one small activity together.',
          'Short messages are usually okay.',
          'A calm moment outside might be possible.',
        ],
        needHelp: [
          'Please still help me pace and remind me to rest before I overdo it.',
        ],
        hint: 'Today is a better day. I still need breaks.',
      },
      yellow: {
        canDo: [
          'Today I can only manage short chats or messages.',
          'I need lots of breaks and time to lie down quietly.',
        ],
        needHelp: [
          'Please take over the tiring things today.',
          'Please help keep everything calm and slow.',
        ],
        hint: 'Today is a careful day. Please go slowly and keep things quiet.',
      },
      red: {
        canDo: [
          'Today I need a lot of rest.',
          'If needed, please only send very short messages instead of calling.',
        ],
        needHelp: [
          'Please bring me drinks or food if I need them.',
          'Please answer the door or phone for me if possible.',
        ],
        hint: 'Today is a rest day. Please do not expect anything from me.',
      },
    },
  },
};

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
    sender: {
      signature: preset.sender.signature,
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
