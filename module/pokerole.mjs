import { PokeroleActor } from "./documents/actor.mjs";
import { PokeroleItem } from "./documents/item.mjs";
import { PokeroleActorPokemonData } from "./data/actor-pokemon.mjs";
import { PokeroleActorTrainerData } from "./data/actor-trainer.mjs";
import { PokeroleItemItemData } from "./data/item-item.mjs";
import { PokeroleItemMoveData } from "./data/item-move.mjs";
import { PokeroleItemAbilityData } from "./data/item-ability.mjs";
import { PokeroleItemEffectData } from "./data/item-effect.mjs";
import { PokeroleCombat, PokeroleCombatTracker } from "./documents/combat.mjs";
import { PokeroleActorSheet, registerActorSheetHooks } from "./sheets/actor-sheet.mjs";
import { PokeroleAbilitySheet } from "./sheets/item-ability-sheet.mjs";
import { PokeroleEffectSheet } from "./sheets/item-effect-sheet.mjs";
import { PokeroleItemItemSheet } from "./sheets/item-item-sheet.mjs";
import { PokeroleMoveSheet } from "./sheets/item-move-sheet.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { getAilmentList, POKEROLE } from "./helpers/config.mjs";
import { rollRecoil, successRollAttributeDialog, successRollFromExpression, chanceDiceRollFromExpression, chanceDiceRoll, createChanceDiceRollMessageData, ReSuccessRoll} from "./helpers/roll.mjs";
import { showClashDialog } from "./helpers/clash.mjs";
import { bulkApplyDamageValidated, bulkApplyHp, createHealMessage, canModifyTokenOrActor } from "./helpers/damage.mjs";
import { registerIntegrationHooks } from "./helpers/integrations.mjs";
import { applyEffectToActors, registerEffectHooks } from "./helpers/effects.mjs";
import { APIdb } from "./API/API.mjs";
import CheckboxElement from "./components/checkbox.mjs";
import SlideToggleElement from "./components/slide-toggle.mjs";
import { PokeroleAilmentsMenu } from "./helpers/settingsMenu.mjs";


/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async () => {
  // Register custom elements
  customElements.define(CheckboxElement.tagName, CheckboxElement);
  customElements.define(SlideToggleElement.tagName, SlideToggleElement);

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.pokerole = {
    PokeroleActor,
    PokeroleItem,
    useItemMacro,
    APIdb
  };

  // Add custom constants for configuration.
  CONFIG.POKEROLE = POKEROLE;

  CONFIG.Combat.initiative.formula = "1d6 + @attributes.dexterity.value + @skills.alert.value + @customInitiativeMod";

  // Define custom Document classes
  CONFIG.Actor.documentClass = PokeroleActor;
  CONFIG.Item.documentClass = PokeroleItem;

  // Define DataModels backing each Actor type's `system` data
  CONFIG.Actor.dataModels = {
    pokemon: PokeroleActorPokemonData,
    trainer: PokeroleActorTrainerData
  };

  // Define DataModels backing each Item type's `system` data
  CONFIG.Item.dataModels = {
    item: PokeroleItemItemData,
    move: PokeroleItemMoveData,
    ability: PokeroleItemAbilityData,
    effect: PokeroleItemEffectData
  };
  CONFIG.Combat.documentClass = PokeroleCombat;
  CONFIG.ActiveEffect.documentClass = PokeroleActiveEffect;
  CONFIG.ui.combat = PokeroleCombatTracker;

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("pokerole", PokeroleActorSheet, { makeDefault: true });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("pokerole", PokeroleAbilitySheet, { 
    types: ["ability"], 
    makeDefault: true 
  });
  foundry.documents.collections.Items.registerSheet("pokerole", PokeroleEffectSheet, { 
    types: ["effect"], 
    makeDefault: true 
  });
  foundry.documents.collections.Items.registerSheet("pokerole", PokeroleItemItemSheet, { 
    types: ["item"], 
    makeDefault: true 
  });
  foundry.documents.collections.Items.registerSheet("pokerole", PokeroleMoveSheet, { 
    types: ["move"], 
    makeDefault: true 
  });

  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[(?:\/|#)sc ([^\]]+)\]\](?:{([^}]+)})?/gi,
    enricher: successRollEnricher,
  });

  CONFIG.statusEffects = getAilmentList();
  CONFIG.specialStatusEffects = POKEROLE.specialStatusEffects;

  await preloadHandlebarsTemplates();
  registerSettings();
});

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["Item"/*, "ActiveEffect"*/].includes(data.type)) {
      createItemMacro(data, slot);
      return false;
    }
  });
  $("body").on("click", "a.inline-roll-cmd", onInlineRollClick);
  $("body").on("click", "button.chat-action", onChatActionClick);
});

