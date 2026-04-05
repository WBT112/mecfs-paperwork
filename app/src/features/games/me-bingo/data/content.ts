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

type LocalizedPromptEntry = readonly [de: string, en: string];

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

const ME_BINGO_PROMPTS = [
  ...createCategoryPrompts('minimization-visibility', [
    ['Aber du siehst gut aus', 'But you look good'],
    ['Du wirkst doch fit', 'But you seem fit'],
    ['Man merkt dir nichts an', "You can't tell at all"],
    ['So krank wirkst du nicht', 'You do not look that sick'],
    ['Für mich siehst du gesund aus', 'You look healthy to me'],
    ['Du lachst doch gerade', 'But you are laughing right now'],
    ['Deine Stimme klingt normal', 'Your voice sounds normal'],
    ['Vorher ging es doch auch', 'You were okay earlier though'],
    ['Gestern ging es doch noch', 'Yesterday was fine though'],
    ['Im Sitzen geht es doch, oder', 'But sitting works, right'],
    ['Ein bisschen geht schon', 'A little should work'],
    ['So schlimm kann es nicht sein', 'It cannot be that bad'],
    ['Das klingt nach Müdigkeit', 'That sounds like tiredness'],
    ['Jeder ist mal erschöpft', 'Everyone gets exhausted'],
    ['Ich bin auch oft müde', 'I am often tired too'],
    ['Das haben gerade viele', 'Lots of people have this'],
    ['Klingt nach einem Durchhänger', 'Sounds like a slump'],
    ['Du bist nur etwas schlapp', 'You are just a bit worn out'],
    ['Vielleicht ist es eine Phase', 'Maybe it is a phase'],
    ['Das geht bestimmt vorbei', 'That will probably pass'],
    ['Morgen wird es besser', 'Tomorrow will be better'],
    ['Du brauchst nur Erholung', 'You just need rest'],
    ['Du klingst ganz normal', 'You sound completely normal'],
    ['Das ist doch nur Erschöpfung', 'That is just exhaustion'],
    ['Wenigstens siehst du gut aus', 'At least you look good'],
  ]),
  ...createCategoryPrompts('push-and-movement', [
    ['Du musst dich mehr bewegen', 'You need to move more'],
    ['Ein Spaziergang hilft immer', 'A walk always helps'],
    ['Fang einfach klein an', 'Just start small'],
    ['Ein bisschen Sport geht doch', 'You can do a little exercise'],
    ['Du musst Kondition aufbauen', 'You need to build stamina'],
    ['Du bist nur untrainiert', 'You are just out of shape'],
    ['Du schonst dich zu sehr', 'You are resting too much'],
    ['Man darf nicht nachgeben', "You mustn't give in"],
    ['Du musst dich überwinden', 'You need to push yourself'],
    ['Einmal pushen, dann läuft’s', 'Push once and it will work'],
    ['Jeden Tag ein bisschen mehr', 'A little more every day'],
    ['Bewegung ist beste Medizin', 'Movement is the best medicine'],
    ['Du musst wieder belastbar werden', 'You need to get tougher again'],
    ['Geh einfach öfter raus', 'Just go out more often'],
    ['Mehr Aktivität tut gut', 'More activity helps'],
    ['Sonst baust du weiter ab', 'Otherwise you will decline'],
    ['Nur zehn Minuten Walking', 'Just ten minutes of walking'],
    ['Probier leichtes Krafttraining', 'Try light strength training'],
    ['Mit Reha wird das besser', 'Rehab will help'],
    ['Du musst den Kreislauf anregen', 'You need to get going'],
    ['Mach einfach Ausdauertraining', 'Just do endurance training'],
    ['Ohne Bewegung wird es schlimmer', 'Less movement makes it worse'],
    ['Dein Körper braucht Training', 'Your body needs training'],
    ['Sport macht gesund', 'Exercise makes you healthy'],
    ['Aktivierung statt Schonung', 'Activation instead of rest'],
  ]),
  ...createCategoryPrompts('medical-psychologizing', [
    ['Deine Blutwerte sind normal', 'Your bloodwork is normal'],
    ['Organisch finde ich nichts', 'I cannot find anything organic'],
    ['Vielleicht ist es psychisch', 'Maybe it is psychosomatic'],
    ['Vielleicht ist es Burnout', 'Maybe it is burnout'],
    ['Vielleicht ist es Depression', 'Maybe it is depression'],
    ['Das klingt nach Angst', 'That sounds like anxiety'],
    ['Warst du schon in Therapie', 'Have you been to therapy'],
    ['Sprechen Sie mit der Psychologie', 'Please talk to psychology'],
    ['Vielleicht ist es Schilddrüse', 'Maybe thyroid is the cause'],
    ['Vielleicht ist es Eisenmangel', 'Maybe it is iron deficiency'],
    ['Vielleicht ist es Vitamin D', 'Maybe it is vitamin D'],
    ['Nehmen Sie genug Magnesium', 'Enough magnesium?'],
    ['Das ist sicher Stress', 'This is probably stress'],
    ['Der Körper reagiert auf Stress', 'The body reacts to stress'],
    ['Mehr kann man da nicht tun', 'There is not much more to do'],
    ['Lernen Sie, damit zu leben', 'Learn to live with it'],
    ['Medizinisch ist alles geklärt', 'Everything medical is clear'],
    ['Sie müssen das akzeptieren', 'You need to accept this'],
    ['Vielleicht somatisieren Sie', 'Maybe you are somatizing'],
    ['Versuchen Sie Entspannung', 'Try relaxation'],
    ['Dahinter steckt Überforderung', 'This is probably overload'],
    ['Vielleicht ist es hormonell', 'Maybe it is hormonal'],
    ['Schlafhygiene schon probiert', 'Tried sleep hygiene?'],
    ['Die Werte sehen gut aus', 'The numbers look good'],
    ['Dann ist ja alles okay', 'Then everything is fine'],
  ]),
  ...createCategoryPrompts('wellness-advice', [
    ['Hast du schon Yoga probiert', 'Have you tried yoga'],
    ['Probier mal Meditation', 'Try meditation'],
    ['Atemübungen helfen sicher', 'Breathing should help'],
    ['Trink mehr Wasser', 'Drink more water'],
    ['Iss weniger Zucker', 'Eat less sugar'],
    ['Versuch es glutenfrei', 'Try going gluten free'],
    ['Probier Intervallfasten', 'Try intermittent fasting'],
    ['Bau mal deinen Darm auf', 'Try fixing your gut'],
    ['Mehr frische Luft', 'More fresh air'],
    ['Geh mal in die Sonne', 'Get some sun'],
    ['Versuch ätherische Öle', 'Try essential oils'],
    ['Vielleicht hilft Kälte', 'Maybe cold helps'],
    ['Vielleicht hilft Wärme', 'Maybe heat helps'],
    ['Versuch mal Achtsamkeit', 'Try mindfulness'],
    ['Positive Gedanken helfen', 'Positive thoughts help'],
    ['Du musst loslassen', 'You need to let go'],
    ['Manifestiere Gesundheit', 'Manifest health'],
    ['Dankbarkeit verändert viel', 'Gratitude changes a lot'],
    ['Vielleicht brauchst du Urlaub', 'Maybe you need a vacation'],
    ['Fahr mal ans Meer', 'Go to the seaside'],
    ['Ein Wochenende Auszeit hilft', 'A weekend away will help'],
    ['Gönn dir Wellness', 'Treat yourself to wellness'],
    ['Vielleicht hilft ein Detox', 'Maybe a detox will help'],
    ['Versuch mal Supplements', 'Try supplements'],
    ['Probier mal Magnesiumöl', 'Try magnesium oil'],
  ]),
  ...createCategoryPrompts('daily-life-expectations', [
    ['Dann komm doch kurz vorbei', 'Then just drop by for a bit'],
    ['Nur eine Stunde', 'Just one hour'],
    ['Es wird ganz entspannt', 'It will be super relaxed'],
    ['Das bisschen Haushalt', 'That little bit of housework'],
    ['Ein kurzer Einkauf geht doch', 'A quick grocery run is doable'],
    ['Duschen schaffst du doch', 'One shower is doable'],
    ['Telefonieren kostet keine Kraft', 'Calls cost no energy'],
    ['Dann antworte einfach kurz', 'Then just reply quickly'],
    ['Mach dir einen Plan', 'Make yourself a plan'],
    ['Du brauchst nur Struktur', 'You just need structure'],
    ['Stell dir einen Wecker', 'Set an alarm'],
    ['Routinen helfen immer', 'Routines always help'],
    ['Arbeit würde dich ablenken', 'Work would distract you'],
    ['Mit Arbeit wird es besser', 'Work will make it better'],
    ['Zuhause wird man krank', 'Staying home makes you sick'],
    ['Du musst unter Leute', 'You need to be around people'],
    ['Ein Hobby wäre gut', 'A hobby would be good for you'],
    ['Sag einfach früher Bescheid', 'Just let people know earlier'],
    ['Dafür gibt es doch Hilfe', 'There is help for that'],
    ['Beantrag das doch einfach', 'Just apply for it'],
    ['Such dir einfach einen Arzt', 'Just find a doctor'],
    ['Dann wechsel eben die Praxis', 'Then just switch practices'],
    ['Irgendwer muss doch helfen', 'Someone has to help'],
    ['Lass dir doch helfen', 'Just let people help you'],
    ['Du musst organisierter sein', 'You just need more structure'],
  ]),
] satisfies readonly MeBingoPromptDefinition[];

const ME_BINGO_PROMPT_MAP = new Map(
  ME_BINGO_PROMPTS.map((prompt) => [prompt.id, prompt] as const),
);

const ME_BINGO_PROMPT_IDS = ME_BINGO_PROMPTS.map((prompt) => prompt.id);

const ME_BINGO_PROMPT_IDS_BY_CATEGORY =
  buildPromptIdsByCategory(ME_BINGO_PROMPTS);

function createCategoryPrompts(
  category: MeBingoPromptCategory,
  entries: readonly LocalizedPromptEntry[],
): MeBingoPromptDefinition[] {
  return entries.map(([de, en], index) => ({
    id: `${category}-${String(index + 1).padStart(2, '0')}`,
    category,
    labels: { de, en },
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
