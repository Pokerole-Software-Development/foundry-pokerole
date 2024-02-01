import { getTripleTypeMatchups, getDualTypeMatchups, getLocalizedEntriesForSelect, getLocalizedType, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";
import { successRollAttributeDialog, successRollSkillDialog } from "../helpers/roll.mjs";
import { addAilmentWithDialog } from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class PokeroleActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["pokerole", "sheet", "actor"],
      template: "systems/pokerole/templates/actor/actor-pokemon-sheet.html",
      width: 720,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** @override */
  get template() {
    return `systems/pokerole/templates/actor/actor-pokemon-sheet.html`;
  }

  // Move groups that are collapsed by default
  static HIDDEN_GROUPS = [...POKEROLE.ranks];

  static SETTINGS_TEMPLATE_PATH = `systems/pokerole/templates/actor/actor-settings.html`;

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = await super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    await this._prepareItems(context);
    await this._prepareAttributes(context, this.actor.overrides);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    context.natures = {};
    for (let nature of Object.keys(POKEROLE.natureConfidence)) {
      context.natures[nature] = game.i18n.localize(POKEROLE.i18n.natures[nature]) ?? nature;
    }
    context.ranks = this.constructor.getLocalizedRanks();
    context.types = getLocalizedTypesForSelect();

    context.matchups = {};
    const matchups = context.system.hasThirdType
        ? getTripleTypeMatchups(context.system.type1, context.system.type2, context.system.type3)
        : getDualTypeMatchups(context.system.type1, context.system.type2);
    if (matchups.resist) {
      context.matchups.resist = matchups.resist.map(getLocalizedType).join(', ');
    }
    if (matchups.doubleResist) {
      context.matchups.doubleResist = matchups.doubleResist.map(getLocalizedType).join(', ');
    }
    if (matchups.tripleResist) {
      context.matchups.tripleResist = matchups.tripleResist.map(getLocalizedType).join(', ');
    }
    if (matchups.weak) {
      context.matchups.weak = matchups.weak.map(getLocalizedType).join(', ');
    }
    if (matchups.doubleWeak) {
      context.matchups.doubleWeak = matchups.doubleWeak.map(getLocalizedType).join(', ');
    }
    if (matchups.tripleWeak) {
      context.matchups.tripleWeak = matchups.tripleWeak.map(getLocalizedType).join(', ');
    }
    if (matchups.immune) {
      context.matchups.immune = matchups.immune.map(getLocalizedType).join(', ');
    }

    context.biographyHtml = await TextEditor.enrichHTML(context.system.biography, {
      secrets: this.document.isOwner,
      async: true
    });

    // m -> ft
    let heightImperial = (context.system.height ?? 0) * 3.28084;
    if (heightImperial < 0 || Number.isNaN(heightImperial)) {
      heightImperial = 0;
    }
    context.heightImperial = Math.round(heightImperial * 100) / 100;
    
    // kg -> lbs 
    let weightImperial = (context.system.weight ?? 0) * 2.20462262185;
    if (weightImperial < 0 || Number.isNaN(weightImperial)) {
      weightImperial = 0;
    }
    context.weightImperial = Math.round(weightImperial);
    
    context.hasAvailableActions = this.actor.hasAvailableActions();
    context.painPenalties = getLocalizedEntriesForSelect('painPenaltiesShort');
    
    this._prepareStatChanges(context);
    this._populateAilmentList(context);
    
    // Propagate settings
    context.recoveryMode = game.settings.get('pokerole', 'recoveryMode');
    context.limitedPermissions = this.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED, { exact: true });

    return context;
  }

  /**
   * Add localized labels to attributes and mark if they're overridden
   */
  async _prepareAttributes(context, overrides) {
    // Apply localization
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(POKEROLE.i18n.attributes[k]) ?? k;
      v.overridden = foundry.utils.hasProperty(overrides, `system.attributes.${k}.value`);
    }
    for (let [k, v] of Object.entries(context.system.social)) {
      v.label = game.i18n.localize(POKEROLE.i18n.social[k]) ?? k;
      v.overridden = foundry.utils.hasProperty(overrides, `system.social.${k}.value`);
    }
    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(POKEROLE.i18n.skills[k]) ?? k;
      v.overridden = foundry.utils.hasProperty(overrides, `system.skills.${k}.value`);
    }
    for (let [k, v] of Object.entries(context.system.extra)) {
      v.label = game.i18n.localize(POKEROLE.i18n.extra[k]) ?? k;
      v.overridden = foundry.utils.hasProperty(overrides, `system.extra.${k}.value`);
    }
    for (let [k, v] of Object.entries(context.system.derived)) {
      v.label = game.i18n.localize(POKEROLE.i18n.derived[k]) ?? k;
      v.overridden = foundry.utils.hasProperty(overrides, `system.derived.${k}.value`);
    }

    // Stat changes
    context.system.statChanges.strength.label = game.i18n.localize(POKEROLE.i18n.attributes.strength);
    context.system.statChanges.dexterity.label = game.i18n.localize(POKEROLE.i18n.attributes.dexterity);
    context.system.statChanges.special.label = game.i18n.localize(POKEROLE.i18n.attributes.special);
    context.system.statChanges.def.label = game.i18n.localize(POKEROLE.i18n.derived.def);
    context.system.statChanges.spDef.label = game.i18n.localize(POKEROLE.i18n.derived.spDef);

    // Ailments
    const ailments = POKEROLE.getAilments();
    for (const ailment of context.system.ailments) {
      ailment.label = game.i18n.localize(ailments[ailment.type].label) ?? ailment.type;
      ailment.icon = ailments[ailment.type].icon;
      ailment.tint = ailments[ailment.type].tint;

      // Ailment-specific description
      switch (ailment.type) {
        case 'disabled':
          const move = await fromUuid(ailment.moveUuid);
          ailment.description = game.i18n.format('POKEROLE.BlockedMove', { move: move?.name });
          break;
        case 'infatuated':
          const inflictedBy = await fromUuid(ailment.inflictedByUuid);
          ailment.description = game.i18n.format('POKEROLE.InflictedBy', { actor: inflictedBy?.name });
          break;
      }
    }
  }

  /** Sort items by name and move rank */
  async _prepareItems(context) {
    const gear = [];
    const abilities = [];
    const effects = [];
    const moves = {};

    for (const group of POKEROLE.moveGroups) {
      moves[group] = {
        groupName: game.i18n.localize(POKEROLE.i18n.moveGroups[group]),
        hidden: (this.constructor.HIDDEN_GROUPS ?? []).includes(group) && this.isEditable,
        moveList: []
      };
    }

    let learnedMoveNum = 0;

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push({ data: i });
      }
      // Append to abilities.
      else if (i.type === 'ability') {
        abilities.push({ data: i });
      }
      // Append to effects.
      else if (i.type === 'effect') {
        effects.push({ data: i });
      }
      // Append to moves.
      else if (i.type === 'move') {
        if (i.system.rank == undefined) {
          await this.actor.updateEmbeddedDocuments('Item', [{
            _id: i._id,
            'system.rank': 'starter',
            'system.learned': true,
          }]);
          // The changes above also have to be applied manually because the object
          // doesn't update automatically.
          i.system.rank = 'starter';
          i.system.learned = true;
        }

        let group = i.system.rank;
        if (i.system.learned) {
          group = 'learned';
          learnedMoveNum++;
        }
        if (i.system.attributes.maneuver) {
          group = 'maneuver';
        }

        // HACK: We're operating on a clone created by `toObject` here, but it doesn't
        // include the UUID. PokeroleActor.isMoveDisabled operates on the UUID, so retrieve
        // the actual move.
        const actualMove = this.actor.items.find(item => item.id === i._id);
        const disabled = actualMove ? this.actor.isMoveDisabled(actualMove) : false;

        if (!moves[group]) {
          moves[group] = {
            groupName: game.i18n.localize(POKEROLE.i18n.moveGroups[group]) ?? group,
            hidden: true,
            moveList: []
          };
        }

        moves[group].moveList.push({
          data: i,
          locType: game.i18n.localize(POKEROLE.i18n.types[i.system.type]) ?? i.system.type,
          locTarget: game.i18n.localize(POKEROLE.i18n.targets[i.system.target]) ?? i.system.target,
          locCategory: game.i18n.localize(POKEROLE.i18n.moveCategories[i.system.category]) ?? i.system.category,
          accuracyPool: this.actor.getAccuracyPoolForMove(i),
          dmgPool: this.actor.getDamagePoolForMove(i),
          usable: !disabled && !i.system.usedInRound,
          disabled
        });
      }
    }

    context.gear = gear;
    context.abilities = abilities;
    context.moves = moves;
    context.customEffects = effects;

    context.abilitiesSelect = {};
    for (let ability of abilities) {
      context.abilitiesSelect[ability.data._id] = ability.data.name;
    }

    // Add active ability description to display it on hover
    let activeAbility = abilities.find(ability => ability.data._id === context.system.activeAbility);
    if (!activeAbility && abilities.length > 0) {
      // If the active ability is not set, use the first one
      activeAbility = abilities[0];
    }
    if (activeAbility) {
      context.activeAbilityDescription = activeAbility.data.system.description;
    }

    // Show number of learned moves and max number of learnable moves
    const maxLearnedMoves = (context.system.attributes.insight?.value ?? 0) + POKEROLE.CONST.LEARNED_MOVES_BONUS;
    const learnedGroup = context.moves['learned'];
    if (learnedGroup) {
      learnedGroup.groupName += ` (${learnedMoveNum}/${maxLearnedMoves})`;
    }

    // Remove empty move groups
    for (const group of POKEROLE.moveGroups) {
      if (group !== 'learned' && group !== 'maneuver') {
        if (moves[group]?.moveList && moves[group].moveList.length === 0) {
          delete moves[group];
        }
      }
    }
  }

  /** Add whether stat changes are positive or negative */
  _prepareStatChanges(context) {
    for (const change of Object.values(context.system.statChanges)) {
      // Omit the "-" sign
      change.displayValue = Math.abs(change.value);
      change.isPositive = change.value > 0;
      change.isNegative = change.value < 0;
    }

    context.system.accuracyMod.displayValue = Math.abs(context.system.accuracyMod.value);
    context.system.accuracyMod.isNegative = context.system.accuracyMod.value < 0;
    context.system.accuracyMod.isPositive = context.system.accuracyMod.value > 0;
  }

  /** Populate the list of ailments that can be added via icons on the character sheet */
  _populateAilmentList(context) {
    const allAilments = POKEROLE.getAilments();
    const ailmentFilter = [
      'paralysis',
      'frozen',
      'poison',
      'sleep',
      'confused',
      'disabled',
      'flinch',
      'infatuated',
      'fainted'
    ];
    context.quickAilmentList = ailmentFilter
      // Filter entries since someone might have modified the list
      .filter(ailment => ailment in allAilments)
      .map(ailment => {
        let buttonDisabled = this.actor.hasAilment(ailment) || (ailment === 'poison' && this.actor.isPoisoned());
        return { key: ailment, buttonDisabled, ...allAilments[ailment] };
      });

    // Special handling for Burn (one icon for all levels)
    if (allAilments.burn1) {
      context.quickAilmentList.unshift({
        key: 'burn',
        icon: allAilments.burn1.icon,
        label: game.i18n.localize('POKEROLE.StatusBurn'),
        buttonDisabled: this.actor.isBurned()
      })
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Toggle move groups in the UI
    html.find(".toggle-group").click(event => {
      const group = event.currentTarget.dataset.group;
      $(event.currentTarget.closest('li')).toggleClass('translucent');
      html.find(`.list-${group}`).toggleClass('items-hidden');

      const hiddenGroups = (this.constructor.HIDDEN_GROUPS ?? []);
      const groupIndex = hiddenGroups.indexOf(group);
      if (groupIndex > -1) {
        hiddenGroups.splice(groupIndex, 1);
      } else {
        hiddenGroups.push(group);
      }
      this.constructor.hiddenGroups = hiddenGroups;
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    html.find('.rank-select').change(this._onSelectRank.bind(this));

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Ailment management
    html.find(".add-ailment").click(async ev => {
      await addAilmentWithDialog(this.actor, ev.currentTarget.dataset.ailment);
      this._refreshTokenAndHud();
    });
    html.find(".remove-ailment").click(async ev => {
      await this.actor.removeAilment(ev.currentTarget.dataset.ailment);
      this._refreshTokenAndHud();
    });

    // Rollable attributes.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Toggle moves
    html.find(".move-toggle-learned").click(event => {
      const li = event.currentTarget.closest("li");
      const item = this.actor.items.get(li.dataset.itemId);
      item.update({
        system: {
          learned: !item.system.learned,
          // Remove the "used in round" flag when a move is unlearned
          usedInRound: item.system.learned ? false : item.system.usedInRound,
        }
      });
    });

    html.find(".move-toggle-used").click(event => {
      const li = event.currentTarget.closest("li");
      const item = this.actor.items.get(li.dataset.itemId);
      item.update({ 'system.usedInRound': !item.system.usedInRound });
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    html.find('.custom-attribute .add-value-button').click(() => {
      this._addCustomAttributeFromInput(html);
    });
    html.find('.custom-attribute .add-value-input').keypress(event => {
      if (event.which === 13 /* Return key */) {
        this._addCustomAttributeFromInput(html);
      }
    });
    html.find('.custom-skill .add-value-button').click(() => {
      this._addCustomSkillFromInput(html);
    });
    html.find('.custom-skill .add-value-input').keypress(event => {
      if (event.which === 13 /* Return key */) {
        this._addCustomSkillFromInput(html);
      }
    });

    html.find('.delete-value-button').click(ev => {
      const { attributeKey, skillKey } = $(ev.target).closest('.delete-value-button')[0].dataset;
      let obj = {};
      if (attributeKey) {
        obj[`system.extra.-=${attributeKey}`] = null;
      } else if (skillKey) {
        obj[`system.skills.-=${skillKey}`] = null;
      }
      this.actor.update(obj);
    });

    html.find('.settings-button').click(ev => this._showSettings());

    html.find('.increment-action-num').click(ev => this.actor.increaseActionCount());
    html.find('.reset-round-based-resources').click(ev => this.actor.resetRoundBasedResources());

    html.find('.toggle-can-clash').click(() => {
      this.actor.update({ 'system.canClash': !this.actor.system.canClash });
    });
    html.find('.toggle-can-evade').click(() => {
      this.actor.update({ 'system.canEvade': !this.actor.system.canEvade });
    });

    this._registerStatChangeListeners(html);

    html.find(".effect-toggle-enabled").click(event => {
      const li = event.currentTarget.closest("li");
      const item = this.actor.items.get(li.dataset.itemId);
      item.update({
        'system.enabled': !item.system.enabled,
      });
    });
  }

  /** 
   * Register listeners for state change inputs.
   * Special handling is required here since the input `value`
   * usually shows an absolute value without a leading "-" sign,
   * which would result in a wrong value when the form saves.
   */
  _registerStatChangeListeners(html) {
    html.find('.stat-change-input').focusin(ev => {
      const input = ev.target;
      const { actualValue } = input.dataset;
      input.value = actualValue;

      input.closest('.stat-change-item').classList.add('editing');
    });
    html.find('.stat-change-input').focusout(ev => {
      const input = ev.target;
      const { displayValue } = input.dataset;
      input.value = displayValue;

      input.closest('.stat-change-item').classList.remove('editing');
    });
    html.find('.stat-change-input').change(ev => {
      const input = ev.target;
      const { key } = input.dataset;

      let val = parseInt(input.value, 10);
      if (isNaN(val)) {
        val = 0;
      }
      input.dataset.displayValue = Math.abs(val);
      this._updateObject(ev, { [key]: val });
      ev.preventDefault();
      ev.stopPropagation();
    });
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data
    };

    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    if (type === 'move') {
      itemData.usedInRound = false;
      if (itemData.system.rank === 'learned') {
        itemData.system.rank = 'starter';
        itemData.system.learned = true;
      } else if (itemData.system.rank === 'maneuver') {
        itemData.system.rank = 'starter';
        itemData.system.attributes = { maneuver: true };
      }
    };

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle move rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.use();
      }
    }

    const chatData = {
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor })
    };
    const rollOptions = {
      painPenalty: this.actor.system.painPenalty,
      confusionPenalty: this.actor.hasAilment('confused'),
    };

    if (dataset.rollAttribute) {
      if (dataset.rollAttribute === 'initiative') {
        const roll = new Roll('1d6 + @dexterity + @alert + @customInitiativeMod', {
          dexterity: this.actor.system.attributes.dexterity.value,
          alert: this.actor.system.skills.alert.value,
          customInitiativeMod: this.actor.system.customInitiativeMod,
        });
        await roll.toMessage(chatData, { create: true });
      } else {
        let value = this.actor.getAnyAttribute(dataset.rollAttribute).value;
        successRollAttributeDialog({
          name: dataset.rollAttribute,
          value
        }, rollOptions, chatData, !event.shiftKey);
      }
    }

    if (dataset.rollSkill) {
      let value = this.actor.getSkill(dataset.rollSkill).value;
      successRollSkillDialog(
        { name: dataset.rollSkill, value },
        this.actor.getIntrinsicOrSocialAttributes(),
        rollOptions,
        chatData
      );
    }
  }

  async _onSelectRank(event) {
    const newRank = event.target.value;
    const oldRank = this.actor.system.rank;

    await this._advanceRank(oldRank, newRank);
  }

  _addCustomAttributeFromInput(html) {
    const name = html.find('.custom-attribute .add-value-input').val();
    // Remove non-alphanumeric characters
    const sanitizedName = this.constructor._sanitizeName(name ?? '');
    if (sanitizedName) {
      if (this._checkDuplicateAttributeOrSkill(sanitizedName)) return;

      const obj = {};
      obj[`system.extra.${sanitizedName}`] = {
        value: 0,
        min: 0,
        max: 5,
        custom: true,
      };
      this.actor.update(obj);
    }
  }

  _addCustomSkillFromInput(html) {
    const name = html.find('.custom-skill .add-value-input').val();
    // Remove non-alphanumeric characters
    const sanitizedName = this.constructor._sanitizeName(name ?? '');
    if (sanitizedName) {
      if (this._checkDuplicateAttributeOrSkill(sanitizedName)) return;

      const obj = {};
      obj[`system.skills.${sanitizedName}`] = {
        value: 0,
        min: 0,
        custom: true,
      };
      this.actor.update(obj);
    }
  }

  /** Shows an error message if an attribute or skill with the given name already exists */
  _checkDuplicateAttributeOrSkill(name) {
    const allKeys = Object.keys(this.actor.getAllSkillsAndAttributes());
    if (allKeys.includes(name)) {
      ui.notifications.error(`A skill or attribute named "${name}" already exists`);
      return true;
    }
    return false;
  }

  static ADVANCEMENT_DIALOGUE_TEMPLATE = "systems/pokerole/templates/actor/advancement.html";

  async _advanceRank(oldRank, newRank) {
    const oldRankIndex = POKEROLE.ranks.indexOf(oldRank);
    const newRankIndex = POKEROLE.ranks.indexOf(newRank);

    const oldRankName = game.i18n.localize(POKEROLE.i18n.ranks[oldRank]) ?? oldRank;
    const newRankName = game.i18n.localize(POKEROLE.i18n.ranks[newRank]) ?? newRank;

    const totalProgression = {
      attributePoints: 0,
      skillPoints: 0,
      socialPoints: 0,
    };

    for (let i = oldRankIndex + 1; i <= newRankIndex; i++) {
      const progression = POKEROLE.rankProgression[POKEROLE.ranks[i]];
      totalProgression.attributePoints += progression.attributePoints;
      totalProgression.skillPoints += progression.skillPoints;
      totalProgression.socialPoints += progression.socialPoints;
    }

    const { skillLimit: oldSkillLimit } = POKEROLE.rankProgression[oldRank] ?? undefined;
    const { skillLimit } = POKEROLE.rankProgression[newRank] ?? undefined;

    const oldMaxHp = this.actor.system.hp.max;
    const oldMaxWill = this.actor.system.will.max;

    const content = await renderTemplate(this.constructor.ADVANCEMENT_DIALOGUE_TEMPLATE, {
      progression: totalProgression,
      skillLimit,
      oldSkillLimit,
      showSkillLimit: skillLimit !== oldSkillLimit,
      oldMaxHp,
      oldMaxWill,
      attributes: this.actor.system.attributes,
      social: this.actor.system.social,
      skills: this.actor.system.skills,
    });

    let dialogueProgression = {
      ...totalProgression,
      oldMaxHp,
      oldMaxWill,
    };

    // Create the Dialog window and await submission of the form
    const result = await new Promise(resolve => {
      new Dialog({
        title: `Advancement: ${oldRankName} → ${newRankName} rank`,
        content,
        buttons: {
          skip: {
            label: 'Skip',
            callback: _ => resolve(undefined),
          },
          apply: {
            label: 'Apply',
            callback: html => {
              if (dialogueProgression.attributePoints > 0 || dialogueProgression.skillPoints > 0 || dialogueProgression.socialPoints > 0) {
                throw new Error("Not all points have been distributed");
              }
              // Disabled elements are excluded from form data
              html.find('input[type="text"]').prop('disabled', false);
              resolve(html);
            },
          },
        },
        default: 'apply',
        render: (html) => this._renderProgressionDialogue(html, dialogueProgression),
        close: () => resolve(undefined),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (result) {
      const formElement = result[0].querySelector('form');
      const updateData = new FormDataExtended(formElement).object;

      this.actor.update({ system: updateData });
    }
  }

  _renderProgressionDialogue(html, progression) {
    let vitalityDelta = 0;
    let insightDelta = 0;

    html.find('.max-hp-box, .max-will-box').hide();
    html.find('.max-hp-box, .max-will-box').prop('disabled', true);

    const updateCounters = () => {
      html.find('.pointsleft.attributes').text(progression.attributePoints);
      html.find('.pointsleft.social').text(progression.socialPoints);
      html.find('.pointsleft.skills').text(progression.skillPoints);

      html.find('.attributes.list button.increase').prop('disabled', progression.attributePoints <= 0);
      html.find('.social.list button.increase').prop('disabled', progression.socialPoints <= 0);
      html.find('.skills.list button.increase').prop('disabled', progression.skillPoints <= 0);

      let newHp = progression.oldMaxHp + vitalityDelta;
      let newWill = progression.oldMaxWill + insightDelta;

      html.find('.max-hp').text(newHp);
      html.find('.max-will').text(newWill);
      if (progression.oldMaxHp == newHp) {
        html.find('.max-hp-box').hide();
      } else {
        html.find('.max-hp-box').show();
      }

      if (progression.oldMaxWill == newWill) {
        html.find('.max-will-box').hide();
      } else {
        html.find('.max-will-box').show();
      }
    };


    html.on('click', '.increase, .decrease', (event) => {
      const { target: targetName, kind } = event.target.dataset;
      const target = html.find(`[name="${targetName}"]`)[0];
      const deltaTarget = html.find(`[data-delta-target="${targetName}"]`)[0];
      const sign = event.target.classList.contains('increase') ? 1 : -1;

      let intValue = parseInt(target.value);
      let min = parseInt(target.dataset.min);

      if (intValue + sign <= parseInt(target.dataset.max) && intValue + sign >= min) {
        let newValue = intValue + sign;
        target.value = newValue;

        let delta = newValue - min;
        deltaTarget.innerText = `(+${delta})`;

        switch (kind) {
          case 'attributes':
            progression.attributePoints -= sign;
            if (targetName === 'attributes.insight.value') {
              insightDelta = delta;
            }
            if (targetName === 'attributes.vitality.value') {
              vitalityDelta = delta;
            }
            break;
          case 'social':
            progression.socialPoints -= sign;
            break;
          case 'skills':
            progression.skillPoints -= sign;
            break;
        }
        updateCounters();
      }
    });
  }

  async _showSettings() {
    const { baseHp, customInitiativeMod, hasThirdType, recommendedRank, source } = this.actor.system;
    const content = await renderTemplate(this.constructor.SETTINGS_TEMPLATE_PATH, {
      baseHp,
      customInitiativeMod,
      hasThirdType,
      recommendedRank,
      source,
      ranks: this.constructor.getLocalizedRanks(),
    });

    const result = await new Promise(resolve => {
      new Dialog({
        title: `Actor settings`,
        content,
        buttons: {
          save: {
            label: 'Save',
            callback: html => resolve(html),
          },
        },
        default: 'save',
        close: () => resolve(undefined),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (!result) return;
    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;
    if(!formData.hasThirdType) this.actor.system.type3 = "none"
    console.log(this.actor.system.type3);

    this.actor.update(formData);
  }

  /** Refresh the token GUI after changing ailments */
  _refreshTokenAndHud() {
    // Refresh token overlay effects
    this.token?.object?.drawEffects();

    // Refresh status effect HUD
    if (canvas.hud?.token._statusEffects) {
      canvas.tokens?.hud?.refreshStatusIcons();
    }
  }

  static _sanitizeName(name) {
    return name.replace(/[\W_]+/g, "").toLowerCase();
  }

  static getLocalizedRanks() {
    const ranks = {};
    for (let rank of POKEROLE.ranks) {
      ranks[rank] = game.i18n.localize(POKEROLE.i18n.ranks[rank]) ?? rank;
    }
    return ranks;
  }
}
