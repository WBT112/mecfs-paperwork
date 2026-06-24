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

type LocalizedPromptRow = readonly [
  category: MeBingoPromptCategory,
  de: string,
  en: string,
];

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

const ME_BINGO_PROMPT_ROWS = `
minimization-visibility|Aber du siehst gut aus|But you look good
minimization-visibility|Du wirkst doch fit|But you seem fit
minimization-visibility|Man merkt dir nichts an|You can't tell at all
minimization-visibility|So krank wirkst du nicht|You do not look that sick
minimization-visibility|Für mich siehst du gesund aus|You look healthy to me
minimization-visibility|Du lachst doch gerade|But you are laughing right now
minimization-visibility|Deine Stimme klingt normal|Your voice sounds normal
minimization-visibility|Vorher ging es doch auch|You were okay earlier though
minimization-visibility|Gestern ging es doch noch|Yesterday was fine though
minimization-visibility|Im Sitzen geht es doch, oder|But sitting works, right
minimization-visibility|Ein bisschen geht schon|A little should work
minimization-visibility|So schlimm kann es nicht sein|It cannot be that bad
minimization-visibility|Das klingt nach Müdigkeit|That sounds like tiredness
minimization-visibility|Jeder ist mal erschöpft|Everyone gets exhausted
minimization-visibility|Ich bin auch oft müde|I am often tired too
minimization-visibility|Das haben gerade viele|Lots of people have this
minimization-visibility|Klingt nach einem Durchhänger|Sounds like a slump
minimization-visibility|Du bist nur etwas schlapp|You are just a bit worn out
minimization-visibility|Vielleicht ist es eine Phase|Maybe it is a phase
minimization-visibility|Das geht bestimmt vorbei|That will probably pass
minimization-visibility|Morgen wird es besser|Tomorrow will be better
minimization-visibility|Du brauchst nur Erholung|You just need rest
minimization-visibility|Du klingst ganz normal|You sound completely normal
minimization-visibility|Das ist doch nur Erschöpfung|That is just exhaustion
minimization-visibility|Wenigstens siehst du gut aus|At least you look good
push-and-movement|Du musst dich mehr bewegen|You need to move more
push-and-movement|Ein Spaziergang hilft immer|A walk always helps
push-and-movement|Fang einfach klein an|Just start small
push-and-movement|Ein bisschen Sport geht doch|You can do a little exercise
push-and-movement|Du musst Kondition aufbauen|You need to build stamina
push-and-movement|Du bist nur untrainiert|You are just out of shape
push-and-movement|Du schonst dich zu sehr|You are resting too much
push-and-movement|Man darf nicht nachgeben|You mustn't give in
push-and-movement|Du musst dich überwinden|You need to push yourself
push-and-movement|Einmal pushen, dann läuft’s|Push once and it will work
push-and-movement|Jeden Tag ein bisschen mehr|A little more every day
push-and-movement|Bewegung ist beste Medizin|Movement is the best medicine
push-and-movement|Du musst wieder belastbar werden|You need to get tougher again
push-and-movement|Geh einfach öfter raus|Just go out more often
push-and-movement|Mehr Aktivität tut gut|More activity helps
push-and-movement|Sonst baust du weiter ab|Otherwise you will decline
push-and-movement|Nur zehn Minuten Walking|Just ten minutes of walking
push-and-movement|Probier leichtes Krafttraining|Try light strength training
push-and-movement|Mit Reha wird das besser|Rehab will help
push-and-movement|Du musst den Kreislauf anregen|You need to get going
push-and-movement|Mach einfach Ausdauertraining|Just do endurance training
push-and-movement|Ohne Bewegung wird es schlimmer|Less movement makes it worse
push-and-movement|Dein Körper braucht Training|Your body needs training
push-and-movement|Sport macht gesund|Exercise makes you healthy
push-and-movement|Aktivierung statt Schonung|Activation instead of rest
medical-psychologizing|Deine Blutwerte sind normal|Your bloodwork is normal
medical-psychologizing|Organisch finde ich nichts|I cannot find anything organic
medical-psychologizing|Vielleicht ist es psychisch|Maybe it is psychosomatic
medical-psychologizing|Vielleicht ist es Burnout|Maybe it is burnout
medical-psychologizing|Vielleicht ist es Depression|Maybe it is depression
medical-psychologizing|Das klingt nach Angst|That sounds like anxiety
medical-psychologizing|Warst du schon in Therapie|Have you been to therapy
medical-psychologizing|Sprechen Sie mit der Psychologie|Please talk to psychology
medical-psychologizing|Vielleicht ist es Schilddrüse|Maybe thyroid is the cause
medical-psychologizing|Vielleicht ist es Eisenmangel|Maybe it is iron deficiency
medical-psychologizing|Vielleicht ist es Vitamin D|Maybe it is vitamin D
medical-psychologizing|Nehmen Sie genug Magnesium|Enough magnesium?
medical-psychologizing|Das ist sicher Stress|This is probably stress
medical-psychologizing|Der Körper reagiert auf Stress|The body reacts to stress
medical-psychologizing|Mehr kann man da nicht tun|There is not much more to do
medical-psychologizing|Lernen Sie, damit zu leben|Learn to live with it
medical-psychologizing|Medizinisch ist alles geklärt|Everything medical is clear
medical-psychologizing|Sie müssen das akzeptieren|You need to accept this
medical-psychologizing|Vielleicht somatisieren Sie|Maybe you are somatizing
medical-psychologizing|Versuchen Sie Entspannung|Try relaxation
medical-psychologizing|Dahinter steckt Überforderung|This is probably overload
medical-psychologizing|Vielleicht ist es hormonell|Maybe it is hormonal
medical-psychologizing|Schlafhygiene schon probiert|Tried sleep hygiene?
medical-psychologizing|Die Werte sehen gut aus|The numbers look good
medical-psychologizing|Dann ist ja alles okay|Then everything is fine
wellness-advice|Hast du schon Yoga probiert|Have you tried yoga
wellness-advice|Probier mal Meditation|Try meditation
wellness-advice|Atemübungen helfen sicher|Breathing should help
wellness-advice|Trink mehr Wasser|Drink more water
wellness-advice|Iss weniger Zucker|Eat less sugar
wellness-advice|Versuch es glutenfrei|Try going gluten free
wellness-advice|Probier Intervallfasten|Try intermittent fasting
wellness-advice|Bau mal deinen Darm auf|Try fixing your gut
wellness-advice|Mehr frische Luft|More fresh air
wellness-advice|Geh mal in die Sonne|Get some sun
wellness-advice|Versuch ätherische Öle|Try essential oils
wellness-advice|Vielleicht hilft Kälte|Maybe cold helps
wellness-advice|Vielleicht hilft Wärme|Maybe heat helps
wellness-advice|Versuch mal Achtsamkeit|Try mindfulness
wellness-advice|Positive Gedanken helfen|Positive thoughts help
wellness-advice|Du musst loslassen|You need to let go
wellness-advice|Manifestiere Gesundheit|Manifest health
wellness-advice|Dankbarkeit verändert viel|Gratitude changes a lot
wellness-advice|Vielleicht brauchst du Urlaub|Maybe you need a vacation
wellness-advice|Fahr mal ans Meer|Go to the seaside
wellness-advice|Ein Wochenende Auszeit hilft|A weekend away will help
wellness-advice|Gönn dir Wellness|Treat yourself to wellness
wellness-advice|Vielleicht hilft ein Detox|Maybe a detox will help
wellness-advice|Versuch mal Supplements|Try supplements
wellness-advice|Probier mal Magnesiumöl|Try magnesium oil
daily-life-expectations|Dann komm doch kurz vorbei|Then just drop by for a bit
daily-life-expectations|Nur eine Stunde|Just one hour
daily-life-expectations|Es wird ganz entspannt|It will be super relaxed
daily-life-expectations|Das bisschen Haushalt|That little bit of housework
daily-life-expectations|Ein kurzer Einkauf geht doch|A quick grocery run is doable
daily-life-expectations|Duschen schaffst du doch|One shower is doable
daily-life-expectations|Telefonieren kostet keine Kraft|Calls cost no energy
daily-life-expectations|Dann antworte einfach kurz|Then just reply quickly
daily-life-expectations|Mach dir einen Plan|Make yourself a plan
daily-life-expectations|Du brauchst nur Struktur|You just need structure
daily-life-expectations|Stell dir einen Wecker|Set an alarm
daily-life-expectations|Routinen helfen immer|Routines always help
daily-life-expectations|Arbeit würde dich ablenken|Work would distract you
daily-life-expectations|Mit Arbeit wird es besser|Work will make it better
daily-life-expectations|Zuhause wird man krank|Staying home makes you sick
daily-life-expectations|Du musst unter Leute|You need to be around people
daily-life-expectations|Ein Hobby wäre gut|A hobby would be good for you
daily-life-expectations|Sag einfach früher Bescheid|Just let people know earlier
daily-life-expectations|Dafür gibt es doch Hilfe|There is help for that
daily-life-expectations|Beantrag das doch einfach|Just apply for it
daily-life-expectations|Such dir einfach einen Arzt|Just find a doctor
daily-life-expectations|Dann wechsel eben die Praxis|Then just switch practices
daily-life-expectations|Irgendwer muss doch helfen|Someone has to help
daily-life-expectations|Lass dir doch helfen|Just let people help you
daily-life-expectations|Du musst organisierter sein|You just need more structure
`;

const ME_BINGO_PROMPTS = createPromptsFromRows(ME_BINGO_PROMPT_ROWS);

const ME_BINGO_PROMPT_MAP = new Map(
  ME_BINGO_PROMPTS.map((prompt) => [prompt.id, prompt] as const),
);

const ME_BINGO_PROMPT_IDS = ME_BINGO_PROMPTS.map((prompt) => prompt.id);

const ME_BINGO_PROMPT_IDS_BY_CATEGORY =
  buildPromptIdsByCategory(ME_BINGO_PROMPTS);

function createPromptsFromRows(
  source: string,
): readonly MeBingoPromptDefinition[] {
  const promptCounts = Object.fromEntries(
    ME_BINGO_PROMPT_CATEGORIES.map((category) => [category, 0]),
  ) as Record<MeBingoPromptCategory, number>;

  return source
    .trim()
    .split('\n')
    .map((row) => row.split('|') as unknown as LocalizedPromptRow)
    .map(([category, de, en]) => {
      promptCounts[category] += 1;
      return {
        id: `${category}-${String(promptCounts[category]).padStart(2, '0')}`,
        category,
        labels: { de, en },
      };
    });
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
