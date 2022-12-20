import { getDualTypeMatchups, getLocalizedType, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";
import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { successRollAttribute, successRollAttributeSkill, successRollSkillDialogue } from "../helpers/roll.mjs";

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
      width: 700,
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
    this._prepareItems(context);
    this._prepareLocalizationData(context);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    context.natures = {};
    for (let nature of Object.keys(POKEROLE.natureConfidence)) {
      context.natures[nature] = game.i18n.localize(POKEROLE.i18n.natures[nature]) ?? nature;
    }
    context.ranks = this.constructor.getLocalizedRanks();
    context.types = getLocalizedTypesForSelect();

    context.matchups = {};
    const matchups = getDualTypeMatchups(context.system.type1, context.system.type2);
    if (matchups.resist) {
      context.matchups.resist = matchups.resist.map(getLocalizedType).join(', ');
    }
    if (matchups.doubleResist) {
      context.matchups.doubleResist = matchups.doubleResist.map(getLocalizedType).join(', ');
    }
    if (matchups.weak) {
      context.matchups.weak = matchups.weak.map(getLocalizedType).join(', ');
    }
    if (matchups.doubleWeak) {
      context.matchups.doubleWeak = matchups.doubleWeak.map(getLocalizedType).join(', ');
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

    return context;
  }

  /**
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
   _prepareLocalizationData(context) {
    // Apply localization
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.POKEROLE.i18n.attributes[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.social)) {
      v.label = game.i18n.localize(CONFIG.POKEROLE.i18n.social[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.POKEROLE.i18n.skills[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.extra)) {
      v.label = game.i18n.localize(CONFIG.POKEROLE.i18n.extra[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.derived)) {
      v.label = game.i18n.localize(CONFIG.POKEROLE.i18n.derived[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    const gear = [];
    const abilities = [];
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
      // Append to moves.
      else if (i.type === 'move') {
        if (i.system.rank == undefined) {
          i.system.rank = 'starter';
        }

        let group = i.system.rank;
        if (i.system.learned) {
          group = 'learned';
          learnedMoveNum++;
        } 
        if (i.system.attributes.maneuver) {
          group = 'maneuver';
        }
        moves[group].moveList.push({
          data: i,
          locType: game.i18n.localize(POKEROLE.i18n.types[i.system.type]) ?? i.system.type,
          locTarget: game.i18n.localize(POKEROLE.i18n.targets[i.system.target]) ?? i.system.target,
          locCategory: game.i18n.localize(POKEROLE.i18n.moveCategories[i.system.category]) ?? i.system.category,
        });
      }
    }

    context.gear = gear;
    context.abilities = abilities;
    context.moves = moves;

    // Show number of learned moves and max number of learnable moves
    const maxLearnedMoves = (context.system.attributes.insight?.value ?? 0) + 2;
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
      $(event.currentTarget.closest('li')).toggleClass('hidden-header');
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

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable attributes.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Toggle moves
    html.find(".move-toggle").click(event => {
      const li = event.currentTarget.closest("li");
      const item = this.actor.items.get(li.dataset.itemId);
      item.update({ 'system.learned': !item.system.learned });
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
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    if (type === 'move') {
      if (itemData.system.rank === 'learned') {
        itemData.system.rank = 'starter';
        itemData.system.learned = true;
      } else if (itemData.system.rank === 'maneuver') {
        itemData.system.rank = 'starter';
        itemData.system.attributes = { maneuver: true };
      }
    };

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
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

    if (dataset.rollAttribute) {
      let value = this.actor.getAnyAttribute(dataset.rollAttribute).value;
      successRollAttribute({ name: dataset.rollAttribute, value }, {
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor })
      });
    }

    if (dataset.rollSkill) {
      let value = this.actor.getSkill(dataset.rollSkill).value;
      successRollSkillDialogue({ name: dataset.rollSkill, value }, this.actor.getIntrinsicOrSocialAttributes(), {
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor })
      });
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
    const content = await renderTemplate(this.constructor.SETTINGS_TEMPLATE_PATH, {
      baseHp: this.actor.system.baseHp,
      recommendedRank: this.actor.system.recommendedRank,
      ranks: this.constructor.getLocalizedRanks()
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

    this.actor.update(formData);
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
