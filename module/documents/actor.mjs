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
    // documents or derived data

    this.system.statChanges = foundry.utils.mergeObject(this.system.statChanges ?? {}, {
      strength: {
        stat: 'system.attributes.strength.value',
      },
      dexterity: {
        stat: 'system.attributes.dexterity.value',
      },
      special: {
        stat: 'system.attributes.special.value',
      },
      def: {
        stat: 'system.derived.def.value',
      },
      spDef: {
        stat: 'system.derived.spDef.value',
      }
    });

    for (const statChange of Object.values(this.system.statChanges)) {
      statChange.value ??= 0;
    }
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
    this._prepareCharacterData(this);
    this._applyEffects();

    super.prepareDerivedData();
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const system = actorData.system;

    const { totalPassiveIncrease, skillLimit } = POKEROLE.rankProgression[system.rank ?? 'none'];

    for (const skill of Object.values(system.skills)) {
      skill.max = skillLimit;
    }

    system.hp.max = system.baseHp + system.attributes.vitality.value;
    system.will.max = system.attributes.insight.value + 2;

    system.derived ??= {};
    system.derived.initiative = {
      value: system.attributes.dexterity.value
        + system.skills.alert.value
        + system.customInitiativeMod
        + totalPassiveIncrease
    };
    system.derived.evade = { value: system.attributes.dexterity.value + system.skills.evasion.value };
    system.derived.clashPhysical = { value: system.attributes.strength.value + system.skills.clash.value };
    system.derived.clashSpecial = { value: system.attributes.special.value + system.skills.clash.value };

    if (system.skills?.medicine?.value !== undefined) { // Pokémon don't have Medicine
      system.derived.useItem = { value: system.social.clever.value + system.skills.medicine.value };
    }
    system.derived.searchForCover = { value: system.attributes.insight.value + system.skills.alert.value };
    system.derived.runAway = { value: system.attributes.dexterity.value + system.skills.athletic.value };

    system.derived.def = { value: system.attributes.vitality.value + totalPassiveIncrease };

    if (game.settings.get('pokerole', 'specialDefenseStat') === 'insight') {
      system.derived.spDef = { value: system.attributes.insight.value + totalPassiveIncrease };
    } else {
      system.derived.spDef = { value: system.attributes.vitality.value + totalPassiveIncrease };
    }
  }

  /**
   * Apply attribute changes and effects
   */
  _applyEffects() {
    const overrides = {};
    for (const statChange of Object.values(this.system.statChanges)) {
      const currentValue = foundry.utils.getProperty(this, statChange.stat) ?? 0;
      if (statChange.value !== 0) {
        // Stat changes can only reduce stats down to 1
        const newValue = Math.max(currentValue + statChange.value, 1);
        overrides[statChange.stat] = newValue;
      }
    }

    this.overrides = foundry.utils.expandObject(overrides);

    // Apply the changes.
    foundry.utils.mergeObject(this, this.overrides);
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
    obj.will = { value: this.system.will.max };
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

  /**
   * Get the total number accuracy dice to roll for the given move
   * @param {PokeroleItem} move 
   * @returns {number | undefined} The number of dice to roll or undefined if the item is not a move
   */
  getAccuracyPoolForMove(move) {
    if (move.type !== 'move') {
      return undefined;
    }

    let diceCount = 0;
    if (move.system.accMod1) {
      diceCount += this.getAnyAttribute(move.system.accMod1.trim())?.value ?? 0;
    }
    if (move.system.accMod2) {
      diceCount += this.getSkill(move.system.accMod2.trim())?.value ?? 0;
    }
    return diceCount;
  }

  getDamagePoolForMove(move) {
    if (move.type !== 'move') {
      return undefined;
    }

    let diceCount = 0;
    if (move.system.category !== 'support') {
        diceCount += this.getAnyAttribute(move.system.dmgMod)?.value ?? 0;
        diceCount += move.system.power;
        if (move.system.stab) {
            diceCount += 1;
        }
    }
    return diceCount;
  }

  /** Whether this actor can still use an action in this round */
  hasAvailableActions() {
    return this.system.actionCount.value <= this.system.actionCount.max;
  }

  /**
   * Increase the number of taken actions this round
   * @param {Object} update Other values that should be updated
   */
  increaseActionCount(update = {}) {
    this.update({
      'system.actionCount.value': (this.system.actionCount?.value ?? 1) + 1,
      ...update
    });
  }

  /** Reset resources depleted during a round */
  async resetRoundBasedResources() {
    const actorUpdate = this.update({
      system: {
        'actionCount.value': 1,
        'canClash': true,
        'canEvade': true
      }
    });

    const moveUpdates = [];
    for (const move of this.items.filter(i => i.type === 'move' && i.system.usedInRound)) {
      moveUpdates.push({ '_id': move.id, 'system.usedInRound': false });
    }
    const embeddedUpdate = this.updateEmbeddedDocuments('Item', moveUpdates);
    await Promise.all([actorUpdate, embeddedUpdate]);
  }
}
