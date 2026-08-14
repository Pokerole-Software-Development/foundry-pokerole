/**
 * Sheet class for the Item (gear/inventory) item type, covering its Description, Properties
 * (incl. Usage Lines), and Rules tabs.
 */
import { PokeroleItemBaseSheet } from "./item-base-sheet.mjs";
import { POKEROLE, getLocalizedTypesForSelect, getLocalizedEntriesForSelect } from "../helpers/config.mjs";

const USAGE_LINE_KINDS = { roll: 'Roll', heal: 'Heal', damage: 'Damage', accuracy: 'Accuracy', healStatus: 'Heal Status', effects: 'Effects' };
const USAGE_LINE_TARGETS = { user: 'User (Self)', target: 'Target' };
const USAGE_MODE_CHOICES = { roll: 'Roll', fixed: 'Fixed' };
const USAGE_DAMAGE_CATEGORIES = { physical: 'Physical', special: 'Special' };
const YES_NO_CHOICES = { false: 'No', true: 'Yes' };
const EFFECT_GROUP_CONDITIONS = { none: 'No Condition', chanceDice: 'Chance Dice' };
const MOVE_EFFECT_TYPES = { ailment: 'Status Condition', statChange: 'Stat Change' };

// Curable via a Heal Status line: every non-volatile ailment except `fainted` (curing != reviving),
// plus `confused` specifically (the only "volatile" ailment allowed per explicit user decision -
// Disabled/Flinch/Infatuated excluded, since granting/removing those needs extra context a simple
// cure doesn't have).
const HEAL_STATUS_AILMENT_KEYS = ['paralysis', 'frozen', 'poison', 'badlyPoisoned', 'sleep', 'burn1', 'burn2', 'burn3', 'confused'];

const USAGE_LINES_TOOLTIP = "A Roll line is a bare dice roll. Heal/Damage lines can be Fixed or rolled from a formula (e.g. \"2 + Dexterity\"). Damage lines always respect the target's Defenses and Type effectiveness - set Type to None and set Ignore Defenses to Yes to emulate flat/raw damage. Accuracy lines roll a to-hit check like a Move's Accuracy roll. Heal Status cures the listed status conditions if present. Effects grants status conditions/stat changes, unconditionally or gated behind a Chance Dice roll - like a Move's own Effects tab, but using this line's single Target/User setting for every effect instead of per-effect targeting. A \"Target\" line reads its formula from - and applies its effect to - whichever token(s) you have targeted; a \"target\"-targeting line applied to yourself requires targeting your own token first.";

/** A freshly-added Usage Line's defaults - matches the row shape documented in item-item.mjs. */
function newUsageLine() {
  return {
    kind: 'roll',
    label: '',
    target: 'user',
    formula: '',
    heal: { mode: 'roll', amount: 0 },
    damage: { mode: 'roll', amount: 0, type: 'none', category: 'physical', ignoreDefenses: false },
    healStatus: { ailments: [] },
    effectGroups: []
  };
}

/** Localized choices for the Heal Status ailment picker - a curated subset, not every ailment. */
function getHealStatusAilmentChoices() {
  const all = getLocalizedEntriesForSelect('ailments');
  const choices = {};
  for (const key of HEAL_STATUS_AILMENT_KEYS) {
    if (all[key]) choices[key] = all[key];
  }
  return choices;
}

/**
 * Item (gear/inventory) sheet
 * @extends {PokeroleItemBaseSheet}
 */
