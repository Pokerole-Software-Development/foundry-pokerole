import { POKEROLE } from "./config.mjs";

export class TokenEffect {
  /**
   * 
   * @param {String} statusId The status ID
   * @param {String} img Path to the effect's icon
   * @param {String} tint The tint color applied to the effect
   * @param {boolean} overlay Whether this effect should be displayed as an overlay
   */
  constructor(statusId, img, tint, overlay = false, tooltip) {
    this.img = img;
    this.tint = tint;
    this.disabled = false;
    this.flags = {
      core: {
        statusId,
        overlay
      }
    };
    this.name = game.i18n.localize(POKEROLE.i18n.ailments[statusId]) ?? statusId;
    this.tooltip = tooltip;
    this.statuses = new Set(statusId);
  }

  getFlag(scope, flag) {
    return this.flags[scope]?.[flag];
  }

  // Backwards compatibility with FoundryVTT v11
  get icon() {
    return this.img;
  }
}

/**
 * ActiveEffect data for a real, but mechanically-inert, effect that exists only so
 * Foundry v14's Token#_drawEffects() (which reads Actor#appliedEffects) draws an icon
 * for this ailment. The actual stat impact is still computed by PokeroleActor#_applyEffects().
 * @param {{type: string}} ailment An entry from actor.system.ailments
 */
export function buildAilmentIconEffectData(ailment) {
  const def = POKEROLE.getAilments()[ailment.type];
  return {
    name: def.label ?? ailment.type,
    img: def.icon,
    tint: def.tint,
    changes: [],
    disabled: false,
    transfer: false,
    statuses: [ailment.type],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    // Token#_drawEffects() reads flags.core.overlay directly, not CONFIG.statusEffects.overlay.
    flags: { core: { overlay: !!def.overlay }, pokerole: { iconOnly: true, iconKey: `ailment:${ailment.type}` } }
  };
}

/**
 * ActiveEffect data for a real, but mechanically-inert, effect that shows the icon of an
 * active custom 'effect' Item on the token. See buildAilmentIconEffectData() for why.
 * @param {PokeroleItem} item An enabled+visible Item of type 'effect'
 */
export function buildCustomEffectIconData(item) {
  return {
    name: item.name,
    img: item.img,
    tint: '#ffffff',
    changes: [],
    disabled: false,
    transfer: false,
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    flags: { pokerole: { iconOnly: true, iconKey: `effect:${item.id}` } }
  };
}

// Foundry's ActiveEffect#tint is a ColorField that only accepts 6-digit hex (no alpha channel),
// unlike the old TokenEffect.tint (a plain property with no validation) - trimmed accordingly.
const STAT_CHANGE_NEGATIVE_TINTS = ["#AAAAAA", "#ffae00", "#ff7b00", "#ff0000"];
const STAT_CHANGE_POSITIVE_TINTS = ["#AAAAAA", "#0d47e7", "#18a4f7", "#29ecff"];

/**
 * ActiveEffect data for a real, but mechanically-inert, effect that shows a buff/debuff icon
 * for a non-zero statChanges/accuracyMod entry on the token (only used when the 'autoBuff'
 * setting is enabled). See buildAilmentIconEffectData() for why this needs to be a real effect.
 * @param {string} key 'strength'|'dexterity'|'special'|'def'|'spDef'|'accuracyMod'
 * @param {number} value The computed statChanges[key].value (or accuracyMod.value), non-zero
 */
export function buildStatChangeIconData(key, value) {
  const isBuff = value > 0;
  const magnitude = Math.min(Math.abs(value), 3);
  const label = game.i18n.localize(POKEROLE.i18n.effectStats[key] ?? "Strange");
  const tints = isBuff ? STAT_CHANGE_POSITIVE_TINTS : STAT_CHANGE_NEGATIVE_TINTS;
  return {
    name: `${label} ${isBuff ? "Buff" : "Debuff"}`,
    img: `systems/pokerole/images/icons/combat/${key}_${isBuff ? "increase" : "decrease"}.svg`,
    tint: tints[magnitude],
    changes: [],
    disabled: false,
    transfer: false,
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    flags: { pokerole: { iconOnly: true, iconKey: `statChange:${key}` } }
  };
}

