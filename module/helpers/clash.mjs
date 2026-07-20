/** Clash dialog/resolution logic: picking a move to clash with and computing both sides' damage. */

import { calcDualTypeMatchupScore, calcTripleTypeMatchupScore, getConfusionModifier} from "./config.mjs";
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

  let confusionModifier = getConfusionModifier(actor.system.rank) ?? 1;
  const content = await foundry.applications.handlebars.renderTemplate(CLASH_DIALOGUE_TEMPLATE, {
    moves,
    confusionPenalty: actor.hasAilment('confused'),
    confusionModifier
  });

  const formData = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Select a move to clash with' },
    classes: ['standard-form'],
    content,
    buttons: [{
      action: 'clash',
      label: 'Clash',
      default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });

  if (!formData) return undefined;

  let { moveId, poolBonus, constantBonus, confusionPenalty } = formData;
  constantBonus ??= 0;
  if (confusionPenalty) {
    constantBonus -= confusionModifier;
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

  const painPenalty = actor.system.painPenalization.value;
  const constantBonusWithPainPenalty = constantBonus - painPenalty;

  // Damage only depends on type matchups, not the roll - safe to compute once and reuse on reroll.
  const successResultHtml = buildClashSuccessResultHtml(move, attacker, attackerTokenDoc, attackingMove, actor, actorToken);
  const failureResultHtml = '<p>It failed...</p>';

  const rerollContext = { expectedSuccesses, successResultHtml, failureResultHtml };
  const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData,
    constantBonusWithPainPenalty, 'clash', rerollContext, painPenalty, expectedSuccesses);
  const baseHtml = messageDataPart.content;

  const html = baseHtml + ((rollResult >= expectedSuccesses) ? successResultHtml : failureResultHtml);

  const messageData = {
    content: html,
    flavor: `${actor.name} uses ${move.name} to clash ${attacker.name}'s ${attackingMove.name}!`,
    ...chatData
  };

  messageData.flags = messageData.flags || {};
  if (messageDataPart.flags?.[game.system.id]?.rollData) {
    messageData.flags[game.system.id] = { rollData: messageDataPart.flags[game.system.id].rollData };
  }

  const finalMessageData = ChatMessage.implementation.applyRollMode(messageData, game.settings.get('core', 'rollMode'));
  await ChatMessage.implementation.create(finalMessageData);
  return move;
}

/** Builds the damage/Apply Damage HTML for a successful clash (shared with reroll). */
function buildClashSuccessResultHtml(move, attacker, attackerTokenDoc, attackingMove, actor, actorToken) {
  const damageUpdates = [];
  let damageAndHtml = calculateClashDamage(move, attacker);
  let dmgAtt = damageAndHtml.damage;
  let htmlAtt = damageAndHtml.html;
  damageAndHtml = calculateClashDamage(attackingMove, actor);
  let dmgDef = damageAndHtml.damage;
  let htmlDef = damageAndHtml.html;
  let resultHtml = '<hr>' + htmlAtt + '<hr>' + htmlDef;
  if (dmgAtt > 0) {
    damageUpdates.push({ tokenUuid: attackerTokenDoc?.uuid, actorId: attacker.id, damage: dmgAtt });
  }
  if (dmgDef > 0) {
    damageUpdates.push({ tokenUuid: actorToken?.document?.uuid, actorId: actor?.id, damage: dmgDef });
  }
  resultHtml += `<div class="pokerole"><div class="action-buttons"><button class="chat-action" data-action="applyDamage"
    data-damage-updates='${JSON.stringify(damageUpdates)}'>Apply Damage</button></div></div>`;
  return resultHtml;
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