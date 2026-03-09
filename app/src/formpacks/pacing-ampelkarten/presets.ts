type SupportedLocale = 'de' | 'en';
type PacingAmpelkartenVariant = 'adult' | 'child';

interface BaseCardPreset {
  canDo: string[];
  needHelp: string[];
  visitRules: string[];
  stimuli: string[];
  hint: string;
  thanks: string;
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
  notes: {
    title: string;
    items: string[];
  };
}

type LocalePresetContent = Omit<PacingAmpelkartenPreset, 'meta'>;

const DE_PRESET: LocalePresetContent = {
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
        visitRules: [
          'Kurzer Besuch ist möglich - bitte vorher kurz anfragen.',
          'Maximal 1-2 Personen, ohne Programm.',
        ],
        stimuli: [
          'Bitte leise sprechen, keine Musik/TV laut.',
          'Bitte keine starken Düfte (Parfum/Deo).',
          'Licht lieber weich/gedimmt.',
        ],
        hint: 'Pausen gehören zu meinem Pacing - ich schütze damit meine Energie.',
        thanks: 'Danke, dass du Rücksicht nimmst. 💙',
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
        visitRules: [
          'Besuch nur nach Absprache und kurz (15-30 Minuten).',
          'Bitte nur eine Person gleichzeitig.',
        ],
        stimuli: [
          'Bitte leise, keine Fragenketten.',
          'Handy auf lautlos / Klingel vermeiden (wenn möglich).',
          'Keine starken Gerüche, wenig Licht.',
        ],
        hint: 'Weniger Kontakt heißt nicht weniger Wertschätzung. Ich brauche heute Ruhe, um keinen Crash auszulösen.',
        thanks: 'Danke für Geduld und Verständnis. 💙',
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
        visitRules: [
          'Bitte kein Besuch.',
          'Nur bei echter Dringlichkeit - am besten per Nachricht.',
        ],
        stimuli: [
          'So ruhig wie möglich: leise, wenig Licht, keine Gerüche.',
          'Bitte nicht klingeln/klopfen (wenn vermeidbar).',
        ],
        hint: 'Mein System ist heute im Alarmmodus. Ruhe hilft am meisten.',
        thanks: 'Danke, dass du Ruhe möglich machst. 💙',
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
        visitRules: [
          'Kurzer Besuch ist ok, wenn er vorher abgesprochen ist.',
          'Bitte nur wenige Leute auf einmal und kein volles Programm.',
        ],
        stimuli: [
          'Bitte leise sprechen und Musik oder TV nicht laut machen.',
          'Licht lieber weich und keine starken Gerüche.',
        ],
        hint: 'Heute ist ein guter Tag. Trotzdem helfen Pausen.',
        thanks: 'Danke, dass du so rücksichtsvoll bist. 💙',
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
        visitRules: [
          'Besuch bitte nur kurz und nur nach Absprache.',
          'Bitte nur eine Person gleichzeitig.',
        ],
        stimuli: [
          'Bitte leise sprechen und nicht viele Fragen hintereinander stellen.',
          'Wenig Licht, keine Klingel und keine starken Gerüche helfen mir.',
        ],
        hint: 'Heute ist ein vorsichtiger Tag. Bitte langsam und leise.',
        thanks: 'Danke für Geduld und Verständnis. 💙',
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
        visitRules: [
          'Bitte heute kein Besuch.',
          'Nur bei echter Dringlichkeit und am besten erst per Nachricht.',
        ],
        stimuli: [
          'Bitte alles so ruhig wie möglich halten: leise, wenig Licht, keine Gerüche.',
          'Bitte nicht klingeln oder klopfen, wenn es vermeidbar ist.',
        ],
        hint: 'Heute ist ein Ruhetag. Bitte nichts erwarten.',
        thanks: 'Danke, dass du mir Ruhe schenkst. 💙',
      },
    },
  },
  notes: {
    title: 'Notizen / individuelle Regeln',
    items: [
      'Beispiel: Kurze Besuche nur nach Absprache.',
      'Beispiel: Bitte keine spontanen Telefonate.',
    ],
  },
};

