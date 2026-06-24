import type { SupportedLocale } from '../../../../i18n/locale';
import type { MeBingoPromptCategory, MeBingoPromptDefinition } from '../types';

const FREE_FIELD_ID = 'free-field';
const ME_BINGO_PROMPT_CATEGORIES = [
  'minimization-visibility',
  'push-and-movement',
  'medical-psychologizing',
  'wellness-advice',
  'daily-life-expectations',
] as const satisfies readonly MeBingoPromptCategory[];

type LocalizedPromptSource = {
  readonly de: readonly string[];
  readonly en: readonly string[];
};

/**
 * Stable identifier for the automatically marked center tile fallback.
 */
export const ME_BINGO_FREE_FIELD_ID = FREE_FIELD_ID;

/**
 * Returns the full prompt pool for ME Bingo.
 *
 * @remarks
 * The pool is grouped into fixed editorial categories so each generated board
 * can stay balanced instead of over-indexing on one tone or scenario cluster.
 *
 * @returns All available prompt definitions.
 */
export const getMeBingoPromptPool = (): readonly MeBingoPromptDefinition[] =>
  ME_BINGO_PROMPTS;

/**
 * Returns all prompt identifiers across categories.
 *
 * @returns Stable prompt identifiers used for game state persistence.
 */
export const getMeBingoPromptIds = (): readonly string[] => ME_BINGO_PROMPT_IDS;

/**
 * Returns prompt identifiers grouped by editorial category.
 *
 * @returns Stable prompt identifiers keyed by category.
 */
export const getMeBingoPromptIdsByCategory = (): Readonly<
  Record<MeBingoPromptCategory, readonly string[]>
> => ME_BINGO_PROMPT_IDS_BY_CATEGORY;

/**
 * Resolves a localized prompt label by identifier.
 *
 * @param entryId - Prompt identifier stored in the board state.
 * @param locale - Active UI locale.
 * @returns The localized prompt label or the identifier as a last-resort fallback.
 */
export const getMeBingoPromptLabel = (
  entryId: string,
  locale: SupportedLocale,
): string => ME_BINGO_PROMPT_MAP.get(entryId)?.labels[locale] ?? entryId;

