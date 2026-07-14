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
    context.operators = { "add": "Add", "replace": "Replace" };

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
}
