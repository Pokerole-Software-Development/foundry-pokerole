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
        tokenUpdates.push({
          _id: token.id,
          'actorData.system.hp.value': hp
        });
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
    promises.push(canvas.scene.updateEmbeddedDocuments('Token', tokenUpdates));
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

  let html = '';

  for (const update of damageUpdates) {
    const token = update.tokenUuid ? await fromUuid(update.tokenUuid) : undefined;
    const actor = update.actorId ? Actor.implementation.get(update.actorId) : undefined;
    if (!token && !actor) {
      return ui.notifications.error("The actor to apply damage to doesn't exist anymore.");
    }

    const name = token?.name ?? actor?.name;

    const allowedToModify = (!token || token.canUserModify(game.user)) && (!actor || actor.canUserModify(game.user));
    if (!allowedToModify) {
      return ui.notifications.error(`You don't have permission to apply damage to ${name}, `
        + "ask the GM or the owning player to click this button instead.");
    }

    const oldHp = token?.actorData?.system?.hp?.value ?? actor.system.hp.value;
    const newHp = Math.max(oldHp - update.damage, 0);
    hpUpdates.push({ token, actor, hp: newHp });

    html += `<p>Applied ${update.damage} damage to ${name}.</p>`;
    if (newHp === 0 && oldHp > 0) {
      html += `<p><b>${name} fainted!</b></p>`;
      await (token?.actor ?? actor).applyAilment('fainted');

      // Refresh token overlay effects
      token?.object?.drawEffects();

      // Refresh status effect HUD
      if (canvas.hud?.token._statusEffects) {
        canvas.tokens?.hud?.refreshStatusIcons();
      }
    }
  }

  await bulkApplyHp(hpUpdates);

  let chatData = {
    content: html
  };
  await ChatMessage.implementation.create(chatData);
}