/**
 * ActiveEffect data for a real, but mechanically-inert, effect that shows the Pain Penalty
 * level/ignored state on the token. Only meant to be shown while level > 0 - see
 * PokeroleActor#_doSyncIconEffects().
 * @param {number} level Raw HP-derived Pain Penalty level (1-3)
 * @param {number} ignored How many of those points are currently covered by spent Willpower (0-level)
 */
export function buildPainPenaltyIconData(level, ignored) {
  const effective = level - ignored;
  const tooltip = ignored > 0
    ? game.i18n.format("POKEROLE.PainPenaltyTooltipIgnored", { effective, ignored })
    : game.i18n.format("POKEROLE.PainPenaltyTooltip", { effective });
  return {
    name: tooltip,
    img: `systems/pokerole/images/icons/combat/pain-penalty/${level}-${ignored}.svg`,
    tint: '#ffffff',
    changes: [],
    disabled: false,
    transfer: false,
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    flags: { pokerole: { iconOnly: true, iconKey: 'painPenalty' } }
  };
}

/** Register hooks and monkey-patches related to active effects */
export function registerEffectHooks() {
  foundry.applications.hud.TokenHUD.prototype._getStatusEffectChoices = function() {
    const token = this.object;
    const actor = token?.actor;

    const allAilments = POKEROLE.getAilments();
    const displayedAilments = [
      { id: 'fainted', ...allAilments.fainted },
      { id: 'paralysis', ...allAilments.paralysis },
      { id: 'frozen', ...allAilments.frozen },
      { id: 'poison', ...allAilments.poison },
      { id: 'sleep', ...allAilments.sleep },
      { id: 'burn', ...allAilments.burn1 },
      { id: 'flinch', ...allAilments.flinch },
      { id: 'confused', ...allAilments.confused },
      { id: 'disabled', ...allAilments.disabled },
      { id: 'flinch', ...allAilments.flinch },
      { id: 'infatuated', ...allAilments.infatuated },
    ];
    return displayedAilments.reduce((obj, e) => {
      let isActive = false;
      if (e.id === 'burn') {
        isActive = actor?.isBurned() ?? false;
      } else if (e.id === 'poison') {
        isActive = actor?.isPoisoned() ?? false;
      } else {
        isActive = actor?.hasAilment(e.id) ?? false;
      }

      const isOverlay = (e.overlay && isActive) ?? false;

      obj[e.id] = {
        id: e.id ?? '',
        title: e.label ? game.i18n.localize(e.label) : null,
        src: e.icon,
        isActive,
        isOverlay,
        cssClass: [
          isActive ? 'active' : null,
          isOverlay ? 'overlay' : null
        ].filterJoin(' ')
      };

      return obj;
    }, {});
  };

  Hooks.on('renderTokenHUD', (_, elem, data) => {
    const token = canvas.tokens.get(data._id);
    if (!token) return;
    registerTokenHudListeners(elem, token);
  });
}

/**
 * @param {HTMLElement} html The container element passed to the `renderTokenHUD` hook
 * @param {Token} token The active token
 */
function registerTokenHudListeners(html, token) {
  const effectControls = html.querySelectorAll(".effect-control");
  for (const control of effectControls) {
    control.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const iconElem = event.currentTarget;
      const type = iconElem.dataset?.statusId;

      const actor = token.actor;
      if (!actor || !type) return;

      if (type === 'burn' && actor.isBurned()) {
        if (actor.hasAilment('burn1')) {
          await actor.removeAilment('burn1');
        } else if (actor.hasAilment('burn2')) {
          await actor.removeAilment('burn2');
        } else {
          await actor.removeAilment('burn3');
        }
      } else if (type === 'poison' && actor.isPoisoned()) {
        if (actor.hasAilment('badlyPoisoned')) {
          await actor.removeAilment('badlyPoisoned');
        } else {
          await actor.removeAilment('poison');
        }
      } else if (actor.hasAilment(type)) {
        await actor.removeAilment(type);
      } else {
        await addAilmentWithDialog(actor, type);
      }
      token?.drawEffects();
      await canvas.hud?.token.render();
    });
  }
}

