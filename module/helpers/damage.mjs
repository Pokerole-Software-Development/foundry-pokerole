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
  if (oldHp + amount >= maxHp) {
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
 * Attempt to apply damage to each actor, providing a friendly error if
 * the user doesn't have permission to do so.
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

    const maxHp = token?.actorData?.system?.hp?.max ?? actor.system.hp.max;
    const oldHp = token?.actorData?.system?.hp?.value ?? actor.system.hp.value;
    const newHp = Math.max(oldHp - update.damage, 0);
    hpUpdates.push({ token, actor, hp: newHp });

    const painPenalty = token?.actorData?.system?.painPenalty ?? actor.system.painPenalty;
    const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';

    html += `<p>Applied ${update.damage} damage to ${name}.</p>`;
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
        if (newHp < maxHp / 2 && oldHp > maxHp / 2 && painPenalty !== 'minus1') {
          // Pain penalty 1
          html += `<p><b>${name} is in pain!</b></p>
  <div class="action-buttons">
    <button class="chat-action" data-action="painPenalty" data-pain-penalty='minus1'
        data-actor-id="${actor.id}" ${dataTokenUuid}>
      Apply Pain Penalization (-1 successes)
    </button>
    <button class="chat-action" data-action="ignorePainPenalty"
        data-actor-id="${actor.id}" ${dataTokenUuid}>
        Spend 1 Will to Tough It Out
    </button>
  </div>`;
        }
        if (newHp === 1 && oldHp !== 1 && painPenalty !== 'minus2') {
          // Pain penalty 2
          html += `<p><b>${name} is about to faint!</b></p>
  <div class="action-buttons">
    <button class="chat-action" data-action="painPenalty" data-pain-penalty='minus2'
        data-actor-id="${actor.id}" ${dataTokenUuid}>
      Apply Pain Penalization (-2 successes)
    </button>
    <button class="chat-action" data-action="ignorePainPenalty"
        data-actor-id="${actor.id}" ${dataTokenUuid}>
      Spend 1 Will to Tough It Out
    </button>
  </div>`;
        }
      }
    }
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
  const allowedToModify = (!token || token.canUserModify(game.user)) && (!actor || actor.canUserModify(game.user));
  if (!allowedToModify) {
    ui.notifications.error(`You don't have permission to modify ${name}, `
      + "ask the GM or the owning player to click this button instead.");
    return false;
  }
  return true;
}