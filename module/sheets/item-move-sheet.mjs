import { PokeroleItemBaseSheet } from "./item-base-sheet.mjs";
import { getLocalizedEntriesForSelect, getLocalizedTypesForSelect, POKEROLE } from "../helpers/config.mjs";

/**
 * Move item sheet
 * @extends {PokeroleItemBaseSheet}
 */
export class PokeroleMoveSheet extends PokeroleItemBaseSheet {

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["pokerole", "sheet", "item", "move"],
  }, { inplace: false });

  /** @override */
  static PARTS = {
    // Edit mode parts
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
    },
    // Play mode parts
    tooltip: {
      template: "systems/pokerole/templates/item/parts/item-move-tooltip.hbs"
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    
    // Determine which parts to show based on mode
    if (this._mode === this.constructor.MODES.PLAY) {
      // Play mode: only show the tooltip part
      options.parts = ['tooltip'];
    } else {
      // Edit mode: show all editing parts
      options.parts = ['header', 'tabs', 'attributes', 'description', 'effects'];
    }
  }

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
    switch (partId) {
      case "tabs":
        context.tabs = Object.values(tabs);
        break;
      case "tooltip":
        context = await this._prepareTooltipContext(context, options);
        break;
    }
    
    // Add specific tab data to each tab part
    if (tabs[partId]) {
      context.tab = tabs[partId];
    }
    
    return context;
  }

  /* ----------------------------------------------------------------------- */
  async _prepareTooltipContext(context, options) {
    const type = this.item.system.type;

    context.cssClass = `${context.cssClass ?? ""} pkmn-type-${type}`;

    context.type = type.titleCase();
    context.category = this.item.system.category?.titleCase() ?? "";
    context.accuracy = this.item.system.accAttr1?.titleCase() ?? ""
    if (this.item.system.accAttr1var){ 
      context.accuracy += " or " + (this.item.system.accAttr1var?.titleCase() ?? "");
    }
    if (this.item.system.accSkill1) {
      context.accuracy += " + " + (this.item.system.accSkill1?.titleCase() ?? "");
      if (this.item.system.accSkill1var) {
        context.accuracy += " or " + (this.item.system.accSkill1var?.titleCase() ?? "");
      }
    }
    context.damage = (this.item.system.power ?? "");
    if (this.item.system.dmgMod1var && this.item.system.dmgMod1) {
      context.damage = (this.item.system.dmgMod1?.titleCase() ?? "") + " or " + (this.item.system.dmgMod1var?.titleCase() ?? "") + " + " + context.damage;
    } else if (this.item.system.dmgMod1) {
      context.damage = (this.item.system.dmgMod1?.titleCase() ?? "") + " + " + context.damage;
    }

    context.attributes = [];
    let targetsFoe = false;
    let targetsAlly = false;
    switch (this.item.system.target) {
      case "Foe":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-foe.png",
          tooltip: "Targets One Foe",
        });
        targetsFoe = true;
        break;
      case "Random Foe":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-random-foe.png",
          tooltip: "Targets One Random Foe",
        });
        targetsFoe = true;
        break;
      case "All Foes":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-all-foes.png",
          tooltip: "Targets All Foes up to the Target Limit",
        });
        targetsFoe = true;
        break;
      case "User":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-user.png",
          tooltip: "Targets User",
        });
        targetsAlly = true;
        break;
      case "One Ally":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-ally.png",
          tooltip: "Targets One Ally",
        });
        targetsAlly = true;
        break;
      case "User and Allies":
        context.attributes.push(
          {
            icon: "systems/pokerole/images/icons/moves/target-user.png",
            tooltip: "Targets User and All Allies",
          },
          {
            icon: "systems/pokerole/images/icons/moves/target-allies.png",
            tooltip: "Targets User and All Allies",
          }
        );
        targetsAlly = true;
        break;
      case "Area":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-area.png",
          tooltip: "Targets All Combatants up to the Target Limit, prioritizing foes",
        });
        break;
      case "Battlefield":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-battlefield.png",
          tooltip: "Targets All Combatants",
        });
        break;
      case "Battlefield (Foes)":
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-battlefield-foes.png",
          tooltip: "Targets All Foes",
        });
        targetsFoe = true;
        break;
      case "Battlefield and Area":
        // This one is weird? How does this even work?
        context.attributes.push({
          icon: "systems/pokerole/images/icons/moves/target-battlefield.png",
          tooltip: "Targets All Combatants",
        });
        break;
    }
    // late reaction
    if (this.item.system.attributes.lateReactionMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/late-reaction.png",
        tooltip: `Late Reaction. This move, when used as a Late Reaction, resolves after the action that triggered it.`,
        cssClass: "teal",
        number: this.item.system.attributes.lateReactionMove,
      });
    }
    // reaction
    if (this.item.system.attributes.reactionMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/reaction.png",
        tooltip: `Reaction. This move, when used as a Reaction, resolves before the action that triggered it.`,
        cssClass: "teal",
        number: this.item.system.attributes.reactionMove,
      });
    }

    if (this.item.system.attributes.accuracyReduction) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/low-accuracy.png",
        tooltip: `You reduce the number of successes on the Accuracy roll for this move by ${this.item.system.attributes.accuracyReduction}.`,
        cssClass: "white",
        number: this.item.system.attributes.accuracyReduction,
      });
    }
    if (this.item.system.attributes.lethal) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/lethal.png",
        tooltip: "This move can deal Lethal damage",
      });
    }
    if (this.item.system.attributes.highCritical) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/high-crit.png",
        tooltip: "This move only requires 2 more successes above the required on the Attack roll to land a Critical Hit.",
      });
    }
    if (this.item.system.attributes.charge) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/charged.png",
        tooltip: "A Charge Move requires two turns, and in consequence, two Actions to be used. First action is to charge and the Second to unleash.<br/>While charging, the User is still able to Evade. These Moves can be used to Clash without needing to charge them. If the User wants to Clash while charging, they are able to do so, however, this locks the User to Clash with the charged Move, effectively wasting the turn it took to gather the energy for it",
      });
    }
    if (this.item.system.attributes.doubleAction) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/double-action.png",
        tooltip: "A Double Action can be used up to twice per turn, using up to two Actions. All actions go to the same Target.",
      });
    }
    if (this.item.system.attributes.tripleAction) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/triple-action.png",
        tooltip: "A Triple Action can be used up to three times per turn, using up to three Actions. All actions go to the same Target.",
      });
    }
    if (this.item.system.attributes.successiveActions) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/successive-action.png",
        tooltip: "A Successive Action can be used up to five times per turn, using up to five Actions. All actions go to the same Target.",
      });
    }
    if (this.item.system.attributes.mustRecharge) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/recharge.png",
        tooltip: "After successfully hitting with this Move, the User must spend their first Action of the next Round to recharge. This need to recharge remains even if the Pokémon is recalled. This effect stacks on itself. If the Move fails the accuracy roll, it's Clashed/Evaded, or used to Clash, the User does not need to recharge.",
      });
    }
    if (this.item.system.attributes.neverFail) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/never-fail.png",
        tooltip: "This move cannot be Evaded.",
      });
    }
    if (this.item.system.attributes.physicalRanged /*|| this.item.system.category == "special"*/) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/ranged.png",
        tooltip: "Ranged Move. This move does not bring the user into contact with the target directly.",
      });
    }
    if (this.item.system.attributes.powderMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/powder-move.png",
        tooltip: "A Powder Move. Grass-type Pokemon take no damage nor ill effects from this move.",
      });
    }
    if (this.item.system.attributes.rampage) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/rampage.png",
        tooltip: "A Rampage Move.<ul><li>This move is able to be used up to 3 consecutive times per Round.</li><li>While on a rampage, the Move can only be used on the user's turn or as a Clash.</li><li>While the Rampage is active, the User can't Evade or perform another Move or else the rampage is over.</li><li>After the Rampage is over, the User will get the Confused status condition.</li></ul>",
      });
    }
    if (this.item.system.attributes.recoil) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/recoil.png",
        tooltip: "The User will be hurt by their own Move. Roll damage normally against the foe, then for each success you scored as damage, roll one die against the User ignoring their defenses.",
      });
    }
    if (this.item.system.attributes.shieldMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/shield.png",
        tooltip: "Shield Move. This move can reduce the damage taken by the User to zero. You may only use one Shield Move per round. Using Shield Moves in each subsequent round will add a <em>Low Accuracy 2</em> penalty that increases successively.",
      });
    }
    if (this.item.system.attributes.soundBased) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/sound.png",
        tooltip: "Sound Move. This move bypasses Substitute, Force Fields, and Cover.",
      });
    }
    if (this.item.system.attributes.switcherMove && targetsFoe) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/switcher-foe.png",
        tooltip: "Switcher Move.<ul><li>The new Pokémon keeps the switched one's remaining actions and Initiative Score.</li><li>Switcher Effects are limited to only one each round per Trainer.</li><li>It is possible respond a Switcher Move for the user with a Switcher Move for the foe.</li><li>Clashing with Switcher Moves does not trigger their effect.</li><li>Clashing a Switcher Move would prevent the activation of this effect.</li></ul>",
      });
    } else if (this.item.system.attributes.switcherMove && targetsAlly) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/switcher-ally.png",
        tooltip: "Switcher Move.<ul><li>The new Pokémon keeps the switched one's remaining actions and Initiative Score.</li><li>Switcher Effects are limited to only one each round per Trainer.</li><li>It is possible respond a Switcher Move for the user with a Switcher Move for the foe.</li><li>Clashing with Switcher Moves does not trigger their effect.</li><li>Clashing a Switcher Move would prevent the activation of this effect.</li></ul>",
      });
    }
    if (this.item.system.attributes.userFaints) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/user-faints.png",
        tooltip: "User Faints. This move causes the user to faint after use.",
      });
    }

    // Ability Interaction icons (they don't have specific rules themselves, they just get keyed off stuff)
    if (this.item.system.attributes.biteMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/bite-move.png",
        tooltip: "A Bite Move. This move benefits from the <em>Strong Jaw</em> Ability.",
      });
    }
    if (this.item.system.attributes.cutterMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/cutter-move.png",
        tooltip: "A Cutter Move. This move benefits from the <em>Sharpness</em> Ability.",
      });
    }
    if (this.item.system.attributes.fistBased) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/fist-move.png",
        tooltip: "A Fist Move. This move benefits from the <em>Iron Fist</em> Ability.",
      });
    }
    if (this.item.system.attributes.projectileMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/projectile-move.png",
        tooltip: "A Projectile Move. This move is stopped by the <em>Bulletproof</em> Ability.",
      });
    }
    if (this.item.system.attributes.windMove) {
      context.attributes.push({
        icon: "systems/pokerole/images/icons/moves/wind-move.png",
        tooltip: "A Wind Move. This move Powers up Pokemon with the <em>Wind Power</em> Ability.",
      });
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