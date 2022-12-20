export const POKEROLE = {};

POKEROLE.typeMatchups = {
  'none': {
    weak: [],
    resist: [],
    immune: [],
  },
  'normal': {
    weak: ['fighting'],
    resist: [],
    immune: ['ghost'],
  },
  'bug': {
    weak: ['fire', 'flying', 'rock'],
    resist: ['fighting', 'grass', 'ground'],
    immune: [],
  },
  'dark': {
    weak: ['bug', 'fairy', 'fighting'],
    resist: ['dark', 'ghost'],
    immune: ['psychic'],
  },
  'dragon': {
    weak: ['dragon', 'fairy', 'ice'],
    resist: ['electric', 'fire', 'grass', 'water'],
    immune: [],
  },
  'electric': {
    weak: ['ground'],
    resist: ['electric', 'fire', 'grass', 'water'],
    immune: [],
  },
  'fairy': {
    weak: ['poison', 'steel'],
    resist: ['bug', 'dark', 'fighting'],
    immune: ['dragon'],
  },
  'fighting': {
    weak: ['fairy', 'flying', 'psychic'],
    resist: ['bug', 'dark', 'rock'],
    immune: [],
  },
  'fire': {
    weak: ['ground', 'rock', 'water'],
    resist: ['bug', 'fairy', 'fire', 'grass', 'ice', 'steel'],
    immune: [],
  },
  'flying': {
    weak: ['electric', 'ice', 'rock'],
    resist: ['bug', 'fighting', 'grass'],
    immune: ['ground'],
  },
  'ghost': {
    weak: ['dark', 'ghost'],
    resist: ['bug', 'poison'],
    immune: ['fighting', 'normal'],
  },
  'grass': {
    weak: ['bug', 'fire', 'flying', 'ice', 'poison'],
    resist: ['electric', 'grass', 'ground', 'water'],
    immune: [],
  },
  'ground': {
    weak: ['grass', 'ice', 'water'],
    resist: ['poison', 'rock'],
    immune: ['electric'],
  },
  'ice': {
    weak: ['fighting', 'fire', 'rock', 'steel'],
    resist: ['ice'],
    immune: [],
  },
  'poison': {
    weak: ['ground', 'psychic'],
    resist: ['bug', 'fairy', 'fighting', 'grass', 'poison'],
    immune: [],
  },
  'psychic': {
    weak: ['bug', 'dark', 'ghost'],
    resist: ['fighting', 'psychic'],
    immune: [],
  },
  'rock': {
    weak: ['grass', 'ground', 'fighting', 'steel', 'water'],
    resist: ['fire', 'flying', 'normal', 'poison'],
    immune: [],
  },
  'steel': {
    weak: ['fighting', 'fire', 'ground'],
    resist: ['bug', 'dragon', 'flying', 'fairy', 'grass', 'ice', 'normal', 'psychic', 'rock', 'steel'],
    immune: ['poison'],
  },
  'water': {
    weak: ['electric', 'grass'],
    resist: ['fire', 'ice', 'steel', 'water'],
    immune: [],
  },
};

POKEROLE.types = Object.keys(POKEROLE.typeMatchups);

POKEROLE.getStatusEffects = () => [{
  id: 'paralysis',
  label: game.i18n.localize('POKEROLE.StatusParalysis'),
  icon: 'icons/svg/paralysis.svg',
  changes: [{ key: 'system.attributes.dexterity.value', mode: 2 /* Add */, value: "-2" }]
}, {
  id: 'frozen', label: game.i18n.localize('POKEROLE.StatusFrozen'), icon: 'icons/svg/frozen.svg', tint: '#96CFD0'
}, {
  id: 'poison', label: game.i18n.localize('POKEROLE.StatusPoison'), icon: 'icons/svg/poison.svg', tint: '#8F6995'
}, {
  id: 'badlyPoisoned', label: game.i18n.localize('POKEROLE.StatusBadlyPoisoned'), icon: 'icons/svg/radiation.svg', tint: '#714783'
}, {
  id: 'sleep', label: game.i18n.localize('POKEROLE.StatusSleep'), icon: 'icons/svg/sleep.svg', tint: '#B5B590'
}, {
  id: 'burn1', label: game.i18n.localize('POKEROLE.StatusBurn1'), icon: 'icons/svg/fire.svg', tint: '#E16436'
}, {
  id: 'burn2', label: game.i18n.localize('POKEROLE.StatusBurn2'), icon: 'icons/svg/fire.svg', tint: '#B84129'
}, {
  id: 'burn3', label: game.i18n.localize('POKEROLE.StatusBurn3'), icon: 'icons/svg/fire.svg', tint: '#93291B'
}, {
  id: 'flinch', label: game.i18n.localize('POKEROLE.StatusFlinch'), icon: 'icons/svg/silenced.svg', tint: '#575D69'
}, {
  id: 'confused', label: game.i18n.localize('POKEROLE.StatusConfused'), icon: 'icons/svg/daze.svg', tint: '#4DAF81'
}, {
  id: 'infaturated', label: game.i18n.localize('POKEROLE.StatusInfaturated'), icon: 'icons/svg/daze.svg', tint: '#E1657F'
}, {
  id: 'fainted', label: game.i18n.localize('POKEROLE.StatusFainted'), icon: 'icons/svg/unconscious.svg'
}, {
  id: 'invisible', label: game.i18n.localize('POKEROLE.StatusInvisible'), icon: 'icons/svg/invisible.svg'
}, {
  id: 'blind', label: game.i18n.localize('POKEROLE.StatusBlind'), icon: 'icons/svg/blind.svg'
}];

