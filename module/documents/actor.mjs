import { POKEROLE } from "../helpers/config.mjs";
import { TokenEffect } from "../helpers/effects.mjs";

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


    if (this.system.source == "Core v2.0" && 
      (this._stats.systemVersion.split('.')[0] <= 0 && 
      this._stats.systemVersion.split('.')[1] <= 4 && 
      this._stats.systemVersion.split('.')[2] <= 4 ) && 
      this._stats.systemVersion != '0.3.1'
    ){
      console.log(this.name,this._stats.systemVersion, "Updating to 0.4.3 - v3.0")
      if (this.system.skills.allure){
       this.system.skills.charm = this.system.skills.allure;
       this.update({'system.skills.-=allure': null});
       console.log("Allure updated");
      }
      if (this.system.rank == 'beginner') {
        this.update({'system.rank': 'rookie'});
      } else if (this.system.rank == 'amateur') {
        this.update({'system.rank': 'standard'});
      } else if (this.system.rank == 'ace') {
        this.update({'system.rank': 'advance'});
      } else if (this.system.rank == 'pro') {
        this.update({'system.rank': 'expert'});
      };
      this.update({'system.source': "Core v3.0"});
    };


    for (const statChange of Object.values(this.system.statChanges)) {
      statChange.plus ??= 0;
      statChange.minus ??= 0;
      statChange.value = statChange.plus - statChange.minus;
      statChange.value ??= 0;
    }
    this.system.accuracyMod = foundry.utils.mergeObject(this.system.accuracyMod ?? {})
    this.system.accuracyMod.plus ??= 0;
    this.system.accuracyMod.minus ??= 0;
    this.system.accuracyMod.value = this.system.accuracyMod.plus - this.system.accuracyMod.minus;
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
    const { totalPassiveIncrease, skillLimit } = POKEROLE.rankProgression[system.rank ?? 'none'] ?? [0,0];

    for (const skill of Object.values(system.skills)) {
      skill.max = skillLimit;
    }

    if (game.settings.get('pokerole', 'specialDefenseStat') === 'insight') {
      system.hp.max = system.baseHp + Math.max(system.attributes.vitality.value,system.attributes.insight.value) + totalPassiveIncrease;
    } else {
      system.hp.max = system.baseHp + system.attributes.vitality.value + totalPassiveIncrease;
    };

    // TP Support Will+
    system.will.max = (system.willbonus ?? 0 ) + system.attributes.insight.value + POKEROLE.CONST.MAX_WILL_BONUS + totalPassiveIncrease;

    // Stat changes need to be applied manually here because derived stats are created
    // before `applyEffects` is called
    const strength = Math.max(system.attributes.strength.value + system.statChanges.strength.value, 1);
    const dexterity = Math.max(system.attributes.dexterity.value + system.statChanges.dexterity.value, 1);
 
    const special = Math.max(system.attributes.special.value + system.statChanges.special.value, 1);

    system.derived ??= {};
    system.derived.initiative = {
      value: dexterity
        + system.skills.alert.value
        + system.customInitiativeMod
        + totalPassiveIncrease
    };
    system.derived.evade = {
      value: dexterity + system.skills.evasion.value
    };

    system.derived.clashPhysical = {
      value: strength + (system.skills?.clash?.value ?? 0)
    };
    system.derived.clashSpecial = {
      value: special + (system.skills?.clash?.value ?? 0)
    };

    

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
    const original = {};
    for (const statChange of Object.values(this.system.statChanges)) {
      const currentValue = foundry.utils.getProperty(this, statChange.stat) ?? 0;
      if (statChange.value !== 0) {
        // Stat changes can only reduce stats down to 1
        const newValue = Math.max(currentValue + statChange.value, 1);
        overrides[statChange.stat] = newValue;
        original[statChange.stat] = currentValue;
      }
    }

    if (this.hasAilment('paralysis') && game.settings.get('pokerole', 'paralysisConst') > 0) {
      // Paralysis reduces Dexterity by 2 (capped to 0 instead of 1)
      const path = 'system.attributes.dexterity.value';
      const currentValue = overrides[path] ?? foundry.utils.getProperty(this, path) ?? 0;
      overrides[path] = Math.max(currentValue - game.settings.get('pokerole', 'paralysisConst'), 0);
      overrides['system.derived.evade.value'] = (overrides[path] + this.system.skills.evasion.value);
      original[path] = currentValue;
    }

    if ((this.hasAilment('burn1')||this.hasAilment('burn2')||this.hasAilment('burn3')) && game.settings.get('pokerole', 'burnConst') > 0) {
      // Burn reduces Strength by 1 (capped to 0 instead of 1)
      const path = 'system.attributes.strength.value';
      const currentValue = overrides[path] ?? foundry.utils.getProperty(this, path) ?? 0;
      overrides[path] = Math.max(currentValue - game.settings.get('pokerole', 'burnConst'), 0);
      overrides['system.derived.clashPhysical.value'] = (overrides[path] + this.system.skills?.clash?.value);
      original[path] = currentValue;
    }

    if (this.hasAilment('frozen') && game.settings.get('pokerole', 'frozenConst') > 0) {
      // Frozen reduces Special by 1 (capped to 0 instead of 1)
      const path = 'system.attributes.special.value';
      const currentValue = overrides[path] ?? foundry.utils.getProperty(this, path) ?? 0;
      overrides[path] = Math.max(currentValue - game.settings.get('pokerole', 'frozenConst'), 0);
      overrides['system.derived.clashSpecial.value'] = (overrides[path] + this.system.skills?.clash?.value);
      original[path] = currentValue;
    }

    // Apply custom effects
    if (!game.settings.get('pokerole', 'recoveryMode')) { // Custom effects are disabled in recovery mode
      for (const effect of this.items.filter(item => item.type === 'effect' && item.system.enabled)) {
        for (const rule of effect.system.rules) {
          let value = parseInt(rule.value);
          let pathO = parseInt(foundry.utils.getProperty(this, rule.attribute));
          
          if ((Number.isNaN(value) || Number.isNaN(pathO)) && rule.attribute != '') {
            console.warn("Custom Rule: Path or value is not a number")
            continue;
          }

          const currentValue = foundry.utils.getProperty(this, rule.attribute) ?? 0;

          switch (rule.operator) {
            case 'add':
              
              overrides[rule.attribute] = (overrides[rule.attribute] ?? 0) + currentValue + value;
              original[rule.attribute] = currentValue;
              break;
            case 'replace':
              overrides[rule.attribute] = value;
              original[rule.attribute] = currentValue;
              break;
          }
        }
      }
    }

    this.overrides = foundry.utils.expandObject(overrides);

    this.original = foundry.utils.expandObject(original);

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
    if (!name) {
      return undefined;
    }

    const lcName = name.toLowerCase();
    const system = this.system;
    const allAttrs = foundry.utils.mergeObject(
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
    const obj = foundry.utils.mergeObject(foundry.utils.deepClone(this.system.attributes),
      foundry.utils.mergeObject(
        foundry.utils.deepClone(this.system.social),
        foundry.utils.deepClone(this.system.extra)
      )
    );
    obj.will = { value: this.system.will.max };
    return obj;
  }

  getAllSkillsAndAttributes() {
    return foundry.utils.mergeObject(
      this.getIntrinsicOrSocialAttributes(),
      foundry.utils.deepClone(this.system.skills)
    );
  }

  getSkill(name) {
    if (!name) {
      return undefined;
    };
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
    if (move.system.accMod1 || move.system.accMod1var) {
      diceCount += Math.max((this.getAnyAttribute(move.system.accMod1?.trim())?.value ?? 0), (this.getAnyAttribute(move.system.accMod1var?.trim())?.value ?? 0));
    }
    if (move.system.accMod2 || move.system.accMod2var) {
      diceCount += Math.max((this.getSkill(move.system.accMod2?.trim())?.value ?? 0), (this.getSkill(move.system.accMod2var?.trim())?.value ?? 0));
    }
    return diceCount;
  }

  getDamagePoolForMove(move) {
    if (move.type !== 'move') {
      return undefined;
    }

    let diceCount = 0;
    if (move.system.category !== 'support') {
      diceCount += Math.max((this.getAnyAttribute(move.system.dmgMod)?.value ?? 0), (this.getAnyAttribute(move.system.dmgModvar)?.value ?? 0));
      diceCount += move.system.power;
      if (move.system.stab) {
        diceCount += POKEROLE.CONST.STAB_BONUS;
      }
    }
    return diceCount;
  }

  /** Whether this actor can still use an action in this round */
  hasAvailableActions() {
    return this.system.actionCount.value < this.system.actionCount.max;
  }

  /**
   * Increase the number of taken actions this round
   * @param {Object} update Other values that should be updated
   */
  increaseActionCount(update = {}) {
    this.update({
      'system.actionCount.value': (this.system.actionCount?.value ?? 0) + 1,
      ...update
    });
  }

  /**
   * Reset the Attributes, Skills and Rank to base
   * 
   */
  resetAttributes() {
    let recovery = {system: {
        attributes: {
        },
        skills: {
        },
        social: {
        },
        rank: 'none'
    }};
    for (let atb in this.system.attributes){
      recovery.system.attributes[atb] = {value: this.system.attributes[atb].base ?? 1};
    };
    for (let skl in this.system.skills){
      recovery.system.skills[skl] = {value: 0};
    };
    for (let scl in this.system.social){
      recovery.system.social[scl] = {value: 1};
    };
    return this.update(recovery);
  }

  /**
   * Apply a status ailment to the Pokémon.
   * @param {string} type The type of the ailment (e.g. 'paralysis')
   * @param {Object | undefined} options Ailment-specific options
   */
  async applyAilment(type, options = undefined) {
    const ailment = { type, ...options };

    // Check if options are missing
    switch (type) {
      case 'infatuated':
        if (!ailment.inflictedByUuid) {
          throw new Error('Infatuation target missing');
        }
        break;
      case 'disabled':
        if (!ailment.moveUuid) {
          throw new Error('Disabled move missing');
        }
        break;
    }

    const ailments = this.system.ailments.filter(a => {
      // Filter duplicate ailments
      const burnLevels = ['burn1', 'burn2', 'burn3'];
      if (burnLevels.includes(ailment) && burnLevels.includes(a)) {
        return false;
      }

      const poisonLevels = ['poison', 'badlyPoisoned'];
      if (poisonLevels.includes(ailment) && poisonLevels.includes(a)) {
        return false;
      }

      return a.type !== ailment.type;
    }) ?? [];

    ailments.push(ailment);

    if (type === 'fainted') {
      // Also update the combatant if the Pokémon fainted
      const combatant = this.token
        ? game.combat?.getCombatantByToken(this.token.id)
        : game.combat?.getCombatantByActor(this.id);
      await combatant?.update({ defeated: true });
    }

    return this.update({
      'system.ailments': ailments
    });
  }

  /**
   * Remove the given status ailment
   * @param {string} type The type of the ailment (e.g. 'paralysis')
   */
  async removeAilment(type) {
    const ailments = this.system.ailments.filter(a => a.type !== type);

    if (type === 'fainted') {
      // Also update the combatant if the Pokémon fainted
      const combatant = this.token
        ? game.combat?.getCombatantByToken(this.token.id)
        : game.combat?.getCombatantByActor(this.id);
      await combatant?.update({ defeated: false });
    }

    return this.update({
      'system.ailments': ailments
    });
  }

  /**
   * Whether this actor has the given ailment applied
   * @param {string} type The type of the ailment (e.g. 'paralysis')
   * @returns {boolean}
   */
  hasAilment(type) {
    return this.system.ailments.some(a => a.type === type);
  }

  /**
   * Whether this actor has the 'burn1', 'burn2' or 'burn2' status
   * @returns {boolean}
   */
  isBurned() {
    return this.system.ailments.some(a => ['burn1', 'burn2', 'burn3'].includes(a.type));
  }

  /**
   * Whether this actor has the 'poison' or 'badlyPoisoned' status
   * @returns {boolean}
   */
  isPoisoned() {
    return this.system.ailments.some(a => ['poison', 'badlyPoisoned'].includes(a.type));
  }

  /**
   * Whether the given move is disabled by the 'disabled' status
   * @param {PokeroleItem} move
   * @returns {boolean}
   */
  isMoveDisabled(move) {
    return this.system.ailments.some(a => a.type === 'disabled' && a.moveUuid === move.uuid);
  }

  /**
   * @override
   * Add effect icons to the combat tracker
   */
  get temporaryEffects() {
    const ailments = POKEROLE.getAilments();
    const ailmentTokenEffects = this.system.ailments.map(ailment => new TokenEffect(
      ailment.type,
      ailments[ailment.type].icon,
      ailments[ailment.type].tint,
      ailments[ailment.type].overlay ?? false,
    ));
    const customTokenEffects = this.items.filter(i => i.type === 'effect' && i.system.enabled && (i.system.visible ?? true))
      .map(i => new TokenEffect(
        i.name,
        i.img,
        '#ffffff',
        false,
      ));
    return [...ailmentTokenEffects, ...customTokenEffects];
  }

  /**
   * Applies a stat change to the actor.
   * 
   * Note that stat changes do not stack, so the new value will replace the old one
   * if its absolute value is higher. If the signs of the current and new values differ,
   * the new value is added to the current value.
   * 
   * @param {string} stat The stat to be changed.
   * @param {number} amount The amount by which the stat should be changed.
   * @throws {Error} If the stat is unknown.
   * @returns {Promise<bool>} `true` if the stat was changed, `false` if the new value was lower than the old one.
   */
  async applyStatChange(stat, amount) { // key need to be selected between plus and minus
    let key;
    if (['strength', 'dexterity', 'special', 'def', 'spDef'].includes(stat)) {
      if (amount < 0){
        key = `system.statChanges.${stat}.minus`;
      } else if (amount > 0){
        key = `system.statChanges.${stat}.plus`;
      };
      // key = `system.statChanges.${stat}.value`;
    } else if (stat === 'accuracyMod') {
      if (amount < 0){
        key = `system.accuracyMod.minus`;
      } else if (amount > 0){
        key = `system.accuracyMod.plus`;
      };
      // key = `system.accuracyMod.value`;
    } else {
      throw new Error(`Unknown stat '${stat}'`);
    }

    const currentValue = getProperty(this, key) ?? 0;

    // Check if the signs of current value and amount are different
    if ((currentValue < 0 && amount > 0) || (currentValue > 0 && amount < 0)) {
      const newValue = currentValue + amount;
      await this.update({ [key]: newValue });
      return true;
    }

    // Replace the old value if the new value's absolute value is higher
    if (Math.abs(amount) > Math.abs(currentValue)) {
      await this.update({ [key]: Math.abs(amount) });
      return true;
    } else {
      return false;
    }
  }


  /** Reset resources depleted during a round */
  async resetRoundBasedResources() {
    const actorUpdate = this.update({
      system: {
        'actionCount.value': 0,
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
  
  async resetStatChange() {
    this.resetStatChangeNegative();
    this.resetStatChangePositive();
  }

  async resetStatChangePositive() {
    const actorUpdate = this.update({
      system: {
        statChanges: {
          'strength.plus': 0,
          'dexterity.plus': 0,
          'special.plus': 0,
          'def.plus': 0,
          'spDef.plus': 0
        },
        accuracyMod: {
          'plus': 0
        }
      }
    });
  }

  async resetStatChangeNegative() {
    const actorUpdate = this.update({
      system: {
        statChanges: {
          'strength.minus': 0,
          'dexterity.minus': 0,
          'special.minus': 0,
          'def.minus': 0,
          'spDef.minus': 0
        },
        accuracyMod: {
          'minus': 0
        }
      }
    });
  }

  async removeVolatileAilments() {
    
  }
}
