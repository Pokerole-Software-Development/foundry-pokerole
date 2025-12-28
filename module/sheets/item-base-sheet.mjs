import { getLocalizedEntriesForSelect, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";

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
  static PARTS = {
    form: {
      template: ""
    }
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
      context.descriptionHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description, {
        secrets: this.document.isOwner,
        async: true
      });
    } else {
      context.descriptionHtml = "";
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

    // Rule attribute/operator/value changes
    htmlElement.querySelectorAll('.rule-attribute').forEach(el => {
      el.addEventListener('change', this._onRuleAttributeChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-operator').forEach(el => {
      el.addEventListener('change', this._onRuleOperatorChange.bind(this));
    });
    htmlElement.querySelectorAll('.rule-value').forEach(el => {
      el.addEventListener('change', this._onRuleValueChange.bind(this));
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
      attribute: '',
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
    console.log("#onEditDescription", field);
    this.render();
  }
}