const EN_PRESET: LocalePresetContent = {
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
        visitRules: [
          'A short visit is possible - please check in first.',
          'No more than 1-2 people at a time and no programme around it.',
        ],
        stimuli: [
          'Please keep voices low and avoid loud music or TV.',
          'Please avoid strong fragrances.',
          'Soft or dimmed light is easier for me.',
        ],
        hint: 'Rest breaks are part of my pacing and help me protect my energy.',
        thanks: 'Thank you for being considerate. 💙',
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
        visitRules: [
          'Visits only after checking in first and only for a short time (15-30 minutes).',
          'Please keep it to one person at a time.',
        ],
        stimuli: [
          'Please stay quiet and avoid asking many questions in a row.',
          'Silent phones and as little doorbell noise as possible help.',
          'Low light and no strong smells are best.',
        ],
        hint: 'Less contact does not mean less appreciation. I need extra quiet today to avoid a crash.',
        thanks: 'Thank you for your patience and understanding. 💙',
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
        visitRules: [
          'Please no visitors today.',
          'Only if it is truly urgent - ideally send a message first.',
        ],
        stimuli: [
          'As calm as possible: low noise, low light, no fragrances.',
          'Please avoid ringing or knocking if at all possible.',
        ],
        hint: 'My system is on high alert today. Rest helps the most.',
        thanks: 'Thank you for helping me keep things quiet. 💙',
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
        visitRules: [
          'A short visit is okay if we plan it first.',
          'Please keep it to a few people and no busy schedule.',
        ],
        stimuli: [
          'Please use quiet voices and keep music or TV low.',
          'Soft light and no strong smells help me.',
        ],
        hint: 'Today is a better day. I still need breaks.',
        thanks: 'Thank you for being so kind and careful. 💙',
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
        visitRules: [
          'Visits should be short and only after checking first.',
          'Please only one person at a time.',
        ],
        stimuli: [
          'Please speak softly and do not ask lots of questions one after another.',
          'Low light, no ringing, and no strong smells help me.',
        ],
        hint: 'Today is a careful day. Please go slowly and keep things quiet.',
        thanks: 'Thank you for being patient with me. 💙',
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
        visitRules: [
          'Please no visitors today.',
          'Only contact me if it is really urgent, and message first if you can.',
        ],
        stimuli: [
          'Please keep everything as calm as possible: quiet, low light, no smells.',
          'Please do not ring or knock unless you really have to.',
        ],
        hint: 'Today is a rest day. Please do not expect anything from me.',
        thanks: 'Thank you for helping me rest. 💙',
      },
    },
  },
  notes: {
    title: 'Notes / personal rules',
    items: [
      'Example: Short visits only after checking first.',
      'Example: Please no spontaneous phone calls.',
    ],
  },
};

const PRESETS_BY_LOCALE: Record<SupportedLocale, LocalePresetContent> = {
  de: DE_PRESET,
  en: EN_PRESET,
};

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
      cards: {
        green: {
          ...preset.adult.cards.green,
          canDo: [...preset.adult.cards.green.canDo],
          needHelp: [...preset.adult.cards.green.needHelp],
          visitRules: [...preset.adult.cards.green.visitRules],
          stimuli: [...preset.adult.cards.green.stimuli],
        },
        yellow: {
          ...preset.adult.cards.yellow,
          canDo: [...preset.adult.cards.yellow.canDo],
          needHelp: [...preset.adult.cards.yellow.needHelp],
          visitRules: [...preset.adult.cards.yellow.visitRules],
          stimuli: [...preset.adult.cards.yellow.stimuli],
        },
        red: {
          ...preset.adult.cards.red,
          canDo: [...preset.adult.cards.red.canDo],
          needHelp: [...preset.adult.cards.red.needHelp],
          visitRules: [...preset.adult.cards.red.visitRules],
          stimuli: [...preset.adult.cards.red.stimuli],
        },
      },
    },
    child: {
      cards: {
        green: {
          ...preset.child.cards.green,
          canDo: [...preset.child.cards.green.canDo],
          needHelp: [...preset.child.cards.green.needHelp],
          visitRules: [...preset.child.cards.green.visitRules],
          stimuli: [...preset.child.cards.green.stimuli],
        },
        yellow: {
          ...preset.child.cards.yellow,
          canDo: [...preset.child.cards.yellow.canDo],
          needHelp: [...preset.child.cards.yellow.needHelp],
          visitRules: [...preset.child.cards.yellow.visitRules],
          stimuli: [...preset.child.cards.yellow.stimuli],
        },
        red: {
          ...preset.child.cards.red,
          canDo: [...preset.child.cards.red.canDo],
          needHelp: [...preset.child.cards.red.needHelp],
          visitRules: [...preset.child.cards.red.visitRules],
          stimuli: [...preset.child.cards.red.stimuli],
        },
      },
    },
    notes: {
      title: preset.notes.title,
      items: [...preset.notes.items],
    },
  };

  return resolvedPreset;
};