const ME_BINGO_PROMPT_SOURCES = {
  'minimization-visibility': {
    de: [
      'Aber du siehst gut aus',
      'Du wirkst doch fit',
      'Man merkt dir nichts an',
      'So krank wirkst du nicht',
      'Für mich siehst du gesund aus',
      'Du lachst doch gerade',
      'Deine Stimme klingt normal',
      'Vorher ging es doch auch',
      'Gestern ging es doch noch',
      'Im Sitzen geht es doch, oder',
      'Ein bisschen geht schon',
      'So schlimm kann es nicht sein',
      'Das klingt nach Müdigkeit',
      'Jeder ist mal erschöpft',
      'Ich bin auch oft müde',
      'Das haben gerade viele',
      'Klingt nach einem Durchhänger',
      'Du bist nur etwas schlapp',
      'Vielleicht ist es eine Phase',
      'Das geht bestimmt vorbei',
      'Morgen wird es besser',
      'Du brauchst nur Erholung',
      'Du klingst ganz normal',
      'Das ist doch nur Erschöpfung',
      'Wenigstens siehst du gut aus',
    ],
    en: [
      'But you look good',
      'But you seem fit',
      "You can't tell at all",
      'You do not look that sick',
      'You look healthy to me',
      'But you are laughing right now',
      'Your voice sounds normal',
      'You were okay earlier though',
      'Yesterday was fine though',
      'But sitting works, right',
      'A little should work',
      'It cannot be that bad',
      'That sounds like tiredness',
      'Everyone gets exhausted',
      'I am often tired too',
      'Lots of people have this',
      'Sounds like a slump',
      'You are just a bit worn out',
      'Maybe it is a phase',
      'That will probably pass',
      'Tomorrow will be better',
      'You just need rest',
      'You sound completely normal',
      'That is just exhaustion',
      'At least you look good',
    ],
  },
  'push-and-movement': {
    de: [
      'Du musst dich mehr bewegen',
      'Ein Spaziergang hilft immer',
      'Fang einfach klein an',
      'Ein bisschen Sport geht doch',
      'Du musst Kondition aufbauen',
      'Du bist nur untrainiert',
      'Du schonst dich zu sehr',
      'Man darf nicht nachgeben',
      'Du musst dich überwinden',
      'Einmal pushen, dann läuft’s',
      'Jeden Tag ein bisschen mehr',
      'Bewegung ist beste Medizin',
      'Du musst wieder belastbar werden',
      'Geh einfach öfter raus',
      'Mehr Aktivität tut gut',
      'Sonst baust du weiter ab',
      'Nur zehn Minuten Walking',
      'Probier leichtes Krafttraining',
      'Mit Reha wird das besser',
      'Du musst den Kreislauf anregen',
      'Mach einfach Ausdauertraining',
      'Ohne Bewegung wird es schlimmer',
      'Dein Körper braucht Training',
      'Sport macht gesund',
      'Aktivierung statt Schonung',
    ],
    en: [
      'You need to move more',
      'A walk always helps',
      'Just start small',
      'You can do a little exercise',
      'You need to build stamina',
      'You are just out of shape',
      'You are resting too much',
      "You mustn't give in",
      'You need to push yourself',
      'Push once and it will work',
      'A little more every day',
      'Movement is the best medicine',
      'You need to get tougher again',
      'Just go out more often',
      'More activity helps',
      'Otherwise you will decline',
      'Just ten minutes of walking',
      'Try light strength training',
      'Rehab will help',
      'You need to get going',
      'Just do endurance training',
      'Less movement makes it worse',
      'Your body needs training',
      'Exercise makes you healthy',
      'Activation instead of rest',
    ],
  },
  'medical-psychologizing': {
    de: [
      'Deine Blutwerte sind normal',
      'Organisch finde ich nichts',
      'Vielleicht ist es psychisch',
      'Vielleicht ist es Burnout',
      'Vielleicht ist es Depression',
      'Das klingt nach Angst',
      'Warst du schon in Therapie',
      'Sprechen Sie mit der Psychologie',
      'Vielleicht ist es Schilddrüse',
      'Vielleicht ist es Eisenmangel',
      'Vielleicht ist es Vitamin D',
      'Nehmen Sie genug Magnesium',
      'Das ist sicher Stress',
      'Der Körper reagiert auf Stress',
      'Mehr kann man da nicht tun',
      'Lernen Sie, damit zu leben',
      'Medizinisch ist alles geklärt',
      'Sie müssen das akzeptieren',
      'Vielleicht somatisieren Sie',
      'Versuchen Sie Entspannung',
      'Dahinter steckt Überforderung',
      'Vielleicht ist es hormonell',
      'Schlafhygiene schon probiert',
      'Die Werte sehen gut aus',
      'Dann ist ja alles okay',
    ],
    en: [
      'Your bloodwork is normal',
      'I cannot find anything organic',
      'Maybe it is psychosomatic',
      'Maybe it is burnout',
      'Maybe it is depression',
      'That sounds like anxiety',
      'Have you been to therapy',
      'Please talk to psychology',
      'Maybe thyroid is the cause',
      'Maybe it is iron deficiency',
      'Maybe it is vitamin D',
      'Enough magnesium?',
      'This is probably stress',
      'The body reacts to stress',
      'There is not much more to do',
      'Learn to live with it',
      'Everything medical is clear',
      'You need to accept this',
      'Maybe you are somatizing',
      'Try relaxation',
      'This is probably overload',
      'Maybe it is hormonal',
      'Tried sleep hygiene?',
      'The numbers look good',
      'Then everything is fine',
    ],
  },
  'wellness-advice': {
    de: [
      'Hast du schon Yoga probiert',
      'Probier mal Meditation',
      'Atemübungen helfen sicher',
      'Trink mehr Wasser',
      'Iss weniger Zucker',
      'Versuch es glutenfrei',
      'Probier Intervallfasten',
      'Bau mal deinen Darm auf',
      'Mehr frische Luft',
      'Geh mal in die Sonne',
      'Versuch ätherische Öle',
      'Vielleicht hilft Kälte',
      'Vielleicht hilft Wärme',
      'Versuch mal Achtsamkeit',
      'Positive Gedanken helfen',
      'Du musst loslassen',
      'Manifestiere Gesundheit',
      'Dankbarkeit verändert viel',
      'Vielleicht brauchst du Urlaub',
      'Fahr mal ans Meer',
      'Ein Wochenende Auszeit hilft',
      'Gönn dir Wellness',
      'Vielleicht hilft ein Detox',
      'Versuch mal Supplements',
      'Probier mal Magnesiumöl',
    ],
    en: [
      'Have you tried yoga',
      'Try meditation',
      'Breathing should help',
      'Drink more water',
      'Eat less sugar',
      'Try going gluten free',
      'Try intermittent fasting',
      'Try fixing your gut',
      'More fresh air',
      'Get some sun',
      'Try essential oils',
      'Maybe cold helps',
      'Maybe heat helps',
      'Try mindfulness',
      'Positive thoughts help',
      'You need to let go',
      'Manifest health',
      'Gratitude changes a lot',
      'Maybe you need a vacation',
      'Go to the seaside',
      'A weekend away will help',
      'Treat yourself to wellness',
      'Maybe a detox will help',
      'Try supplements',
      'Try magnesium oil',
    ],
  },
  'daily-life-expectations': {
    de: [
      'Dann komm doch kurz vorbei',
      'Nur eine Stunde',
      'Es wird ganz entspannt',
      'Das bisschen Haushalt',
      'Ein kurzer Einkauf geht doch',
      'Duschen schaffst du doch',
      'Telefonieren kostet keine Kraft',
      'Dann antworte einfach kurz',
      'Mach dir einen Plan',
      'Du brauchst nur Struktur',
      'Stell dir einen Wecker',
      'Routinen helfen immer',
      'Arbeit würde dich ablenken',
      'Mit Arbeit wird es besser',
      'Zuhause wird man krank',
      'Du musst unter Leute',
      'Ein Hobby wäre gut',
      'Sag einfach früher Bescheid',
      'Dafür gibt es doch Hilfe',
      'Beantrag das doch einfach',
      'Such dir einfach einen Arzt',
      'Dann wechsel eben die Praxis',
      'Irgendwer muss doch helfen',
      'Lass dir doch helfen',
      'Du musst organisierter sein',
    ],
    en: [
      'Then just drop by for a bit',
      'Just one hour',
      'It will be super relaxed',
      'That little bit of housework',
      'A quick grocery run is doable',
      'One shower is doable',
      'Calls cost no energy',
      'Then just reply quickly',
      'Make yourself a plan',
      'You just need structure',
      'Set an alarm',
      'Routines always help',
      'Work would distract you',
      'Work will make it better',
      'Staying home makes you sick',
      'You need to be around people',
      'A hobby would be good for you',
      'Just let people know earlier',
      'There is help for that',
      'Just apply for it',
      'Just find a doctor',
      'Then just switch practices',
      'Someone has to help',
      'Just let people help you',
      'You just need more structure',
    ],
  },
} as const satisfies Readonly<
  Record<MeBingoPromptCategory, LocalizedPromptSource>
