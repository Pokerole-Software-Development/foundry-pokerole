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
