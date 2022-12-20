import { calcDualTypeMatchupScore } from "./config.mjs";
import { bulkApplyHp, getEffectivenessText, createSuccessRollMessageData } from "./roll.mjs";

const CLASH_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/clash.html";

/**
 * @param {Actor} actor The defending actor
 * @param {Token | undefined} actorToken The defending actor's token
 * @param {Actor | TokenDocument} attacker The attacking actor
 * @param {Object} attackingMove The move that is being clashed
 * @param {Number} expectedSuccesses The number of successes that must be scored
 */
export async function showClashDialog(actor, actorToken, attacker, attackingMove, expectedSuccesses, chatData) {
  let attackerTokenDoc;
  if (attacker instanceof TokenDocument) {
    attackerTokenDoc = attacker;
    attacker = attackerTokenDoc.actor;
  }

  const moveList = actor.getLearnedMoves()
    .filter(move => move.system.category !== 'support');

  if (moveList.length === 0) {
    throw new Error("No moves to clash with. At least one physical or special move must be learned to clash.");
  }

  const moves = {};
  for (const move of moveList) {
    moves[move.id] = move.name;
  }

  const content = await renderTemplate(CLASH_DIALOGUE_TEMPLATE, {
    moves
  });

  const result = await new Promise(resolve => {
    new Dialog({
      title: 'Select a move to clash with',
      content,
      buttons: {
        clash: {
          label: 'Clash',
          callback: html => resolve(html),
        },
      },
      default: 'clash',
      close: () => resolve(undefined),
    }, { popOutModuleDisable: true }).render(true);
  });

  if (!result) return;

  const formElement = result[0].querySelector('form');
  const { moveId, applyDamage, poolBonus, constantBonus } = new FormDataExtended(formElement).object;
  const move = moveList.find(move => move.id === moveId);
  if (!move) {
    throw new Error('Failed to resolve move');
  }

  const attributeVal = move.system.category === 'special'
    ? actor.system.attributes.special?.value
    : actor.system.attributes.strength?.value;
  const rollCount = poolBonus + (attributeVal ?? 0) + (actor.system.skills.clash?.value ?? 0);

  const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus);
  let html = messageDataPart.content;

  if (rollResult >= expectedSuccesses) {
    const hpUpdates = [];
    
    // Calculate damage to attacker
    let damageAndHtml = calculateClashDamage(move, attacker);
    html += '<hr>' + damageAndHtml.html + '<hr>';
    if (applyDamage) {
      const oldHp = attacker.system.hp.value;
      const hp = Math.max(oldHp - damageAndHtml.damage, 0);
      hpUpdates.push({ actor: attacker, token: attackerTokenDoc, hp });
      if (hp === 0 && oldHp > 0) {
        html += `<p><b>${attacker.name} fainted!</b></p>`;
      }
    }
    damageAndHtml = calculateClashDamage(attackingMove, actor);
    html += damageAndHtml.html;
    if (applyDamage) {
      const oldHp = actor.system.hp.value;
      const hp = Math.max(oldHp - damageAndHtml.damage, 0);
      hpUpdates.push({ actor, token: actorToken?.document, hp });
      if (hp === 0 && oldHp > 0) {
        html += `<p><b>${actor.name} fainted!</b></p>`;
      }
      await bulkApplyHp(hpUpdates);
    }
  } else {
    html += '<p>It failed...</p>';
  }

  let messageData = {
    content: html,
    flavor: `${actor.name} uses ${move.name} to clash ${attacker.name}'s ${attackingMove.name}!`,
    ...chatData
  };

  messageData = ChatMessage.implementation.applyRollMode(messageData, game.settings.get('core', 'rollMode'));
  await ChatMessage.implementation.create(messageData);
}

function calculateClashDamage(move, defender) {
  let matchup = calcDualTypeMatchupScore(move.system.type,
    defender.system.type1, defender.system.type2);
  let damage = Math.max(1 + matchup, 1);
  if (matchup === -Infinity) { // Immune
    damage = 0;
  }
  let html = '';
  let text = getEffectivenessText(matchup);
  if (text) {
    html += `<p><b>${text}</b></p>`;
  }
  if (damage > 0) {
    html += `<p>${defender.name} took ${damage} damage!</p>`;
  }

  return { damage, html };
}
