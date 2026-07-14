import { POKEROLE } from "../helpers/config.mjs";
import { buildAilmentIconEffectData, buildCustomEffectIconData, buildStatChangeIconData, buildPainPenaltyIconData } from "../helpers/effects.mjs";
import { MANEUVER_MOVES } from "../helpers/maneuvers.mjs";
import { applyDamageEffectsHtml, createHealMessage } from "../helpers/damage.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class PokeroleActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override Runs after system.prepareBaseData()/prepareDerivedData(), which already handle hp/will/skill caps and system.derived.*. */
  prepareDerivedData() {
    this._applyEffects();

    super.prepareDerivedData();
  }

  /** @override Gives brand-new Pokémon/Trainer actors the standard maneuver moves, sourced from MANEUVER_MOVES (not the compendium, which world builders can edit/delete) - skipped if the actor already has items. */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    if (["pokemon", "trainer"].includes(this.type) && this.items.size === 0) {
      this.updateSource({ items: foundry.utils.deepClone(MANEUVER_MOVES) });
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

    if ((this.hasAilment('burn1') || this.hasAilment('burn2') || this.hasAilment('burn3')) && game.settings.get('pokerole', 'burnConst') > 0) {
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
      const effects = this.items.filter(item => item.type === 'effect' && item.system.enabled);
      // Equipped Item/Ability only contribute rules while selected (header dropdown) AND enabled.
      const equipped = [this.activeItem, this.activeAbility].filter(item => item?.system.enabled);

      for (const source of [...effects, ...equipped]) {
        for (const rule of source.system.rules) {
          let value = parseInt(rule.value);
          let pathO = parseInt(foundry.utils.getProperty(this, rule.attribute));

          if ((Number.isNaN(value) || Number.isNaN(pathO)) && rule.attribute != '') {
            console.warn("Custom Rule: Path or value is not a number")
            continue;
          }

          const currentValue = foundry.utils.getProperty(this, rule.attribute) ?? 0;

          switch (rule.operator) {
            case 'add':
              overrides[rule.attribute] = (overrides[rule.attribute] ?? currentValue) + value;
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
    // super.getRollData() returns `this.system` directly (not a copy), so we shallow-copy it
    // here before mutating - otherwise _getCharacterRollData() would pollute the live actor data.
    const data = { ...super.getRollData() };

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

  /** The equipped/held Item, resolved from the `system.activeItem` id. @returns {PokeroleItem | undefined} */
  get activeItem() {
    return this.items.get(this.system.activeItem);
  }

  /** The active Ability, resolved from the `system.activeAbility` id. @returns {PokeroleItem | undefined} */
  get activeAbility() {
    return this.items.get(this.system.activeAbility);
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
    if (move.system.accAttr1 || move.system.accAttr1var) {
      diceCount += Math.max((this.getAnyAttribute(move.system.accAttr1?.trim())?.value ?? 0), (this.getAnyAttribute(move.system.accAttr1var?.trim())?.value ?? 0));
    }
    if (move.system.accSkill1 || move.system.accSkill1var) {
      diceCount += Math.max((this.getSkill(move.system.accSkill1?.trim())?.value ?? 0), (this.getSkill(move.system.accSkill1var?.trim())?.value ?? 0));
    }
    return diceCount;
  }

  getDamagePoolForMove(move) {
    if (move.type !== 'move') {
      return undefined;
    }

    let diceCount = 0;
    if (move.system.category !== 'support') {
      diceCount += Math.max((this.getAnyAttribute(move.system.dmgMod1)?.value ?? 0), (this.getAnyAttribute(move.system.dmgMod1var)?.value ?? 0));
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
      'system.actionCount.value': (Math.min((this.system.actionCount?.value ?? 0) + 1, this.system.actionCount?.max ?? 5)),
      ...update
    });
  }

  /**
   * Reset the Attributes, Skills and Rank to base
   * 
   */
  resetAttributes() {
    let recovery = {
      system: {
        attributes: {
        },
        skills: {
        },
        social: {
        },
        rank: 'none'
      }
    };
    for (let atb in this.system.attributes) {
      recovery.system.attributes[atb] = { value: this.system.attributes[atb].base ?? 1 };
    };
    for (let skl in this.system.skills) {
      recovery.system.skills[skl] = { value: 0 };
    };
    for (let scl in this.system.social) {
      recovery.system.social[scl] = { value: 1 };
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

  /** @override Routes the HP bar (native drag, or any third-party modifyTokenAttribute call) through the same damage/heal logic as our chat buttons. Other attributes keep Foundry's default. */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (attribute !== 'hp') {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    const attr = this.system.hp;
    const current = isBar ? attr.value : attr;
    const target = Math.clamp(isDelta ? current + value : value, 0, attr.max);
    if (target === current) return this;

    const updates = { 'system.hp.value': target };

    // Same hook Foundry's default implementation fires - lets other modules veto/adjust the change.
    const allowed = Hooks.call('modifyTokenAttribute', { attribute, value, isDelta, isBar }, updates, this);
    if (allowed === false) return this;

    const token = this.token ?? this.getActiveTokens(true, true)[0]?.document;
    const name = token?.name ?? this.name;

    if (target < current) {
      const html = await applyDamageEffectsHtml(token, this, name, current - target, current, target, attr.max);
      await ChatMessage.implementation.create({ content: `<div class="pokerole">${html}</div>` });
    } else {
      await ChatMessage.implementation.create({
        content: createHealMessage(name, current, target, attr.max),
        speaker: ChatMessage.implementation.getSpeaker({ token, actor: this })
      });
    }

    return this.update(updates);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (foundry.utils.hasProperty(changed, 'system.ailments')
      || foundry.utils.hasProperty(changed, 'system.statChanges')
      || foundry.utils.hasProperty(changed, 'system.accuracyMod')
      || foundry.utils.hasProperty(changed, 'system.hp')
      || foundry.utils.hasProperty(changed, 'system.painPenalization')) {
      this._syncIconEffects(userId);
    }
  }

  /** @override */
  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
    if (collection === 'items') this._syncIconEffects(userId);
  }

  /** @override */
  _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
    if (collection === 'items') this._syncIconEffects(userId);
  }

  /** @override */
  _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
    super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
    if (collection === 'items') this._syncIconEffects(userId);
  }

  /** Syncs mechanically-inert ActiveEffects for ailment/custom-effect icons (see effects.mjs); queued since concurrent calls could race-delete the same effect. @param {string} userId */
  _syncIconEffects(userId) {
    // Only the originating client should act - avoids duplicate/racing writes across clients.
    if (userId !== game.user.id) return;

    this._iconSyncQueue = (this._iconSyncQueue ?? Promise.resolve())
      .then(() => this._doSyncIconEffects())
      .catch(err => console.error("Pokerole | Failed to sync token icon effects", err));
    return this._iconSyncQueue;
  }

  async _doSyncIconEffects() {
    const desired = new Map();
    for (const ailment of this.system.ailments) {
      desired.set(`ailment:${ailment.type}`, buildAilmentIconEffectData(ailment));
    }
    if (game.settings.get('pokerole', 'showPainPenaltyIcon') ?? true) {
      const { level, value } = this.system.painPenalization;
      if (level > 0) {
        const ignored = level - value; // recover the clamped count for icon display
        desired.set('painPenalty', buildPainPenaltyIconData(level, ignored));
      }
    }
    for (const item of this.items.filter(i => i.type === 'effect' && i.system.enabled && (i.system.visible ?? true))) {
      desired.set(`effect:${item.id}`, buildCustomEffectIconData(item));
    }
    if (game.settings.get('pokerole', 'autoBuff') ?? false) {
      for (const [key, statChange] of Object.entries(this.system.statChanges)) {
        if (statChange.value !== 0) {
          desired.set(`statChange:${key}`, buildStatChangeIconData(key, statChange.value));
        }
      }
      if (this.system.accuracyMod.value !== 0) {
        desired.set('statChange:accuracyMod', buildStatChangeIconData('accuracyMod', this.system.accuracyMod.value));
      }
    }

    const existing = this.effects.filter(e => e.getFlag('pokerole', 'iconOnly'));
    const existingByKey = new Map(existing.map(e => [e.getFlag('pokerole', 'iconKey'), e]));

    const toDelete = existing.filter(e => !desired.has(e.getFlag('pokerole', 'iconKey')));
    const toCreate = [];
    const toUpdate = [];

    for (const [key, data] of desired) {
      const current = existingByKey.get(key);
      if (!current) {
        toCreate.push(data);
      } else if (current.name !== data.name || current.img !== data.img || current.tint !== data.tint) {
        // Keep the icon in sync if the source Item/ailment definition changes after creation
        // (e.g. a GM swaps the effect Item's image) - creation alone only handles first-time sync.
        toUpdate.push({ _id: current.id, name: data.name, img: data.img, tint: data.tint });
      }
    }

    if (toDelete.length) await this.deleteEmbeddedDocuments('ActiveEffect', toDelete.map(e => e.id));
    if (toCreate.length) await this.createEmbeddedDocuments('ActiveEffect', toCreate);
    if (toUpdate.length) await this.updateEmbeddedDocuments('ActiveEffect', toUpdate);
  }

  /**
   * Applies a stat change - doesn't stack, replaces the old value if higher (or adds if signs differ).
   * @param {string} stat The stat to be changed.
   * @param {number} amount The amount by which the stat should be changed.
   * @throws {Error} If the stat is unknown.
   * @returns {Promise<bool>} `true` if the stat was changed, `false` if the new value was lower than the old one.
   */
  async applyStatChange(stat, amount) { // key need to be selected between plus and minus
    let key;
    if (['strength', 'dexterity', 'special', 'def', 'spDef'].includes(stat)) {
      if (amount < 0) {
        key = `system.statChanges.${stat}.minus`;
      } else if (amount > 0) {
        key = `system.statChanges.${stat}.plus`;
      };
      // key = `system.statChanges.${stat}.value`;
    } else if (stat === 'accuracyMod') {
      if (amount < 0) {
        key = `system.accuracyMod.minus`;
      } else if (amount > 0) {
        key = `system.accuracyMod.plus`;
      };
      // key = `system.accuracyMod.value`;
    } else {
      throw new Error(`Unknown stat '${stat}'`);
    }

    const currentValue = foundry.utils.getProperty(this, key) ?? 0;

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