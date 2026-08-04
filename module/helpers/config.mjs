/**
 * Central static config: the `POKEROLE` object (type matchups, ailments, ranks, i18n key maps, etc.)
 * plus small pure-function helpers (type matchup scoring, pain penalty level) that read from it.
 */

export const POKEROLE = {};

POKEROLE.CONST = {
  // Attributes
  MAX_WILL_BONUS: 3, // Max Will is calculated from the Insight stat + this value (MOD 3.0)
  LEARNED_MOVES_BONUS: 3, // Max Moves is calculated from the Insight stat + this value (MOD 3.0)

  // Damage
  STAB_BONUS: 1, // Added to the damage pool if the move's type matches the Pokémon's type
  CRIT_BONUS: 2, // Added to the damage pool if the move is a critical hit

  // Effects
  BURN1_DAMAGE: 1,
  BURN2_DAMAGE: 2, // TODO: Lethal Damage (https://github.com/Pokerole-Software-Development/foundry-pokerole/issues/32)
  BURN3_DAMAGE: 3, // TODO: Lethal Damage (https://github.com/Pokerole-Software-Development/foundry-pokerole/issues/32)
  POISON_DAMAGE: 2,
  BADLY_POISONED_DAMAGE: 2, // TODO: Lethal Damage (https://github.com/Pokerole-Software-Development/foundry-pokerole/issues/32)
};

