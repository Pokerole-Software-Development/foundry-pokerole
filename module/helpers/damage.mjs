/** HP/damage application helpers shared by chat-card buttons and the native token HP bar. */

import { computePainPenaltyLevel } from "./config.mjs";

/**
 * Helper for creating chat messages related to healing
 * @param {string} name The actor name
 * @param {number} oldHp 
 * @param {number} newHp 
 * @param {number} maxHp
 * @returns {string} Output HTML
 */
export function createHealMessage(name, oldHp, newHp, maxHp) {
  const amount = newHp - oldHp;
  if (oldHp >= maxHp) {
    return `<p>${name} already has full HP.</p>`;
  } else if (amount === 0) {
    return `<p>${name} didn't heal any HP.</p>`;
  } else {
    return `<p>${name} healed ${amount} HP.</p>`;
  }
}

/**
 * @param {Array<{ actor?: Actor, token?: TokenDocument, hp: number }>} healthUpdates 
 */
export async function bulkApplyHp(healthUpdates) {
  const actorUpdates = [];
  const tokenUpdates = [];

  for (const { actor, token, hp } of healthUpdates) {
    if (token) {
      if (token.actorLink) {
        // If the token is linked to the actor, update the actor itself
        actorUpdates.push({
          _id: token.actorId,
          'system.hp.value': hp
        });
      } else {
        // Otherwise, update the override data in the token
        tokenUpdates.push(token.actor.update({
          'system.hp.value': hp,
        }));
      }
    } else if (actor) {
      actorUpdates.push({
        _id: actor.id,
        'system.hp.value': hp
      });
    }
  }

  const promises = [];
  if (actorUpdates.length > 0) {
    promises.push(Actor.updateDocuments(actorUpdates));
  }
  if (tokenUpdates.length > 0) {
    promises.concat(tokenUpdates);
  }
  await Promise.all(promises);
}

/**
 * Applies HP-decrease side effects (fainted, Pain Penalty crossing) and returns the chat HTML - shared by bulkApplyDamageValidated and modifyTokenAttribute.
 * @param {TokenDocument | undefined} token
 * @param {PokeroleActor} actor
 * @param {string} name
 * @param {number} damage
 * @param {number} oldHp
 * @param {number} newHp
 * @param {number} maxHp
 * @returns {Promise<string>} Chat message HTML
 */
export async function applyDamageEffectsHtml(token, actor, name, damage, oldHp, newHp, maxHp) {
  const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';

  let html = `<p>Applied ${damage} damage to ${name}.</p>`;
  if (oldHp > 0) {
    if (newHp === 0) {
      // Handle fainting
      html += `<p><b>${name} fainted!</b></p>`;
      await (token?.actor ?? actor).applyAilment('fainted');

      // Refresh token overlay effects
      token?.object?.drawEffects();

      // Refresh status effect HUD
      if (canvas.hud?.token._statusEffects) {
        canvas.tokens?.hud?.refreshStatusIcons();
      }
    } else {
      const oldLevel = computePainPenaltyLevel(oldHp, maxHp);
      const newLevel = computePainPenaltyLevel(newHp, maxHp);
      if (newLevel > oldLevel) {
        html += `<p><b>${name} is in pain! (Pain Penalization: -${newLevel} SCs)</b></p>
  <div class="action-buttons">
    <button class="chat-action" data-action="ignorePainPenalty"
        data-actor-id="${actor.id}" ${dataTokenUuid}>
      Spend 1 Will to Resist 1 Point of Pain
    </button>
  </div>`;
      }
    }
  }
  return html;
}

/**
 * Applies damage to each actor, showing a friendly error if the user lacks permission.
 * @param {Array<{ actorId?: string, tokenUuid?: string, damage: number }>} damageUpdates
 */
export async function bulkApplyDamageValidated(damageUpdates) {
  const hpUpdates = [];

  let html = '<div class="pokerole">';

  for (const update of damageUpdates) {
    const token = update.tokenUuid ? await fromUuid(update.tokenUuid) : undefined;
    const actor = update.actorId ? Actor.implementation.get(update.actorId) : undefined;
    if (!token && !actor) {
      return ui.notifications.error("The actor to apply damage to doesn't exist anymore.");
    }

    const name = token?.name ?? actor?.name;

    if (!canModifyTokenOrActor(token, actor)) {
      return;
    }

    const maxHp = token?.actor?.system?.hp?.max ?? actor.system.hp.max;
    const oldHp = token?.actor?.system?.hp?.value ?? actor.system.hp.value;
    const newHp = Math.max(oldHp - update.damage, 0);
    hpUpdates.push({ token, actor, hp: newHp });

    html += await applyDamageEffectsHtml(token, actor, name, update.damage, oldHp, newHp, maxHp);
  }
  html += '</div>';

  await bulkApplyHp(hpUpdates);

  let chatData = {
    content: html
  };
  await ChatMessage.implementation.create(chatData);
}

/**
 * Checks whether the given token or actor can be modified and shows a notification window if not.
 * @param {TokenDocument | undefined} token 
 * @param {PokeroleActor | undefined} actor 
 * @returns {boolean} Whether the actor or token can be modified
 */
export async function canModifyTokenOrActor(token, actor) {
  const name = token?.name ?? actor?.name;

  const allowedToModify = (!token || token.canUserModify(game.user,"update")) && (!actor || actor.canUserModify(game.user,"update"));

  if (!allowedToModify) {
    ui.notifications.error(`You don't have permission to modify ${name}, `
      + "ask the GM or the owning player to click this button instead.");
    return false;
  }
  return true;
}