const DISABLE_MOVE_DIALOG_TEMPLATE = "systems/pokerole/templates/chat/disable-move.html";

/**
 * Adds an ailment to an actor, showing a dialog if additional data is required
 * @param {PokeroleActor} actor The actor to add the ailment to
 * @param {string} category The ailment category (e.g. "burn")
 */
export async function addAilmentWithDialog(actor, category) {
  let type = category;
  const options = {};
  switch (category) {
    case 'burn': {
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Inflict condition' },
        content: '<p>Select a condition to inflict.</p>',
        buttons: [
          { action: 'burn1', label: game.i18n.localize(POKEROLE.i18n.ailments.burn1), default: true, callback: () => 'burn1' },
          { action: 'burn2', label: game.i18n.localize(POKEROLE.i18n.ailments.burn2), callback: () => 'burn2' },
          { action: 'burn3', label: game.i18n.localize(POKEROLE.i18n.ailments.burn3), callback: () => 'burn3' },
        ],
        rejectClose: false
      });
      if (!result) {
        return;
      }

      type = result;
      break;
    }
    case 'poison': {
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Inflict condition' },
        content: '<p>Select a condition to inflict.</p>',
        buttons: [
          { action: 'poison', label: game.i18n.localize(POKEROLE.i18n.ailments.poison), default: true, callback: () => 'poison' },
          { action: 'badlyPoisoned', label: game.i18n.localize(POKEROLE.i18n.ailments.badlyPoisoned), callback: () => 'badlyPoisoned' },
        ],
        rejectClose: false
      });
      if (!result) {
        return;
      }

      type = result;
      break;
    }
    case 'infatuated': {
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Inflict condition' },
        content: '<p>Select the actor who has infaturated this Pokémon with the "Select Targets" tool.</p>',
        buttons: [
          {
            action: 'apply',
            label: game.i18n.localize('POKEROLE.Apply'),
            default: true,
            // NOTE: must return `false` (not leave this undefined) in the error paths - DialogV2
            // falls back to the button's action id ("apply", a truthy string) if the callback
            // returns undefined, which would defeat the `if (!result)` check below.
            callback: () => {
              const targets = Array.from(game.user.targets);
              if (targets.length === 1) {
                const uuid = targets[0].document.uuid;
                if (uuid !== actor.uuid) {
                  return uuid;
                } else {
                  ui.notifications.error("A Pokémon can't infatuate itself!");
                  return false;
                }
              } else {
                ui.notifications.error('Select exactly one token.');
                return false;
              }
            },
          },
          {
            action: 'cancel',
            label: game.i18n.localize('Cancel'),
            callback: () => false,
          },
        ],
        rejectClose: false
      });
      if (!result) {
        return undefined;
      }
      options.inflictedByUuid = result;
      break;
    }
    case 'disabled': {
      const moveList = actor.getLearnedMoves();
      if (moveList.length === 0) {
        return ui.notifications.error("This Pokémon hasn't learned any moves to disable.");
      }
      const moves = {};
      for (const move of moveList) {
        moves[move.uuid] = move.name;
      }

      const content = await foundry.applications.handlebars.renderTemplate(DISABLE_MOVE_DIALOG_TEMPLATE, {
        moves
      });
      const formData = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Disable move' },
        classes: ['standard-form'],
        content,
        buttons: [
          {
            action: 'select',
            label: 'Select',
            default: true,
            callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
          },
          {
            action: 'cancel',
            label: 'Cancel',
            callback: () => false,
          },
        ],
        rejectClose: false
      });

      if (!formData) return undefined;
      const { moveUuid } = formData;
      options.moveUuid = moveUuid;

      break;
    }
  }
  if (isActorResistantAgainstAilment(actor, type)) {
    return ui.notifications.error("The Pokémon is immune to this status condition!");
  }

  await actor.applyAilment(type, options);
  return type;
}

