/**
 * Shared base class for all Pokérole item sheets (AppV2 ItemSheetV2), providing Play/Edit
 * mode toggling, rules-table editing, and other action handlers common to every item type.
 */
import { getLocalizedEntriesForSelect, getLocalizedTypesForSelect, getRuleAttributeTargets, getDamagePoolCategoryChoices, POKEROLE } from "../helpers/config.mjs";

/**
 * Base ItemSheet with AppV2 - to be extended by type-specific sheets
 * @extends {foundry.applications.sheets.ItemSheetV2}
 */
export class PokeroleItemBaseSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "sheet", "item"],
    position: {
      width: 520,
      height: 480
    },
    actions: {
      addRule: PokeroleItemBaseSheet.#onAddRule,
      deleteRule: PokeroleItemBaseSheet.#onDeleteRule,
      createEffectGroup: PokeroleItemBaseSheet.#onCreateEffectGroup,
      deleteEffectGroup: PokeroleItemBaseSheet.#onDeleteEffectGroup,
      addEffect: PokeroleItemBaseSheet.#onAddEffect,
      deleteEffect: PokeroleItemBaseSheet.#onDeleteEffect,
      editDescription: PokeroleItemBaseSheet.#onEditDescription
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    }
  };

  /** @override */
  static PARTS = {};

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

  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Set initial mode
    let { mode, renderContext } = options;
    if ( (mode === undefined) && (renderContext === "createItem") ) mode = this.constructor.MODES.EDIT;
    // Non-editable documents (e.g. locked compendium items) always default to Play mode, regardless of the world setting.
    const defaultMode = this.isEditable && game.settings.get('pokerole', 'defaultItemSheetMode') === 'edit'
      ? this.constructor.MODES.EDIT : this.constructor.MODES.PLAY;
    this._mode = mode ?? this._mode ?? defaultMode;
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.item?.parent ?? null;
    if (actor) {
      context.owned = true;
      context.rollData = actor.getRollData();
    }

    // The parent class already adds item and system, but let's ensure they're set
    // In case we need to override or add additional properties
    if (!context.item) context.item = this.item;
    if (!context.system) context.system = this.item.system;
    if (!context.flags) context.flags = this.item.flags;
    
    context.owner = this.document.isOwner;
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
    context.locked = !this.isEditable;
    context.owned = this.item.isOwned;

    // Handle description editing
    if (this._editingDescriptionTarget) {
      context.editingDescription = {
        target: this._editingDescriptionTarget,
        value: foundry.utils.getProperty(this.document, this._editingDescriptionTarget)
      };
    } else if (this.item.system?.description) {
      let modDescription = this.item.system.description.trim();
      if (modDescription.at(0) != "<") {
        modDescription = `<p>${foundry.utils.escapeHTML(modDescription)}</p>`;
      }
      context.descriptionHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(modDescription, {
        secrets: this.document.isOwner,
        async: true
      });
    } else {
      context.descriptionHtml = "";
    }

    // Custom Effect/Held Item/Ability rules (TASK-16) - shared by item-effect-sheet.mjs/item-item-sheet.mjs/item-ability-sheet.mjs.
    // Built as a separate context.ruleRows array (not mutating context.system.rules) since context.system
    // is the live actor/item data reference - annotating it in place would leak display-only fields
    // (targetGroups, selected, etc.) into what #onAddRule/the rule change handlers persist via item.update().
    if (this.item.system.rules) {
      context.operators = { add: 'Add', replace: 'Replace' };
      context.ruleKinds = { attribute: 'Attribute Override', type: 'Type Override', damagePool: 'Damage Pool Bonus' };
      context.typeSlots = { type1: 'Type 1', type2: 'Type 2', type3: 'Type 3' };
      context.poolScopes = { all: 'All Moves', type: 'By Type', category: 'By Category' };
      context.typeChoices = getLocalizedTypesForSelect();
      context.categoryChoices = getDamagePoolCategoryChoices();

      const targetGroups = getRuleAttributeTargets();
      context.ruleRows = this.item.system.rules.map(rule => {
        const kind = rule.kind ?? 'attribute';
        const row = {
          ...rule,
          kind,
          isAttributeKind: kind === 'attribute',
          isTypeKind: kind === 'type',
          isDamagePoolKind: kind === 'damagePool'
        };
        if (row.isAttributeKind) {
          row.targetGroups = targetGroups.map(group => ({
            label: group.label,
            options: group.options.map(opt => ({ ...opt, selected: opt.path === rule.attribute }))
          }));
        }
        if (row.isDamagePoolKind) {
          row.scopeIsAll = !rule.scope || rule.scope === 'all';
          row.scopeIsType = rule.scope === 'type';
          row.scopeIsCategory = rule.scope === 'category';
        }
        return row;
      });
    }

    return context;
  }

  /**
   * Helper method to get localized entries for select options
   * @param {string} key - The key to look up in POKEROLE config
   * @returns {Object} Localized entries
   * @protected
   */
  _getLocalizedEntriesForSelect(key) {
    return getLocalizedEntriesForSelect(key);
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

  /* -------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    // Rule kind/attribute/operator/value changes
    htmlElement.querySelectorAll('.rule-kind').forEach(el => {
      el.addEventListener('change', this._onRuleKindChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-attribute').forEach(el => {
      el.addEventListener('change', this._onRuleAttributeChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-operator').forEach(el => {
      el.addEventListener('change', this._onRuleOperatorChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-value').forEach(el => {
      el.addEventListener('change', this._onRuleValueChange.bind(this));
    });

    // Type Override slot/new-type changes
    htmlElement.querySelectorAll('.rule-type-slot').forEach(el => {
      el.addEventListener('change', this._onRuleTypeSlotChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-type-new').forEach(el => {
      el.addEventListener('change', this._onRuleTypeNewChange.bind(this));
    });

    // Damage Pool Bonus scope/scope-value/dice changes
    htmlElement.querySelectorAll('.rule-pool-scope').forEach(el => {
      el.addEventListener('change', this._onRulePoolScopeChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-pool-scope-value').forEach(el => {
      el.addEventListener('change', this._onRulePoolScopeValueChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-pool-dice').forEach(el => {
      el.addEventListener('change', this._onRulePoolDiceChange.bind(this));
    });

    // Effect group condition changes
    htmlElement.querySelectorAll('.effect-group-condition').forEach(el => {
      el.addEventListener('change', this._onEffectGroupConditionChange.bind(this));
    });
    htmlElement.querySelectorAll('.effect-group-condition-amount').forEach(el => {
      el.addEventListener('change', this._onEffectGroupConditionAmountChange.bind(this));
    });

    // Effect property changes
    htmlElement.querySelectorAll('.effect-type').forEach(el => {
      el.addEventListener('change', this._onEffectTypeChange.bind(this));
    });
    htmlElement.querySelectorAll('.effect-ailment').forEach(el => {
      el.addEventListener('change', this._onEffectAilmentChange.bind(this));
    });
    htmlElement.querySelectorAll('.effect-stat').forEach(el => {
      el.addEventListener('change', this._onEffectStatChange.bind(this));
    });
    htmlElement.querySelectorAll('.effect-amount').forEach(el => {
      el.addEventListener('change', this._onEffectAmountChange.bind(this));
    });
    htmlElement.querySelectorAll('.effect-affects').forEach(el => {
      el.addEventListener('change', this._onEffectAffectsChange.bind(this));
    });
    
    // Clear editing description state when prose-mirror is saved
    if (this._editingDescriptionTarget) {
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

  /**
   * Handle rule attribute changes.
   * @param {Event} event  The triggering event.
   */
  async _onRuleAttributeChange(event) {
    const index = event.target.dataset.index;
    if (!event.target.value) return;
    this.item.system.rules[index].attribute = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle rule operator changes.
   * @param {Event} event  The triggering event.
   */
  async _onRuleOperatorChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].operator = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle rule value changes.
   * @param {Event} event  The triggering event.
   */
  async _onRuleValueChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].value = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle rule kind changes (Attribute Override/Type Override/Damage Pool Bonus).
   * @param {Event} event  The triggering event.
   */
  async _onRuleKindChange(event) {
    const index = event.target.dataset.index;
    const rule = this.item.system.rules[index];
    rule.kind = event.target.value;
    // Seed defaults for the newly-selected kind's own fields - an unset <select> renders its first
    // <option> regardless, so without this the data stays undefined until the user happens to touch
    // every one of that kind's dropdowns individually.
    if (rule.kind === 'attribute') {
      rule.attribute ??= getRuleAttributeTargets()[0].options[0].path;
      rule.operator ??= 'add';
      rule.value ??= 0;
    } else if (rule.kind === 'type') {
      rule.slot ??= 'type1';
      rule.newType ??= 'none';
    } else if (rule.kind === 'damagePool') {
      rule.scope ??= 'all';
      rule.dice ??= 1;
    }
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle Type Override slot changes.
   * @param {Event} event  The triggering event.
   */
  async _onRuleTypeSlotChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].slot = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle Type Override new-type changes.
   * @param {Event} event  The triggering event.
   */
  async _onRuleTypeNewChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].newType = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle Damage Pool Bonus scope changes.
   * @param {Event} event  The triggering event.
   */
  async _onRulePoolScopeChange(event) {
    const index = event.target.dataset.index;
    const rule = this.item.system.rules[index];
    rule.scope = event.target.value;
    // Seed the newly-revealed scope-value dropdown with a real option - same reasoning as the rule-kind
    // seeding above, an unset <select> still renders its first option regardless of stored data.
    if (rule.scope === 'type') {
      rule.scopeValue ??= Object.keys(getLocalizedTypesForSelect())[0];
    } else if (rule.scope === 'category') {
      rule.scopeValue ??= Object.keys(getDamagePoolCategoryChoices())[0];
    }
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle Damage Pool Bonus scope-value changes.
   * @param {Event} event  The triggering event.
   */
  async _onRulePoolScopeValueChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].scopeValue = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle Damage Pool Bonus dice-amount changes.
   * @param {Event} event  The triggering event.
   */
  async _onRulePoolDiceChange(event) {
    const index = event.target.dataset.index;
    this.item.system.rules[index].dice = event.target.value;
    await this.item.update({ "system.rules": this.item.system.rules });
  }

  /**
   * Handle effect group condition changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectGroupConditionChange(event) {
    const index = event.target.dataset.index;
    const groups = [...this.item.system.effectGroups];
    const type = event.target.value;
    groups[index].condition.type = type;
    if (type === 'chanceDice') {
      groups[index].condition.amount = 1;
    } else {
      delete groups[index].condition.amount;
    }
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle effect group condition amount changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectGroupConditionAmountChange(event) {
    const index = event.target.dataset.index;
    const groups = [...this.item.system.effectGroups];
    const amount = parseInt(event.target.value);
    groups[index].condition.amount = !isNaN(amount) && amount > 0 ? amount : 1;
    await this.item.update({ "system.effectGroups": groups });
    event.target.value = groups[index].condition.amount;
  }

  /**
   * Handle effect type changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectTypeChange(event) {
    const { groupIndex, effectIndex } = event.target.dataset;
    const groups = [...this.item.system.effectGroups];

    const type = event.target.value;
    const item = groups[groupIndex].effects[effectIndex];
    item.type = type;
    if (type === 'ailment') {
      item.ailment = 'poison';
      delete item.stat;
      delete item.amount;
    } else {
      item.stat = 'strength';
      item.amount = 1;
      delete item.ailment;
    }
    groups[groupIndex].effects[effectIndex] = item;

    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle effect ailment changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectAilmentChange(event) {
    const { groupIndex, effectIndex } = event.target.dataset;
    const groups = [...this.item.system.effectGroups];
    groups[groupIndex].effects[effectIndex].ailment = event.target.value;
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle effect stat changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectStatChange(event) {
    const { groupIndex, effectIndex } = event.target.dataset;
    const groups = [...this.item.system.effectGroups];
    groups[groupIndex].effects[effectIndex].stat = event.target.value;
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle effect amount changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectAmountChange(event) {
    const { groupIndex, effectIndex } = event.target.dataset;
    const groups = [...this.item.system.effectGroups];
    const amount = parseInt(event.target.value);

    if (!isNaN(amount) && amount !== 0) {
      groups[groupIndex].effects[effectIndex].amount = amount;
    } else {
      groups[groupIndex].effects[effectIndex].amount = 1;
    }

    await this.item.update({ "system.effectGroups": groups });
    event.target.value = groups[groupIndex].effects[effectIndex].amount;
  }

  /**
   * Handle effect affects changes.
   * @param {Event} event  The triggering event.
   */
  async _onEffectAffectsChange(event) {
    const { groupIndex, effectIndex } = event.target.dataset;
    const groups = [...this.item.system.effectGroups];
    groups[groupIndex].effects[effectIndex].affects = event.target.value;
    await this.item.update({ "system.effectGroups": groups });
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle adding a new rule.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddRule(event, target) {
    const rules = [...this.item.system.rules];
    rules.push({
      kind: 'attribute',
      attribute: getRuleAttributeTargets()[0].options[0].path,
      operator: 'add',
      value: 0
    });
    await this.item.update({ "system.rules": rules });
  }

  /**
   * Handle deleting a rule.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteRule(event, target) {
    const index = target.dataset.index;
    const rules = [...this.item.system.rules];
    rules.splice(index, 1);
    await this.item.update({ "system.rules": rules });
  }

  /**
   * Handle creating a new effect group.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onCreateEffectGroup(event, target) {
    const groups = [...this.item.system.effectGroups];
    groups.push({
      condition: {
        type: 'none',
      },
      effects: [{
        type: 'ailment',
        ailment: 'poison',
        affects: 'user'
      }]
    });
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle deleting an effect group.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteEffectGroup(event, target) {
    const index = target.dataset.index;
    const groups = [...this.item.system.effectGroups];
    groups.splice(index, 1);
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle adding an effect to an effect group.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddEffect(event, target) {
    const index = target.dataset.index;
    const groups = [...this.item.system.effectGroups];
    groups[index].effects.push({
      type: 'ailment',
      ailment: 'poison',
      affects: 'user'
    });
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle deleting an effect from an effect group.
   * @this {PokeroleItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteEffect(event, target) {
    const { groupIndex, effectIndex } = target.dataset;
    const groups = [...this.item.system.effectGroups];
    groups[groupIndex].effects.splice(effectIndex, 1);
    await this.item.update({ "system.effectGroups": groups });
  }

  /**
   * Handle editing description fields.
   * @this {PokeroleItemBaseSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onEditDescription(event, target) {
    const field = target.dataset.target;
    this._editingDescriptionTarget = field;
    this.render();
  }
}
