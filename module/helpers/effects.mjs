import { POKEROLE } from "./config.mjs";

export class TokenEffect {
  /**
   * 
   * @param {String} statusId The status ID
   * @param {String} icon Path to the effect's icon
   * @param {String} tint The tint color applied to the effect
   * @param {boolean} overlay Whether this effect should be displayed as an overlay
   */
  constructor(statusId, icon, tint, overlay = false) {
    this.icon = icon;
    this.tint = tint;
    this.disabled = false;
    this.flags = {
      core: {
        statusId,
        overlay
      }
    };
    this.statuses = new Set(statusId);
  }

  getFlag(scope, flag) {
    return this.flags[scope]?.[flag];
  }
}

/** Register hooks and monkey-patches related to active effects */
export function registerEffectHooks() {
  TokenHUD.prototype._getStatusEffectChoices = function() {
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
      obj[e.icon] = {
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

    registerTokenHudListeners(elem[0], token);
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
      const result = await new Promise(resolve => {
        new Dialog({
          title: 'Inflict condition',
          content: '<p>Select a condition to inflict.</p>',
          buttons: {
            burn1: {
              label: game.i18n.localize(POKEROLE.i18n.ailments.burn1),
              callback: () => resolve('burn1'),
            },
            burn2: {
              label: game.i18n.localize(POKEROLE.i18n.ailments.burn2),
              callback: () => resolve('burn2'),
            },
            burn3: {
              label: game.i18n.localize(POKEROLE.i18n.ailments.burn3),
              callback: () => resolve('burn3'),
            },
          },
          default: 'burn1',
          close: () => resolve(undefined),
        }, { popOutModuleDisable: true }).render(true);
      });
      if (!result) {
        return;
      }

      type = result;
      break;
    }
    case 'poison': {
      const result = await new Promise(resolve => {
        new Dialog({
          title: 'Inflict condition',
          content: '<p>Select a condition to inflict.</p>',
          buttons: {
            poison: {
              label: game.i18n.localize(POKEROLE.i18n.ailments.poison),
              callback: () => resolve('poison'),
            },
            badlyPoisoned: {
              label: game.i18n.localize(POKEROLE.i18n.ailments.badlyPoisoned),
              callback: () => resolve('badlyPoisoned'),
            },
          },
          default: 'poison',
          close: () => resolve(undefined),
        }, { popOutModuleDisable: true }).render(true);
      });
      if (!result) {
        return;
      }

      type = result;
      break;
    }
    case 'infatuated': {
      const result = await new Promise(resolve => {
        new Dialog({
          title: 'Inflict condition',
          content: '<p>Select the actor who has infaturated this Pokémon with the "Select Targets" tool.</p>',
          buttons: {
            apply: {
              label: game.i18n.localize('POKEROLE.Apply'),
              callback: () => {
                const targets = Array.from(game.user.targets);
                if (targets.length === 1) {
                  const uuid = targets[0].document.uuid;
                  if (uuid !== actor.uuid) {
                    resolve(uuid);
                  } else {
                    ui.notifications.error("A Pokémon can't infatuate itself!");
                  }
                } else {
                  ui.notifications.error('Select exactly one token.');
                }
              },
            },
            cancel: {
              label: game.i18n.localize('Cancel'),
              callback: () => resolve(undefined),
            },
          },
          default: 'apply',
          close: () => resolve(undefined),
        }, { popOutModuleDisable: true }).render(true);
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

      const content = await renderTemplate(DISABLE_MOVE_DIALOG_TEMPLATE, {
        moves
      });
      const result = await new Promise(resolve => {
        new Dialog({
          title: 'Disable move',
          content,
          buttons: {
            select: {
              label: 'Select',
              callback: html => resolve(html),
            },
            cancel: {
              label: 'Cancel',
              callback: () => resolve(undefined),
            },
          },
          default: 'select',
          close: () => resolve(undefined),
        }, { popOutModuleDisable: true }).render(true);
      });

      if (!result) return undefined;
      const formElement = result[0].querySelector('form');
      const { moveUuid } = new FormDataExtended(formElement).object;
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