/**
 * Check whether an actor is resistant to a given ailment
 * @param {PokeroleActor} actor The actor who would suffer from the ailment
 * @param {string} ailment The ailment type (e.g. "burn1")
 */
export function isActorResistantAgainstAilment(actor, ailment) {
  const type1 = POKEROLE.typeMatchups[actor.system.type1] ?? POKEROLE.typeMatchups.none;
  const type2 = POKEROLE.typeMatchups[actor.system.type2] ?? POKEROLE.typeMatchups.none;
  const type3 = POKEROLE.typeMatchups[actor.system.type3] ?? POKEROLE.typeMatchups.none;

  return type1.ailmentImmunities.includes(ailment)
      || type2.ailmentImmunities.includes(ailment)
      || (type3.ailmentImmunities.includes(ailment) && actor.system.hasThirdType);
}

/**
 * Applies an effect to a list of actors.
 * @param {object} effect The effect data
 * @param {object} attackerActor The actor that inflicts the effect
 * @param {object} attackerToken The token that inflicts the effect
 * @param {boolean} mightTargetUser Whether the user is a valid target for the effect
 * @param {Array<object>} actors The list of target actors.
 * @returns {Promise<void>} A promise that resolves when the effect is applied.
 */
export async function applyEffectToActors(effect, attackerActor, attackerToken, actors, mightTargetUser) {
  if (actors.length === 0) {
    return ui.notifications.warn("Choose an actor to apply the effect to.");
  }

  for (const actor of actors) {
    // Check if the target is correct
    if (effect.affects === 'user' && actor !== attackerActor) {
      ui.notifications.error(`You can't apply this effect to ${actor.name}: it only affects the user.`);
      continue;
    }

    if (effect.affects === 'targets' && actor === attackerActor && !mightTargetUser) {
      ui.notifications.error(`You can't apply this effect to ${actor.name}: it doesn't affect the user.`);
      continue;
    }

    if (isActorResistantAgainstAilment(actor, effect.ailment)) {
      ui.notifications.warn(`${actor.name} is immune against this status condition.`);
      continue;
    }

    switch (effect.type) {
      case 'ailment':
        if (actor.hasAilment(effect.ailment)) {
          ui.notifications.warn(`${actor.name} already has this status condition.`);
          continue;
        }

        switch (effect.ailment) {
          case 'disabled':
            if (!await addAilmentWithDialog(actor, effect.ailment)) {
              return;
            }
            break;
          case 'infatuated':
            await actor.applyAilment(effect.ailment, { inflictedByUuid: attackerActor.uuid });
            break;
          default:
            await actor.applyAilment(effect.ailment);
            break;
        }

        const ailmentName = game.i18n.localize(POKEROLE.i18n.ailments[effect.ailment]);
        await ChatMessage.implementation.create({
          content: `Applied status condition ${ailmentName} to ${actor.name}.`,
          speaker: ChatMessage.implementation.getSpeaker({ attackerToken, attackerActor })
        });
        break;

      case 'statChange':
        if (!await actor.applyStatChange(effect.stat, effect.amount)) {
          ui.notifications.warn(`The effect was not applied because the targeted stat is already at the level the effect would have altered it to.`);
          continue;
        }

        const statName = game.i18n.localize(POKEROLE.i18n.effectStats[effect.stat]);
        const change = effect.amount > 0 ? 'rose' : 'fell';

        let message = `${actor.name}'s ${statName} ${change}`;
        if (Math.abs(effect.amount) > 1) {
          message += ` by ${Math.abs(effect.amount)}`;
        }
        message += '!';

        await ChatMessage.implementation.create({
          content: `${actor.name}'s ${statName} ${change} by ${Math.abs(effect.amount)}!`,
          speaker: ChatMessage.implementation.getSpeaker({ attackerToken, attackerActor })
        });
        break;
    }
  }
}