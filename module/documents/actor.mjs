import { POKEROLE } from "../helpers/config.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class PokeroleActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as attribute modifiers rather than attribute scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const flags = actorData.flags.pokerole || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const systemData = actorData.system;

    const { totalPassiveIncrease, skillLimit } = POKEROLE.rankProgression[systemData.rank ?? 'none'];

    systemData.hp.max = systemData.baseHp + systemData.attributes.vitality.value;
    systemData.will.max = systemData.attributes.insight.value + 2;

    systemData.derived ??= {};
    systemData.derived.initiative = { value: systemData.attributes.insight.value + systemData.skills.alert.value + totalPassiveIncrease };
    systemData.derived.evade = { value: systemData.attributes.dexterity.value + systemData.skills.evasion.value };
    systemData.derived.clashPhysical = { value: systemData.attributes.strength.value + systemData.skills.clash.value };
    systemData.derived.clashSpecial = { value: systemData.attributes.special.value + systemData.skills.clash.value };

    if (systemData.skills?.medicine?.value !== undefined) { // Pokémon don't have Medicine
      systemData.derived.useItem = { value: systemData.social.clever.value + systemData.skills.medicine.value };
    }
    systemData.derived.searchForCover = { value: systemData.attributes.insight.value + systemData.skills.alert.value };
    systemData.derived.runAway = { value: systemData.attributes.dexterity.value + systemData.skills.athletic.value };
    
    systemData.derived.def = { value: systemData.attributes.vitality.value + totalPassiveIncrease };
    systemData.derived.spDef = { value: systemData.attributes.insight.value + totalPassiveIncrease };

    for (const skill of Object.values(systemData.skills)) {
      skill.max = skillLimit;
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    // Copy the attribute scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    for (let [k, v] of Object.entries({
        ...data.attributes, ...data.skills, ...data.social, ...data.extra, ...data.derived
    })) {
      data[k] = foundry.utils.deepClone(v);
    }
  }

  getMoves() {
    return this.items.filter(item => item.type === 'move');
  }

  getLearnedMoves() {
    return this.getMoves().filter(move => move.system.learned);
  }

  getAttributeOrSkill(name) {
    return this.getAnyAttribute(name) ?? this.getSkill(name);
  }

  /** Get an attribute of any kind (attribute, social, extra, derived) */
  getAnyAttribute(name) {
    const lcName = name.toLowerCase();
    const system = this.system;
    const allAttrs = mergeObject(
      this.getIntrinsicOrSocialAttributes(),
      foundry.utils.deepClone(system.derived)
    );
    for (const [key, attr] of Object.entries(allAttrs)) {
      if (key.toLowerCase() === lcName) {
        return attr;
      }
    }
  }

  getIntrinsicOrSocialAttributes() {
    const obj = mergeObject(foundry.utils.deepClone(this.system.attributes),
      mergeObject(
        foundry.utils.deepClone(this.system.social),
        foundry.utils.deepClone(this.system.extra)
      )
    );
    obj.will = foundry.utils.deepClone(this.system.will);
    return obj;
  }

  getAllSkillsAndAttributes() {
    return mergeObject(
      this.getIntrinsicOrSocialAttributes(),
      foundry.utils.deepClone(this.system.skills)
    );
  }

  getSkill(name) {
    const lcName = name.toLowerCase();
    return foundry.utils.deepClone(this.system.skills[lcName]);
  }
}