POKEROLE.specialStatusEffects = {
  BLIND: 'blind',
  DEFEATED: 'fainted',
  INVISIBLE: 'invisible',
}

POKEROLE.ranks = ['none', 'starter', 'beginner', 'amateur', 'ace', 'pro', 'master', 'champion'];
POKEROLE.moveGroups = ['learned', ...POKEROLE.ranks.slice(1), 'maneuver'];

POKEROLE.rankProgression = {
  'none': {
    attributePoints: 0,
    skillPoints: 0,
    socialPoints: 0,
    skillLimit: 0,
    maxTargets: 0,
    totalPassiveIncrease: 0,
  },
  'starter': {
    attributePoints: 0,
    skillPoints: 5,
    socialPoints: 0,
    skillLimit: 1,
    maxTargets: 2,
    totalPassiveIncrease: 0,
  },
  'beginner': {
    attributePoints: 2,
    skillPoints: 4,
    socialPoints: 2,
    skillLimit: 2,
    maxTargets: 2,
    totalPassiveIncrease: 0,
  },
  'amateur': {
    attributePoints: 2,
    skillPoints: 3,
    socialPoints: 2,
    skillLimit: 3,
    maxTargets: 3,
    totalPassiveIncrease: 0,
  },
  'ace': {
    attributePoints: 2,
    skillPoints: 2,
    socialPoints: 2,
    skillLimit: 4,
    maxTargets: 5,
    totalPassiveIncrease: 0,
  },
  'pro': {
    attributePoints: 2,
    skillPoints: 1,
    socialPoints: 2,
    skillLimit: 5,
    maxTargets: 6,
    totalPassiveIncrease: 0,
  },
  'master': {
    attributePoints: 0,
    skillPoints: 0,
    socialPoints: 0,
    skillLimit: 5,
    maxTargets: 6,
    totalPassiveIncrease: 2,
  },
  'champion': {
    attributePoints: 0,
    skillPoints: 0,
    socialPoints: 0,
    skillLimit: 5,
    maxTargets: 6,
    totalPassiveIncrease: 2,
  },
};

// TODO: custom attributes
POKEROLE.attributes = ['strength', 'dexterity', 'vitality', 'special', 'insight'];
POKEROLE.skills = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'allure', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'science'];
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

export function getTypeMatchups(defending) {
  return POKEROLE.typeMatchups[defending];
}

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

export function getLocalizedType(type) {
  return game.i18n.localize(CONFIG.POKEROLE.i18n.types[type]);
}

export function getLocalizedTypesForSelect() {
  const obj = {};
  for (const type of POKEROLE.types) {
    obj[type] = getLocalizedType(type);
  }
  return obj;
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
    "allure": "POKEROLE.SkillAllure",
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
    "beginner": "POKEROLE.RankBeginner",
    "amateur": "POKEROLE.RankAmateur",
    "ace": "POKEROLE.RankAce",
    "pro": "POKEROLE.RankPro",
    "master": "POKEROLE.RankMaster",
    "champion": "POKEROLE.RankChampion",
  },

  moveGroups: {
    "learned": "POKEROLE.MoveGroupLearned",

    "starter": "POKEROLE.MoveGroupStarter",
    "beginner": "POKEROLE.MoveGroupBeginner",
    "amateur": "POKEROLE.MoveGroupAmateur",
    "ace": "POKEROLE.MoveGroupAce",
    "pro": "POKEROLE.MoveGroupPro",
    "master": "POKEROLE.MoveGroupMaster",
    "champion": "POKEROLE.MoveGroupChampion",

    "maneuver": "POKEROLE.MoveGroupManeuver",
  },
};
