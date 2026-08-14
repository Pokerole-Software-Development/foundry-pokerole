/**
 * Item document subclass: use()/chat-card rendering, heal application, and move effect-text formatting.
 */
import { POKEROLE, migrateUnambiguousLegacyRankValue } from "../helpers/config.mjs";
import { bulkApplyHp, createHealMessage } from "../helpers/damage.mjs";
import { rollAccuracy, rollDamage, rollUsageLine, rollUsageLineAccuracy, rollUsageLineDamage, applyUsageLineHeal, applyUsageLineHealStatus, rollUsageLineEffects } from "../helpers/roll.mjs";

const USAGE_LINE_KIND_LABELS = { roll: 'Roll', heal: 'Heal', damage: 'Damage', accuracy: 'Accuracy', healStatus: 'Heal Status', effects: 'Effects' };

/** Fallback chat-card button text for a Usage Line with no custom label set. */
function defaultUsageLineLabel(line) {
  return USAGE_LINE_KIND_LABELS[line.kind] ?? 'Use';
}

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class PokeroleItem extends Item {

  /** @override Migrates pre-0.5.1 `rank` strings on Move items - see helpers/config.mjs for the mapping. */
  static migrateData(source) {
    if (source.type === 'move' && source.system?.rank !== undefined) {
      source.system.rank = migrateUnambiguousLegacyRankValue(source.system.rank);
    }
    return super.migrateData(source);
  }

  /** Augment the basic Item data model with additional dynamic data. */
  prepareData() {
    // As with the actor class, items are documents that can have their data preparation methods overridden (such as prepareBaseData()).
    super.prepareData();

    if (this.actor) {
      this.system.stab = this.system.type !== 'none' 
          && [this.actor.system.type1, this.actor.system.type2, this.actor.system.type3].includes(this.system.type);
    }
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if (!this.actor) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Use the item (prints to chat).
   * @param {Event} event The originating click event
   */
  async use() {

    Hooks.callAll("PokeroleItemPre", this);

    const token = this.actor.token;

    // Gear Items with configured Usage Lines skip the plain description card entirely - clicking
    // the item goes straight to the Consumable confirm (if applicable) and the line-buttons card.
    if (this.type === 'item' && (this.system.usageLines?.length ?? 0) > 0) {
      return this.useConsumable(this.actor, token);
    }

    let properties = [];
    let hasAccuracy = false;
    let hasDamage = false;
    let healText = undefined;

    if (this.type === 'move') {
      if (!this.system.learned && !this.system.attributes?.maneuver) {
        return ui.notifications.error("You haven't learned this move.");
      }
  
      if (this.actor && !this.actor.hasAvailableActions()) {
        return ui.notifications.error("You can't take any more actions this round.");
      }
  
      if (this.system.usedInRound) {
        return ui.notifications.error("You have already used this move in the current round.");
      }
  
      if (this.actor?.isMoveDisabled(this)) {
        return ui.notifications.error("You can't use a disabled move!");
      }

      const locType = game.i18n.localize(POKEROLE.i18n.types[this.system.type]);
      const locCategory = game.i18n.localize(POKEROLE.i18n.moveCategories[this.system.category]);
      const locTarget = game.i18n.localize(POKEROLE.i18n.targets[this.system.target]);

      properties = [
        `${locType} (${locCategory})`,
        `Target: ${locTarget}`,
        `Power: ${this.system.power}`,
      ];
      if (this.system.stab) {
        properties.push('STAB');
      }
      if (this.system.accAttr1 || this.system.accSkill1 || this.system.accAttr1var || this.system.accSkill1var) {
        hasAccuracy = true;
      }
      if (this.system.power || this.system.dmgMod1 || this.system.dmgMod1var || this.system.damagePool.formula !== 'standard') {
        hasDamage = true;
      }

      switch (this.system.heal.type) {
        case 'basic':
          healText = 'Apply Basic Heal';
          break;
        case 'complete':
          healText = 'Apply Complete Heal';
          break;
        case 'custom':
          healText = `Heal ${this.system.heal.amount} HP`;
          break;
      }

      if (healText && this.system.heal.willPointCost) {
        if (this.system.heal.willPointCost !== 1) {
          healText += ` (costs ${this.system.heal.willPointCost} Will Points)`;
        } else {
          healText += ` (costs 1 Will Point)`;
        }
      }
    }

    let flavor = this.name;
    if (this.actor?.name && this.type === 'move') {
      flavor = `${this.actor.name} used ${this.name}!`;
    }

    const templateData = {
      actor: this.actor.toObject(false),
      tokenId: token?.uuid || null,
      item: this.toObject(false),
      data: await this.getRollData(),
      isMove: this.type === 'move',
      properties,
      hasAccuracy,
      hasDamage,
      healText,
      canBeClashed: this.canBeClashed(),
      canBeEvaded: this.canBeEvaded(),
    };

    const html = await foundry.applications.handlebars.renderTemplate ("systems/pokerole/templates/chat/item-card.html", templateData);

    // Create the ChatMessage data object
    let chatData = {
      author: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      flavor,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {
        "core.canPopout": true,
        [game.system.id]: {
          itemUse: true,
          itemUuid: this.uuid,
          actorUuid: this.actor?.uuid,
          tokenUuid: token?.uuid
        }
      }
    };
    chatData = ChatMessage.implementation.applyRollMode(chatData, game.settings.get('core', 'rollMode'));

    await ChatMessage.create(chatData);
  }

  /**
   * Whether the item is a move that can be clashed
   * @return {boolean}
   */
  canBeClashed() {
    if (this.type !== 'move') {
      return false;
    }

    return this.system.category !== 'support'
      && this.system.power > 0
      && !this._hasSocialAttributeAccuracyRoll()
      && this.system.target !== 'Battlefield'
      && this.system.target !== 'Battlefield (Foes)';
  }

  /**
   * Whether the item is a move that can be evaded
   * @return {boolean}
   */
   canBeEvaded() {
    if (this.type !== 'move') {
      return false;
    }

    return !this._hasSocialAttributeAccuracyRoll()
      && !this.system.attributes.neverFail
      && this.system.target !== 'Battlefield'
      && this.system.target !== 'Battlefield (Foes)';
  }

  /** Cannot be clashed/evaded if true */
  _hasSocialAttributeAccuracyRoll() {
    // accAttr1 is always an attribute
    return (POKEROLE.socialAttributes.includes(this.system.accAttr1) || POKEROLE.socialAttributes.includes(this.system.accAttr1var));
  }

  /**
   * Heal the selected targets
   * @param {Actor} actor The actor using the healing move
   * @param {Token[]} selectedTargets Targets who should be healed (if `heal.target` is `targets`)
   * @returns {boolean | any} `true` if healing was applied successfully
   */
  async applyHeal(actor, selectedTargets) {
    const heal = this.system.heal;
    if (!heal) {
      return false;
    }

    const mayTargetOthers = this.system.target !== 'User' && heal.target !== 'user';
    if (mayTargetOthers && selectedTargets.length < 1) {
      return ui.notifications.error("Select at least one target to heal.");
    }

    const willCost = heal.willPointCost;
    if (willCost > 0 && actor.system.will.value < willCost) {
      return ui.notifications.error("You don't have enough Will Points.");
    }

    const healAmount = ['basic', 'complete'].includes(heal.type)
      ? POKEROLE.healAmounts[heal.type].regular
      : heal.amount;

    let chatMessage = '';
    const hpUpdates = [];
    if (mayTargetOthers) {
      for (const target of selectedTargets) {
        const maxHp = target.document.actor.system.hp.max;
        const oldHp = target.document.actor.system.hp.value;
        const newHp = Math.min(oldHp + healAmount, maxHp);
        chatMessage += createHealMessage(target.document.name, oldHp, newHp, maxHp);
        hpUpdates.push({ token: target.document, hp: newHp });
      }
    } else {
      const maxHp = actor.system.hp.max;
      const oldHp = actor.system.hp.value;
      const newHp = Math.min(oldHp + healAmount, maxHp);
      chatMessage += createHealMessage(actor.name, oldHp, newHp, maxHp);
      hpUpdates.push({ actor, hp: newHp });
    }

    const promises = [bulkApplyHp(hpUpdates)];
    if (willCost > 0) {
      promises.push(actor.update({
        'system.will.value': actor.system.will.value - willCost
      }));
      chatMessage += `<p>${actor.name}'s Will was reduced by ${willCost}</p>`;
    }
    await Promise.all(promises);

    let chatData = {
      flavor: this.name,
      content: chatMessage,
      speaker: ChatMessage.implementation.getSpeaker({ actor })
    };
    chatData = ChatMessage.implementation.applyRollMode(chatData, game.settings.get('core', 'rollMode'));
    await ChatMessage.implementation.create(chatData);
    return true;
  }

  /**
   * Use a gear Item's configured Usage Lines (`system.usageLines`) - if Consumable, asks whether to
   * spend 1 Quantity via a checkbox (checked by default, deleting the item entirely if it reaches
   * 0) before posting the chat card with one button per line (see #postUsageLinesCard()).
   * @param {Actor} actor The actor using the item.
   * @param {TokenDocument} token The actor's token.
   * @returns {Promise<boolean>} `true` if used, `false` if the dialog was cancelled/closed.
   */
  async useConsumable(actor, token) {
    let spent = false;
    // Snapshot taken before any change - if this use ends up spending the last Quantity, this is
    // what #_onRollbackUse() recreates the item from (with Quantity reset to 1).
    const preConsumeItemData = this.toObject(false);

    if (this.system.consumable) {
      const content = `<p>Use ${this.name}?</p>
        <div class="form-group">
          <label class="checkbox">
            <input type="checkbox" name="consume" checked>
            Consume 1 Quantity (${this.system.quantity} remaining)
          </label>
        </div>`;
      const formData = await foundry.applications.api.DialogV2.wait({
        window: { title: `Use ${this.name}` },
        content,
        buttons: [{
          action: 'use',
          label: 'Use',
          default: true,
          callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
        }],
        rejectClose: false
      });
      if (!formData) return false;

      if (formData.consume) {
        spent = true;
        const newQuantity = Math.max(this.system.quantity - 1, 0);
        if (newQuantity <= 0) {
          await this.delete();
        } else {
          await this.update({ 'system.quantity': newQuantity });
        }
      }
    }

    await this.postUsageLinesCard(actor, token, {
      spent,
      rollback: spent ? { itemId: this.id, itemData: preConsumeItemData, used: false } : null
    });
    return true;
  }

  /**
   * Posts the "Use Item" follow-up chat card - one button per configured Usage Line, plus a
   * "Rewind Spent Use" button when this use just spent a Consumable's Quantity. Snapshots this item's
   * data onto the message's `itemData` flag so the line buttons keep working even if this item was
   * just deleted (Consumable reaching 0) - `_onChatCardAction` already prefers that flag over a
   * live actor-item lookup.
   * @param {Actor} actor The actor using the item.
   * @param {TokenDocument} token The actor's token.
   * @param {{spent?: boolean, rollback?: object|null}} options `spent` varies the flavor text;
   *   `rollback`, when set, renders a Rewind Spent Use button and is stored on the message's
   *   `consumeRollback` flag for #_onRollbackUse() to act on.
   */
  async postUsageLinesCard(actor, token, { spent = false, rollback = null } = {}) {
    const lines = (this.system.usageLines ?? []).map((line, index) => ({
      ...line,
      index,
      buttonLabel: line.label || defaultUsageLineLabel(line)
    }));

    const templateData = {
      actor: actor.toObject(false),
      tokenId: token?.uuid || null,
      item: this.toObject(false),
      lines,
      showRollback: !!rollback,
      rollbackUsed: false
    };
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/pokerole/templates/chat/item-usage-card.html", templateData);

    let chatData = {
      author: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      flavor: spent ? `${actor.name} spent ${this.name}` : `${actor.name} used ${this.name}!`,
      speaker: ChatMessage.getSpeaker({ actor, token }),
      flags: {
        "core.canPopout": true,
        [game.system.id]: {
          itemUse: true,
          actorUuid: actor?.uuid,
          tokenUuid: token?.uuid,
          itemData: this.toObject(false),
          consumeRollback: rollback
        }
      }
    };
    chatData = ChatMessage.implementation.applyRollMode(chatData, game.settings.get('core', 'rollMode'));
    await ChatMessage.create(chatData);
  }

  /**
   * Undoes a Consumable use - adds 1 Quantity back to the live item, or recreates it with Quantity
   * 1 if it was deleted entirely (fully depleted). Disables the Rewind Spent Use button afterward by
   * patching the message's stored content directly, so the disabled state survives a reload too.
   * @param {Actor} actor The actor the item was used from.
   * @param {ChatMessage} message The "Use Item" chat message carrying the `consumeRollback` flag.
   */
  static async _onRollbackUse(actor, message) {
    const rollback = message.getFlag(game.system.id, "consumeRollback");
    if (!rollback || rollback.used) return;

    // Whether the item still exists is checked live (not stored) - covers it having been deleted
    // by some other means since this message was posted, not just via this same Consumable flow.
    const liveItem = actor.items.get(rollback.itemId);
    if (liveItem) {
      await liveItem.update({ 'system.quantity': liveItem.system.quantity + 1 });
    } else {
      const data = foundry.utils.deepClone(rollback.itemData);
      delete data._id;
      data.system = { ...data.system, quantity: 1 };
      await actor.createEmbeddedDocuments('Item', [data]);
    }

    const disabledButton = '<button data-action="rollbackUse" disabled>Spent Use Rewound</button>';
    const newContent = message.content.replace(
      '<button data-action="rollbackUse">Rewind Spent Use</button>', disabledButton);
    await message.update({
      content: newContent,
      [`flags.${game.system.id}.consumeRollback.used`]: true
    });
  }

  /**
   * Dispatches a single Usage Line button click to the matching roll.mjs function.
   * @param {number} lineIndex Index into `system.usageLines`.
   * @param {Actor} actor The actor using the item.
   * @param {TokenDocument} token The actor's token.
   */
  async executeUsageLine(lineIndex, actor, token) {
    const line = this.system.usageLines?.[lineIndex];
    if (!line) {
      return ui.notifications.error("This usage line no longer exists.");
    }
    switch (line.kind) {
      case 'roll':       return rollUsageLine(this, line, actor);
      case 'accuracy':   return rollUsageLineAccuracy(this, line, actor, token);
      case 'damage':     return rollUsageLineDamage(this, line, actor, token);
      case 'heal':       return applyUsageLineHeal(this, line, actor, token);
      case 'healStatus': return applyUsageLineHealStatus(this, line, actor, token);
      case 'effects':    return rollUsageLineEffects(this, line, actor, token);
    }
  }

  /**
   * Get a list of all effects applied by this move that don't require a chance roll
   * @return {object[]} List of effects
   */
  getUnconditionalEffects() {
    return this.system.effectGroups
      .filter(group => group.condition.type === 'none')
      .flatMap(group => group.effects);
  }

  /**
   * Retrieves the effect groups with a condition of type 'chanceDice'.
   * @returns {EffectGroup[]} An array of effect groups with a condition of type 'chanceDice'.
   */
  getEffectGroupsWithChanceDice() {
    return this.system.effectGroups.filter(group => group.condition.type === 'chanceDice');
  }

  /**
   * Whether this move might target the user.
   * @return {boolean}
   */
  get mightTargetUser() {
    return ['User', 'User and Allies', 'Area', 'Battlefield', 'Battlefield and Area'].includes(this.system.target);
  }

  /**
   * Returns a pretty-printed string of the effect
   * @param {object} effect The effect to convert
   */
  static formatEffect(effect) {
    let str = '';
    switch (effect.type) {
      case 'ailment':
        str += 'Inflict Condition: ';
        str += game.i18n.localize(POKEROLE.i18n.ailments[effect.ailment]);
        break;
      case 'statChange':
        str += effect.amount > 0 ? 'Raise ' : 'Lower ';
        str += game.i18n.localize(POKEROLE.i18n.effectStats[effect.stat]);
        if (effect.amount !== 1 && effect.amount !== -1) {
          str += ` by ${Math.abs(effect.amount)}`;
        }
        break;
    }

    str += effect.affects === 'user' ? ' (Self)' : ' (Targets)';
    return str;
  }

  /**
   * Formats the chance dice group into a descriptive string.
   * @param {object} group The chance dice group object.
   * @returns {string} The formatted descriptive string.
   */
  static formatChanceDiceGroup(group) {
    if (group.condition.type !== 'chanceDice') {
      return '';
    }

    let str = group.condition.amount === 1 ? 'Roll 1 chance die to ' : `Roll ${group.condition.amount} chance dice to `;
    const statIncreases = [];
    const statDecreases = [];
    const ailments = [];

    for (const effect of group.effects) {
      const localizedStat = game.i18n.localize(POKEROLE.i18n.effectStats[effect.stat]);
      const amount = Math.abs(effect.amount);
      let changeStr = localizedStat;
      if (amount !== 1) { // Only add "by amount" if amount is not 1
          changeStr += ` by ${amount}`;
      }

      if (effect.type === 'statChange') {
          if (effect.amount > 0) {
              statIncreases.push(changeStr);
          } else if (effect.amount < 0) {
              statDecreases.push(changeStr);
          }
      } else if (effect.type === 'ailment') {
          ailments.push(game.i18n.localize(POKEROLE.i18n.ailments[effect.ailment]));
      }
    }

    function listToString(list) {
      if (list.length === 1) {
        return list[0];
      }
      const last = list.pop();
      return list.join(', ') + ', and ' + last;
    }

    if (statIncreases.length > 0) {
        str += 'raise ' + listToString(statIncreases);
    }

    if (statDecreases.length > 0) {
        if (statIncreases.length > 0) str += ', and ';
        str += 'lower ' + listToString(statDecreases);
    }

    if (ailments.length > 0) {
        if (statIncreases.length > 0 || statDecreases.length > 0) str += ', and ';
        str += `inflict condition${ailments.length > 1 ? 's' : ''}: ` + listToString(ailments);
    }

    return str;
  }

   /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    $(html).on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    $(html).on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }

    /* -------------------------------------------- */

  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
   static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    if (!(game.user.isGM || message.isAuthor)) {
      return ui.notifications.error("You can't use this item.");
    }

    // Recover the actor for the chat card
    const { actor, token } = await this._getChatCardActor(card);
    if (!actor) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag(game.system.id, "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    const canBeClashed = !!card.dataset.canBeClashed;
    const canBeEvaded = !!card.dataset.canBeEvaded;
    if (!item) {
      const err = game.i18n.format("POKEROLE.ActionWarningNoItem", {item: card.dataset.itemId, name: actor.name});
      return ui.notifications.error(err);
    }

    // Handle different actions
    switch (action) {
      case 'accuracy':
        if (!actor.hasAvailableActions()) {
          button.disabled = false;
          return ui.notifications.error("You can't take any more actions this round.");
        }

        if (item.system.usedInRound && !item.system.attributes.unlimitedUses) {
          button.disabled = false;
          return ui.notifications.error("You have already used this move in the current round.");
        }

        if (actor.isMoveDisabled(item)) {
          button.disabled = false;
          return ui.notifications.error("You can't use a disabled move!");
        }

        if (await rollAccuracy(item, actor, token, canBeClashed, canBeEvaded, !event.shiftKey)
            && game.settings.get('pokerole', 'combatResourceAutomation')) {
          actor.increaseActionCount();
          if (!item.system.attributes.unlimitedUses) {
            item.update({'system.usedInRound': true});
          }
        }
        break;
      case 'damage':
        await rollDamage(item, actor, token);
        break;
      case 'heal':
        await item.applyHeal(actor, Array.from(game.user.targets));
        break;
      case 'usageLine':
        await item.executeUsageLine(parseInt(button.dataset.lineIndex, 10), actor, token);
        break;
      case 'rollbackUse':
        await this._onRollbackUse(actor, message);
        break;
    }

    // Re-enable the button
    button.disabled = false;
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  }

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {{actor: Actor | undefined, token: token | undefined}} The Actor document or undefined
   */
  static async _getChatCardActor(card) {
    // Case 1 - a synthetic actor from a Token
    if (card.dataset.tokenId) {
      const token = await fromUuid(card.dataset.tokenId);
      if (!token) return { actor: undefined, token: undefined };
      return { token, actor: token.actor };
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return { actor: game.actors.get(actorId) ?? undefined, token: undefined };
  }
}
