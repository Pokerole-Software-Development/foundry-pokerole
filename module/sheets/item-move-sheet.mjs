import { PokeroleItemBaseSheet } from "./item-base-sheet.mjs";
import { getLocalizedEntriesForSelect, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";

/**
 * Move item sheet
 * @extends {PokeroleItemBaseSheet}
 */
export class PokeroleMoveSheet extends PokeroleItemBaseSheet {

  /** @override */
  static PARTS = {
    header: {
      template: "systems/pokerole/templates/item/parts/item-move-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    attributes: {
      template: "systems/pokerole/templates/item/parts/item-move-attributes.hbs",
      scrollable: [""]
    },
    description: {
      template: "systems/pokerole/templates/item/parts/item-move-description.hbs",
      scrollable: [""]
    },
    effects: {
      template: "systems/pokerole/templates/item/parts/item-move-effects.hbs",
      scrollable: [""]
    }
  };

  /** @override */
  tabGroups = {
    primary: "attributes"
  };

  /**
   * Prepare tab navigation data
   * @returns {Object} Object of tab configuration objects keyed by tab id
   * @private
   */
  _getTabs() {
    const tabs = [
      { id: "attributes", group: "primary", icon: "fa-solid fa-list", label: "Attributes" },
      { id: "description", group: "primary", icon: "fa-solid fa-book", label: "Description" },
      { id: "effects", group: "primary", icon: "fa-solid fa-bolt", label: "Effects" }
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
    
    // Move-specific context
    context.types = getLocalizedTypesForSelect();
    context.categories = getLocalizedEntriesForSelect('moveCategories');
    context.targets = getLocalizedEntriesForSelect('targets');

    context.healTypes = getLocalizedEntriesForSelect('healTypes');
    context.effectTargets = getLocalizedEntriesForSelect('effectTargets');
    
    context.ranks = {};
    for (let rank of POKEROLE.ranks.slice(1)) {
      context.ranks[rank] = game.i18n.localize(POKEROLE.i18n.ranks[rank]) ?? rank;
    }
    
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

    context.healEnabled = context.system.heal?.type !== 'none';
    context.isCustomHeal = context.system.heal?.type === 'custom';
    context.isLeechHeal = context.system.heal?.type === 'leech';

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    
    const tabs = this._getTabs();
    
    // Add tabs data to the tabs part
    if (partId === "tabs") {
      context.tabs = tabs;
    }
    
    // Add specific tab data to each tab part
    if (tabs[partId]) {
      context.tab = tabs[partId];
    }
    
    console.log("Prepared part context for", partId, foundry.utils.deepClone(context));
    return context;
  }

  /** @override */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    if ( group !== "primary" ) return;
    this.element.className = this.element.className.replace(/tab-\w+/g, "");
    this.element.classList.add(`tab-${tab}`);
  }
}