import { PokeroleActorSheet } from "./actor-sheet.mjs";
import { getHpBarBucket } from "../helpers/config.mjs";

/**
 * "Pokédex Red" alternate sheet for Pokémon actors only.
 * Reskins PokeroleActorSheet's header/tabs-content templates; every data-action handler,
 * the Play/Edit mode toggle, and drag/drop are inherited unchanged. _getTabs() is overridden
 * below to add tooltips and put Training 4th in the nav order.
 * @extends {PokeroleActorSheet}
 */
export class PokeroleDexActorSheet extends PokeroleActorSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole-dex", "sheet", "actor"],
    position: {
      width: 760,
      height: 770
    }
  };

  /**
   * Foundry's ApplicationV2 concatenates `classes` from every ancestor's own DEFAULT_OPTIONS
   * (see ApplicationV2#_initializeApplicationOptions / #mergeApplicationOptions - arrays are
   * pushed together, not replaced), so the inherited "pokerole" class from PokeroleActorSheet
   * ends up alongside our own "pokerole-dex" regardless of what we declare above. That means
   * every `.pokerole.actor.sheet ...` rule in the classic css/pokerole.css (tab-specific grid
   * layouts, theme variables, etc.) would otherwise silently apply to this sheet too. Strip it
   * here so this sheet is cleanly isolated under only `.pokerole-dex.actor.sheet`.
   * @override
   */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    applicationOptions.classes = applicationOptions.classes.filter(c => c !== "pokerole");
    return applicationOptions;
  }

  /** @override */
  static PARTS = {
    header: {
      template: "systems/pokerole/templates/actor/dex/dex-header.hbs"
    },
    // Re-declared identically to PokeroleActorSheet's own PARTS.tabs entry (Foundry's core
    // generic tab-navigation template) - static PARTS is NOT deep-merged across subclasses,
    // it's fully replaced, so this has to be repeated here or the tab bar silently disappears.
    // Reskinned to icon-only purely via CSS in css/pokerole-dex.css, markup untouched.
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    attributes: {
      template: "systems/pokerole/templates/actor/dex/dex-attributes.hbs",
      scrollable: [""]
    },
    moves: {
      template: "systems/pokerole/templates/actor/dex/dex-moves.hbs",
      scrollable: [""]
    },
    items: {
      template: "systems/pokerole/templates/actor/dex/dex-items.hbs",
      scrollable: [""]
    },
    effects: {
      template: "systems/pokerole/templates/actor/dex/dex-effects.hbs",
      scrollable: [""]
    },
    biography: {
      template: "systems/pokerole/templates/actor/dex/dex-biography.hbs",
      scrollable: [""]
    },
    training: {
      template: "systems/pokerole/templates/actor/dex/dex-training.hbs",
      scrollable: [""]
    }
  };

  /** @inheritDoc */
  async _prepareHeaderContext(context, options) {
    context = await super._prepareHeaderContext(context, options);
    const fainted = this.actor.hasAilment('fainted');
    context.hpPercent = Math.round(100 * context.system.hp.value / Math.max(1, context.system.hp.max));
    context.wpPercent = Math.round(100 * context.system.will.value / Math.max(1, context.system.will.max));
    context.hpBucket = fainted ? 'fainted' : getHpBarBucket(context.system.hp.value, context.system.hp.max);
    // One tick-mark section per point of max HP/WP (see .dex-bar::after in pokerole-dex.css),
    // capped at 20 so a high-max Pokémon doesn't turn the bar into noise.
    context.hpSegments = Math.min(20, Math.max(1, context.system.hp.max));
    context.wpSegments = Math.min(20, Math.max(1, context.system.will.max));
    return context;
  }

  /**
   * Add a tooltip (mirroring the label) to each tab so the icon-only nav still exposes
   * the tab name on hover, and reorder so Training sits 4th (base order is
   * attributes/moves/items/effects/biography/training - Foundry's generic tab-navigation
   * template just iterates this object in key-insertion order, so re-inserting the keys in
   * the order we want is enough to reorder the rendered nav).
   * @override
   */
  _getTabs() {
    const tabs = super._getTabs();
    for ( const tab of Object.values(tabs) ) {
      tab.tooltip = tab.label;
    }
    const order = ["attributes", "moves", "items", "training", "effects", "biography"];
    const reordered = {};
    for ( const id of order ) {
      if ( id in tabs ) reordered[id] = tabs[id];
    }
    for ( const id in tabs ) {
      if ( !(id in reordered) ) reordered[id] = tabs[id];
    }
    return reordered;
  }
}
