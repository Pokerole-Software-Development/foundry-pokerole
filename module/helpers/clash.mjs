import { calcDualTypeMatchupScore, calcTripleTypeMatchupScore, getLocalizedPainPenaltiesForSelect, POKEROLE } from "./config.mjs";
import { getEffectivenessText, createSuccessRollMessageData } from "./roll.mjs";
import { PokeroleActor } from "../documents/actor.mjs";

const CLASH_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/clash.html";

/**
 * @param {Actor} actor The defending actor
 * @param {Token | undefined} actorToken The defending actor's token
 * @param {Actor | TokenDocument} attacker The attacking actor
 * @param {Object} attackingMove The move that is being clashed
 * @param {Number} expectedSuccesses The number of successes that must be scored
 * @returns {PokeroleItem | undefined} The move that was used to clash or undefined if the user has canceled the dialog
 */
export async function showClashDialog(actor, actorToken, attacker, attackingMove, expectedSuccesses, chatData) {
  let attackerTokenDoc;
  if (attacker instanceof TokenDocument) {
    attackerTokenDoc = attacker;
    attacker = attackerTokenDoc.actor;
  }
  if (attacker.token) {
    attackerTokenDoc = attacker.token;
  }

  // Only physical and special moves can be used to clash
  let moveList = actor.getLearnedMoves()
    .filter(move => move.system.category !== 'support' && !move.system.attributes.maneuver);

  if (moveList.length === 0) {
    throw new Error("No moves to clash with. At least one physical or special move must be learned to clash.");
  }

  // Only show moves that haven't been used yet in the current round
  moveList = moveList.filter(move => !move.system.usedInRound);
  if (moveList.length === 0) {
    throw new Error("No moves to clash with. All moves eligible for clashing have already been used in the current round.");
  }

  const moves = {};
  for (const move of moveList) {
    moves[move.id] = move.name;
  }

  let defaultPainPenalty = actor.system.painPenalty ?? 'none';

  const content = await renderTemplate(CLASH_DIALOGUE_TEMPLATE, {
    moves,
    painPenalty: defaultPainPenalty,
    painPenalties: getLocalizedPainPenaltiesForSelect(),
    confusionPenalty: actor.hasAilment('confused')
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

  if (!result) return undefined;

  const formElement = result[0].querySelector('form');
  let { moveId, painPenalty, poolBonus, constantBonus, confusionPenalty } = new FormDataExtended(formElement).object;
  constantBonus ??= 0;
  if (confusionPenalty) {
    constantBonus--;
  }

  const move = moveList.find(move => move.id === moveId);
  if (!move) {
    throw new Error('Failed to resolve move');
  }

  const attributeVal = move.system.category === 'special'
    ? actor.system.attributes.special?.value
    : actor.system.attributes.strength?.value;

  const rollCount = poolBonus
    + (attributeVal ?? 0)
    + (actor.system.skills.clash?.value ?? 0);

  const constantBonusWithPainPenalty = constantBonus - POKEROLE.painPenalties[painPenalty];
  const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonusWithPainPenalty);
  let html = messageDataPart.content;

  if (rollResult >= expectedSuccesses) {    
    const damageUpdates = [];

    // Calculate damage to attacker
    let damageAndHtml = calculateClashDamage(move, attacker);
    html += '<hr>' + damageAndHtml.html + '<hr>';
    let damageToAttacker = damageAndHtml.damage;

    if (damageToAttacker > 0) {
      damageUpdates.push({ tokenUuid: attackerTokenDoc?.uuid, actorId: attacker.id, damage: damageToAttacker });
    }

    // Calculate damage to defender
    damageAndHtml = calculateClashDamage(attackingMove, actor);
    html += damageAndHtml.html;
    let damageToDefender = damageAndHtml.damage;
    if (damageToDefender > 0) {
      damageUpdates.push({ tokenUuid: actorToken?.document?.uuid, actorId: actor?.id, damage: damageToDefender });
    }

    html += `<div class="pokerole"><div class="action-buttons"><button class="chat-action" data-action="applyDamage"
      data-damage-updates='${JSON.stringify(damageUpdates)}'>Apply Damage</button></div></div>`;
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
  return move;
}

function calculateClashDamage(move, defender) {
  let matchup = defender.system.hasThirdType ? calcTripleTypeMatchupScore(move.system.type,
    defender.system.type1, defender.system.type2, defender.system.type3)
  :calcDualTypeMatchupScore(move.system.type, defender.system.type1, defender.system.type2);
  let damage = Math.max(1 + matchup, 0);
  let html = '';
  let text = getEffectivenessText(matchup);
  if (text) {
    html += `<p><b>${text}</b></p>`;
  }
  if (damage > 0) {
    html += `<p>${defender.name} took ${damage} damage!</p>`;
  } else {
    html += `<p>${defender.name} didn't take any damage.</p>`;
  }

  return { damage, html };
}
