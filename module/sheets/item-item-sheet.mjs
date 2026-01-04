import { PokeroleItemBaseSheet } from "./item-base-sheet.mjs";
import { POKEROLE } from "../helpers/config.mjs";

/**
 * Item (gear/inventory) sheet
 * @extends {PokeroleItemBaseSheet}
 */
export class PokeroleItemItemSheet extends PokeroleItemBaseSheet {

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
      { id: "properties", group: "primary", icon: "fa-solid fa-list", label: "Properties" }
    ];

    for ( const tab of tabs ) {
      tab.active = this.tabGroups[tab.group] === tab.id;
      tab.cssClass = tab.active ? "active" : "";
    }

    return tabs;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.tabs = this._getTabs();
    
    // Item-specific context
    context.pockets = POKEROLE.itemCategory;
    context.healTypes = this._getLocalizedEntriesForSelect('healTypes');
    context.effectTargets = this._getLocalizedEntriesForSelect('effectTargets');
    
    context.healEnabled = context.system.heal?.type !== 'none';
    context.isCustomHeal = context.system.heal?.type === 'custom';
    context.isLeechHeal = context.system.heal?.type === 'leech';
    
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    // Inject tab information into each part
    if (partId !== "header") {
      const tab = context.tabs.find(t => t.id === partId);
      if (tab) context.tab = tab;
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
}