// Chat message hooks
/*
Hooks.on('renderChatLog', (app, html, data) => PokeroleItem.chatListeners(html));
Hooks.on('renderChatPopout', (app, html, data) => PokeroleItem.chatListeners(html));
*/
Hooks.on('renderChatMessageHTML', (app, html, data) => PokeroleItem.chatListeners(html));

Hooks.on('getChatMessageContextOptions', (html, options) => {
  options.push(
  {
    name: game.i18n.localize('Reroll'),
    icon: '<i class="fas fa-redo"></i>',
    condition: li => {
      // Only show this context menu if the person is GM or author of the message
      const message = game.messages.get(li.getAttribute('data-message-id'));
      const rollData = message?.getFlag(game.system.id, 'rollData');

      // Only if not already rerolled and there's at least one failed die left
      if (!rollData || rollData.rerolled) return false;
      const failedCount = rollData.type === 'damage'
        ? rollData.targets.reduce((sum, t) => sum + t.rolls.filter(roll => roll < 4).length, 0)
        : rollData.rolls.filter(roll => roll < 4).length;

      return (game.user.isGM || message.isAuthor) && failedCount > 0;
    },
    callback: li => ReSuccessRoll(li)
  })
})

PokeroleCombatTracker.registerHooks();
registerIntegrationHooks();
registerEffectHooks();
registerActorSheetHooks();

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// Legacy/unused - renamed so it doesn't shadow core's own `concat` helper. Remove eventually.
Handlebars.registerHelper('concatpk', function () {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

// greater than (renamed so it doesn't shadow core's own `gt` subexpression helper)
Handlebars.registerHelper('gtpk', function (a, b) {
  var next = arguments[arguments.length - 1];
  // HACK: `next.inverse` is not defined when using Simple Calender for some reason
  return (a > b) ? (next.fn && next.fn(this)) : (next.inverse && next.inverse(this));
});

// less than (block helper - see gtpk above)
Handlebars.registerHelper('ltpk', function (a, b) {
  var next = arguments[arguments.length - 1];
  return (a < b) ? (next.fn && next.fn(this)) : (next.inverse && next.inverse(this));
});

// getProperty
Handlebars.registerHelper('getProperty', function (...args) {
  const options = args.pop(); // remove Handlebars options arguments
  // Fallback for the final path segment only - varies per field, so callers pass their own default.
  const defaultValue = options.hash?.default ?? 0;
  var next = args.shift();
  for (let i = 0; i < args.length; i++) {
    const isLast = i === args.length - 1;
    next = foundry.utils.getProperty(next, args[i]) ?? (isLast ? defaultValue : {});
  }
  return next;
});

// TP support (EQ)

Handlebars.registerHelper('ifvitamin', function(v1, v2, test) {
  if (v1==test || v2==test){
    return true;
  } else {
    return false;
  };
});

// TP filter EQ

Handlebars.registerHelper('categoryfilter', function(v1, categ) {
  if (v1==categ || categ=="all"){
    return true;
  } else {
    return false;
  };
});
// TP filter EQ
Handlebars.registerHelper('eqpk', function(v1, v2) {
  if (v1==v2){
    return true;
  } else {
    return false;
  };
});

Handlebars.registerHelper('gtexe', function(v1, v2) {
  if (v1 >= v2){
    return true;
  } else {
    return false;
  };
});

Handlebars.registerHelper('pokecount', function(cvalue, cmax) {
  var geo = [];
  for (let i = 0; i < cmax; i++) {
    if (cmax - i <= cvalue) {
      geo[i] = false;
    } else {
      geo[i] = true;
    }
  }
    return geo;
});

Handlebars.registerHelper('pkOptions', function(v1) {
  if (v1=='genderOption'){
    return game.settings.get('pokerole', 'genderOption') ?? false;
  };
  if (v1=='vitaminOption'){
    return game.settings.get('pokerole', 'vitaminOption') ?? false;
  };
  if (v1=='developmentOption'){
    return game.settings.get('pokerole', 'developmentOption') ?? false;
  };
});

Handlebars.registerHelper('styleImage', function(item='none', tolowercase = false) {
  if (tolowercase == true){item = item.toLowerCase()};
  let varo = POKEROLE.styleImages[item];
  return varo ?? 'systems/pokerole/images/icons/Ranks/none.svg';
});

Handlebars.registerHelper('styleColor', function(item='skinOld', asset='color1', tolowercase = false) {
  if (tolowercase == true){item = item.toLowerCase()};
  if (item == ''){item = 'skinOld'; asset = 'color1';};
  let varo = POKEROLE.styleColor[item];
  if (varo){varo = varo[asset]};
  return varo ?? '#2D2718';
});

Handlebars.registerHelper('styleType', function(item='none', asset='color1', tolowercase = false) {
  if (tolowercase == true){item = item.toLowerCase()};
  if (item == ''){item = 'none'; asset = 'image';};
  let varo = POKEROLE.typeMatchups[item];
  if (varo){varo = varo[asset]};
  return varo ?? 'none';
});

/**
 * Generate bubble data for attributes in Play mode.
 * @param {object} actor - The actor document
 * @param {string} category - The category path (e.g., "attributes", "social", "skills")
 * @param {string} key - The attribute key
 * @returns {Array} Array of bubble objects with type and color
 */
Handlebars.registerHelper('attributeBubbles', function(actor, category, key) {
  if (!actor || !category || !key) return [];
  
  const sourceData = actor._source?.system?.[category]?.[key];
  const currentData = actor.system?.[category]?.[key];
  
  if (!sourceData || !currentData) return [];
  
  const baseValue = sourceData.value || 0;
  const currentValue = currentData.value || 0;
  const maxValue = currentData.max || 0;
  const changeValue = currentValue - baseValue;
  
  const bubbles = [];
  
  // Calculate how many bubbles of each type
  let blackCount = baseValue;
  let redCount = 0;
  let blueCount = 0;
  
  if (changeValue < 0) {
    // Stat is lowered - some black bubbles become red
    redCount = Math.min(Math.abs(changeValue), baseValue);
    blackCount = baseValue - redCount;
  } else if (changeValue > 0) {
    // Stat is increased - add blue bubbles
    blueCount = changeValue;
  }
  
  // Add black bubbles (base value minus any red)
  for (let i = 0; i < blackCount; i++) {
    bubbles.push({ type: 'base', color: 'black' });
  }
  
  // Add red bubbles (penalties)
  for (let i = 0; i < redCount; i++) {
    bubbles.push({ type: 'penalty', color: 'red' });
  }
  
  // Add blue bubbles (bonuses)
  for (let i = 0; i < blueCount; i++) {
    bubbles.push({ type: 'bonus', color: 'blue' });
  }
  
  // Add white bubbles for remaining capacity
  const totalFilled = blackCount + redCount + blueCount;
  const whiteCount = Math.max(0, maxValue - totalFilled);
  for (let i = 0; i < whiteCount; i++) {
    bubbles.push({ type: 'empty', color: 'white' });
  }
  
  return bubbles;
});

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

/** Register Pokérole game settings */
function registerSettings() {
  game.settings.register('pokerole', 'specialDefenseStat', {
    name: 'POKEROLE.SettingNameSpecialDefenseStat',
    hint: 'POKEROLE.SettingHintSpecialDefenseStat',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'vitality': 'POKEROLE.AttributeVitality',
      'insight': 'POKEROLE.AttributeInsight',
    },
    default: 'vitality',
    requiresReload: true
  });

  game.settings.register('pokerole', 'forceAttributeHP', {
    name: 'Force HP Calculation',
    hint: 'Option to bypass HP calculations and force to use either Vitality or Insight for Maximum HP',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'disabled': 'Disabled',
      'higher': 'Higher',
      'vitality': 'POKEROLE.AttributeVitality',
      'insight': 'POKEROLE.AttributeInsight',
    },
    default: 'disabled',
    requiresReload: true
  });

  game.settings.register('pokerole', 'combatResourceAutomation', {
    name: 'POKEROLE.SettingNameCombatResourceAutomation',
    hint: 'POKEROLE.SettingHintCombatResourceAutomation',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('pokerole', 'rulesetVersion', {
    name: 'POKEROLE.SettingNameRulesetVersion',
    hint: 'POKEROLE.SettingHintRulesetVersion',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      '2.0': 'POKEROLE.Version20',
    },
    default: '2.0',
    requiresReload: true
  });

  game.settings.register('pokerole', 'autoBuff', {
    name: 'Display Buff & Debuff',
    hint: 'Add the Increases and Decreases of stats on token UI',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register('pokerole', 'showPainPenaltyIcon', {
    name: 'Display Pain Penalization',
    hint: 'Show the Pain Penalization level (and how much is Resisted) as an icon on the token',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register('pokerole', 'disablePainPenalty', {
    name: 'Disable Pain Penalization',
    hint: 'Turns off the Pain Penalization mechanic entirely - no calculations, no sheet section, no Willpower-resist prompt.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register('pokerole', 'vitaminOption', {
    name: 'Enable Vitamin Tracker',
    hint: 'Add a new section on the Biography tab to keeptrack of the vitamin you are giving to a pokemon and add a visual reminder on the attribute tab',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register('pokerole', 'genderOption', {
    name: 'Enable Pokemon Gender Selector',
    hint: 'Add a new dropdown list to keep track of the Gender of Actors (Videogame genders)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register('pokerole', 'recoveryMode', {
    name: 'POKEROLE.SettingNameRecoveryMode',
    hint: 'POKEROLE.SettingHintRecoveryMode',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register('pokerole', 'developmentOption', {
    name: 'Enable The Developer Options ',
    hint: 'Development Sheets and Menus WARNING: those features may be not secure for your world',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.registerMenu('pokerole', 'ailmentsConst', {
      name: "Ailments Constants",
      hint: "Allows to change certain numbers of the core mechanics related to Ailments",
      label: "Ailments Settings",
      icon: 'fas fa-wrench',
      type: PokeroleAilmentsMenu,
      restricted: true
    })

  game.settings.register('pokerole', 'burnConst', {
    name: 'Burn Strength Reduction',
    hint: 'Homebrew option to add Strength reduction to the Burn condition (Default: 0)',
    scope: 'world',
    config: false,
    type: Number,
    default: 0,
    range: {min: 0, max: 3},
    requiresReload: true
  });

  game.settings.register('pokerole', 'frozenConst', {
    name: 'Frozen Special Reduction',
    hint: 'Homebrew option to add Special reduction to the Frozen condition (Default: 0)',
    scope: 'world',
    config: false,
    type: Number,
    default: 0,
    range: {min: 0, max: 3},
    requiresReload: true
  });

  game.settings.register('pokerole', 'paralysisConst', {
    name: 'Paralysis Dexterity Reduction',
    hint: 'Homebrew option to change the Special reduction to the Paralysis condition (Default: 2)',
    scope: 'world',
    config: false,
    type: Number,
    default: 2,
    range: {min: 0, max: 3},
    requiresReload: true
  });

  game.settings.register('pokerole', 'enforceTargetLimit', {
    name: 'Enforce Rank Target Limit',
    hint: 'Block a damage roll (with a warning) if more targets are selected than the attacker\'s rank allows, for multi-target moves (Area, All Foes, Battlefield, etc.)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('pokerole', 'enforceSingleTargetLimit', {
    name: 'Enforce Single-Target Move Limit',
    hint: 'Block a damage roll (with a warning) if more than one target is selected for a single-target move (Foe, Random Foe, Ally). Takes priority over Enforce Rank Target Limit for these moves.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('pokerole', 'sharedMultiTargetDamage', {
    name: 'Shared Multi-Target Damage Pool',
    hint: 'For multi-target damage rolls, roll one shared dice pool instead of an independent pool per target - each target keeps as many dice from the shared pool as its own Def/Sp. Def allows. Only applies to standard power+stat damage rolls, not moves with a custom Damage Pool Formula.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('pokerole', 'showBubbles', {
    name: 'Show Bubbles on Attributes',
    hint: 'In "Play" mode on the character sheet, display bubbles for attributes instead of numbers (similar to the PDF)',
    scope: 'user',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('pokerole', 'defaultActorSheetMode', {
    name: 'Default Actor Sheet Mode',
    hint: 'Whether Actor sheets (Pokémon and Trainer) open in Play or Edit mode by default',
    scope: 'user',
    config: true,
    type: String,
    choices: {
      'play': 'Play',
      'edit': 'Edit'
    },
    default: 'play'
  });

  game.settings.register('pokerole', 'defaultItemSheetMode', {
    name: 'Default Item Sheet Mode',
    hint: 'Whether Item sheets (Move, Item, Ability, Effect) open in Play or Edit mode by default',
    scope: 'user',
    config: true,
    type: String,
    choices: {
      'play': 'Play',
      'edit': 'Edit'
    },
    default: 'play'
  });

  game.settings.register("pokerole", "customBar", {
    name: 'BarBrawl: Axoria Custom Bar',
    hint: 'Enable a Default BarBrawl Bar for Pokerole Tokens',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Assigns an existing item macro to the hotbar, or creates one, from a dropped Item.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(dropData, slot) {
  const macroData = { type: "script", scope: "actor" };
  switch (dropData.type) {
    case "Item":
      const itemData = await Item.implementation.fromDropData(dropData);
      if (!itemData) return ui.notifications.warn(game.i18n.localize("You can only create macro buttons for owned Items"));
      foundry.utils.mergeObject(macroData, {
        name: itemData.name,
        img: itemData.img,
        command: `game.pokerole.useItemMacro("${itemData.uuid}")`,
        flags: { "pokerole.itemMacro": true }
      });
      break;
    default:
      return true;
  }

  // Assign the macro to the hotbar
  const macro = game.macros.find(m => (m.name === macroData.name) && (m.command === macroData.command)
    && m.author.isSelf) || await Macro.create(macroData);
  game.user.assignHotbarMacro(macro, slot);
}

/** Uses an item macro by re-fetching the Item via its uuid. @param {string} itemUuid */
async function useItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  const item = await Item.implementation.fromDropData(dropData);
  // Determine if the item loaded and if it's an owned item.
  if (item && !item.parent) {
    return ui.notifications.warn(`The item does not have an owner. Only owned items are supported.`);
  } else if (!item || !item.parent) {
    const itemName = item?.name ?? itemUuid;
    return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
  }

  // Trigger the item roll
  item.use();
}

/** Called when clicking chat action buttons like "Clash" etc. */
async function onChatActionClick(event) {
  event.preventDefault();

  const messageId = event.currentTarget.closest(".message").dataset.messageId;
  const message = game.messages.get(messageId);

  const tokens = canvas.tokens.controlled;
  const actors = tokens.map(t => t.document.actor);
  if (actors.length == 0 && game.user?.character) {
    actors.push(game.user.character);
  }

  const token = tokens.length > 0 ? tokens[0] : null;
  const actor = actors.length > 0 ? actors[0] : null;
  const chatData = { speaker: ChatMessage.implementation.getSpeaker({ token: token?.document, actor }) };

  const action = event.target.dataset.action;
  if (action === 'clash' || action === 'evade') {
    if (!actor) {
      return ui.notifications.error('No actor selected');
    }

    if (!actor.hasAvailableActions()) {
      return ui.notifications.error("You can't take any more actions this round.");
    }
  }

  try {
    switch (action) {
      case 'clash': {
        if (!actor.system.canClash) {
          return ui.notifications.error("You can only clash once per round.");
        }

        const { attackerId, moveId, expectedSuccesses } = event.target.dataset;
        const attacker = await fromUuid(attackerId);
        if (!attacker) {
          return ui.notifications.error("The attacking actor doesn't exist anymore");
        }
        if (attacker.id === actor.id) {
          return ui.notifications.error("You can't clash your own attack!");
        }

        const move = await fromUuid(moveId);
        if (!move) {
          return ui.notifications.error("The move to be clashed doesn't exist anymore");
        }
        const clashMove = await showClashDialog(actor, token, attacker, move, expectedSuccesses ?? 1, chatData);
        if (clashMove && game.settings.get('pokerole', 'combatResourceAutomation')) {
          actor.increaseActionCount({ 'system.canClash': false });
          if (!clashMove.system.attributes.unlimitedUses) {
            clashMove.update({ 'system.usedInRound': true });
          }
        }
        break;
      }
      case 'evade': {
        if (!actor.system.canEvade) {
          return ui.notifications.error("You can only evade once per round.");
        }

        const { expectedSuccesses } = event.target.dataset;
        const requiredSuccesses = expectedSuccesses !== undefined ? parseInt(expectedSuccesses, 10) : null;
        const hasEvaded = await successRollAttributeDialog({
          name: 'Evade',
          value: actor.system.derived.evade.value
        }, {
          painPenalty: actor.system.painPenalization.value,
          confusionPenalty: actor.hasAilment('confused'),
          userRank: actor.system.rank
        },
          chatData, !event.shiftKey, requiredSuccesses);

        if (hasEvaded && game.settings.get('pokerole', 'combatResourceAutomation')) {
          actor.increaseActionCount({ 'system.canEvade': false });
        }
        break;
      }
      case 'recoil': {
        const { damageBeforeEffectiveness } = event.target.dataset;
        const { actor: attacker, token } = await getActorAndTokenFromEvent(event);
        if (!(game.user.isGM || message.isAuthor)) {
          return ui.notifications.error("You can't use this item.");
        }
        await rollRecoil(attacker, token, damageBeforeEffectiveness);
        break;
      }
      case 'applyDamage': {
        const updates = JSON.parse(event.target.dataset.damageUpdates);
        await bulkApplyDamageValidated(updates);
        break;
      }
      case 'applyHealing': {
        const { actor, token } = await getActorAndTokenFromEvent(event);
        if (canModifyTokenOrActor(token, actor)) {
          const healAmount = parseInt(event.target.dataset.healAmount, 10) || 0;
          const oldHp = actor.system.hp.value;
          const newHp = Math.min(oldHp + healAmount, actor.system.hp.max);
          await bulkApplyHp([{ actor, token, hp: newHp }]);
          await ChatMessage.implementation.create({
            content: createHealMessage(token?.name ?? actor.name, oldHp, newHp, actor.system.hp.max),
            speaker: ChatMessage.implementation.getSpeaker({ token, actor })
          });
        }
        break;
      }
      case 'ignorePainPenalty': {
        const { actor, token } = await getActorAndTokenFromEvent(event);
        if (canModifyTokenOrActor(token, actor)) {
          if (actor.system.painPenalization.value <= 0) {
            return ui.notifications.warn("There's no more pain left to resist.");
          }
          if (actor.system.will.value < 1) {
            return ui.notifications.error("You don't have any Will left.");
          }
          await actor.update({
            'system.will.value': actor.system.will.value - 1,
            'system.painPenalization.ignored': actor.system.painPenalization.ignored + 1
          });
          await ChatMessage.implementation.create({
            content: 'It toughed through the pain with its Will power!',
            speaker: ChatMessage.implementation.getSpeaker({ token, actor })
          });
        }
        break;
      }
      case 'applyEffect': {
        const { effect: effectJson, mightTargetUser } = event.target.dataset;
        const effect = JSON.parse(effectJson);
        const { actor: attackerActor, token: attackerToken } = await getActorAndTokenFromEvent(event);
        if (effect.affects === 'targets') {
          let targets = game.user.targets.map(t => t.actor)
          await applyEffectToActors(effect, attackerActor, attackerToken, targets, mightTargetUser === 'true');
        } else {
          await applyEffectToActors(effect, attackerActor, attackerToken, actors, mightTargetUser === 'true');
        }

        break;
      }
      case 'chanceDiceRollEffect': {
        const { effectGroup: effectGroupJson, mightTargetUser } = event.target.dataset;
        const effectGroup = JSON.parse(effectGroupJson);
        const { actor: attackerActor, token: attackerToken } = await getActorAndTokenFromEvent(event);

        const flavorText = PokeroleItem.formatChanceDiceGroup(effectGroup);
        let [success, messageData] = await createChanceDiceRollMessageData(effectGroup.condition.amount, flavorText);

        if (success) {
        const dataTokenUuid = attackerToken ? `data-token-uuid="${attackerToken.uuid}"` : '';
        messageData.content += `<div class="pokerole"><div class="action-buttons">`;
        for (let effect of effectGroup.effects) {
          messageData.content += `<button class="chat-action" data-action="applyEffect" data-actor-id="${attackerActor.id}" ${dataTokenUuid} data-effect='${JSON.stringify(effect)}' data-might-target-user="${mightTargetUser}">
  ${PokeroleItem.formatEffect(effect)}
</button>`;
          }
          messageData.content += `</div></div>`;
        }

        await ChatMessage.implementation.create(messageData);
      }
    }
  } catch (e) {
    ui.notifications.error(e.message);
  }
}

async function getActorAndTokenFromEvent(event) {
  const { actorId, tokenUuid } = event.target.dataset;
  const token = tokenUuid ? await fromUuid(tokenUuid) : undefined;
  const actor = token ? token?.actor : await Actor.get(actorId);
  if (!actor) {
    throw new Error("The actor doesn't exist anymore");
  }
  return { actor, token };
}

function createButton(mode, roll, flavor) {
  const a = document.createElement('a');
  // add classes
  a.classList.add('inline-roll');
  a.style.background = '#ddd';
  a.style.padding = '1px 4px';
  a.style.border = '1px solid var(--color-border-dark-tertiary)';
  a.style.borderRadius = '2px';
  a.style.whiteSpace = 'nowrap';
  a.style.wordBreak = 'break-all';
  a.classList.add('inline-roll-cmd');
  a.classList.add('roll');
  // add dataset
  a.dataset.mode = mode;
  a.dataset.func = 'sc';
  a.dataset.flavor = flavor ?? '';
  a.dataset.roll = roll;
  a.innerHTML = `<i class="fas fa-dice-d6"></i>${flavor ?? roll}`;
  return a;
}

async function onInlineRollClick(event) {
  event.preventDefault();
  const a = event.currentTarget;

  const flavor = a.dataset.flavor;

  switch (a.dataset.func) {
    case "sc":
      const roll = a.dataset.roll;

      const token = canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0] : null;
      const actor = token?.actor ?? game.user?.character;
      await successRollFromExpression(a.dataset.roll, actor, { speaker: ChatMessage.implementation.getSpeaker({ token, actor }) });
      break;
      /*
    case "cd":
      const roll = a.dataset.roll;

      const token = canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0] : null;
      const actor = token?.actor ?? game.user?.character;
      await chanceDiceRollFromExpression(a.dataset.roll, actor, { speaker: ChatMessage.implementation.getSpeaker({ token, actor }) });
      break;
      */
  }
}

/** Custom `/sc` and `/cd` chat commands, registered via Foundry's `ChatLog.CHAT_COMMANDS`. */
async function successRollChatCommand(command, match, chatData) {
  const actor = canvas?.tokens.get(chatData.speaker?.token)?.actor ?? game.user?.character;
  await successRollFromExpression(match[2], actor, chatData);
  return false; // successRollFromExpression creates its own chat message - skip the default one
}

async function chanceDiceChatCommand(command, match, chatData) {
  const actor = canvas?.tokens.get(chatData.speaker?.token)?.actor ?? game.user?.character;
  await chanceDiceRollFromExpression(match[2], actor, chatData);
  return false;
}

const ChatLog = foundry.applications.sidebar.tabs.ChatLog;
if (ChatLog.CHAT_COMMANDS) {
  ChatLog.CHAT_COMMANDS.sc = { rgx: /^(\/sc |\/successroll )([^]*)$/i, fn: successRollChatCommand, isRoll: true };
  ChatLog.CHAT_COMMANDS.cd = { rgx: /^(\/cd |\/chancedice )([^]*)$/i, fn: chanceDiceChatCommand, isRoll: true };
} else {
  // V13 Backwards Compatibility: no CHAT_COMMANDS registry before v14 - patch processMessage() instead.
  const originalProcessMessage = ChatLog.prototype.processMessage;
  ChatLog.prototype.processMessage = async function (message) {
    const speaker = ChatMessage.implementation.getSpeaker();
    const chatData = { user: game.user.id, speaker };
    const actor = canvas?.tokens.get(speaker?.token)?.actor ?? game.user?.character;

    const split = message.split(' ');
    const command = split[0]?.toLowerCase();
    if (command === '/sc' || command === '/successroll') {
      if (split.length < 2) throw new Error('This command requires 2 or more parameters');
      return successRollFromExpression(split.slice(1).join(' '), actor, chatData);
    } else if (command === '/cd' || command === '/chancedice') {
      if (split.length < 2) throw new Error('This command requires 2 or more parameters');
      return chanceDiceRollFromExpression(split.slice(1).join(' '), actor, chatData);
    }

    return originalProcessMessage.call(this, message);
  };
}

function successRollEnricher(match, options) {
  const roll = match[1];
  const flavor = match[2];
  return createButton('sc', roll, flavor);
}

/** Disable Active Effects (from https://github.com/foundryvtt/pf2e/blob/c1089180064fcfb64069ad323b2d7d522a768c06/src/module/active-effect.ts) */
export class PokeroleActiveEffect extends ActiveEffect {
  constructor(data, context) {
    // Our own icon-only effects (see effects.mjs) are exempt - everything else stays disabled.
    if (!data.flags?.pokerole?.iconOnly) {
      data.disabled = true;
      data.transfer = false;
    }
    super(data, context);
  }

  /** @override */
  static async createDocuments(data = [], context = {}) {
    const allowed = data.filter(d => d.flags?.pokerole?.iconOnly);
    if (!allowed.length) return [];
    return super.createDocuments(allowed, context);
  }
}