POKEROLE.typeMatchups = {
  'none': {
    weak: [],
    resist: [],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/icons/Ranks/none.svg',
    color1: '#2D2718'
  },
  'normal': {
    weak: ['fighting'],
    resist: [],
    immune: ['ghost'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/normal.svg',
    color1: '#828282'
  },
  'bug': {
    weak: ['fire', 'flying', 'rock'],
    resist: ['fighting', 'grass', 'ground'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/bug.svg',
    color1: '#9f9f28'
  },
  'dark': {
    weak: ['bug', 'fairy', 'fighting'],
    resist: ['dark', 'ghost'],
    immune: ['psychic'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/dark.svg',
    color1: '#4f4747'
  },
  'dragon': {
    weak: ['dragon', 'fairy', 'ice'],
    resist: ['electric', 'fire', 'grass', 'water'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/dragon.svg',
    color1: '#576fbc'
  },
  'electric': {
    weak: ['ground'],
    resist: ['flying', 'steel', 'electric'],
    immune: [],
    ailmentImmunities: ['paralysis'],
    image:'systems/pokerole/images/types/electric.svg',
    color1: '#dfbc28'
  },
  'fairy': {
    weak: ['poison', 'steel'],
    resist: ['bug', 'dark', 'fighting'],
    immune: ['dragon'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/fairy.svg',
    color1: '#e291e2'
  },
  'fighting': {
    weak: ['fairy', 'flying', 'psychic'],
    resist: ['bug', 'dark', 'rock'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/fighting.svg',
    color1: '#e49021'
  },
  'fire': {
    weak: ['ground', 'rock', 'water'],
    resist: ['bug', 'fairy', 'fire', 'grass', 'ice', 'steel'],
    immune: [],
    ailmentImmunities: ['burn1', 'burn2', 'burn3'],
    image:'systems/pokerole/images/types/fire.svg',
    color1: '#e4613e'
  },
  'flying': {
    weak: ['electric', 'ice', 'rock'],
    resist: ['bug', 'fighting', 'grass'],
    immune: ['ground'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/flying.svg',
    color1: '#74aad0'
  },
  'ghost': {
    weak: ['dark', 'ghost'],
    resist: ['bug', 'poison'],
    immune: ['fighting', 'normal'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/ghost.svg',
    color1: '#6f4570'
  },
  'grass': {
    weak: ['bug', 'fire', 'flying', 'ice', 'poison'],
    resist: ['electric', 'grass', 'ground', 'water'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/grass.svg',
    color1: '#439837'
  },
  'ground': {
    weak: ['grass', 'ice', 'water'],
    resist: ['poison', 'rock'],
    immune: ['electric'],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/ground.svg',
    color1: '#a4733c'
  },
  'ice': {
    weak: ['fighting', 'fire', 'rock', 'steel'],
    resist: ['ice'],
    immune: [],
    ailmentImmunities: ['frozen'],
    image:'systems/pokerole/images/types/ice.svg',
    color1: '#47c8c8'
  },
  'poison': {
    weak: ['ground', 'psychic'],
    resist: ['bug', 'fairy', 'fighting', 'grass', 'poison'],
    immune: [],
    ailmentImmunities: ['poison', 'badlyPoisoned'],
    image:'systems/pokerole/images/types/poison.svg',
    color1: '#9354cb'
  },
  'psychic': {
    weak: ['bug', 'dark', 'ghost'],
    resist: ['fighting', 'psychic'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/psychic.svg',
    color1: '#e96c8d'
  },
  'rock': {
    weak: ['grass', 'ground', 'fighting', 'steel', 'water'],
    resist: ['fire', 'flying', 'normal', 'poison'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/rock.svg',
    color1: '#a9a481'
  },
  'steel': {
    weak: ['fighting', 'fire', 'ground'],
    resist: ['bug', 'dragon', 'flying', 'fairy', 'grass', 'ice', 'normal', 'psychic', 'rock', 'steel'],
    immune: ['poison'],
    ailmentImmunities: ['poison', 'badlyPoisoned'],
    image:'systems/pokerole/images/types/steel.svg',
    color1: '#74b0cb'
  },
  'water': {
    weak: ['electric', 'grass'],
    resist: ['fire', 'ice', 'steel', 'water'],
    immune: [],
    ailmentImmunities: [],
    image:'systems/pokerole/images/types/water.svg',
    color1: '#3099e1'
  },
};

POKEROLE.types = Object.keys(POKEROLE.typeMatchups);

POKEROLE.getAilments = () => ({
  fainted: {
    label: game.i18n.localize('POKEROLE.StatusFainted'),
    icon: 'systems/pokerole/images/ailments/fainted.svg',
    tint: '#000000',
    overlay: true,
    tooltip: '',
    volatile: false
  },
  paralysis: {
    label: game.i18n.localize('POKEROLE.StatusParalysis'),
    icon: 'systems/pokerole/images/ailments/paralyzed.svg',
    tint: '#ECD82F',
    tooltip: 'Paralysis',
    volatile: false
  },
  frozen: {
    label: game.i18n.localize('POKEROLE.StatusFrozen'),
    icon: 'systems/pokerole/images/ailments/frozen.svg',
    tint: '#96CFD0',
    tooltip: 'Frozen',
    volatile: false
  },
  poison: {
    label: game.i18n.localize('POKEROLE.StatusPoison'),
    icon: 'systems/pokerole/images/ailments/poisoned.svg',
    tint: '#8F6995',
    tooltip: 'Poison',
    volatile: false
  },
  badlyPoisoned: {
    label: game.i18n.localize('POKEROLE.StatusBadlyPoisoned'),
    icon: 'systems/pokerole/images/ailments/poisoned.svg#badlyPoisoned.svg',
    tint: '#714783',
    tooltip: 'Poison+',
    volatile: false
  },
  sleep: {
    label: game.i18n.localize('POKEROLE.StatusSleep'),
    icon: 'systems/pokerole/images/ailments/asleep.svg',
    tint: '#B5B590',
    tooltip: 'Asleep',
    volatile: false
  },
  burn1: {
    label: game.i18n.localize('POKEROLE.StatusBurn1'),
    icon: 'systems/pokerole/images/ailments/burn.svg',
    tint: '#E16436',
    tooltip: 'Burned',
    volatile: false
  },
  burn2: {
    label: game.i18n.localize('POKEROLE.StatusBurn2'),
    icon: 'systems/pokerole/images/ailments/burn.svg#burn2.svg',
    tint: '#B84129',
    tooltip: 'Burned 2',
    volatile: false
  },
  burn3: {
    label: game.i18n.localize('POKEROLE.StatusBurn3'),
    icon: 'systems/pokerole/images/ailments/burn.svg#burn3.svg',
    tint: '#93291B',
    tooltip: 'Burned 3',
    volatile: false
  },
  confused: {
    label: game.i18n.localize('POKEROLE.StatusConfused'),
    icon: 'icons/svg/daze.svg',
    tint: '#4DAF81',
    tooltip: 'Confused',
    volatile: true
  },
  disabled: {
    label: game.i18n.localize('POKEROLE.StatusDisabled'),
    icon: 'icons/svg/cancel.svg',
    tint: '#4DAF81',
    tooltip: 'Disabled',
    volatile: true
  },
  flinch: {
    label: game.i18n.localize('POKEROLE.StatusFlinch'),
    icon: 'icons/svg/explosion.svg',
    tint: '#575D69',
    tooltip: 'Flinch',
    volatile: true
  },
  infatuated: {
    label: game.i18n.localize('POKEROLE.StatusInfatuated'),
    icon: 'icons/svg/heal.svg',
    tint: '#E1657F',
    tooltip: 'Infatuated',
    volatile: true
  },
});

export function getAilmentList() {
  // Aliased to name/img here (not renamed at the source) since fromStatusEffect() needs those keys.
  return Object.entries(POKEROLE.getAilments()).map(([id, ailment]) => ({
    id,
    ...ailment,
    name: ailment.label,
    img: ailment.icon
  }));
}

// Ailment Immunity rule kind (TASK-51): the classic non-volatile status family a Grant/Remove Immunity
// rule targets - "Poison"/"Burn" are single selectable options that expand to their sub-ranks, same
// grouping POKEROLE.typeMatchups[type].ailmentImmunities already uses for the built-in type immunities
// (e.g. steel: ['poison', 'badlyPoisoned']) and applyAilment()'s own family-deduping.
POKEROLE.ailmentImmunityFamilies = {
  paralysis: ['paralysis'],
  frozen: ['frozen'],
  sleep: ['sleep'],
  poison: ['poison', 'badlyPoisoned'],
  burn: ['burn1', 'burn2', 'burn3']
};

export function getAilmentImmunityFamilyChoices() {
  return {
    paralysis: game.i18n.localize('POKEROLE.StatusParalysis'),
    frozen: game.i18n.localize('POKEROLE.StatusFrozen'),
    sleep: game.i18n.localize('POKEROLE.StatusSleep'),
    poison: game.i18n.localize('POKEROLE.StatusPoison'),
    burn: game.i18n.localize('POKEROLE.StatusBurn1')
  };
}

POKEROLE.specialStatusEffects = {
  BLIND: 'blind',
  DEFEATED: 'fainted',
  INVISIBLE: 'invisible',
}

POKEROLE.ranks = ['none', 'starter', 'rookie', 'standard', 'advanced', 'expert', 'ace', 'master', 'champion'];
POKEROLE.moveGroups = ['learned', ...POKEROLE.ranks.slice(1), 'maneuver'];

// Training Points required to advance FROM this rank to the next one. `none` is free (bootstrapping a
// fresh/retrained actor into Starter, not a real TP-gated tier). No entry for `champion` (nothing past it).
POKEROLE.rankUpTrainingPointCost = {
  none: 0, starter: 5, rookie: 15, standard: 25, advanced: 30, expert: 35, ace: 40, master: 50
};

// Training Points required to Retrain while at this rank (resets attributes/skills and replays point
// allocation from Starter up to the current rank). No entry for `none` - nothing to retrain yet.
POKEROLE.retrainTrainingPointCost = {
  starter: 1, rookie: 10, standard: 20, advanced: 25, expert: 30, ace: 35, master: 40, champion: 45
};

// Training Points required to learn a new move, by the Pokemon's evolution stage and whether the move's
// own rank equals the Pokemon's current rank ("current") or is below it ("previous"). Moves above the
// Pokemon's current rank are "Overrank" - a separate future TP mechanic, not handled here.
POKEROLE.learnMoveTrainingPointCost = {
  first: { current: 2, previous: 1 },
  second: { current: 4, previous: 2 },
  final: { current: 6, previous: 3 }
};

// Overrank: TP cost per rank above the Pokemon's current rank, by evolution stage. Requires
// Happiness + Loyalty >= 7 (checked in overrank-dialog.mjs, not here).
POKEROLE.overrankTrainingPointCostPerRank = { first: 5, second: 15, final: 20 };

// Pre-0.5.1 ("POKEROLE 3.0" rework) rank rename - these three are never valid under the current schema, safe to remap unconditionally.
const LEGACY_RANK_RENAMES = { beginner: 'rookie', amateur: 'standard', pro: 'expert' };

/** Migrates the pre-0.5.1 rank strings that are never valid under the current schema - always safe, no version info needed. */
export function migrateUnambiguousLegacyRankValue(value) {
  return typeof value === 'string' && value in LEGACY_RANK_RENAMES ? LEGACY_RANK_RENAMES[value] : value;
}

POKEROLE.itemCategory = {
  item: "Item",
  medicine: "Medicine",
  pokeball: "Pokeball",
  ingredient: "Ingredient",
  berry: "Berry",
  pokedex: "Pokedex",
  heldItem: "Held Item",
  battle: "Battle Item",
  medals: "Trophy",
  keyItem: "Key Item",
  miscItem: "Misc Item",
  evolutionItem: "Evolution Item",
  technicalMachine: "Technical Machine"
};

POKEROLE.styleImages = {
  // Ranks
  starter: 'systems/pokerole/images/icons/Ranks/1.rank_starter.png',
  rookie: 'systems/pokerole/images/icons/Ranks/2.rank_rookie.png',
  standard: 'systems/pokerole/images/icons/Ranks/3.rank_standard.png',
  advanced: 'systems/pokerole/images/icons/Ranks/4.rank_advance.png',
  expert: 'systems/pokerole/images/icons/Ranks/5.rank_expert.png',
  ace: 'systems/pokerole/images/icons/Ranks/6.rank_ace.png',
  master: 'systems/pokerole/images/icons/Ranks/7.rank_master.png',
  champion: 'systems/pokerole/images/icons/Ranks/8.rank_champion.png',
  // Genders
  male: 'systems/pokerole/images/icons/msymbol2.png',
  female: 'systems/pokerole/images/icons/fsymbol2.png',
  genderless: 'systems/pokerole/images/icons/osymbol2.png',
  neutral: 'systems/pokerole/images/icons/none.svg',
}

POKEROLE.rankColors = {
  none: '#8a8a8a',
  starter: '#9a9a9a',
  rookie: '#5fae4a',
  standard: '#3f8fd1',
  advanced: '#e2b23c',
  expert: '#e2803c',
  ace: '#d1453f',
  master: '#8a5fc7',
  champion: '#c79a2e'
};

/** The maximum number of actions allowed per round */
POKEROLE.maxActions = 5;

POKEROLE.rankProgression = {
  'none': {
    attributePoints: 0,
    skillPoints: 0,
    socialPoints: 0,
    skillLimit: 0,
    maxTargets: 0,
    totalPassiveIncrease: 0,
    confusionPenalty: 1,
  },
  'starter': {
    attributePoints: 0,
    skillPoints: 5,
    socialPoints: 0,
    skillLimit: 1,
    maxTargets: 1,
    totalPassiveIncrease: 0,
    confusionPenalty: 1,
  },
  'rookie': {
    attributePoints: 2,
    skillPoints: 5,
    socialPoints: 2,
    skillLimit: 2,
    maxTargets: 2,
    totalPassiveIncrease: 0,
    confusionPenalty: 1,
  },
  'standard': {
    attributePoints: 2,
    skillPoints: 4,
    socialPoints: 2,
    skillLimit: 3,
    maxTargets: 3,
    totalPassiveIncrease: 0,
    confusionPenalty: 1,
  },
  'advanced': {
    attributePoints: 2,
    skillPoints: 3,
    socialPoints: 2,
    skillLimit: 4,
    maxTargets: 4,
    totalPassiveIncrease: 0,
    confusionPenalty: 2,
  },
  'expert': {
    attributePoints: 2,
    skillPoints: 2,
    socialPoints: 2,
    skillLimit: 5,
    maxTargets: 5,
    totalPassiveIncrease: 0,
    confusionPenalty: 2,
  },
  'ace': {
    attributePoints: 2,
    skillPoints: 1,
    socialPoints: 2,
    skillLimit: 5,
    maxTargets: 6,
    totalPassiveIncrease: 0,
    confusionPenalty: 2,
  },
  'master': {
    attributePoints: 0,
    skillPoints: 2,
    socialPoints: 0,
    skillLimit: 5,
    maxTargets: 8,
    totalPassiveIncrease: 3,
    confusionPenalty: 3,
  },
  'champion': {
    attributePoints: 4,
    skillPoints: 3,
    socialPoints: 4,
    skillLimit: 5,
    maxTargets: 10,
    totalPassiveIncrease: 3,
    confusionPenalty: 3,
  },
};

POKEROLE.attributes = ['strength', 'dexterity', 'vitality', 'special', 'insight'];
POKEROLE.skills = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'science'];
POKEROLE.socialAttributes = ['tough', 'cool', 'beauty', 'cute', 'clever'];
POKEROLE.extraAttributes = ['happiness', 'loyalty'];

// Skill sets differ between Actor types (used by the Actor DataSchemas)
POKEROLE.pokemonSkills = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform'];
POKEROLE.trainerSkills = ['brawl', 'throw', 'weapon', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'empathy', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'science'];

// Raw gender keys (labels are localized/looked up in the sheet, e.g. actor-sheet.mjs)
POKEROLE.genders = ['neutral', 'male', 'female', 'genderless'];

// Boolean flags on move.attributes (used by the Move DataSchema)
POKEROLE.moveFlags = [
  'highCritical', 'lethal', 'physicalRanged', 'charge', 'mustRecharge', 'fistBased',
  'soundBased', 'shieldMove', 'neverFail', 'switcherMove', 'recoil', 'rampage',
  'doubleAction', 'alwaysCrit', 'destroyShield', 'successiveActions', 'userFaints',
  'resetTerrain', 'resistedWithDefense', 'ignoreDefenses', 'cutterMove', 'windMove',
  'biteMove', 'powderMove', 'maneuver',
  'projectileMove', 'tripleAction', // not in any pack data yet (issue #97), schema ready for later
  'unlimitedUses' // issue #88: exempt from the once-per-Round usedInRound block (accuracy + clash)
];

// Valid raw values for move.target - separate from POKEROLE.i18n.targets, which is just display labels.
POKEROLE.moveTargets = [
  'Foe', 'Random Foe', 'All Foes', 'Self', 'Ally', 'All Allies',
  'Area', 'Battlefield', "Foe's Battlefield", "Ally's Battlefield"
];

// Composite values are real (e.g. Struggle Throw is 'physical/special'), not placeholders.
POKEROLE.moveCategories = ['physical', 'special', 'support', 'physical/special', 'support/physical/special'];

// Valid raw values for move.heal.type / item.heal.type
POKEROLE.healTypes = ['none', 'basic', 'complete', 'leech', 'custom'];

// Valid raw values for move.heal.target and effect "affects" targeting
POKEROLE.effectTargets = ['user', 'targets'];

// TODO
POKEROLE.natureConfidence = {
  "hardy": 0,
  "lonely": 0,
  "brave": 0,
  "adamant": 0,
  "naughty": 0,
  "bold": 0,
  "docile": 0,
  "relaxed": 0,
  "impish": 0,
  "lax": 0,
  "timid": 0,
  "hasty": 0,
  "serious": 0,
  "jolly": 0,
  "naive": 0,
  "modest": 0,
  "mild": 0,
  "quiet": 0,
  "bashful": 0,
  "rash": 0,
  "calm": 0,
  "gentle": 0,
  "sassy": 0,
  "careful": 0,
  "quirky": 0,
};

/// Attributes that should not have a pain penalty applied by default
POKEROLE.painPenaltyExcludedAttributes = ['vitality', 'will'];

export function getAllAttributesAndSkills() {
  return [...getAllAttributes(), ...POKEROLE.skills];
}

export function getAllAttributes() {
  return [...POKEROLE.attributes, ...POKEROLE.socialAttributes, ...POKEROLE.extraAttributes];
}

export function getSkills() {
  return [...POKEROLE.skills];
}

// 0 = neutral, -1 = resist, 1 = weak, -Infinity = immune
export function calcTypeMatchupScore(attacking, defending) {
  let defendingType = POKEROLE.typeMatchups[defending] ?? POKEROLE.typeMatchups['none'];
  if (defendingType.weak.includes(attacking)) {
    return 1;
  }
  if (defendingType.resist.includes(attacking)) {
    return -1;
  }
  if (defendingType.immune.includes(attacking)) {
    return Number.NEGATIVE_INFINITY;
  }
  return 0;
}

export function calcDualTypeMatchupScore(attacking, defending1, defending2) {
  return calcTypeMatchupScore(attacking, defending1) + calcTypeMatchupScore(attacking, defending2);
}

export function calcTripleTypeMatchupScore(attacking, defending1, defending2, defending3) {
  return calcTypeMatchupScore(attacking, defending1) + calcTypeMatchupScore(attacking, defending2) + calcTypeMatchupScore(attacking, defending3);
}

// Per-attacking-type contribution list for a Matchup Modifier-aware score: one entry per natural type
// slot (may be -Infinity) plus one per active Grant* rule targeting this type. Cancel Immunity is
// applied by the caller afterward, since it needs the full list to filter -Infinity out.
function getMatchupContributions(attackingType, defender) {
  const slots = defender.system.hasThirdType
    ? [defender.system.type1, defender.system.type2, defender.system.type3]
    : [defender.system.type1, defender.system.type2];
  const contributions = slots.map(slot => calcTypeMatchupScore(attackingType, slot));
  for (const source of defender.getActiveRuleSources()) {
    for (const rule of source.system.rules) {
      if ((rule.kind ?? 'attribute') !== 'matchup') continue;
      if (rule.scope !== 'type' || rule.scopeValue !== attackingType) continue;
      if (rule.operation === 'grantWeakness') contributions.push(1);
      else if (rule.operation === 'grantResistance') contributions.push(-1);
      else if (rule.operation === 'grantImmunity') contributions.push(Number.NEGATIVE_INFINITY);
    }
  }
  return contributions;
}

function hasActiveCancelImmunity(attackingType, defender) {
  for (const source of defender.getActiveRuleSources()) {
    for (const rule of source.system.rules) {
      if ((rule.kind ?? 'attribute') !== 'matchup') continue;
      if (rule.operation !== 'cancelImmunity') continue;
      if (rule.scope === 'all' || rule.scopeValue === attackingType) return true;
    }
  }
  return false;
}

/**
 * Single source of truth for "how effective is an attack of this type against this defender" -
 * the natural dual/triple-type sum plus any active Matchup Modifier rules (Grant Weakness/Resistance/
 * Immunity stack additively like an extra type slot; Cancel Immunity strips every -Infinity
 * contribution for its target type(s) before re-summing). Replaces the
 * `hasThirdType ? calcTripleTypeMatchupScore(...) : calcDualTypeMatchupScore(...)` branch that used to
 * be duplicated independently in both roll.mjs and clash.mjs.
 */
export function getEffectiveTypeMatchupScore(attackingType, defender) {
  let contributions = getMatchupContributions(attackingType, defender);
  if (hasActiveCancelImmunity(attackingType, defender)) {
    contributions = contributions.filter(c => c !== Number.NEGATIVE_INFINITY);
  }
  return contributions.reduce((sum, c) => sum + c, 0);
}

/**
 * Rule-aware replacement for getDualTypeMatchups()/getTripleTypeMatchups() - buckets every attacking
 * type by its getEffectiveTypeMatchupScore() result instead of the raw natural score, so the
 * Attributes-tab display and pokemonMatchup() macro API reflect active Matchup Modifier rules.
 * @returns {{weak: string[], doubleWeak: string[], tripleWeak: string[], resist: string[], doubleResist: string[], tripleResist: string[], immune: string[]}}
 */
export function getEffectiveTypeMatchups(defender) {
  const buckets = { weak: [], doubleWeak: [], tripleWeak: [], resist: [], doubleResist: [], tripleResist: [], immune: [] };
  for (const attacking of Object.keys(POKEROLE.typeMatchups)) {
    switch (getEffectiveTypeMatchupScore(attacking, defender)) {
      case 1: buckets.weak.push(attacking); break;
      case 2: buckets.doubleWeak.push(attacking); break;
      case 3: buckets.tripleWeak.push(attacking); break;
      case -1: buckets.resist.push(attacking); break;
      case -2: buckets.doubleResist.push(attacking); break;
      case -3: buckets.tripleResist.push(attacking); break;
      case Number.NEGATIVE_INFINITY: buckets.immune.push(attacking); break;
    }
  }
  return buckets;
}

export function getTypeMatchups(defending) {
  return POKEROLE.typeMatchups[defending];
}

/**
 * 
 * @param {string} defending1 First type of the defender
 * @param {string} defending2 Second type of the defender
 * @returns {{weak: string[], doubleWeak: string[], resist: string[], doubleResist: string[], immune: string[]}}
 */
export function getDualTypeMatchups(defending1, defending2) {
  let matchups = {
    weak: [],
    doubleWeak: [],
    resist: [],
    doubleResist: [],
    immune: []
  };

  for (const attacking of Object.keys(POKEROLE.typeMatchups)) {
    switch (calcDualTypeMatchupScore(attacking, defending1, defending2)) {
      case 1:
        matchups.weak.push(attacking);
        break;
      case 2:
        matchups.doubleWeak.push(attacking);
        break;
      case -1:
        matchups.resist.push(attacking);
        break;
      case -2:
        matchups.doubleResist.push(attacking);
        break;
      case Number.NEGATIVE_INFINITY:
        matchups.immune.push(attacking);
        break;
    }
  }

  return matchups;
}
/**
 *
 * @param {string} defending1 First type of the defender
 * @param {string} defending2 Second type of the defender
 * @param {string} defending3 Third type of the defender
 * @returns {{weak: string[], doubleWeak: string[], tripleWeak: string[], resist: string[], doubleResist: string[], tripleResist: string[], immune: string[]}}
 */
export function getTripleTypeMatchups(defending1, defending2, defending3) {
  let matchups = {
    weak: [],
    doubleWeak: [],
    tripleWeak: [],
    resist: [],
    doubleResist: [],
    tripleResist: [],
    immune: []
  };

  for (const attacking of Object.keys(POKEROLE.typeMatchups)) {
    switch (calcTripleTypeMatchupScore(attacking, defending1, defending2, defending3)) {
      case 1:
        matchups.weak.push(attacking);
        break;
      case 2:
        matchups.doubleWeak.push(attacking);
        break;
      case 3:
        matchups.tripleWeak.push(attacking);
        break;
      case -1:
        matchups.resist.push(attacking);
        break;
      case -2:
        matchups.doubleResist.push(attacking);
        break;
      case -3:
        matchups.tripleResist.push(attacking);
        break;
      case Number.NEGATIVE_INFINITY:
        matchups.immune.push(attacking);
        break;
    }
  }

  return matchups;
}
/**
 *
 * @param {string} rank Evaluated Rank
 * @returns {integer} Accuracy reduction Modifier
 */
export function getConfusionModifier(rank) {
  return POKEROLE.rankProgression[rank]?.confusionPenalty ?? 0;
}

// Named per-rank dice-count tables for moves whose damage pool scales with the user's Rank (e.g. Seismic Toss, Night Shade, Psywave); ranks not listed in a tag fall back to 0.
POKEROLE.rankDiceTables = {
  standard: {
    starter: 1,
    rookie: 2,
    standard: 4,
    advanced: 6,
    expert: 8,
    ace: 10,
    master: 10,
    champion: 10
  }
};

/**
 * @param {string} tag Table name (key into POKEROLE.rankDiceTables)
 * @param {string} rank
 * @returns {number} Dice count for that rank in the given table, or 0 if unlisted
 */
export function getRankDiceCount(tag, rank) {
  return POKEROLE.rankDiceTables[tag]?.[rank] ?? 0;
}

// Training Point cost per Level-evolution speed tier (Pokerole rulebook values).
POKEROLE.evolutionSpeedTrainingPoints = { fast: 10, medium: 30, slow: 50 };

// Vitamin mechanical bonuses (Issue #132). Vitamin/Rare Candy give the same flat amount to an attribute's value/max.
POKEROLE.vitaminAttributeBonus = 1;
POKEROLE.vitaminHpMaxBonus = 2;
POKEROLE.vitaminWillMaxBonus = 2;

/**
 * Value bonus an attribute's Vitamin/Rare Candy checkboxes grant, given its current value/max (pre-bonus).
 * Independent toggles that stack: Vitamin adds to value, Rare Candy adds to both value and max.
 * Shared by PokeroleActor#_applyEffects() (applies it to the attribute for display) and
 * PokeroleActorBaseData#prepareDerivedData() (needs it independently, since that runs before
 * _applyEffects() each cycle - see hp.max/will.max/derived.* there).
 * @param {boolean} vitamin
 * @param {boolean} rareCandy
 * @param {number} currentValue
 * @param {number} currentMax
 * @returns {number} Integer bonus to add to currentValue (0 if neither is set).
 */
export function computeAttributeVitaminBonus(vitamin, rareCandy, currentValue, currentMax) {
  const rawBonus = (vitamin ? POKEROLE.vitaminAttributeBonus : 0) + (rareCandy ? POKEROLE.vitaminAttributeBonus : 0);
  if (rawBonus === 0) return 0;
  const effectiveMax = currentMax + (rareCandy ? POKEROLE.vitaminAttributeBonus : 0);
  return Math.min(currentValue + rawBonus, effectiveMax) - currentValue;
}

/** Turns one raw `system.evolutions[]` entry into `{label, kindLabel, detail}` display data, or `null` for kinds not shown (form/unrecognized). */
export function buildEvolutionDisplayData(evolution) {
  switch (evolution.kind) {
    case 'level': {
      const speed = evolution.speed;
      const label = speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown';
      const tp = POKEROLE.evolutionSpeedTrainingPoints[speed];
      return { label, kindLabel: 'Level', detail: tp ? `${tp} Training Points` : `${label} pace` };
    }
    case 'stone':
    case 'item':
      return { label: 'Item', kindLabel: 'Item', detail: `Requires: ${evolution.item}` };
    case 'stat':
      return { label: evolution.stat, kindLabel: 'Stat', detail: `${evolution.stat} ${evolution.value ?? ''}+`.trim() };
    case 'special':
      return { label: 'Special', kindLabel: 'Special', detail: evolution.special ?? '' };
    case 'trade':
      return { label: 'Trade', kindLabel: 'Trade', detail: evolution.item ? `Requires: ${evolution.item}` : 'No additional requirements' };
    case 'mega':
      return { label: 'Mega', kindLabel: 'Mega', detail: evolution.item ? `Requires: ${evolution.item}` : 'Mega Evolution' };
    default:
      return null;
  }
}

// Narrative Strength->Lifting Capacity and Dexterity->Max Speed charts (Pokerole rulebook values). Index 0 unused; 1-10 matches the attribute range.
POKEROLE.strengthLiftingCapacity = [null,
  { lb: 40, kg: 18 }, { lb: 100, kg: 45 }, { lb: 250, kg: 113 }, { lb: 400, kg: 181 }, { lb: 650, kg: 294 },
  { lb: 800, kg: 362 }, { lb: 900, kg: 408 }, { lb: 1000, kg: 453 }, { lb: 1200, kg: 544 }, { lb: 1500, kg: 680 }
];
POKEROLE.dexterityMaxSpeed = [null,
  { mph: 6, kmph: 10 }, { mph: 12, kmph: 20 }, { mph: 15, kmph: 25 }, { mph: 18, kmph: 30 }, { mph: 24, kmph: 40 },
  { mph: 37, kmph: 60 }, { mph: 49, kmph: 80 }, { mph: 62, kmph: 100 }, { mph: 80, kmph: 130 }, { mph: 99, kmph: 160 }
];
POKEROLE.athleticLiftingBonus = { lb: 8, kg: 4 };
POKEROLE.athleticSpeedBonus = { mph: 1.4, kmph: 2 };

/**
 * Computes narrative Lifting Capacity and Max Speed from Strength/Dexterity/Athletic.
 * Scores outside 1-10 (e.g. reduced to 0, or raised past 10) clamp to the nearest table row.
 */
export function buildPhysicalCapacityDisplayData(strengthValue, dexterityValue, athleticValue) {
  const str = Math.clamp(strengthValue, 1, 10);
  const dex = Math.clamp(dexterityValue, 1, 10);
  const lift = POKEROLE.strengthLiftingCapacity[str];
  const speed = POKEROLE.dexterityMaxSpeed[dex];
  return {
    lifting: {
      lb: Math.round(lift.lb + athleticValue * POKEROLE.athleticLiftingBonus.lb),
      kg: Math.round(lift.kg + athleticValue * POKEROLE.athleticLiftingBonus.kg)
    },
    speed: {
      mph: Math.round(speed.mph + athleticValue * POKEROLE.athleticSpeedBonus.mph),
      kmph: Math.round(speed.kmph + athleticValue * POKEROLE.athleticSpeedBonus.kmph)
    }
  };
}

/** How many regular and Lethal damage are healed from basic and complete heals */
POKEROLE.healAmounts = {
  basic: {
    regular: 3,
    lethal: 0,
  },
  complete: {
    regular: 5,
    lethal: 5
  }
}

/** Raw Pain Penalization level (0-3): -1 at half HP, stacking to -3 at exactly 1 HP. 0 if disabled world-wide. */
export function computePainPenaltyLevel(hpValue, hpMax) {
  if (game.settings.get('pokerole', 'disablePainPenalty')) return 0;
  if (hpValue === 1) return 3;
  if (hpValue > 0 && hpValue <= Math.floor(hpMax / 2)) return 1;
  return 0;
}

/** 'low' | 'mid' | 'high' bucket for HP-bar coloring, independent of the fainted check. */
export function getHpBarBucket(value, max) {
  const pct = max > 0 ? value / max : 0;
  if (pct <= 0.25) return 'low';
  if (pct <= 0.5) return 'mid';
  return 'high';
}

POKEROLE.i18n = {
  attributes: {
    "strength": "POKEROLE.AttributeStrength",
    "dexterity": "POKEROLE.AttributeDexterity",
    "vitality": "POKEROLE.AttributeVitality",
    "special": "POKEROLE.AttributeSpecial",
    "insight": "POKEROLE.AttributeInsight",
  },

  skills: {
    "brawl": "POKEROLE.SkillBrawl",
    "channel": "POKEROLE.SkillChannel",
    "clash": "POKEROLE.SkillClash",
    "evasion": "POKEROLE.SkillEvasion",
    "alert": "POKEROLE.SkillAlert",
    "athletic": "POKEROLE.SkillAthletic",
    "nature": "POKEROLE.SkillNature",
    "stealth": "POKEROLE.SkillStealth",
    "charm": "POKEROLE.SkillCharm",
    "etiquette": "POKEROLE.SkillEtiquette",
    "intimidate": "POKEROLE.SkillIntimidate",
    "perform": "POKEROLE.SkillPerform",
    "crafts": "POKEROLE.SkillCrafts",
    "lore": "POKEROLE.SkillLore",
    "medicine": "POKEROLE.SkillMedicine",
    "science": "POKEROLE.SkillScience",
    "throw": "POKEROLE.SkillThrow",
    "weapon": "POKEROLE.SkillWeapon",
    "empathy": "POKEROLE.SkillEmpathy"
  },

  social: {
    "tough": "POKEROLE.SocialTough",
    "cool": "POKEROLE.SocialCool",
    "beauty": "POKEROLE.SocialBeauty",
    "cute": "POKEROLE.SocialCute",
    "clever": "POKEROLE.SocialClever",
  },

  extra: {
    "happiness": "POKEROLE.ExtraHappiness",
    "loyalty": "POKEROLE.ExtraLoyalty",
  },

  derived: {
    "initiative": "POKEROLE.DerivedInitiative",
    "evade": "POKEROLE.DerivedEvade",
    "clashPhysical": "POKEROLE.DerivedClashPhysical",
    "clashSpecial": "POKEROLE.DerivedClashSpecial",
    "atk": "POKEROLE.DerivedAtk",
    "spAtk": "POKEROLE.DerivedSpAtk",
    "def": "POKEROLE.DerivedDef",
    "spDef": "POKEROLE.DerivedSpDef",
  },

  types: {
    "none": "POKEROLE.TypeNone",
    "normal": "POKEROLE.TypeNormal",
    "bug": "POKEROLE.TypeBug",
    "dark": "POKEROLE.TypeDark",
    "dragon": "POKEROLE.TypeDragon",
    "electric": "POKEROLE.TypeElectric",
    "fairy": "POKEROLE.TypeFairy",
    "fighting": "POKEROLE.TypeFighting",
    "fire": "POKEROLE.TypeFire",
    "flying": "POKEROLE.TypeFlying",
    "ghost": "POKEROLE.TypeGhost",
    "grass": "POKEROLE.TypeGrass",
    "ground": "POKEROLE.TypeGround",
    "ice": "POKEROLE.TypeIce",
    "poison": "POKEROLE.TypePoison",
    "psychic": "POKEROLE.TypePsychic",
    "rock": "POKEROLE.TypeRock",
    "steel": "POKEROLE.TypeSteel",
    "water": "POKEROLE.TypeWater",
  },

  targets: {
    "Foe": "POKEROLE.TargetFoe",
    "Random Foe": "POKEROLE.TargetRandomFoe",
    "All Foes": "POKEROLE.TargetAllFoes",
    "Self": "POKEROLE.TargetUser",
    "Ally": "POKEROLE.TargetAlly",
    "All Allies": "POKEROLE.TargetUserAndAllies",
    "Area": "POKEROLE.TargetArea",
    "Battlefield": "POKEROLE.TargetBattlefield",
    "Foe's Battlefield": "POKEROLE.TargetBattlefieldFoes",
    "Ally's Battlefield": "POKEROLE.TargetBattlefieldAndArea",
  },

  moveCategories: {
    "physical": "POKEROLE.MoveCategoryPhysical",
    "special": "POKEROLE.MoveCategorySpecial",
    "support": "POKEROLE.MoveCategorySupport",
  },

  natures: {
    "hardy": "POKEROLE.NatureHardy",
    "lonely": "POKEROLE.NatureLonely",
    "brave": "POKEROLE.NatureBrave",
    "adamant": "POKEROLE.NatureAdamant",
    "naughty": "POKEROLE.NatureNaughty",
    "bold": "POKEROLE.NatureBold",
    "docile": "POKEROLE.NatureDocile",
    "relaxed": "POKEROLE.NatureRelaxed",
    "impish": "POKEROLE.NatureImpish",
    "lax": "POKEROLE.NatureLax",
    "timid": "POKEROLE.NatureTimid",
    "hasty": "POKEROLE.NatureHasty",
    "serious": "POKEROLE.NatureSerious",
    "jolly": "POKEROLE.NatureJolly",
    "naive": "POKEROLE.NatureNaive",
    "modest": "POKEROLE.NatureModest",
    "mild": "POKEROLE.NatureMild",
    "quiet": "POKEROLE.NatureQuiet",
    "bashful": "POKEROLE.NatureBashful",
    "rash": "POKEROLE.NatureRash",
    "calm": "POKEROLE.NatureCalm",
    "gentle": "POKEROLE.NatureGentle",
    "sassy": "POKEROLE.NatureSassy",
    "careful": "POKEROLE.NatureCareful",
    "quirky": "POKEROLE.NatureQuirky",
  },

  natureKeywords: {
    "hardy": "POKEROLE.NatureKeywordsHardy",
    "lonely": "POKEROLE.NatureKeywordsLonely",
    "brave": "POKEROLE.NatureKeywordsBrave",
    "adamant": "POKEROLE.NatureKeywordsAdamant",
    "naughty": "POKEROLE.NatureKeywordsNaughty",
    "bold": "POKEROLE.NatureKeywordsBold",
    "docile": "POKEROLE.NatureKeywordsDocile",
    "relaxed": "POKEROLE.NatureKeywordsRelaxed",
    "impish": "POKEROLE.NatureKeywordsImpish",
    "lax": "POKEROLE.NatureKeywordsLax",
    "timid": "POKEROLE.NatureKeywordsTimid",
    "hasty": "POKEROLE.NatureKeywordsHasty",
    "serious": "POKEROLE.NatureKeywordsSerious",
    "jolly": "POKEROLE.NatureKeywordsJolly",
    "naive": "POKEROLE.NatureKeywordsNaive",
    "modest": "POKEROLE.NatureKeywordsModest",
    "mild": "POKEROLE.NatureKeywordsMild",
    "quiet": "POKEROLE.NatureKeywordsQuiet",
    "bashful": "POKEROLE.NatureKeywordsBashful",
    "rash": "POKEROLE.NatureKeywordsRash",
    "calm": "POKEROLE.NatureKeywordsCalm",
    "gentle": "POKEROLE.NatureKeywordsGentle",
    "sassy": "POKEROLE.NatureKeywordsSassy",
    "careful": "POKEROLE.NatureKeywordsCareful",
    "quirky": "POKEROLE.NatureKeywordsQuirky",
  },

  natureDescriptions: {
    "hardy": "POKEROLE.NatureDescriptionHardy",
    "lonely": "POKEROLE.NatureDescriptionLonely",
    "brave": "POKEROLE.NatureDescriptionBrave",
    "adamant": "POKEROLE.NatureDescriptionAdamant",
    "naughty": "POKEROLE.NatureDescriptionNaughty",
    "bold": "POKEROLE.NatureDescriptionBold",
    "docile": "POKEROLE.NatureDescriptionDocile",
    "relaxed": "POKEROLE.NatureDescriptionRelaxed",
    "impish": "POKEROLE.NatureDescriptionImpish",
    "lax": "POKEROLE.NatureDescriptionLax",
    "timid": "POKEROLE.NatureDescriptionTimid",
    "hasty": "POKEROLE.NatureDescriptionHasty",
    "serious": "POKEROLE.NatureDescriptionSerious",
    "jolly": "POKEROLE.NatureDescriptionJolly",
    "naive": "POKEROLE.NatureDescriptionNaive",
    "modest": "POKEROLE.NatureDescriptionModest",
    "mild": "POKEROLE.NatureDescriptionMild",
    "quiet": "POKEROLE.NatureDescriptionQuiet",
    "bashful": "POKEROLE.NatureDescriptionBashful",
    "rash": "POKEROLE.NatureDescriptionRash",
    "calm": "POKEROLE.NatureDescriptionCalm",
    "gentle": "POKEROLE.NatureDescriptionGentle",
    "sassy": "POKEROLE.NatureDescriptionSassy",
    "careful": "POKEROLE.NatureDescriptionCareful",
    "quirky": "POKEROLE.NatureDescriptionQuirky",
  },

  ranks: {
    "none": "POKEROLE.RankNone",
    "starter": "POKEROLE.RankStarter",
    "rookie": "POKEROLE.RankRookie",
    "standard": "POKEROLE.RankStandard",
    "advanced": "POKEROLE.RankAdvanced",
    "expert": "POKEROLE.RankExpert",
    "ace": "POKEROLE.RankAce",
    "master": "POKEROLE.RankMaster",
    "champion": "POKEROLE.RankChampion",
  },

  moveGroups: {
    "learned": "POKEROLE.MoveGroupLearned",

    "starter": "POKEROLE.MoveGroupStarter",
    "rookie": "POKEROLE.MoveGroupRookie",
    "standard": "POKEROLE.MoveGroupStandard",
    "advanced": "POKEROLE.MoveGroupAdvanced",
    "expert": "POKEROLE.MoveGroupExpert",
    "ace": "POKEROLE.MoveGroupAce",
    "master": "POKEROLE.MoveGroupMaster",
    "champion": "POKEROLE.MoveGroupChampion",

    "maneuver": "POKEROLE.MoveGroupManeuver",
  },

  healTypes: {
    "none": "POKEROLE.HealNone",
    "basic": "POKEROLE.HealBasic",
    "complete": "POKEROLE.HealComplete",
    "leech": "POKEROLE.HealLeech",
    "custom": "POKEROLE.HealCustom",
  },

  damagePoolFormulas: {
    "standard": "POKEROLE.DamagePoolFormulaStandard",
    "hpBased": "POKEROLE.DamagePoolFormulaHpBased",
    "statDiff": "POKEROLE.DamagePoolFormulaStatDiff",
    "fixed": "POKEROLE.DamagePoolFormulaFixed",
  },

  damagePoolHpModes: {
    "remaining": "POKEROLE.DamagePoolHpModeRemaining",
    "missing": "POKEROLE.DamagePoolHpModeMissing",
    "max": "POKEROLE.DamagePoolHpModeMax",
  },

  damagePoolResultAs: {
    "diceToRoll": "POKEROLE.DamagePoolResultAsDiceToRoll",
    "directDamage": "POKEROLE.DamagePoolResultAsDirectDamage",
  },

  damagePoolDiceModes: {
    "override": "POKEROLE.DamagePoolDiceModeOverride",
    "add": "POKEROLE.DamagePoolDiceModeAdd",
  },

  damagePoolDirections: {
    "target": "POKEROLE.DamagePoolDirectionTarget",
    "user": "POKEROLE.DamagePoolDirectionUser",
    "userAbove": "POKEROLE.DamagePoolDirectionUserAbove",
    "targetAbove": "POKEROLE.DamagePoolDirectionTargetAbove",
  },

  effectTargets: {
    "user": "POKEROLE.EffectTargetUser",
    "targets": "POKEROLE.EffectTargetTargets",
  },

  painPenaltyLevels: {
    0: "POKEROLE.PainPenaltyLevelNone",
    1: "POKEROLE.PainPenaltyLevelHalfHp",
    2: "POKEROLE.PainPenaltyLevel1Hp2",
    3: "POKEROLE.PainPenaltyLevel1Hp3",
  },

  ailments: {
    "fainted": "POKEROLE.StatusFainted",
    "paralysis": "POKEROLE.StatusParalysis",
    "frozen": "POKEROLE.StatusFrozen",
    "poison": "POKEROLE.StatusPoison",
    "badlyPoisoned": "POKEROLE.StatusBadlyPoisoned",
    "sleep": "POKEROLE.StatusSleep",
    "burn1": "POKEROLE.StatusBurn1",
    "burn2": "POKEROLE.StatusBurn2",
    "burn3": "POKEROLE.StatusBurn3",
    "confused": "POKEROLE.StatusConfused",
    "disabled": "POKEROLE.StatusDisabled",
    "flinch": "POKEROLE.StatusFlinch",
    "infatuated": "POKEROLE.StatusInfatuated",
  },

  effectStats: {
    "strength": "POKEROLE.AttributeStrength",
    "dexterity": "POKEROLE.AttributeDexterity",
    "special": "POKEROLE.AttributeSpecial",
    "def": "POKEROLE.DerivedDef",
    "spDef": "POKEROLE.DerivedSpDef",
    "accuracyMod": "POKEROLE.AccuracyMod",
  }
};

/**
 * Get localized entries to be used with <select> elements for a given category
 * @param {string} category A category in `POKEROLE.i18n`, such as `types`
 * @returns {Object | undefined}
 */
export function getLocalizedEntriesForSelect(category) {
  if (!POKEROLE.i18n[category]) {
    return undefined;
  }

  const entries = {};
  for (let [k, v] of Object.entries(POKEROLE.i18n[category])) {
    entries[k] = game.i18n.localize(v) ?? v;
  }
  return entries;
}

/** Whether a Move's damagePool formula fully replaces the standard power+stat pool (so the Moves tab's base "dmgMod1 +power" text would be misleading and should be hidden) rather than adding onto it. */
export function isDamagePoolOverridingBasePool(damagePool) {
  if (!damagePool || damagePool.formula === 'standard') return false;
  if (damagePool.formula === 'fixed') return true;
  if (damagePool.formula === 'hpBased') return damagePool.resultAs === 'directDamage' || damagePool.diceMode === 'override';
  if (damagePool.formula === 'statDiff') return damagePool.diceMode === 'override';
  return false;
}

/** Builds a one-line, human-readable description of a Move's non-standard damagePool formula, for the Moves tab's "*" tooltip - null if the formula is 'standard' (nothing special to explain). */
export function buildDamagePoolFormulaTooltip(damagePool) {
  if (!damagePool || damagePool.formula === 'standard') return null;

  const loc = (dict, key) => game.i18n.localize(dict[key]) ?? key;

  // "Add" when the formula's dice stack onto the standard pool, "Use" when it fully replaces it.
  const diceModeVerb = damagePool.diceMode === 'add' ? 'Add' : 'Use';

  if (damagePool.formula === 'fixed') {
    let text = `Deal ${damagePool.amount} direct damage`;
    if (damagePool.ignoreTypeEffectiveness) text += ', ignoring type effectiveness';
    return text;
  }

  if (damagePool.formula === 'hpBased') {
    const hpLabel = loc(POKEROLE.i18n.damagePoolHpModes, damagePool.hpMode);
    // diceMode (Add/Use) only applies when this formula actually produces dice to roll - a
    // 'directDamage' result is always a flat number, there's no pool for it to add to or replace.
    let text = damagePool.resultAs === 'directDamage'
      ? `Deal ${damagePool.fraction}% of ${hpLabel} as direct damage`
      : `${diceModeVerb} ${damagePool.fraction}% of ${hpLabel} as dice`;
    if (damagePool.plusAmount) text += ` + ${damagePool.plusAmount}`;
    if (damagePool.resultAs === 'diceToRoll' && damagePool.maxDice != null) text += `, max ${damagePool.maxDice}`;
    return text;
  }

  if (damagePool.formula === 'statDiff') {
    let text;
    // Rank-based statDiff looks up dice count from a rank table (getRankDiceCount()), not perUnit/direction.
    if (damagePool.stat === 'rank') {
      text = `${diceModeVerb} dice based on ${game.i18n.localize('POKEROLE.Rank')} (${damagePool.rankTable} table)`;
    } else {
      const statLabel = damagePool.stat === 'weight' ? game.i18n.localize('POKEROLE.Weight') : loc(POKEROLE.i18n.attributes, damagePool.stat);
      const whoHasIt = {
        target: `${statLabel} the target has`,
        user: `${statLabel} you have`,
        userAbove: `${statLabel} you have above the target's`,
        targetAbove: `${statLabel} the target has above yours`
      }[damagePool.direction];
      text = `${diceModeVerb} 1 die per ${damagePool.perUnit} ${whoHasIt}`;
    }
    if (damagePool.maxDice != null) text += `, max ${damagePool.maxDice}`;
    return text;
  }

  return null;
}

/**
 * Get a localized string for a Pokémon type key
 * @param {string} type
 * @returns {string}
 */
export function getLocalizedType(type) {
  return game.i18n.localize(POKEROLE.i18n.types[type]) ?? type;
}

/** 
 * Get an object with key-value pairs of Pokémon type keys and their translations
 *  @returns {Object}
 */
export function getLocalizedTypesForSelect() {
  const obj = {};
  for (const type of POKEROLE.types) {
    obj[type] = getLocalizedType(type);
  }
  return obj;
}

/**
 * The closed, grouped list of paths a Custom Effect/Held Item/Ability "Attribute Override" rule may
 * target (TASK-16) - single source of truth for both the sheet's dropdown and _applyEffects()'s
 * mechanical whitelist. Excludes Pain Penalization (own override toggle), Training Points, Rank,
 * Evolution Stage, and Extra/Happiness/Loyalty - none of those are overridable by design.
 * @returns {Array<{label: string, options: Array<{path: string, label: string}>}>}
 */
export function getRuleAttributeTargets() {
  const attrLabel = key => game.i18n.localize(POKEROLE.i18n.attributes[key]) ?? key;
  return [
    {
      label: 'Attributes',
      options: POKEROLE.attributes.flatMap(key => [
        { path: `system.attributes.${key}.value`, label: `${attrLabel(key)} — Value` },
        { path: `system.attributes.${key}.max`, label: `${attrLabel(key)} — Max` }
      ])
    },
    {
      label: 'Social',
      options: POKEROLE.socialAttributes.map(key => ({ path: `system.social.${key}.value`, label: game.i18n.localize(POKEROLE.i18n.social[key]) ?? key }))
    },
    {
      label: 'Skills',
      // The union of pokemonSkills/trainerSkills (i18n.skills already covers exactly that) - a rule isn't
      // bound to one actor type at authoring time, and a mismatched selection is a harmless no-op.
      options: Object.keys(POKEROLE.i18n.skills).map(key => ({ path: `system.skills.${key}.value`, label: game.i18n.localize(POKEROLE.i18n.skills[key]) ?? key }))
    },
    {
      label: 'Derived',
      // Hardcoded, not Object.keys(POKEROLE.i18n.derived) - that also holds 'atk'/'spAtk', which are dead keys never actually built onto system.derived.
      options: ['initiative', 'evade', 'clashPhysical', 'clashSpecial', 'def', 'spDef'].map(key => ({ path: `system.derived.${key}.value`, label: game.i18n.localize(POKEROLE.i18n.derived[key]) ?? key }))
    },
    {
      label: 'Resource',
      options: [
        { path: 'system.hp.max', label: 'HP — Max' },
        { path: 'system.will.max', label: 'Willpower — Max' }
      ]
    },
    {
      label: 'Combat Modifier',
      options: [
        { path: 'system.accuracyMod.value', label: 'Accuracy Roll Bonus' }
      ]
    }
  ];
}

/** Flat Set of every valid Attribute Override target path - see getRuleAttributeTargets(). */
export function getRuleAttributeTargetPaths() {
  const paths = new Set();
  for (const group of getRuleAttributeTargets()) {
    for (const option of group.options) paths.add(option.path);
  }
  return paths;
}

/**
 * Damage Pool Bonus "Category" scope choices - just the atomic categories (physical/special).
 * 'support' is excluded (never has a dice pool in this ruleset, same exclusion PokeroleItem#canBeClashed()
 * already uses). The compound category strings ('physical/special', 'support/physical/special') are
 * deliberately not offered as scope *values* - matching is membership-based (see getDamagePoolRuleBonus()
 * in roll.mjs), so picking "Physical" already covers a compound-category move; offering the compound
 * strings themselves as a pickable scope would only match that exact compound string, a narrower and
 * more confusing case than what an author actually wants.
 */
export function getDamagePoolCategoryChoices() {
  const entries = {};
  for (const category of ['physical', 'special']) {
    entries[category] = game.i18n.localize(POKEROLE.i18n.moveCategories[category]) ?? category;
  }
  return entries;
}

/** Localized classification string for a Pain Penalty level (0-3), e.g. "Half HP (-1)". */
export function getLocalizedPainPenaltyLevel(level) {
  return game.i18n.localize(POKEROLE.i18n.painPenaltyLevels[level] ?? POKEROLE.i18n.painPenaltyLevels[0]);
}

