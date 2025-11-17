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
  return Object.entries(POKEROLE.getAilments()).map(([id, ailment]) => ({ id, ...ailment }));
}

POKEROLE.specialStatusEffects = {
  BLIND: 'blind',
  DEFEATED: 'fainted',
  INVISIBLE: 'invisible',
}

POKEROLE.ranks = ['none', 'starter', 'rookie', 'standard', 'advanced', 'expert', 'ace', 'master', 'champion'];
POKEROLE.moveGroups = ['learned', ...POKEROLE.ranks.slice(1), 'maneuver'];

POKEROLE.itemCategory = {
  item: "Item", 
  medicine: "Medicine", 
  pokeball: "Pokeball", 
  ingredient: "Ingredient", 
  pokedex: "Pokedex", 
  battle: "Battle Item", 
  keyItem: "Key Item",
  miscItem: "Misc Item"
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

POKEROLE.styleColor = {
  // Styles
  skinClean : {
    color1: '#2D2718',
    color2: '#E73C2F',
    color3: '#FFFFFF',
    color4: '#E73C2F',
  },
  skinOld : {
    color1: '#2D2718',
    color2: '#C34231',
    color3: '#FFFFFF',
    color4: '#C34231',
  },
  secret : {
    color1: 'red',
    color2: 'green',
    color3: 'blue',
    color4: 'grey',
  },
  v3style : {
    color1: '#433727',
    color2: '#A21C1C',
    color3: '#DAECF9',
    color4: '#D22417',
  },
}

POKEROLE.styleSheet = Object.keys(POKEROLE.styleColor);

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
    maxTargets: 5,
    totalPassiveIncrease: 0,
    confusionPenalty: 1,
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

/** Number of dice to reduce for each pain penalty */
POKEROLE.painPenalties = {
  'none': 0,
  'minus1': 1,
  'minus2': 2,
  'minus3': 3
};

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
    "useItem": "POKEROLE.DerivedUseItem",
    "searchForCover": "POKEROLE.DerivedSearchForCover",
    "runAway": "POKEROLE.DerivedRunAway",
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
    "User": "POKEROLE.TargetUser",
    "One Ally": "POKEROLE.TargetAlly",
    "User and Allies": "POKEROLE.TargetUserAndAllies",
    "Area": "POKEROLE.TargetArea",
    "Battlefield": "POKEROLE.TargetBattlefield",
    "Battlefield (Foes)": "POKEROLE.TargetBattlefieldFoes",
    "Battlefield and Area": "POKEROLE.TargetBattlefieldAndArea",
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

  effectTargets: {
    "user": "POKEROLE.EffectTargetUser",
    "targets": "POKEROLE.EffectTargetTargets",
  },

  painPenalties: {
    "none": "POKEROLE.PainPenaltyNone",
    "minus1": "POKEROLE.PainPenaltyMinus1",
    "minus2": "POKEROLE.PainPenaltyMinus2",
    "minus3": "POKEROLE.PainPenaltyMinus3",
  },

  painPenaltiesShort: {
    "none": "POKEROLE.PainPenaltyNoneShort",
    "minus1": "POKEROLE.PainPenaltyMinus1Short",
    "minus2": "POKEROLE.PainPenaltyMinus2Short",
    "minus3": "POKEROLE.PainPenaltyMinus3Short",
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
 * Get an object with key-value pairs of pain penalty keys and their translations
 * @returns {Object}
 */
export function getLocalizedPainPenaltiesForSelect() {
  return getLocalizedEntriesForSelect('painPenalties');
}