>;

const ME_BINGO_PROMPTS = ME_BINGO_PROMPT_CATEGORIES.flatMap((category) =>
  createCategoryPrompts(category, ME_BINGO_PROMPT_SOURCES[category]),
) satisfies readonly MeBingoPromptDefinition[];

const ME_BINGO_PROMPT_MAP = new Map(
  ME_BINGO_PROMPTS.map((prompt) => [prompt.id, prompt] as const),
);

const ME_BINGO_PROMPT_IDS = ME_BINGO_PROMPTS.map((prompt) => prompt.id);

const ME_BINGO_PROMPT_IDS_BY_CATEGORY =
  buildPromptIdsByCategory(ME_BINGO_PROMPTS);

function createCategoryPrompts(
  category: MeBingoPromptCategory,
  source: LocalizedPromptSource,
): MeBingoPromptDefinition[] {
  return source.de.map((de, index) => ({
    id: `${category}-${String(index + 1).padStart(2, '0')}`,
    category,
    labels: { de, en: source.en[index] },
  }));
}

function buildPromptIdsByCategory(
  prompts: readonly MeBingoPromptDefinition[],
): Readonly<Record<MeBingoPromptCategory, readonly string[]>> {
  const groupedPrompts = Object.fromEntries(
    ME_BINGO_PROMPT_CATEGORIES.map((category) => [category, [] as string[]]),
  ) as Record<MeBingoPromptCategory, string[]>;

  for (const prompt of prompts) {
    groupedPrompts[prompt.category].push(prompt.id);
  }

  return Object.freeze(
    Object.fromEntries(
      Object.entries(groupedPrompts).map(([category, promptIds]) => [
        category,
        Object.freeze([...promptIds]),
      ]),
    ) as Record<MeBingoPromptCategory, readonly string[]>,
  );
}
