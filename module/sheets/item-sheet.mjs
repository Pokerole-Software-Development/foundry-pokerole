import { getLocalizedEntriesForSelect, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class PokeroleItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["pokerole", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/pokerole/templates/item";
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = await super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.owned = true;
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    context.types = getLocalizedTypesForSelect();
    context.categories = getLocalizedEntriesForSelect('moveCategories');

    context.targets = getLocalizedEntriesForSelect('targets');

    context.ranks = {};
    for (let rank of POKEROLE.ranks.slice(1)) {
      context.ranks[rank] = game.i18n.localize(POKEROLE.i18n.ranks[rank]) ?? rank;
    }

    context.descriptionHtml = await TextEditor.enrichHTML(context.system.description, {
      secrets: this.document.isOwner,
      async: true
    });

    context.healTypes = getLocalizedEntriesForSelect('healTypes');
    context.effectTargets = getLocalizedEntriesForSelect('effectTargets');

    context.healEnabled = context.system.heal?.type !== 'none';
    context.isCustomHeal = context.system.heal?.type === 'custom';
    context.isLeechHeal = context.system.heal?.type === 'leech';

    context.operators = {
      "add": "Add",
      "replace": "Replace"
    };

    context.effectGroupConditions = {
      "none": "No condition",
      "chanceDice": "Chance Dice"
    };
    context.moveEffects = {
      "ailment": "Status Condition",
      "statChange": "Stat Change",
    };
    context.effectAilments = getLocalizedEntriesForSelect('ailments');
    context.effectStats = getLocalizedEntriesForSelect('effectStats');
    context.effectAffects = getLocalizedEntriesForSelect('effectTargets');

    return context;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Effects
    this.addRuleListener(html);
    this.deleteRuleListener(html);
    this.ruleAttributeListener(html);
    this.ruleOperatorListener(html);
    this.ruleValueListener(html);

    // Move effects
    this.effectGroupCreateListener(html);
    this.effectGroupDeleteListener(html);
    this.effectGroupConditionListener(html);
    this.effectGroupConditionAmountListener(html);
    this.effectGroupAddEffectListener(html);
    this.deleteEffectListener(html);
    this.effectTypeListener(html);
    this.effectAilmentListener(html);
    this.effectStatListener(html);
    this.effectAmountListener(html);
    this.effectAffectsListener(html);
  }

  addRuleListener(html) {
    html.find(".add-rule").click(async ev => {
      const rules = [...this.object.system.rules];
      rules.push({
        attribute: '',
        operator: 'add',
        value: 0
      });
      await this.object.update({ "system.rules": rules });
    });
  }

  deleteRuleListener(html) {
    html.find(".delete-rule").click(async ev => {
      const index = ev.target.dataset.index;
      const rules = [...this.object.system.rules];
      rules.splice(index, 1);
      await this.object.update({ "system.rules": rules });
    });
  }

  ruleAttributeListener(html) {
    html.find(".rule-attribute").change(async ev => {
      const index = ev.target.dataset.index;
      if (!ev.target.value) {
        return;
      }
      this.object.system.rules[index].attribute = ev.target.value;
      await this.object.update({ "system.rules": this.object.system.rules });
    });
  }

  ruleOperatorListener(html) {
    html.find(".rule-operator").change(async ev => {
      const index = ev.target.dataset.index;
      this.object.system.rules[index].operator = ev.target.value;
      await this.object.update({ "system.rules": this.object.system.rules });
    });
  }

  ruleValueListener(html) {
    html.find(".rule-value").change(async ev => {
      const index = ev.target.dataset.index;
      this.object.system.rules[index].value = ev.target.value;
      await this.object.update({ "system.rules": this.object.system.rules });
    });
  }

  effectGroupCreateListener(html) {
    html.find('.effect-group-create').click(async ev => {
      const groups = [...this.object.system.effectGroups];
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
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectGroupDeleteListener(html) {
    html.find('.effect-group-delete').click(async ev => {
      const index = ev.currentTarget.dataset.index;
      const groups = [...this.object.system.effectGroups];
      groups.splice(index, 1);
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectGroupConditionListener(html) {
    html.find('.effect-group-condition').change(async ev => {
      const index = ev.currentTarget.dataset.index;
      const groups = [...this.object.system.effectGroups];
      const type = ev.currentTarget.value;
      groups[index].condition.type = type;
      if (type === 'chanceDice') {
        groups[index].condition.amount = 1;
      } else {
        delete groups[index].condition.amount;
      }

      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectGroupConditionAmountListener(html) {
    html.find('.effect-group-condition-amount').change(async ev => {
      const index = ev.currentTarget.dataset.index;
      const groups = [...this.object.system.effectGroups];
      const amount = parseInt(ev.currentTarget.value);
      groups[index].condition.amount = !isNaN(amount) && amount > 0 ? amount : 1;
      await this.object.update({ "system.effectGroups": groups });
      ev.currentTarget.value = groups[index].condition.amount;
    });
  }
  
  effectGroupAddEffectListener(html) {
    html.find('.effect-group-add-effect').click(async ev => {
      const index = ev.currentTarget.dataset.index;
      const groups = [...this.object.system.effectGroups];
      groups[index].effects.push({
        type: 'ailment',
        ailment: 'poison',
        affects: 'user'
      });
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  deleteEffectListener(html) {
    html.find('.delete-effect').click(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];
      groups[groupIndex].effects.splice(effectIndex, 1);
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectTypeListener(html) {
    html.find('.effect-type').change(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];

      const type = ev.currentTarget.value;
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

      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectAilmentListener(html) {
    html.find('.effect-ailment').change(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];
      groups[groupIndex].effects[effectIndex].ailment = ev.currentTarget.value;
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectStatListener(html) {
    html.find('.effect-stat').change(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];
      groups[groupIndex].effects[effectIndex].stat = ev.currentTarget.value;
      await this.object.update({ "system.effectGroups": groups });
    });
  }

  effectAmountListener(html) {
    html.find('.effect-amount').change(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];
      const amount = parseInt(ev.currentTarget.value);

      if (!isNaN(amount) && amount !== 0) {
        groups[groupIndex].effects[effectIndex].amount = amount;
      } else {
        groups[groupIndex].effects[effectIndex].amount = 1;
      }

      await this.object.update({ "system.effectGroups": groups });

      ev.currentTarget.value = groups[groupIndex].effects[effectIndex].amount;
    });
  }

  effectAffectsListener(html) {
    html.find('.effect-affects').change(async ev => {
      const { groupIndex, effectIndex } = ev.currentTarget.dataset;
      const groups = [...this.object.system.effectGroups];
      groups[groupIndex].effects[effectIndex].affects = ev.currentTarget.value;
      await this.object.update({ "system.effectGroups": groups });
    });
  }
}