export class PokeroleItemItemSheet extends PokeroleItemBaseSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 550,
      height: 550
    },
    actions: {
      addUsageLine: PokeroleItemItemSheet.#onAddUsageLine,
      deleteUsageLine: PokeroleItemItemSheet.#onDeleteUsageLine,
      addHealStatusAilment: PokeroleItemItemSheet.#onAddHealStatusAilment,
      removeHealStatusAilment: PokeroleItemItemSheet.#onRemoveHealStatusAilment,
      addUsageEffectGroup: PokeroleItemItemSheet.#onAddUsageEffectGroup,
      deleteUsageEffectGroup: PokeroleItemItemSheet.#onDeleteUsageEffectGroup,
      addUsageEffect: PokeroleItemItemSheet.#onAddUsageEffect,
      deleteUsageEffect: PokeroleItemItemSheet.#onDeleteUsageEffect
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/pokerole/templates/item/parts/item-item-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    description: {
      template: "systems/pokerole/templates/item/parts/item-item-description.hbs"
    },
    properties: {
      template: "systems/pokerole/templates/item/parts/item-item-properties.hbs"
    },
    rules: {
      template: "systems/pokerole/templates/item/parts/item-rules.hbs"
    }
  };

  /** @override */
  tabGroups = {
    primary: "description"
  };

  /**
   * Prepare tab navigation data
   * @returns {Object} Object of tab configuration objects keyed by tab id
   * @private
   */
  _getTabs() {
    const tabs = [
      { id: "description", group: "primary", icon: "fa-solid fa-book", label: "Description" },
      { id: "properties", group: "primary", icon: "fa-solid fa-list", label: "Properties" },
      { id: "rules", group: "primary", icon: "fa-solid fa-gears", label: "Effects" }
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
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Item-specific context
    context.pockets = POKEROLE.itemCategory;
    context.yesNoChoices = YES_NO_CHOICES;

    // Usage Lines (Roll/Heal/Damage/Accuracy/Heal Status/Effects) editor - same "separate
    // display-only rows array" convention as context.ruleRows above (see item-base-sheet.mjs) -
    // never mutate context.system.usageLines directly, it's the live reference #onAddUsageLine/the
    // change handlers persist from.
    context.usageLineKinds = USAGE_LINE_KINDS;
    context.usageLineTargets = USAGE_LINE_TARGETS;
    context.usageModeChoices = USAGE_MODE_CHOICES;
    context.damageCategoryChoices = USAGE_DAMAGE_CATEGORIES;
    context.typeChoices = getLocalizedTypesForSelect();
    context.usageLinesTooltip = USAGE_LINES_TOOLTIP;
    context.healStatusAilmentChoices = getHealStatusAilmentChoices();
    context.effectGroupConditions = EFFECT_GROUP_CONDITIONS;
    context.moveEffectTypes = MOVE_EFFECT_TYPES;
    context.effectAilmentChoices = getLocalizedEntriesForSelect('ailments');
    context.effectStatChoices = getLocalizedEntriesForSelect('effectStats');
    context.usageLineRows = (this.item.system.usageLines ?? []).map((line, index) => {
      const kind = line.kind ?? 'roll';
      return {
        ...line,
        kind,
        number: index + 1,
        isRollKind: kind === 'roll',
        isHealKind: kind === 'heal',
        isDamageKind: kind === 'damage',
        isAccuracyKind: kind === 'accuracy',
        isHealStatusKind: kind === 'healStatus',
        isEffectsKind: kind === 'effects',
        healModeIsFixed: line.heal?.mode === 'fixed',
        damageModeIsFixed: line.damage?.mode === 'fixed',
        effectGroupRows: (line.effectGroups ?? []).map(group => ({
          ...group,
          conditionIsChanceDice: group.condition?.type === 'chanceDice',
          effects: (group.effects ?? []).map(effect => ({
            ...effect,
            isAilmentType: effect.type === 'ailment',
            isStatChangeType: effect.type === 'statChange'
          }))
        }))
      };
    });

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const tabs = this._getTabs();

    if (partId === "tabs") {
      context.tabs = Object.values(tabs);
    } else if (tabs[partId]) {
      context.tab = tabs[partId];
    }

    return context;
  }

  /** @override */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    if ( group !== "primary" ) return;
    this.element.className = this.element.className.replace(/tab-\w+/g, "");
    this.element.classList.add(`tab-${tab}`);
  }

  /* -------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    htmlElement.querySelectorAll('.usage-line-label').forEach(el => {
      el.addEventListener('change', this._onUsageLineLabelChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-line-kind').forEach(el => {
      el.addEventListener('change', this._onUsageLineKindChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-line-target').forEach(el => {
      el.addEventListener('change', this._onUsageLineTargetChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-line-formula').forEach(el => {
      el.addEventListener('change', this._onUsageLineFormulaChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-heal-mode').forEach(el => {
      el.addEventListener('change', this._onUsageHealModeChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-heal-amount').forEach(el => {
      el.addEventListener('change', this._onUsageHealAmountChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-damage-mode').forEach(el => {
      el.addEventListener('change', this._onUsageDamageModeChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-damage-amount').forEach(el => {
      el.addEventListener('change', this._onUsageDamageAmountChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-damage-type').forEach(el => {
      el.addEventListener('change', this._onUsageDamageTypeChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-damage-category').forEach(el => {
      el.addEventListener('change', this._onUsageDamageCategoryChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-damage-ignore-defenses').forEach(el => {
      el.addEventListener('change', this._onUsageDamageIgnoreDefensesChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-group-condition').forEach(el => {
      el.addEventListener('change', this._onUsageEffectGroupConditionChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-group-condition-amount').forEach(el => {
      el.addEventListener('change', this._onUsageEffectGroupConditionAmountChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-type').forEach(el => {
      el.addEventListener('change', this._onUsageEffectTypeChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-ailment').forEach(el => {
      el.addEventListener('change', this._onUsageEffectAilmentChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-stat').forEach(el => {
      el.addEventListener('change', this._onUsageEffectStatChange.bind(this));
    });
    htmlElement.querySelectorAll('.usage-effect-amount').forEach(el => {
      el.addEventListener('change', this._onUsageEffectAmountChange.bind(this));
    });
  }

  /* -------------------------------------------- */

  /** Handle Usage Line label changes. */
  async _onUsageLineLabelChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].label = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Usage Line kind changes - seeds that kind's sub-object defaults. */
  async _onUsageLineKindChange(event) {
    const index = event.target.dataset.index;
    const line = this.item.system.usageLines[index];
    line.kind = event.target.value;
    if (line.kind === 'heal') {
      line.heal ??= { mode: 'roll', amount: 0 };
    } else if (line.kind === 'damage') {
      line.damage ??= { mode: 'roll', amount: 0, type: 'none', category: 'physical', ignoreDefenses: false };
    } else if (line.kind === 'healStatus') {
      line.healStatus ??= { ailments: [] };
    } else if (line.kind === 'effects') {
      line.effectGroups ??= [];
    }
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Usage Line target changes (User/Target). */
  async _onUsageLineTargetChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].target = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Usage Line formula changes. */
  async _onUsageLineFormulaChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].formula = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Heal Usage Line mode changes (Roll/Fixed). */
  async _onUsageHealModeChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].heal.mode = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Heal Usage Line fixed-amount changes. */
  async _onUsageHealAmountChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].heal.amount = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Damage Usage Line mode changes (Roll/Fixed). */
  async _onUsageDamageModeChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].damage.mode = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Damage Usage Line fixed-amount changes. */
  async _onUsageDamageAmountChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].damage.amount = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Damage Usage Line type changes. */
  async _onUsageDamageTypeChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].damage.type = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Damage Usage Line category changes (Physical/Special). */
  async _onUsageDamageCategoryChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].damage.category = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Damage Usage Line "Ignore Defenses" dropdown changes. */
  async _onUsageDamageIgnoreDefensesChange(event) {
    const index = event.target.dataset.index;
    this.item.system.usageLines[index].damage.ignoreDefenses = event.target.value === 'true';
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Effects Usage Line group condition-type changes (No Condition/Chance Dice). */
  async _onUsageEffectGroupConditionChange(event) {
    const { index, groupIndex } = event.target.dataset;
    const group = this.item.system.usageLines[index].effectGroups[groupIndex];
    const type = event.target.value;
    group.condition.type = type;
    if (type === 'chanceDice') {
      group.condition.amount = 1;
    } else {
      delete group.condition.amount;
    }
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Effects Usage Line group chance-dice amount changes. */
  async _onUsageEffectGroupConditionAmountChange(event) {
    const { index, groupIndex } = event.target.dataset;
    const group = this.item.system.usageLines[index].effectGroups[groupIndex];
    const amount = parseInt(event.target.value);
    group.condition.amount = !isNaN(amount) && amount > 0 ? amount : 1;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
    event.target.value = group.condition.amount;
  }

  /** Handle Effects Usage Line effect type changes (Status Condition/Stat Change). */
  async _onUsageEffectTypeChange(event) {
    const { index, groupIndex, effectIndex } = event.target.dataset;
    const effect = this.item.system.usageLines[index].effectGroups[groupIndex].effects[effectIndex];
    const type = event.target.value;
    effect.type = type;
    if (type === 'ailment') {
      effect.ailment = 'poison';
      delete effect.stat;
      delete effect.amount;
    } else {
      effect.stat = 'strength';
      effect.amount = 1;
      delete effect.ailment;
    }
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Effects Usage Line effect ailment changes. */
  async _onUsageEffectAilmentChange(event) {
    const { index, groupIndex, effectIndex } = event.target.dataset;
    this.item.system.usageLines[index].effectGroups[groupIndex].effects[effectIndex].ailment = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Effects Usage Line effect stat changes. */
  async _onUsageEffectStatChange(event) {
    const { index, groupIndex, effectIndex } = event.target.dataset;
    this.item.system.usageLines[index].effectGroups[groupIndex].effects[effectIndex].stat = event.target.value;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /** Handle Effects Usage Line effect stat-change amount changes. */
  async _onUsageEffectAmountChange(event) {
    const { index, groupIndex, effectIndex } = event.target.dataset;
    const effect = this.item.system.usageLines[index].effectGroups[groupIndex].effects[effectIndex];
    const amount = parseInt(event.target.value);
    effect.amount = !isNaN(amount) && amount !== 0 ? amount : 1;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
    event.target.value = effect.amount;
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle adding a new Usage Line.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddUsageLine(event, target) {
    const lines = [...this.item.system.usageLines, newUsageLine()];
    await this.item.update({ "system.usageLines": lines });
  }

  /**
   * Handle deleting a Usage Line.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteUsageLine(event, target) {
    const index = target.dataset.index;
    const lines = [...this.item.system.usageLines];
    lines.splice(index, 1);
    await this.item.update({ "system.usageLines": lines });
  }

  /**
   * Handle adding an ailment to a Heal Status Usage Line - reads the value from the adjacent
   * scratch picker `<select>` (not itself bound to any stored data) and appends it if not already
   * present.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddHealStatusAilment(event, target) {
    const index = target.dataset.index;
    const picker = target.previousElementSibling;
    const value = picker?.value;
    if (!value) return;
    const line = this.item.system.usageLines[index];
    line.healStatus ??= { ailments: [] };
    if (!line.healStatus.ailments.includes(value)) {
      line.healStatus = { ailments: [...line.healStatus.ailments, value] };
    }
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /**
   * Handle removing an ailment from a Heal Status Usage Line.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRemoveHealStatusAilment(event, target) {
    const { index, ailmentIndex } = target.dataset;
    const line = this.item.system.usageLines[index];
    const ailments = [...(line.healStatus?.ailments ?? [])];
    ailments.splice(ailmentIndex, 1);
    line.healStatus = { ailments };
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /**
   * Handle adding a new effect group to an Effects Usage Line.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddUsageEffectGroup(event, target) {
    const index = target.dataset.index;
    const line = this.item.system.usageLines[index];
    line.effectGroups = [...(line.effectGroups ?? []), {
      condition: { type: 'none' },
      effects: [{ type: 'ailment', ailment: 'poison' }]
    }];
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /**
   * Handle deleting an effect group from an Effects Usage Line.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteUsageEffectGroup(event, target) {
    const { index, groupIndex } = target.dataset;
    const line = this.item.system.usageLines[index];
    const groups = [...line.effectGroups];
    groups.splice(groupIndex, 1);
    line.effectGroups = groups;
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /**
   * Handle adding a new effect to an Effects Usage Line's group.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onAddUsageEffect(event, target) {
    const { index, groupIndex } = target.dataset;
    const group = this.item.system.usageLines[index].effectGroups[groupIndex];
    group.effects.push({ type: 'ailment', ailment: 'poison' });
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }

  /**
   * Handle deleting an effect from an Effects Usage Line's group.
   * @this {PokeroleItemItemSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onDeleteUsageEffect(event, target) {
    const { index, groupIndex, effectIndex } = target.dataset;
    const group = this.item.system.usageLines[index].effectGroups[groupIndex];
    group.effects.splice(effectIndex, 1);
    await this.item.update({ "system.usageLines": this.item.system.usageLines });
  }
}
