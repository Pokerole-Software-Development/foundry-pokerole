import { POKEROLE } from "../helpers/config.mjs";
import { rollAccuracy, rollDamage } from "../helpers/roll.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class PokeroleItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();

    if (this.actor) {
      this.system.stab = this.system.type !== 'none' 
          && [this.actor.system.type1, this.actor.system.type2].includes(this.system.type);
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
   * @param {Event} event   The originating click event
   * @private
   */
  async use() {
    const token = this.actor.token;

    let properties = [];
    let hasAccuracy = false;
    let hasDamage = false;

    if (this.type === 'move') {
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
      if (this.system.accMod1 || this.system.accMod2) {
        hasAccuracy = true;
      }
      if (this.system.power || this.system.dmgMod) {
        hasDamage = true;
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
      canBeClashed: this.canBeClashed(),
      canBeEvaded: this.canBeEvaded(),
    };

    const html = await renderTemplate("systems/pokerole/templates/chat/item-card.html", templateData);

    // Create the ChatMessage data object
    let chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };
    chatData = ChatMessage.implementation.applyRollMode(chatData, game.settings.get('core', 'rollMode'));

    await ChatMessage.create(chatData);
  }

  /**
   * Whether the item is a move that can be clashed
   * @return {boolean}
   */
  canBeClashed() {
    if (this.system.type !== 'move') {
      return false;
    }

    return this.system.category !== 'support'
      && this.system.power > 0
      && !this.hasSocialAttributeAccuracyRoll()
      && this.system.target !== 'Battlefield'
      && this.system.target !== 'Battlefield (Foes)';
  }

  /**
   * Whether the item is a move that can be evaded
   * @return {boolean}
   */
   canBeEvaded() {
    if (this.system.type !== 'move') {
      return false;
    }

    return !this.hasSocialAttributeAccuracyRoll()
      && !this.system.attributes.neverFail
      && this.system.target !== 'Battlefield'
      && this.system.target !== 'Battlefield (Foes)';
  }

  /** Cannot be clashed/evaded if true */
  _hasSocialAttributeAccuracyRoll() {
    // accMod1 is always an attribute
    return POKEROLE.socialAttributes.includes(this.system.accMod1);
  }

   /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
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
    // TODO: revisit when implementing clashing/evading in response
    if (!(game.user.isGM || message.isAuthor)) return;

    // Recover the actor for the chat card
    const { actor, token } = await this._getChatCardActor(card);
    if (!actor) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("pokerole", "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    const canBeClashed = card.dataset.canBeClashed;
    const canBeEvaded = card.dataset.canBeEvaded;
    if (!item) {
      const err = game.i18n.format("POKEROLE.ActionWarningNoItem", {item: card.dataset.itemId, name: actor.name});
      return ui.notifications.error(err);
    }

    // Handle different actions
    switch (action) {
      case "accuracy":
        await rollAccuracy(item, actor, token, canBeClashed, canBeEvaded, !event.shiftKey);
        break;
      case "damage":
        await rollDamage(item, actor);
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
