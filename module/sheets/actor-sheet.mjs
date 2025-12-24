import { getTripleTypeMatchups, getDualTypeMatchups, getLocalizedEntriesForSelect, getLocalizedType, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";
import { successRollAttributeDialog, successRollSkillDialog } from "../helpers/roll.mjs";
import { addAilmentWithDialog } from "../helpers/effects.mjs";


/**
 * Extend the basic ActorSheet with AppV2
 * @extends {foundry.applications.sheets.ActorSheetV2}
 */
export class PokeroleActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "sheet", "actor"],
    position: {
      width: 720,
      height: 600
    },
    actions: {
      editImage: PokeroleActorSheet.#onEditImage,
      editItem: PokeroleActorSheet.#onEditItem,
      deleteItem: PokeroleActorSheet.#onDeleteItem,
      createItem: PokeroleActorSheet.#onCreateItem,
      toggleMoveGroup: PokeroleActorSheet.#onToggleMoveGroup,
      togglePocket: PokeroleActorSheet.#onTogglePocket,
      addAilment: PokeroleActorSheet.#onAddAilment,
      removeAilment: PokeroleActorSheet.#onRemoveAilment,
      roll: PokeroleActorSheet.#onRoll,
      editDescription: PokeroleActorSheet.#onEditDescription,
      toggleMoveLearned: PokeroleActorSheet.#onToggleMoveLearned,
      toggleMoveUsed: PokeroleActorSheet.#onToggleMoveUsed,
      toggleMoveOverrank: PokeroleActorSheet.#onToggleMoveOverrank,
      addCustomAttribute: PokeroleActorSheet.#onAddCustomAttribute,
      addCustomSkill: PokeroleActorSheet.#onAddCustomSkill,
      deleteValue: PokeroleActorSheet.#onDeleteValue,
      showSettings: PokeroleActorSheet.#onShowSettings,
      reTrain: PokeroleActorSheet.#onReTrain,
      incrementActions: PokeroleActorSheet.#onIncrementActions,
      resetRoundResources: PokeroleActorSheet.#onResetRoundResources,
      resetStatChanges: PokeroleActorSheet.#onResetStatChanges,
      resetPositiveChanges: PokeroleActorSheet.#onResetPositiveChanges,
      resetNegativeChanges: PokeroleActorSheet.#onResetNegativeChanges,
      toggleCanClash: PokeroleActorSheet.#onToggleCanClash,
      toggleCanEvade: PokeroleActorSheet.#onToggleCanEvade,
      toggleEffectEnabled: PokeroleActorSheet.#onToggleEffectEnabled,
      toggleVisible: PokeroleActorSheet.#onToggleVisible
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/pokerole/templates/actor/parts/actor-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    attributes: {
      template: "systems/pokerole/templates/actor/parts/actor-attributes.hbs",
      scrollable: [""]
    },
    moves: {
      template: "systems/pokerole/templates/actor/parts/actor-moves.hbs",
      scrollable: [""]
    },
    items: {
      template: "systems/pokerole/templates/actor/parts/actor-items.hbs",
      scrollable: [""]
    },
    effects: {
      template: "systems/pokerole/templates/actor/parts/actor-effects.hbs",
      scrollable: [""]
    },
    biography: {
      template: "systems/pokerole/templates/actor/parts/actor-biography.hbs",
      scrollable: [""]
    }
  };

  /** @override */
  tabGroups = {
    primary: "attributes"
  };

  /**
   * Available sheet modes.
   * @enum {number}
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2
  };

  /**
   * The mode the sheet is currently in.
   * @type {number|null}
   * @protected
   */
  _mode = null;

  // Move groups that are collapsed by default
  static HIDDEN_GROUPS = [...POKEROLE.ranks];

  static HIDDEN_POCKET = []

  static SETTINGS_TEMPLATE_PATH = `systems/pokerole/templates/actor/actor-settings.hbs`;

  static STATS_TEMPLATE_PATH = `systems/pokerole/templates/actor/actor-stats.hbs`;

  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Set initial mode
    let { mode, renderContext } = options;
    if ( (mode === undefined) && (renderContext === "createItem") ) mode = this.constructor.MODES.EDIT;
    this._mode = mode ?? this._mode ?? this.constructor.MODES.PLAY;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    
    const tabs = this._getTabs();
    
    // Add tabs data to the tabs part
    if (partId === "tabs") {
      context.tabs = tabs;
    }

    if (partId === "header") {
      await this._prepareHeaderContext(context, options);
    }
    
    // Prepare enriched biography HTML for the biography part
    if (partId === "biography") {
      // Check if we're editing a description field
      if (this._editingDescriptionTarget) {
        context.editingDescription = {
          target: this._editingDescriptionTarget,
          value: foundry.utils.getProperty(this.document, this._editingDescriptionTarget)
        };
      } else {
        context.biographyHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.system.biography, {
          secrets: this.document.isOwner,
          async: true
        });
      }
    }
    
    // Add specific tab data to each tab part
    if (tabs[partId]) {
      context.tab = tabs[partId];
    }
    
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepares the header-specific context data.
   * @param {*} context 
   * @param {*} options 
   */
  async _prepareHeaderContext(context, options) {
    let attributesBubblesNum = 0;
    for (let attribute of Object.values(this.actor.system.attributes)) {
      attributesBubblesNum = Math.max(attributesBubblesNum, attribute.max || 0, attribute.value || 0);
    }
    for (let attribute of Object.values(this.actor.system.social)) {
      attributesBubblesNum = Math.max(attributesBubblesNum, attribute.max || 0, attribute.value || 0);
    }
    for (let attribute of Object.values(this.actor.system.extra)) {
      attributesBubblesNum = Math.max(attributesBubblesNum, attribute.max || 0, attribute.value || 0);
    }
    context.attributesBubblesNum = Math.min(attributesBubblesNum, 8);
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Add actor data to context
    context.actor = this.actor;
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    context.owner = this.document.isOwner;
    context.locked = !this.isEditable;
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

    // Prepare character data and items.
    await this._prepareItems(context);
    await this._prepareAttributes(context, this.actor.overrides);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    context.natures = {};
    for (let nature of Object.keys(POKEROLE.natureConfidence)) {
      context.natures[nature] = game.i18n.localize(POKEROLE.i18n.natures[nature]) ?? nature;
    }
    // TP support.
    context.gender = {neutral: "None", male: "Male", female: "Female", genderless: "Genderless"};
    context.addedvitamin = {None: "None", strength: "Strength", dexterity: "Dexterity", def: "Defense", vitality: "Vitality", special: "Special", spDef: "Special Def.", insight: "Insight", hp: "HP", willpower: "WP"};

    // TP Test Variable
    context.testvarso = this.element?.querySelector('.inventoryfilterclass')?.value ?? "all";
    context.system.testvarso = "reset";

    // TP support.
    context.ranks = this.constructor.getLocalizedRanks();
    context.types = getLocalizedTypesForSelect();
    context.styleSheets = this.constructor.getLocalizedStyle();
   
    context.matchups = {};
    const matchups = context.system.hasThirdType
        ? getTripleTypeMatchups(context.system.type1, context.system.type2, context.system.type3)
        : getDualTypeMatchups(context.system.type1, context.system.type2);
    context.typematch = matchups;
    
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

    // TP support.
     // context.system.typechart = matchups;
    // TP support.

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
   * Prepare tab navigation data
   * @returns {Object} Object of tab configuration objects keyed by tab id
   * @private
   */
  _getTabs() {
    const tabs = [
      { id: "attributes", group: "primary", icon: "fa-solid fa-user", label: "Attributes" },
      { id: "moves", group: "primary", icon: "fa-solid fa-fist-raised", label: "Moves" },
      { id: "items", group: "primary", icon: "fa-solid fa-suitcase", label: "Items" },
      { id: "effects", group: "primary", icon: "fa-solid fa-bolt", label: "Effects" },
      { id: "biography", group: "primary", icon: "fa-solid fa-book", label: "Biography" }
    ];

    const tabsObject = {};
    for ( const tab of tabs ) {
      tab.active = this.tabGroups[tab.group] === tab.id;
      tab.cssClass = tab.active ? "active" : "";
      tabsObject[tab.id] = tab;
    }

    return tabsObject;
  }

  /** @override */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    if ( group !== "primary" ) return;
    this.element.className = this.element.className.replace(/tab-\w+/g, "");
    this.element.classList.add(`tab-${tab}`);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    this.element.querySelectorAll(".always-interactive").forEach(input => input.disabled = false);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const html = await super._renderFrame(options);
    if ( !game.user.isGM && this.document.limited ) html.classList.add("limited");
    return html;
  }

  /* -------------------------------------------- */

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @protected
   */
  _renderModeToggle() {
    const header = this.element.querySelector(".window-header");
    const toggle = header?.querySelector(".mode-slider");
    if ( this.isEditable && !toggle ) {
      const toggle = document.createElement("slide-toggle");
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
      toggle.classList.add("mode-slider");
      toggle.dataset.tooltip = "POKEROLE.SheetModeEdit";
      toggle.setAttribute("aria-label", game.i18n.localize("POKEROLE.SheetModeEdit"));
      toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
      toggle.addEventListener("dblclick", event => event.stopPropagation());
      toggle.addEventListener("pointerdown", event => event.stopPropagation());
      header.prepend(toggle);
    } else if ( this.isEditable && toggle ) {
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
    } else if ( !this.isEditable && toggle ) {
      toggle.remove();
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    
    // Attach change event listener to rank select (actions only work for click events)
    if (partId === "header") {
      const rankSelect = htmlElement.querySelector('select[name="system.rank"]');
      if (rankSelect) {
        rankSelect.addEventListener("change", async (event) => {
          await PokeroleActorSheet.#onSelectRank.call(this, event, event.target);
        });
      }
    }
    
    // Clear editing description state when prose-mirror is saved
    if (partId === "biography" && this._editingDescriptionTarget) {
      const proseMirror = htmlElement.querySelector('prose-mirror');
      if (proseMirror) {
        proseMirror.addEventListener('save', () => {
          this._editingDescriptionTarget = null;
          this.render();
        });
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Set toggle state and add status class to frame
    this._renderModeToggle();
    this.element.classList.toggle("editable", this.isEditable && (this._mode === this.constructor.MODES.EDIT));
    this.element.classList.toggle("interactable", this.isEditable && (this._mode === this.constructor.MODES.PLAY));
    this.element.classList.toggle("locked", !this.isEditable);
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sheet mode.
   * @param {Event} event  The triggering event.
   * @protected
   */
  async _onChangeSheetMode(event) {
    const { MODES } = this.constructor;
    const toggle = event.currentTarget;
    const label = game.i18n.localize(`POKEROLE.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    await this.submit();
    this.render();
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
      ailment.tooltip = ailments[ailment.type].tooltip;

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
    const customitemdf = {};
    const customitemdfordered = {};

    for (const group of POKEROLE.moveGroups) {
      moves[group] = {
        groupName: game.i18n.localize(POKEROLE.i18n.moveGroups[group]),
        hidden: (this.constructor.HIDDEN_GROUPS ?? []).includes(group) && this.isEditable,
        moveList: []
      };
    }
    
    let learnedMoveNum = 0;

    // Iterate through items, allocating to containers
    for (let i of this.actor.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push({ data: i });

        // TP Support 
        let categorylist = (i.system.pocket ?? 'Misc Item');

        if (!customitemdf[categorylist]) {
          customitemdf[categorylist] = {
            catname: POKEROLE.itemCategory[categorylist] ?? categorylist, // requires Localization
            hidden: (this.constructor.HIDDEN_POCKET ?? []).includes(categorylist),
            customitemlist: []
          }
        };

        customitemdf[categorylist].customitemlist.push({ data: i });
        // TP Support
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
        if (i.system.attributes.maneuver) {
          group = 'maneuver';
        } else if (i.system.learned) {
          group = 'learned';
          learnedMoveNum++;
        } else if (!context.editable) {
          continue;
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
     // TP Support inventory support
    // categorylist = game.itempiles.API.getItemCategories();

    for (const key in POKEROLE.itemCategory){
      if (customitemdf[key]) {
        customitemdfordered[key] = customitemdf[key];
      };
    };

    if (customitemdf['Misc Item']) {
      customitemdfordered['Misc Item'] = customitemdf['Misc Item'];
    };
    context.customitemdf = (customitemdfordered ?? customitemdf);
    

   // TP Support inventory support
    
    context.abilitiesSelect = {};
    for (let ability of abilities) {
      context.abilitiesSelect[ability.data._id] = ability.data.name;
    }

    // held item power up - TP support
    context.heldItemSelect = {};
    for (let ability of gear) {
      context.heldItemSelect[ability.data._id] = ability.data.name;
    }

    let activeItem = gear.find(ability => ability.data._id === context.system.activeItem);
    if (!activeItem && gear.length > 0) {
      // If the active ability is not set, use the first one
      activeItem = gear[0];
    }

    if (activeItem) {
      context.activeItemName = activeItem.data.name;
      context.activeItemDescription = activeItem.data.system.description;
    }


    // held item power up - TP support

    // Add active ability description to display it on hover
    let activeAbility = abilities.find(ability => ability.data._id === context.system.activeAbility);
    if (!activeAbility && abilities.length > 0) {
      // If the active ability is not set, use the first one
      activeAbility = abilities[0];
    }
    if (activeAbility) {
      context.activeAbilityName = activeAbility.data.name;
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
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle editing an image.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document._source, attr);
    const fp = new CONFIG.ux.FilePicker({
      current,
      type: target.dataset.type,
      callback: path => {
        target.src = path;
        this.submit({ updateData: { [attr]: path } });
      },
      position: {
        top: this.position.top + 40,
        left: this.position.left + 10
      }
    });
    await fp.browse();
  }

  /**
   * Handle editing an item.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onEditItem(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  /**
   * Handle deleting an item.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteItem(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      await item.delete();
      li.remove();
    }
  }

  /**
   * Handle creating a new item.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onCreateItem(event, target) {
    const type = target.dataset.type;
    const data = foundry.utils.duplicate(target.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data
    };

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
    }

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle toggling move group visibility.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleMoveGroup(event, target) {
    const group = target.dataset.group;
    const li = target.closest('li');
    li?.classList.toggle('translucent');
    const list = this.element.querySelector(`.list-${group}`);
    list?.classList.toggle('items-hidden');
    
    const hiddenGroups = (this.constructor.HIDDEN_GROUPS ?? []);
    const groupIndex = hiddenGroups.indexOf(group);
    if (groupIndex > -1) {
      hiddenGroups.splice(groupIndex, 1);
    } else {
      hiddenGroups.push(group);
    }
    this.constructor.HIDDEN_GROUPS = hiddenGroups;
  }

  /**
   * Handle toggling pocket visibility.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onTogglePocket(event, target) {
    const group = target.dataset.group;
    const li = target.closest('li');
    li?.classList.toggle('translucent');
    const list = this.element.querySelector(`.list-${group}`);
    list?.classList.toggle('items-hidden');
    
    const hiddenGroups = (this.constructor.HIDDEN_POCKET ?? []);
    const groupIndex = hiddenGroups.indexOf(group);
    if (groupIndex > -1) {
      hiddenGroups.splice(groupIndex, 1);
    } else {
      hiddenGroups.push(group);
    }
    this.constructor.HIDDEN_POCKET = hiddenGroups;
  }

  /**
   * Handle rank selection change.
   * @this {PokeroleActorSheet}
   * @param {Event} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onSelectRank(event, target) {    
    // Prevent the form from auto-submitting (AppV2 submitOnChange behavior)
    event.preventDefault();
    event.stopPropagation();
    
    const newRank = target.value;
    const oldRank = this.actor.system.rank;
    
    // Only show advancement dialog if rank actually changed
    if (oldRank !== newRank) {
      const advanced = await this._advanceRank(oldRank, newRank);
      
      // If user cancelled the dialog, revert the dropdown to old rank
      if (!advanced) {
        target.value = oldRank;
      }
    }
  }

  /**
   * Handle adding an ailment.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddAilment(event, target) {
    await addAilmentWithDialog(this.actor, target.dataset.ailment);
    this._refreshTokenAndHud();
  }

  /**
   * Handle removing an ailment.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRemoveAilment(event, target) {
    await this.actor.removeAilment(target.dataset.ailment);
    this._refreshTokenAndHud();
  }

  /**
   * Handle rolling from the sheet.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRoll(event, target) {
    const dataset = target.dataset;

    // Handle move rolls.
    if (dataset.rollType === 'item') {
      const itemId = target.closest('[data-item-id]')?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) return item.use();
    }

    const chatData = {
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor })
    };
    const rollOptions = {
      painPenalty: this.actor.system.painPenalty,
      confusionPenalty: this.actor.hasAilment('confused'),
      userRank: this.actor.system.rank,
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

  /**
   * Handle toggling move learned status.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleMoveLearned(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      item.update({
        system: {
          learned: !item.system.learned,
          usedInRound: item.system.learned ? false : item.system.usedInRound,
          overrank: false,
        }
      });
    }
  }

  /**
   * Handle toggling move used status.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleMoveUsed(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      item.update({ 'system.usedInRound': !item.system.usedInRound });
    }
  }

  /**
   * Handle toggling move overrank status.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleMoveOverrank(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      item.update({ 'system.overrank': !item.system.overrank });
    }
  }

  /**
   * Handle adding custom attribute.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onAddCustomAttribute(event, target) {
    const input = this.element.querySelector('.custom-attribute .add-value-input');
    const name = input?.value;
    const sanitizedName = PokeroleActorSheet._sanitizeName(name ?? '');
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
      if (input) input.value = '';
    }
  }

  /**
   * Handle adding custom skill.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onAddCustomSkill(event, target) {
    const input = this.element.querySelector('.custom-skill .add-value-input');
    const name = input?.value;
    const sanitizedName = PokeroleActorSheet._sanitizeName(name ?? '');
    if (sanitizedName) {
      if (this._checkDuplicateAttributeOrSkill(sanitizedName)) return;

      const obj = {};
      obj[`system.skills.${sanitizedName}`] = {
        value: 0,
        min: 0,
        custom: true,
      };
      this.actor.update(obj);
      if (input) input.value = '';
    }
  }

  /**
   * Handle deleting custom value.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onDeleteValue(event, target) {
    const { attributeKey, skillKey } = target.dataset;
    let obj = {};
    if (attributeKey) {
      obj[`system.extra.-=${attributeKey}`] = null;
    } else if (skillKey) {
      obj[`system.skills.-=${skillKey}`] = null;
    }
    this.actor.update(obj);
  }

  /**
   * Handle showing settings.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onShowSettings(event, target) {
    await this._showSettings();
  }

  /**
   * Handle re-training.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onReTrain(event, target) {
    await this.reTrain();
  }

  /**
   * Handle incrementing action number.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onIncrementActions(event, target) {
    this.actor.increaseActionCount();
  }

  /**
   * Handle resetting round-based resources.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onResetRoundResources(event, target) {
    this.actor.resetRoundBasedResources();
  }

  /**
   * Handle resetting stat changes.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onResetStatChanges(event, target) {
    this.actor.resetStatChange();
  }

  /**
   * Handle resetting positive changes.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onResetPositiveChanges(event, target) {
    this.actor.resetStatChangePositive();
  }

  /**
   * Handle resetting negative changes.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onResetNegativeChanges(event, target) {
    this.actor.resetStatChangeNegative();
  }

  /**
   * Handle toggling can clash.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleCanClash(event, target) {
    this.actor.update({ 'system.canClash': !this.actor.system.canClash });
  }

  /**
   * Handle toggling can evade.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleCanEvade(event, target) {
    this.actor.update({ 'system.canEvade': !this.actor.system.canEvade });
  }

  /**
   * Handle toggling effect enabled.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleEffectEnabled(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      item.update({ 'system.enabled': !item.system.enabled });
    }
  }

  /**
   * Handle toggling visibility.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleVisible(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) {
      item.update({ 'system.visible': !item.system.visible });
    }
  }

  /**
   * Handle editing description fields.
   * @this {PokeroleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onEditDescription(event, target) {
    const field = target.dataset.target;
    this._editingDescriptionTarget = field;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /** Shows an error message if an attribute or skill with the given name already exists */
  _checkDuplicateAttributeOrSkill(name) {
    const allKeys = Object.keys(this.actor.getAllSkillsAndAttributes());
    if (allKeys.includes(name)) {
      ui.notifications.error(`A skill or attribute named "${name}" already exists`);
      return true;
    }
    return false;
  }

  static ADVANCEMENT_DIALOGUE_TEMPLATE = "systems/pokerole/templates/actor/advancement.hbs";

  async _advanceRank(oldRank, newRank) {

    foundry.utils.mergeObject(this.actor, this.actor.original); // setting Original Numbers

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

    const content = await foundry.applications.handlebars.renderTemplate(this.constructor.ADVANCEMENT_DIALOGUE_TEMPLATE, {
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
            callback: _ => resolve('skip'),
          },
          apply: {
            label: 'Apply',
            callback: html => {
              let forceApply = html.find('.force-check')[0].checked
              if ((dialogueProgression.attributePoints > 0 || dialogueProgression.skillPoints > 0 || dialogueProgression.socialPoints > 0) && !forceApply) {
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
        close: () => resolve(null),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (result === 'skip') {
      // User clicked "Skip" - update rank without applying stat changes
      await this.actor.update({ 'system.rank': newRank });
      return true;
    } else if (result) {
      // User clicked "Apply" - apply stat changes and update rank
      const formElement = result[0].querySelector('form');
      const updateData = new foundry.applications.ux.FormDataExtended(formElement).object;
      // Include the new rank in the update
      updateData.rank = newRank;
      await this.actor.update({ system: updateData });
      return true;
    } else {
      // User cancelled (closed dialog) - don't update anything
      return false;
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
      let forceLimit = html.find('.force-limit')[0].checked

      if ((intValue + sign <= parseInt(target.dataset.max) || forceLimit || (!forceLimit && sign < 0)) && intValue + sign >= min) {
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

    const {attributes, varicolor, baseHp, willbonus, customInitiativeMod, hasThirdType, recommendedRank, source, sheetskin} = this.actor.system;

    const labelito = {};
    for (let [k, v] of Object.entries(attributes)) {
      labelito[k] = game.i18n.localize(POKEROLE.i18n.attributes[k]) ?? k;
    }

    const content = await foundry.applications.handlebars.renderTemplate(this.constructor.SETTINGS_TEMPLATE_PATH, {
      attributes,
      labelito,
      varicolor,
      baseHp,
      willbonus,
      customInitiativeMod,
      hasThirdType,
      recommendedRank,
      source,
      ranks: this.constructor.getLocalizedRanks(),
      styleSheets: this.constructor.getLocalizedStyle(),
      sheetskin
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
    const formData = new foundry.applications.ux.FormDataExtended(formElement).object;
    if(!formData.hasThirdType) this.actor.system.type3 = "none"
    console.log(this.actor.system.type3);

    this.actor.update(formData);
  }

  async _actorStats() {
    const {attributes} = this.actor.system;
    const labelito = {};
    for (let [k, v] of Object.entries(attributes)) {
      labelito[k] = game.i18n.localize(POKEROLE.i18n.attributes[k]) ?? k;
    }

    const content = await foundry.applications.handlebars.renderTemplate(this.constructor.STATS_TEMPLATE_PATH, {
      attributes,
      labelito,
    });

    const result = await new Promise(resolve => {
      new Dialog({
        title: `Actor Base Attributes`,
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
    const formData = new foundry.applications.ux.FormDataExtended(formElement).object;

    this.actor.update(formData);
  }

  async reTrain() {

    let question = await new Promise(question => {
      new Dialog({
        title: "Re Train",
        content: "<p>The Attributes and skills will be set to initial ones and you will be able to assign points by your actual Rank</p> <br> <p>Other changes will be lost, Are you sure you want to Re-train?</p>",
        buttons: {
          yes: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: "Yes",
            callback: () => question(true)
          },
          no: {
            icon: '<i class="fa-solid fa-xmark"></i>',
            label: "No",
            callback: () => question(false)
          }
        },
        default: "no",
          close: () => question(false),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (!question) return;

    const newRank = this.actor.system.rank
    if (newRank != 'none'){
      await this.actor.resetAttributes();
      this.actor.update({system: {rank: newRank}});
      await this._advanceRank('none', newRank);
      console.log("Re-Train performed")
    } else {
      console.warn("Actor doesn't have Rank")
    }
    
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

  static getLocalizedStyle() {
    const ranks = {};
    for (let rank of POKEROLE.styleSheet) {
      ranks[rank] = rank;
    }
    return ranks;
  }
}
