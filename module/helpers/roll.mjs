/**
 * Core dice-rolling engine: attribute/skill/accuracy/damage resolution, reroll handling, and the
 * chat-message HTML builders shared across all roll types.
 */

import { PokeroleItem } from "../documents/item.mjs";
import {
  getEffectiveTypeMatchupScore,
  getConfusionModifier,
  getRankDiceCount,
  buildDamagePoolFormulaTooltip,
  POKEROLE
} from "./config.mjs";
import { bulkApplyDamageValidated } from "./damage.mjs";

/**
 * Utility function to parse the expression, calculate the roll count, and extract the comment.
 * @param {String} expr Expression such as `Dexterity+Alert+2`
 * @param {Actor | undefined} actor The actor to roll as.
 * @returns {Object} An object containing the calculated roll count and the comment
 */
async function parseExpressionForRollCountAndComment(expr, actor) {
  expr = expr.trim();

  let [exprWithoutComment, comment] = expr.split('#');
  comment = comment?.trim();

  let exprSplit = exprWithoutComment.split('+');
  let rollCount = 0;
  for (let i = 0; i < exprSplit.length; i++) {
    let statName = exprSplit[i].trim().toLowerCase();
    let statInt = parseInt(statName);
    if (!isNaN(statInt)) {
      rollCount += statInt;
      continue;
    }

    if (!actor) {
      throw new Error('No actor selected');
    }

    for (let [key, value] of Object.entries({ ...actor.getIntrinsicOrSocialAttributes(), ...actor.system.skills })) {
      if (key.toLowerCase() == statName) {
        rollCount += value.value;
      }
    }
  }

  return { rollCount, comment: comment ?? exprWithoutComment };
}

/**
 * Success roll from a chat expression
 * @param {String} expr Expression such as `Dexterity+Alert+2`
 * @param {Actor | undefined} actor The actor to roll as.
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @returns
 */
export async function successRollFromExpression(expr, actor, chatData) {
  const { rollCount, comment } = await parseExpressionForRollCountAndComment(expr, actor);
  return successRoll(rollCount, comment, chatData);
}

/**
 * Chance dice roll from a chat expression
 * @param {String} expr Expression such as `Dexterity+Alert+2`
 * @param {Actor | undefined} actor The actor to roll as.
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @returns
 */
export async function chanceDiceRollFromExpression(expr, actor, chatData) {
  const { rollCount, comment } = await parseExpressionForRollCountAndComment(expr, actor);
  return chanceDiceRoll(rollCount, comment, chatData);
}

// attribute = { name: String, value: number };
export async function successRollAttribute(attribute, chatData) {
  return successRoll(attribute.value, attribute.name, chatData);
}

// attribute, skill = { name: String, value: number };
export async function successRollAttributeSkill(attribute, skill, chatData, poolModifier = 0, constantModifier = 0, rerollType = null, painPenalty = 0) {
  if (poolModifier != 0) {
    let sign = poolModifier >= 0 ? '+' : '';
    return successRoll(attribute.value + skill.value + poolModifier, `${attribute.name}+${skill.name}${sign}${poolModifier}`, chatData, constantModifier, rerollType, painPenalty);
  } else {
    return successRoll(attribute.value + skill.value, `${attribute.name}+${skill.name}`, chatData, constantModifier, rerollType, painPenalty);
  }
}

/** Whether a roll message still has rerolls left, per the configurable per-message limit. */
export function hasRerollsRemaining(rollData) {
  return (rollData.rerollCount ?? 0) < game.settings.get('pokerole', 'maxRerollsPerMessage');
}

/**
 * Rerolls up to `count` failed dice in an existing roll message (skill/attribute/accuracy/clash/shared-pool damage).
 * @param {ChatMessage} message
 * @param {number} count
 */
export async function rerollFailedDice(message, count) {
  const rollData = message.getFlag(game.system.id, 'rollData');
  if (!rollData || !hasRerollsRemaining(rollData)) return;

  const { rolls, modifier, type, context, painPenalty = 0, requiredSuccesses = null } = rollData;
  const newRerollCount = (rollData.rerollCount ?? 0) + 1;
  const failedCount = rolls.filter(roll => roll < 4).length;
  count = Math.max(0, Math.min(count, failedCount));
  if (count === 0) return;

  const rollsRE = await rollDice(count);

  if (type === 'damageShared') {
    // Dice are shared across targets by array position, so a reroll replaces dice in place (not appended); rerolledIndices lets the display still show the old crossed-out value next to the new one.
    const updatedRolls = [...rolls];
    const rerolledIndices = [];
    let rerollIndex = 0;
    for (let i = 0; i < updatedRolls.length && rerollIndex < rollsRE.length; i++) {
      if (updatedRolls[i] < 4) {
        updatedRolls[i] = rollsRE[rerollIndex];
        rerolledIndices.push(i);
        rerollIndex++;
      }
    }
    const rerollInfo = { originalRolls: rolls, rerolledIndices, rerollCount: newRerollCount };
    const content = await buildDamageSharedRerollContent(updatedRolls, modifier, painPenalty, context, rerollInfo);
    await animateDiceRoll(rollsRE, message.whisper);
    await message.update({
      content,
      [`flags.${game.system.id}.rollData`]: { ...rollData, rolls: updatedRolls, rerollCount: newRerollCount }
    });
    return;
  }

  // Replace the failed dice in place for the array we persist, so a later reroll's
  // failed-dice count only ever counts dice that are genuinely still failing (not the
  // same old failures again, which would otherwise let the pool grow every round).
  const updatedRolls = [...rolls];
  let rerollIndex = 0;
  for (let i = 0; i < updatedRolls.length && rerollIndex < rollsRE.length; i++) {
    if (updatedRolls[i] < 4) {
      updatedRolls[i] = rollsRE[rerollIndex];
      rerollIndex++;
    }
  }
  const successCount = Math.min(updatedRolls.filter(roll => roll > 3).length, updatedRolls.length) + modifier;

  const stylingFunction = roll => roll > 3 ? 'max' : '';
  const diceHtml = buildDiceHtml(rolls, stylingFunction, rollsRE);
  const modifierNoteHtml = buildModifierNoteHtml(modifier, painPenalty);

  let totalsText = `${successCount} Total Successes (${count} Reroll${count === 1 ? '' : 's'})`;
  if (requiredSuccesses !== null) {
    totalsText += ` (${requiredSuccesses} required)`;
  }
  const totalsLineHtml = `<p><b>${totalsText}</b></p><p><i>Rerolled (${newRerollCount})</i></p>`;

  let content = diceHtml + modifierNoteHtml + totalsLineHtml;
  if (type === 'accuracy') {
    content += await buildAccuracyRerollContent(successCount, context);
  } else if (type === 'clash') {
    const { expectedSuccesses, successResultHtml, failureResultHtml } = context;
    content += successCount >= expectedSuccesses ? successResultHtml : failureResultHtml;
  } else if (type === 'evade') {
    content += buildEvadeResultHtml(successCount, requiredSuccesses, message.speaker?.alias);
  }

  await animateDiceRoll(rollsRE, message.whisper);

  await message.update({
    content,
    [`flags.${game.system.id}.rollData`]: {
      ...rollData,
      rolls: updatedRolls,
      rerollCount: newRerollCount
    }
  });
}

const REROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/reroll.html";

/**
 * Chat message context menu callback: asks how many failed dice to reroll, then applies it.
 * @param {HTMLElement} li The chat message's list item element
 */
export async function ReSuccessRoll(li) {
  const message = game.messages.get(li.getAttribute('data-message-id'));
  const rollData = message?.getFlag(game.system.id, 'rollData');
  if (!rollData || !hasRerollsRemaining(rollData)) return;

  if (rollData.type === 'damage') {
    return rerollDamageDialog(message, rollData);
  }

  const failedCount = rollData.rolls.filter(roll => roll < 4).length;
  if (failedCount === 0) {
    return ui.notifications.warn("There are no failed dice to reroll.");
  }

  const content = await foundry.applications.handlebars.renderTemplate(REROLL_DIALOGUE_TEMPLATE, { failedCount });

  const formData = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Reroll Failed Dice' },
    classes: ['standard-form', 'pokerole', 'reroll-dialog'],
    position: { width: 340 },
    content,
    buttons: [{
      action: 'reroll',
      label: 'Reroll',
      default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });
  if (!formData) return;

  const count = parseInt(formData.count, 10);
  if (!Number.isFinite(count) || count <= 0) return;

  await rerollFailedDice(message, count);
}

const REROLL_DAMAGE_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/reroll-damage.html";

/** Reroll dialog for Damage messages - one row per target, since each has its own dice pool. */
async function rerollDamageDialog(message, rollData) {
  const targets = rollData.targets
    .map((t, index) => ({ index, name: t.name, failedCount: t.rolls.filter(roll => roll < 4).length }))
    .filter(t => t.failedCount > 0);

  if (targets.length === 0) {
    return ui.notifications.warn("There are no failed dice to reroll.");
  }

  const content = await foundry.applications.handlebars.renderTemplate(REROLL_DAMAGE_DIALOGUE_TEMPLATE, { targets });

  const formData = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Reroll Failed Dice' },
    classes: ['standard-form', 'pokerole', 'reroll-dialog'],
    position: { width: 340 },
    content,
    buttons: [{
      action: 'reroll',
      label: 'Reroll',
      default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });
  if (!formData) return;

  const countsByIndex = {};
  for (const t of targets) {
    const count = parseInt(formData[`count_${t.index}`], 10);
    if (Number.isFinite(count) && count > 0) {
      countsByIndex[t.index] = count;
    }
  }
  if (Object.keys(countsByIndex).length === 0) return;

  await rerollDamageTargets(message, countsByIndex);
}

/**
 * Rerolls failed dice per-target for a damage roll message and recomputes its content.
 * @param {ChatMessage} message
 * @param {Object<number, number>} countsByIndex Target array index -> dice to reroll
 */
export async function rerollDamageTargets(message, countsByIndex) {
  const rollData = message.getFlag(game.system.id, 'rollData');
  if (!rollData || !hasRerollsRemaining(rollData) || rollData.type !== 'damage') return;

  const newRerollCount = (rollData.rerollCount ?? 0) + 1;
  const targets = rollData.targets;
  const stylingFunction = roll => roll > 3 ? 'max' : '';
  let anyRerolled = false;

  for (const [indexStr, requestedCount] of Object.entries(countsByIndex)) {
    const target = targets[parseInt(indexStr, 10)];
    if (!target) continue;

    const failedCount = target.rolls.filter(roll => roll < 4).length;
    const count = Math.max(0, Math.min(requestedCount, failedCount));
    if (count === 0) continue;

    const rollsRE = await rollDice(count);
    await animateDiceRoll(rollsRE, message.whisper);

    // Replace the failed dice in place for the array we persist - same reasoning as the
    // single-pool reroll path, so a later reroll doesn't double-count already-superseded failures.
    const updatedTargetRolls = [...target.rolls];
    let rerollIndex = 0;
    for (let i = 0; i < updatedTargetRolls.length && rerollIndex < rollsRE.length; i++) {
      if (updatedTargetRolls[i] < 4) {
        updatedTargetRolls[i] = rollsRE[rerollIndex];
        rerollIndex++;
      }
    }
    const successCount = Math.min(updatedTargetRolls.filter(roll => roll > 3).length, updatedTargetRolls.length) + target.modifier;

    const { damageBeforeEffectiveness, damage } = computeDamageFromRoll(successCount, rollData.context.damageFactor, target.effectivenessLevel);

    const targetPainPenalty = rollData.context.painPenalty ?? 0;
    const diceHtml = buildDiceHtml(target.rolls, stylingFunction, rollsRE)
      + buildModifierNoteHtml(target.modifier, targetPainPenalty)
      + `<p><b>${successCount} Total Successes (${count} Reroll${count === 1 ? '' : 's'})</b></p><p><i>Rerolled (${newRerollCount})</i></p>`;

    target.rolls = updatedTargetRolls;
    target.damageBeforeEffectiveness = damageBeforeEffectiveness;
    target.damage = damage;
    target.html = buildDamageTargetHtml({
      diceHtml, name: target.name, damageTypeText: rollData.context.damageTypeText,
      effectivenessLevel: target.effectivenessLevel, damage, isNoTarget: target.defenderTokenUuid === null
    });
    anyRerolled = true;
  }

  if (!anyRerolled) return;

  const content = await buildDamageRerollContent(targets, rollData.context);
  if (!content) return;

  await message.update({
    content,
    [`flags.${game.system.id}.rollData`]: { ...rollData, targets, rerollCount: newRerollCount }
  });
}

const ATTRIBUTE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/attribute-roll.html";

/**
 * Roll an attribute for successes with an optional dialog.
 * @param {{name: string, value: string}} attribute
 * @param {{painPenalty: number, confusionPenalty: bool, userRank: string}} options
 * @param {boolean} showPopup If `false`, the popup is skipped and default values are assumed
 * @param {Object} chatData
 * @returns {boolean} `true` if the user has rolled, `false` if cancelled
 */
export async function successRollAttributeDialog(attribute, options, chatData, showPopup = true, requiredSuccesses = null) {
  let poolBonus = 0;
  let constantBonus = 0;

  // Pain penalties aren't applied to certain attributes
  const enablePainPenalty = !POKEROLE.painPenaltyExcludedAttributes
    .includes(attribute.name);
  const painPenalty = enablePainPenalty ? (options?.painPenalty ?? 0) : 0;
  let confusionModifier = getConfusionModifier(options.userRank) ?? 1;
  let confusionPenalty = options.confusionPenalty ?? false;

  if (showPopup) {
    const content = await foundry.applications.handlebars.renderTemplate(ATTRIBUTE_ROLL_DIALOGUE_TEMPLATE, {
      attribute: `${attribute.name} (${attribute.value})`,
      confusionPenalty,
      confusionModifier
    });

    // Create the Dialog window and await submission of the form
    const formData = await foundry.applications.api.DialogV2.wait({
      window: { title: `Attribute roll: ${attribute.name}` },
      classes: ['standard-form'],
      content,
      buttons: [{
        action: 'roll',
        label: 'Roll',
        default: true,
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }],
      rejectClose: false
    });

    if (!formData) return false;

    poolBonus = formData.poolBonus ?? 0;
    constantBonus = formData.constantBonus ?? 0;
    confusionPenalty = formData.confusionPenalty ?? false;
  }

  if (confusionPenalty) {
    constantBonus -= confusionModifier;
  }

  const constantBonusWithPainPenalty = constantBonus - painPenalty;
  const rerollType = requiredSuccesses !== null ? 'evade' : 'attribute';
  await successRoll(attribute.value + poolBonus, attribute.name, chatData, constantBonusWithPainPenalty, rerollType, painPenalty, requiredSuccesses);

  return true;
}

const SKILL_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/skill-roll.html";

/**
 * Show a dialog for rolling successes based on a skill.
 * @param {{name: string, value: string}} skill
 * @param {Object} attributes The list of attributes to choose from
 * @param {{painPenalty: number, confusionPenalty: bool}} options
 * @param {Object} chatData
 * @returns {boolean} `true` if accuracy was rolled, `false` if cancelled
 */
export async function successRollSkillDialog(skill, attributes, options, chatData) {
  const content = await foundry.applications.handlebars.renderTemplate(SKILL_ROLL_DIALOGUE_TEMPLATE, {
    skill: `${skill.name} (${skill.value})`,
    attributes: Object.keys(attributes).reduce((curr, name) => {
      curr[name] = name;
      return curr;
    }, {}),
    confusionPenalty: options.confusionPenalty,
    confusionModifier: getConfusionModifier(options.userRank)
  });

  // Create the Dialog window and await submission of the form
  const formData = await foundry.applications.api.DialogV2.wait({
    window: { title: `Skill roll: ${skill.name}` },
    classes: ['standard-form'],
    content,
    buttons: [{
      action: 'roll',
      label: 'Roll',
      default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });

  if (!formData) return;

  let attributeName = formData.attribute;
  let poolBonus = formData.poolBonus ?? 0;
  let constantBonus = formData.constantBonus ?? 0;

  if (formData.confusionPenalty) {
    constantBonus -= getConfusionModifier(options.userRank);
  }

  // Certain attributes are exempt from pain penalties
  const painPenalty = POKEROLE.painPenaltyExcludedAttributes.includes(attributeName)
    ? 0 : (options?.painPenalty ?? 0);

  const constantBonusWithPainPenalty = constantBonus - painPenalty;
  await successRollAttributeSkill(
    { name: attributeName, value: attributes[attributeName].value },
    skill,
    chatData,
    poolBonus,
    constantBonusWithPainPenalty,
    'skill',
    painPenalty
  );
}

const ACCURACY_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/accuracy-roll.html";

/**
 * @param {Item} item The move to roll accuracy for
 * @param {Actor} actor The actor using the move
 * @param {TokenDocument} actorToken The token using the move
 * @param {boolean} canBeClashed Whether an option to clash should be provided
 * @param {boolean} canBeEvaded Whether an option to evade should be provided
 * @param {boolean} showPopup If `false`, the popup is skipped and default values are assumed
 * @param {number | null} overrideDicePool If provided, used as the base dice pool instead of
 *   `actor.getAccuracyPoolForMove(item)` - lets a non-Move caller (Item Usage Lines) supply a
 *   pool computed from its own formula instead of Move's fixed attribute+skill pair.
 * @returns {boolean} `true` if accuracy was rolled, `false` if cancelled
 */
export async function rollAccuracy(item, actor, actorToken, canBeClashed, canBeEvaded, showPopup = true, overrideDicePool = null) {
  let { accAttr1, accSkill1, accAttr1var, accSkill1var} = item.system;
  accAttr1 = accAttr1.trim();
  accSkill1 = accSkill1.trim();
  accAttr1var = accAttr1var?.trim();
  accSkill1var = accSkill1var?.trim();

  if (!accAttr1 && accAttr1var) {
    accAttr1 = accAttr1var;
    accAttr1var = undefined;
  }

  if (!accSkill1 && accSkill1var) {
    accSkill1 = accSkill1var;
    accSkill1var = undefined;
  }

  if (accSkill1 == !accAttr1) {
    accAttr1 = accSkill1;
    accSkill1 = undefined;
  }

  let baseFormula = '';
  if (accAttr1) {
    baseFormula = accAttr1;
    if (accAttr1var) {
      baseFormula += `/${accAttr1var}`
    }

    if (accSkill1) {
      baseFormula += ` + ${accSkill1}`;
      if (accSkill1var){
        baseFormula += `/${accSkill1var}`
      }
    }
  }

  let dicePool = overrideDicePool ?? actor.getAccuracyPoolForMove(item);

  let poolBonus = 0;
  let constantBonus = 0;
  let enablePainPenalty = !(POKEROLE.painPenaltyExcludedAttributes.includes(accAttr1) || POKEROLE.painPenaltyExcludedAttributes.includes(accAttr1var));
  const painPenalty = enablePainPenalty ? actor.system.painPenalization.value : 0;
  let requiredSuccesses = Math.max(actor.system.actionCount.value + 1, 0);

  if (showPopup) {
    const content = await foundry.applications.handlebars.renderTemplate(ACCURACY_ROLL_DIALOGUE_TEMPLATE, {
      baseFormula,
      accuracyMod: actor.system.accuracyMod.value,
      accuracyReduction: item.system.attributes.accuracyReduction,
      requiredSuccesses,
      confusionPenalty: actor.hasAilment('confused'),
      confusionModifier: getConfusionModifier(actor.system.rank)
    });

    // Create the Dialog window and await submission of the form
    const formData = await foundry.applications.api.DialogV2.wait({
      window: { title: `Accuracy roll: ${item.name}` },
      classes: ['standard-form'],
      content,
      buttons: [{
        action: 'roll',
        label: 'Roll',
        default: true,
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }],
      rejectClose: false
    });

    if (!formData) return false;

    poolBonus = formData.poolBonus ?? 0;
    constantBonus = formData.constantBonus ?? 0;

    if (formData.requiredSuccesses !== undefined) {
      requiredSuccesses = formData.requiredSuccesses;
    }

    if (formData.confusionPenalty) {
      constantBonus -= getConfusionModifier(actor.system.rank);
    }
  }

  dicePool += poolBonus;
  if (item.system.attributes.accuracyReduction) {
    constantBonus -= Math.abs(item.system.attributes.accuracyReduction);
  }
  
  if (actor.system.accuracyMod.value) {
    if (actor.system.accuracyMod.value > 0) {
      dicePool += actor.system.accuracyMod.value;
    } else if (actor.system.accuracyMod.value < 0) {
      constantBonus += actor.system.accuracyMod.value;
    }
  }

  const constantBonusWithPainPenalty = constantBonus - painPenalty;

  const rerollContext = {
    actorUuid: actor.uuid,
    itemUuid: item.uuid,
    actorTokenUuid: actorToken?.uuid,
    requiredSuccesses,
    canBeClashed,
    canBeEvaded
  };

  let chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
  const [rollResult, newChatData] = await createSuccessRollMessageData(dicePool, `Accuracy roll: ${item.name}`, chatData,
    constantBonusWithPainPenalty, 'accuracy', rerollContext, painPenalty, requiredSuccesses);

  chatData = newChatData;

  newChatData.content += buildAccuracyResultHtml({
    rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken
  });

  await ChatMessage.create(newChatData);
  return true;
}

/** Builds an accuracy roll's action-buttons HTML (shared with reroll); required-successes shows in the totals line, not here. */
function buildAccuracyResultHtml({ rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken }) {
  let html = '<div class="pokerole"><div class="action-buttons">';
  if (rollResult >= requiredSuccesses) {
    if (canBeClashed) {
      html += `<button class="chat-action" data-action="clash"
        data-attacker-id="${actor.uuid}" data-move-id="${item.uuid}" data-expected-successes="${rollResult}"
        >Clash</button>`;
    }
    if (canBeEvaded) {
      html += `<button class="chat-action" data-action="evade" data-expected-successes="${rollResult}">Evade</button>`;
    }
  }

  const dataTokenUuid = actorToken ? `data-token-uuid="${actorToken.uuid}"` : '';

  // Unconditional effects
  for (let effect of item.getUnconditionalEffects()) {
    html += `<button class="chat-action" data-action="applyEffect" data-actor-id="${actor.id}" ${dataTokenUuid} data-effect='${JSON.stringify(effect)}' data-might-target-user="${item.mightTargetUser}">
  ${PokeroleItem.formatEffect(effect)}
</button>`;
  }

  // Chance dice rolls
  for (let group of item.getEffectGroupsWithChanceDice()) {
    html += `<button class="chat-action" data-action="chanceDiceRollEffect" data-actor-id="${actor.id}" ${dataTokenUuid} data-effect-group='${JSON.stringify(group)}' data-might-target-user="${item.mightTargetUser}">
  ${PokeroleItem.formatChanceDiceGroup(group)}
</button>`;
  }

  html += '</div></div>';
  return html;
}

/** Re-derives an accuracy reroll's follow-up HTML from rollData.context. */
async function buildAccuracyRerollContent(rollResult, context) {
  const { actorUuid, itemUuid, actorTokenUuid, requiredSuccesses, canBeClashed, canBeEvaded } = context;
  const actor = await fromUuid(actorUuid);
  const item = await fromUuid(itemUuid);
  if (!actor || !item) return '';
  const actorToken = actorTokenUuid ? await fromUuid(actorTokenUuid) : undefined;
  return buildAccuracyResultHtml({ rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken });
}

/** Converts the no-target damage roll's effectiveness dropdown value to a numeric level. */
function effectivenessSelectToLevel(effectiveness) {
  switch (effectiveness) {
    case 'superEffective': return 1;
    case 'doubleSuperEffective': return 2;
    case 'tripleSuperEffective': return 3;
    case 'notVeryEffective': return -1;
    case 'doubleNotVeryEffective': return -2;
    case 'tripleNotVeryEffective': return -3;
    case 'immune': return -Infinity;
    default: return 0;
  }
}

/**
 * Resolves a Move's `system.damagePool` formula (if not 'standard') against a specific defender.
 * @param {Item} item The move
 * @param {Actor} actor The user
 * @param {Actor | null} defender The target, or null for a no-target damage roll
 * @returns {null | 'needsTarget' | {mode: 'directDamage'|'diceToRoll', amount: number, diceMode: 'override'|'add', applyEffectiveness: boolean}}
 *   `null` means formula is 'standard' - no change to the normal power+stat pipeline.
 */
function resolveDamagePoolFormula(item, actor, defender) {
  const pool = item.system.damagePool;
  if (!pool || pool.formula === 'standard') return null;

  if (pool.formula === 'fixed') {
    return { mode: 'directDamage', amount: pool.amount, diceMode: 'override', applyEffectiveness: !pool.ignoreTypeEffectiveness };
  }

  if (!defender) return 'needsTarget';

  let amount;
  if (pool.formula === 'hpBased') {
    const hp = defender.system.hp;
    const base = pool.hpMode === 'missing' ? hp.max - hp.value : pool.hpMode === 'max' ? hp.max : hp.value;
    amount = Math.floor(base * pool.fraction / 100) + pool.plusAmount;
  } else {
    // statDiff
    if (pool.stat === 'rank') {
      amount = getRankDiceCount(pool.rankTable, actor.system.rank);
    } else {
      const userVal = pool.stat === 'weight' ? actor.system.weight : (actor.getAnyAttribute(pool.stat)?.value ?? 0);
      const targetVal = pool.stat === 'weight' ? defender.system.weight : (defender.getAnyAttribute(pool.stat)?.value ?? 0);
      let diff;
      if (pool.direction === 'target') diff = targetVal;
      else if (pool.direction === 'user') diff = userVal;
      else if (pool.direction === 'userAbove') diff = Math.max(userVal - targetVal, 0);
      else diff = Math.max(targetVal - userVal, 0); // targetAbove
      amount = pool.perUnit > 0 ? Math.floor(diff / pool.perUnit) : 0;
    }
  }

  if (pool.maxDice !== null && pool.maxDice !== undefined) {
    amount = Math.min(amount, pool.maxDice);
  }

  return pool.formula === 'hpBased'
    // Direct-damage hpBased moves (Horn Drill, Guillotine...) are OHKO mechanics, never affected by type effectiveness, unlike 'fixed' which defaults to respecting it (see ignoreTypeEffectiveness).
    ? { mode: pool.resultAs, amount, diceMode: pool.diceMode, applyEffectiveness: false }
    : { mode: 'diceToRoll', amount, diceMode: pool.diceMode, applyEffectiveness: true };
}

/** Applies a rolled success count + type effectiveness to get final damage (shared with reroll). */
function computeDamageFromRoll(rollResult, damageFactor, effectivenessLevel) {
  const damageBeforeEffectiveness = rollResult > 0 ? Math.max(Math.floor(rollResult * damageFactor), 1) : 1;
  const appliedEffectiveness = (rollResult <= 0 && effectivenessLevel > 0) ? 0 : effectivenessLevel;
  const damage = Math.max(damageBeforeEffectiveness + appliedEffectiveness, 0);
  return { damageBeforeEffectiveness, damage };
}

/** Applies additive type effectiveness to a flat (non-rolled) damage amount, e.g. a Fixed damage pool. */
function applyEffectivenessToAmount(amount, effectivenessLevel) {
  const appliedEffectiveness = (amount <= 0 && effectivenessLevel > 0) ? 0 : effectivenessLevel;
  return Math.max(amount + appliedEffectiveness, 0);
}

/** Type-matchup effectiveness level of a move against a specific defender. */
function computeEffectivenessLevel(item, defender) {
  return getEffectiveTypeMatchupScore(item.system.type, defender);
}

/** Builds one damage target's result HTML block (shared between initial roll and reroll). */
function buildDamageTargetHtml({ diceHtml, name, damageTypeText, effectivenessLevel, damage, isNoTarget }) {
  let html = '<hr>' + diceHtml;
  if (effectivenessLevel !== 0) {
    html += `<p><b>${getEffectivenessText(effectivenessLevel)}</b></p>`;
  }
  if (isNoTarget) {
    html += `<p>${damageTypeText}The attack deals ${damage} damage!</p>`;
  } else if (damage > 0) {
    html += `<p>${damageTypeText}${name} took ${damage} damage!</p>`;
  } else {
    html += `<p>${damageTypeText}${name} didn't take any damage.</p>`;
  }
  return html;
}

/** Builds the Apply Damage/Roll Recoil/Apply Healing buttons from the current per-target totals. */
function buildDamageActionButtonsHtml({ actor, token, targets, hasRecoil, applyLeechHeal }) {
  const damageUpdates = targets
    .filter(t => t.defenderTokenUuid && t.damage > 0)
    .map(t => ({ actorId: t.defenderActorId, tokenUuid: t.defenderTokenUuid, damage: t.damage }));

  const leechHealHp = applyLeechHeal
    ? targets.reduce((sum, t) => sum + Math.floor(t.damage / 2), 0)
    : 0;

  if (damageUpdates.length === 0 && !hasRecoil && leechHealHp === 0) return '';

  let html = `<div class="pokerole"><div class="action-buttons">`;
  if (damageUpdates.length > 0) {
    html += `<button class="chat-action" data-action="applyDamage"
      data-damage-updates='${JSON.stringify(damageUpdates)}'>Apply Damage</button>`;
  }
  if (hasRecoil) {
    const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';
    const lastTarget = targets[targets.length - 1];
    html += `<button class="chat-action" data-action="recoil" data-actor-id="${actor.id}"
        ${dataTokenUuid} data-damage-before-effectiveness="${lastTarget.damageBeforeEffectiveness}">Roll Recoil Damage</button>`;
  }
  if (leechHealHp > 0) {
    const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';
    html += `<button class="chat-action" data-action="applyHealing" data-actor-id="${actor.id}"
        ${dataTokenUuid} data-heal-amount="${leechHealHp}">Apply Healing (${actor.name})</button>`;
  }
  html += `</div></div>`;
  return html;
}

/** Rebuilds a damage roll's full content from its (possibly rerolled) targets + context. */
async function buildDamageRerollContent(targets, context) {
  const { actorUuid, itemUuid, tokenUuid, damageTypeText, hasRecoil, applyLeechHeal } = context;
  const actor = await fromUuid(actorUuid);
  const item = await fromUuid(itemUuid);
  if (!actor || !item) return '';
  const token = tokenUuid ? await fromUuid(tokenUuid) : undefined;

  let html = '';
  for (const target of targets) {
    html += target.html;
  }
  html += buildDamageActionButtonsHtml({ actor, token, targets, hasRecoil, applyLeechHeal });
  return html;
}

/**
 * Builds a shared-pool dice tooltip for one target: old values stay in place (crossed out where rerolled) and fresh replacements are appended as a trailing group, matching `buildDiceHtml`'s convention; this only controls what's displayed, success counts still come from `masterRolls`.
 * @param {number} keepCount This target's prefix length
 * @param {Array<number>} masterRolls The current (post-reroll) shared array
 * @param {Function} stylingFunction
 * @param {{originalRolls: Array<number>, rerolledIndices: Array<number>} | null} rerollInfo
 */
function buildSharedPoolDiceHtml(keepCount, masterRolls, stylingFunction, rerollInfo) {
  const originalSlice = (rerollInfo ? rerollInfo.originalRolls : masterRolls).slice(0, keepCount);
  const relevantRerolled = rerollInfo ? rerollInfo.rerolledIndices.filter(i => i < keepCount) : [];
  const relevantRerolledSet = new Set(relevantRerolled);
  const newDice = relevantRerolled.map(i => masterRolls[i]);

  let text = '<div class="dice-tooltip"><div class="dice"><ol class="dice-rolls">';
  originalSlice.forEach((roll, i) => {
    let classes = stylingFunction(roll);
    if (relevantRerolledSet.has(i)) classes += ' rerolled';
    text += `<li class="roll die d6 ${classes}">${roll}</li>`;
  });
  newDice.forEach(roll => {
    text += `<li class="roll die d6 ${stylingFunction(roll)}">${roll}</li>`;
  });
  text += '</ol></div></div>';
  return text;
}

/**
 * Builds a shared-pool damage roll's full content (each target keeps its own prefix of one shared dice array); used for both the initial roll and reroll as a single source of truth.
 * @param {{originalRolls: Array<number>, rerolledIndices: Array<number>} | null} rerollInfo Pass
 *   when called from a reroll, so previously-failed dice show their old (crossed-out) value.
 */
async function buildDamageSharedRerollContent(masterRolls, modifier, painPenalty, context, rerollInfo = null) {
  const { actorUuid, tokenUuid, damageTypeText, damageFactor, hasRecoil, applyLeechHeal, targets: targetMeta } = context;
  const actor = await fromUuid(actorUuid);
  if (!actor) return '';
  const token = tokenUuid ? await fromUuid(tokenUuid) : undefined;
  const stylingFunction = roll => roll > 3 ? 'max' : '';

  const targets = targetMeta.map(t => {
    const dice = masterRolls.slice(0, t.keepCount);
    const successCount = dice.filter(roll => roll > 3).length + modifier;
    const { damageBeforeEffectiveness, damage } = computeDamageFromRoll(successCount, damageFactor, t.effectivenessLevel);
    const diceHtml = buildSharedPoolDiceHtml(t.keepCount, masterRolls, stylingFunction, rerollInfo) + buildModifierNoteHtml(modifier, painPenalty)
      + `<p><b>${successCount} Total Successes</b></p>` + (rerollInfo ? `<p><i>Rerolled (${rerollInfo.rerollCount})</i></p>` : '');
    const html = buildDamageTargetHtml({
      diceHtml, name: t.name, damageTypeText, effectivenessLevel: t.effectivenessLevel, damage,
      isNoTarget: t.defenderTokenUuid === null
    });
    return { ...t, damage, damageBeforeEffectiveness, html };
  });

  let html = targets.map(t => t.html).join('');
  html += buildDamageActionButtonsHtml({ actor, token, targets, hasRecoil, applyLeechHeal });
  return html;
}

const DAMAGE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/damage-roll.html";

/**
 * Sum of Damage Pool Bonus rule dice (TASK-16) from the actor's active Custom Effect/Held Item/Ability
 * rules that match the move being rolled. Support-category moves never have a dice pool in this
 * ruleset (same exclusion PokeroleItem#canBeClashed() uses), so they're excluded outright regardless of scope.
 * @param {PokeroleActor} actor
 * @param {PokeroleItem} item - the move being rolled
 * @returns {number}
 */
function getDamagePoolRuleBonus(actor, item) {
  if (item.system.category === 'support') return 0;

  let bonus = 0;
  for (const source of actor.getActiveRuleSources()) {
    for (const rule of source.system.rules) {
      if ((rule.kind ?? 'attribute') !== 'damagePool') continue;
      const matches = rule.scope === 'all'
        || (rule.scope === 'type' && item.system.type === rule.scopeValue)
        // Membership, not equality - a compound category like "physical/special" (real moves use this)
        // still counts as a Physical move and a Special move, not a wholly separate third category.
        || (rule.scope === 'category' && item.system.category.split('/').includes(rule.scopeValue));
      if (!matches) continue;
      const dice = parseInt(rule.dice);
      if (!Number.isNaN(dice)) bonus += dice;
    }
  }
  return bonus;
}

/**
 *
 * @param {Item} item The move to roll damage for
 * @param {Actor} actor The actor using the move
 * @param {TokenDocument} token The token using the move
 * @returns {boolean} `true` if damage was rolled, `false` if cancelled
 */
export async function rollDamage(item, actor, token) {
  let baseFormula = `${item.system.power}-[def/sp.def]`;
  let highermod = "";
  if (item.system.dmgMod1 && item.system.dmgMod1var) {
    if ((actor.getAnyAttribute(item.system.dmgMod1)?.value ?? 0) < (actor.getAnyAttribute(item.system.dmgMod1var)?.value ?? 0)) {
      highermod = item.system.dmgMod1var
    } else {
      highermod = item.system.dmgMod1
    }
    baseFormula = `${highermod}+${item.system.power}-[def/sp.def]+[STAB]`;
  } else if (item.system.dmgMod1) {
    baseFormula = `${item.system.dmgMod1}+${item.system.power}-[def/sp.def]+[STAB]`;
  } else if (item.system.dmgMod1var){
    baseFormula = `${item.system.dmgMod1var}+${item.system.power}-[def/sp.def]+[STAB]`;
  }

  let selectedTokens = Array.from(game.user.targets)
    .filter(token => token.actor);
  if (
    ['Foe', 'Random Foe', 'All Foes', 'Battlefield (Foes)'].includes(item.system.target)
  ) {
    // Exclude the current actor from the list if it can't target itself
    selectedTokens = selectedTokens.filter(token => token.actor._id !== actor.id);
  }

  const isSingleTargetMove = ['Foe', 'Random Foe', 'Ally'].includes(item.system.target);
  if (isSingleTargetMove && game.settings.get('pokerole', 'enforceSingleTargetLimit')) {
    if (selectedTokens.length > 1) {
      ui.notifications.warn(`${item.name} can only target a single Pokémon - you have ${selectedTokens.length} selected.`);
      return false;
    }
  } else if (game.settings.get('pokerole', 'enforceTargetLimit')) {
    const maxTargets = Math.max(POKEROLE.rankProgression[actor.system.rank]?.maxTargets ?? 0, 1);
    if (selectedTokens.length > maxTargets) {
      ui.notifications.warn(`${actor.name}'s rank (${actor.system.rank}) only allows targeting up to ${maxTargets} target(s) at once - you have ${selectedTokens.length} selected.`);
      return false;
    }
  }

  if (selectedTokens.length === 0 && resolveDamagePoolFormula(item, actor, null) === 'needsTarget') {
    ui.notifications.warn(`${item.name}'s damage formula needs a target - select one first.`);
    return false;
  }

  let shouldApplyLeechHeal = false;
  let leechHealPercent = 0;
  if (item.system.heal?.type === 'leech') {
    leechHealPercent = item.system.heal?.amount;
    if (leechHealPercent > 0) {
      shouldApplyLeechHeal = true;
    }
  }

  const targetNames = selectedTokens.map(token => token.actor.name).join(', ');

  const content = await foundry.applications.handlebars.renderTemplate(DAMAGE_ROLL_DIALOGUE_TEMPLATE, {
    baseFormula,
    formulaTooltip: buildDamagePoolFormulaTooltip(item.system.damagePool),
    enemyDef: 0,
    ignoreDefenses: item.system.attributes?.ignoreDefenses,
    stab: item.system.stab,
    effectiveness: 'neutral',
    effectivenessList: {
      tripleNotVeryEffective: 'Triple Not Very Effective (-3)',
      doubleNotVeryEffective: 'Double Not Very Effective (-2)',
      notVeryEffective: 'Not Very Effective (-1)',
      neutral: 'Neutral',
      superEffective: 'Super Effective (+1)',
      doubleSuperEffective: 'Double Super Effective (+2)',
      tripleSuperEffective: 'Triple Super Effective (+3)',
    },
    targetNames,
    hasLeechHeal: shouldApplyLeechHeal,
  });

  // Create the Dialog window and await submission of the form
  const [formData, damageType] = await foundry.applications.api.DialogV2.wait({
    window: { title: `Damage roll: ${item.name}` },
    classes: ['standard-form'],
    content,
    buttons: [
      {
        action: 'holdBack',
        label: 'Hold Back',
        callback: (event, button) => [new foundry.applications.ux.FormDataExtended(button.form).object, 'holdBack']
      },
      {
        action: 'normal',
        label: 'Normal',
        default: true,
        callback: (event, button) => [new foundry.applications.ux.FormDataExtended(button.form).object, 'normal']
      },
      {
        action: 'crit',
        label: 'Critical Hit',
        callback: (event, button) => [new foundry.applications.ux.FormDataExtended(button.form).object, 'crit']
      },
    ],
    close: () => [undefined, false],
    rejectClose: false
  });

  if (!formData) return false;

  let { enemyDef, stab, effectiveness, poolBonus, constantBonus, applyLeechHeal } = formData;
  poolBonus ??= 0;
  constantBonus ??= 0;
  const painPenalty = actor.system.painPenalization.value;
  constantBonus -= painPenalty;

  if (stab) {
    poolBonus += POKEROLE.CONST.STAB_BONUS;
  }
  if (damageType === 'crit') {
    poolBonus += POKEROLE.CONST.CRIT_BONUS;
  }

  let rollCountBeforeDef = (item.system.power ?? 0) + poolBonus + getDamagePoolRuleBonus(actor, item);
  if (item.system.dmgMod1 && item.system.dmgMod1var) {
    rollCountBeforeDef += Math.max(actor.getAnyAttribute(item.system.dmgMod1)?.value ?? 0, actor.getAnyAttribute(item.system.dmgMod1var)?.value ?? 0)
  } else if (item.system.dmgMod1) {
    rollCountBeforeDef += actor.getAnyAttribute(item.system.dmgMod1)?.value ?? 0;
  } else if (item.system.dmgMod1var) {
    rollCountBeforeDef += actor.getAnyAttribute(item.system.dmgMod1var)?.value ?? 0;
  }

  if (item.system.attributes?.ignoreDefenses) {
    enemyDef = 0;
  }

  const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor, token }) };
  let html = '';

  let damageTypeText = '';
  if (damageType === 'crit') {
    damageTypeText = 'A critical hit! ';
  } else if (damageType === 'holdBack') {
    damageTypeText = "They're holding back! ";
  }

  let damageFactor = damageType === 'holdBack' ? 0.5 : 1;

  const hasRecoil = !!item.system.attributes.recoil;
  const targets = [];

  // Formula-driven moves (TASK-17) already vary a target's base pool for reasons unrelated to defense and are designed to be single-target, so shared pooling only applies to plain targets.
  const useSharedPool = selectedTokens.length > 1
    && game.settings.get('pokerole', 'sharedMultiTargetDamage')
    && selectedTokens.every(t => resolveDamagePoolFormula(item, actor, t.actor) === null);

  if (useSharedPool) {
    const masterRolls = await rollDice(Math.max(rollCountBeforeDef, 1));
    await animateDiceRoll(masterRolls, chatData.whisper);

    const targetMeta = selectedTokens.map(defenderToken => {
      const defender = defenderToken.actor;
      let defStat = 0;
      if (!item.system.attributes?.ignoreDefenses) {
        defStat = item.system.category === 'special' && !item.system.attributes.resistedWithDefense
          ? defender.system.derived.spDef.value
          : defender.system.derived.def.value;
      }
      return {
        name: defender.name,
        keepCount: Math.max(rollCountBeforeDef - defStat, 1),
        effectivenessLevel: computeEffectivenessLevel(item, defender),
        defenderTokenUuid: defenderToken.document.uuid, defenderActorId: defender.id
      };
    });

    const damageContext = {
      actorUuid: actor.uuid, itemUuid: item.uuid, tokenUuid: token?.uuid,
      damageTypeText, damageFactor, hasRecoil, applyLeechHeal: !!applyLeechHeal,
      targets: targetMeta
    };

    html += await buildDamageSharedRerollContent(masterRolls, constantBonus, painPenalty, damageContext);

    await ChatMessage.create({
      ...chatData,
      content: html,
      flavor: `Damage roll: ${item.name}`,
      flags: {
        [game.system.id]: {
          rollData: {
            type: 'damageShared',
            rolls: masterRolls,
            modifier: constantBonus,
            painPenalty,
            requiredSuccesses: null,
            rerollCount: 0,
            context: damageContext
          }
        }
      }
    });
    return true;
  }

  if (selectedTokens.length === 0) {
    // A damaging move's dice pool is always at least 1, even if power+stat doesn't exceed the defense.
    const formulaResult = resolveDamagePoolFormula(item, actor, null);

    if (formulaResult?.mode === 'directDamage') {
      // Only 'fixed' can reach here without a target - 'hpBased'/'statDiff' already got blocked above.
      const effectivenessLevel = formulaResult.applyEffectiveness ? effectivenessSelectToLevel(effectiveness) : 0;
      const damage = applyEffectivenessToAmount(formulaResult.amount, effectivenessLevel);
      const targetHtml = buildDamageTargetHtml({
        diceHtml: `<p><b>${formulaResult.amount} Direct Damage</b></p>`, name: actor.name, damageTypeText, effectivenessLevel, damage, isNoTarget: true
      });
      targets.push({
        name: actor.name, rolls: [], modifier: constantBonus,
        effectivenessLevel, damageBeforeEffectiveness: formulaResult.amount, damage, html: targetHtml,
        defenderTokenUuid: null, defenderActorId: null
      });
    } else {
      const rollCount = Math.max(rollCountBeforeDef - enemyDef, 1);

      const [rollResult, messageDataPart, rolls] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus, null, null, painPenalty);
      const effectivenessLevel = effectivenessSelectToLevel(effectiveness);
      const { damageBeforeEffectiveness, damage } = computeDamageFromRoll(rollResult, damageFactor, effectivenessLevel);

      const targetHtml = buildDamageTargetHtml({
        diceHtml: messageDataPart.content, name: actor.name, damageTypeText, effectivenessLevel, damage, isNoTarget: true
      });

      targets.push({
        name: actor.name, rolls, modifier: constantBonus,
        effectivenessLevel, damageBeforeEffectiveness, damage, html: targetHtml,
        defenderTokenUuid: null, defenderActorId: null
      });
    }
  } else {
    // One or more tokens to apply damage to are selected
    for (let defenderToken of selectedTokens) {
      const defender = defenderToken.actor;
      const formulaResult = resolveDamagePoolFormula(item, actor, defender);

      if (formulaResult?.mode === 'directDamage') {
        const effectivenessLevel = formulaResult.applyEffectiveness ? computeEffectivenessLevel(item, defender) : 0;
        const damage = applyEffectivenessToAmount(formulaResult.amount, effectivenessLevel);
        const targetHtml = buildDamageTargetHtml({
          diceHtml: `<p><b>${formulaResult.amount} Direct Damage</b></p>`, name: defender.name, damageTypeText, effectivenessLevel, damage, isNoTarget: false
        });
        targets.push({
          name: defender.name, rolls: [], modifier: constantBonus,
          effectivenessLevel, damageBeforeEffectiveness: formulaResult.amount, damage, html: targetHtml,
          defenderTokenUuid: defenderToken.document.uuid, defenderActorId: defender.id
        });
        continue;
      }

      let defStat = 0;
      if (!item.system.attributes?.ignoreDefenses) {
        defStat = item.system.category === 'special' && !item.system.attributes.resistedWithDefense
          ? defender.system.derived.spDef.value
          : defender.system.derived.def.value;
      }

      // Formula-driven pool for this target, if any (falls back to the standard power+stat pool otherwise).
      let effectiveRollCountBeforeDef = rollCountBeforeDef;
      if (formulaResult) {
        effectiveRollCountBeforeDef = formulaResult.diceMode === 'override'
          ? formulaResult.amount
          : rollCountBeforeDef + formulaResult.amount;
      }

      // A damaging move's dice pool is always at least 1, even if power+stat doesn't exceed the defense.
      const rollCount = Math.max(effectiveRollCountBeforeDef - defStat, 1);

      const [rollResult, messageDataPart, rolls] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus, null, null, painPenalty);
      const effectivenessLevel = computeEffectivenessLevel(item, defender);
      const { damageBeforeEffectiveness, damage } = computeDamageFromRoll(rollResult, damageFactor, effectivenessLevel);

      const targetHtml = buildDamageTargetHtml({
        diceHtml: messageDataPart.content, name: defender.name, damageTypeText, effectivenessLevel, damage, isNoTarget: false
      });

      targets.push({
        name: defender.name, rolls, modifier: constantBonus,
        effectivenessLevel, damageBeforeEffectiveness, damage, html: targetHtml,
        defenderTokenUuid: defenderToken.document.uuid, defenderActorId: defender.id
      });
    }
  }

  // Leech Heal is a deferred button (like Apply Damage), not applied immediately here.
  html += targets.map(t => t.html).join('');
  html += buildDamageActionButtonsHtml({ actor, token, targets, hasRecoil, applyLeechHeal: !!applyLeechHeal });

  await ChatMessage.create({
    ...chatData,
    content: html,
    flavor: `Damage roll: ${item.name}`,
    flags: {
      [game.system.id]: {
        rollData: {
          type: 'damage',
          rerollCount: 0,
          targets,
          context: {
            itemUuid: item.uuid,
            actorUuid: actor.uuid,
            tokenUuid: token?.uuid,
            damageTypeText,
            damageFactor,
            hasRecoil,
            applyLeechHeal: !!applyLeechHeal,
            painPenalty
          }
        }
      }
    }
  });
  return true;
}

/**
 * Roll for recoil damage
 * @param {Actor} actor The actor receiving recoil
 * @param {TokenDocument | undefined} token The token of the actor receiving recoil
 * @param {number} damageBeforeEffectiveness The damage dealt by the attack before effectiveness is calculated (serves as the dice pool for recoil)
 */
export async function rollRecoil(actor, token, damageBeforeEffectiveness) {
  const chatData = {
    speaker: ChatMessage.implementation.getSpeaker({ token, actor })
  };
  const [result, newChatData] = await createSuccessRollMessageData(damageBeforeEffectiveness, 'Recoil', chatData);

  if (result > 0) {
    newChatData.content += `<p>${actor.name} took ${result} damage from recoil.</p>`;
  } else {
    newChatData.content += `<p>${actor.name} didn't take any recoil damage.</p>`;
  }

  await ChatMessage.implementation.create(newChatData);

  if (result > 0) {
    await bulkApplyDamageValidated([{
      tokenUuid: token?.uuid, actorId: actor.id, damage: result
    }]);
  }
}

/**
 * Utility function to roll a number of d6 dice.
 * @param {number} rollCount The number of dice to roll
 * @returns {Promise<Array<number>>} Array of dice roll results
 */
async function rollDice(rollCount) {
  let rolls = [];
  for (let i = 0; i < rollCount; i++) {
    let roll = await new Roll('d6').evaluate();
    rolls.push(roll.total);
  }
  return rolls;
}

/** Builds the "(-X subtracted by pain) (+Y Extra)" note shown under a roll's success count, if applicable. */
function buildModifierNoteHtml(modifier, painPenalty) {
  const bonusModifier = modifier + painPenalty;
  const spans = [];
  if (painPenalty > 0) {
    spans.push(`<span class="pain-penalty-note">(-${painPenalty} subtracted by pain)</span>`);
  }
  if (bonusModifier !== 0) {
    const sign = bonusModifier > 0 ? 'positive' : 'negative';
    spans.push(`<span class="modifier-extra-note ${sign}">(${bonusModifier > 0 ? '+' : ''}${bonusModifier} Extra)</span>`);
  }
  return spans.length > 0 ? `<p>${spans.join(' ')}</p>` : '';
}

/** Builds an Evade roll's hit/miss result line, shown when the roll was triggered from an accuracy roll's Evade button. */
function buildEvadeResultHtml(successCount, requiredSuccesses, name) {
  return successCount >= requiredSuccesses
    ? `<p>${name} evade the attack!</p>`
    : `<p>It Failed....</p>`;
}

/** Builds the dice-tooltip HTML; `rollsRE` dice are appended and mark superseded failures. */
function buildDiceHtml(rolls, stylingFunction, rollsRE = []) {
  let text = '<div class="dice-tooltip"><div class="dice"><ol class="dice-rolls">';
  let RRcounter = 1
  rolls.forEach(roll => {
    let classes = stylingFunction(roll);
    if (roll < 4 && rollsRE.length >= RRcounter) {
      classes += " rerolled"
      RRcounter += 1
    }
    text += `<li class="roll die d6 ${classes}">${roll}</li>`;
  });
  rollsRE.forEach((rollRE) => {
    let classes = stylingFunction(rollRE);
    text += `<li class="roll die d6 ${classes}">${rollRE}</li>`;
  });
  text += '</ol></div></div>';
  return text;
}

/** Plays the 3D Dice Animation, if active, for just the given (e.g. newly-rolled) dice. */
async function animateDiceRoll(rolls, whisper) {
  if (game.dice3d?.show && rolls.length > 0 && rolls.length <= 50) {
    const data = {
      throws: [{
        dice: rolls.map(roll => ({
          result: roll,
          resultLabel: roll,
          type: 'd6',
          vectors: [],
          options: {}
        }))
      }]
    };
    await game.dice3d.show(data, game.user, true, whisper?.length > 0 ? whisper : undefined);
  }
}

/**
 * Wraps pre-built content (caller includes dice HTML wherever it belongs) into chat message data.
 * @param {Array<number>} rolls Array of dice roll results, used to trigger the 3D dice animation
 * @param {string} content Content to display in the chat message
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Chat message settings
 * @returns {Object} Formatted chat message data
 */
async function createDiceRollChatMessage(rolls, content, flavor, chatData) {
  let messageData = {
    content,
    flavor,
    ...chatData
  };

  const rollMode = game.settings.get('core', 'rollMode');
  messageData = ChatMessage.implementation.applyRollMode(messageData, rollMode);

  await animateDiceRoll(rolls, messageData.whisper);

  return messageData;
}

/**
 * Rolls for successes (d6 >= 4) and creates a chat message with the results.
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @param {number} modifier Constant number added to the result
 * @returns {Promise<number>} The number of successes
 */
export async function successRoll(rollCount, flavor, chatData, modifier = 0, rerollType = null, painPenalty = 0, requiredSuccesses = null) {
  if (rollCount > 999) {
    throw new Error('You cannot roll more than 999 dice');
  }

  const [successCount, messageData] = await createSuccessRollMessageData(rollCount, flavor, chatData, modifier, rerollType, null, painPenalty, requiredSuccesses);

  await ChatMessage.implementation.create(messageData);
  return successCount;
}

/**
 * Rolls chance dice (success if any die is a 6) and creates a chat message with the results.
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @returns {Promise<boolean>} True if at least one die is a 6, otherwise false
 */
export async function chanceDiceRoll(rollCount, flavor, chatData) {
  if (rollCount > 999) {
    throw new Error('You cannot roll more than 999 dice');
  }

  const [hasSix, messageData] = await createChanceDiceRollMessageData(rollCount, flavor, chatData);

  await ChatMessage.implementation.create(messageData);
  return hasSix;
}


/**
 * Rolls for successes and returns the formatted chat message data.
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Chat message settings that will be merged with the resulting HTML
 * @param {number} modifier Constant number added to the result
 * @returns {Promise<[result: number, chatMessageData: object, rolls: Array<number>]>}
 */
export async function createSuccessRollMessageData(rollCount, flavor, chatData, modifier = 0, rerollType = null, rerollContext = null, painPenalty = 0, requiredSuccesses = null) {
  if (rollCount > 999) {
    throw new Error('You cannot roll for successes with more than 999 dice');
  }

  const rolls = await rollDice(rollCount);

  const successCount = Math.min(rolls.filter(roll => roll > 3).length, rolls.length) + modifier;

  const stylingFunction = roll => roll > 3 ? 'max' : '';
  const diceHtml = buildDiceHtml(rolls, stylingFunction);
  const modifierNoteHtml = buildModifierNoteHtml(modifier, painPenalty);

  let totalsText = `${successCount} Total Successes`;
  if (requiredSuccesses !== null) {
    totalsText += ` (${requiredSuccesses} required)`;
  }
  const totalsLineHtml = `<p><b>${totalsText}</b></p>`;

  const evadeResultHtml = rerollType === 'evade'
    ? buildEvadeResultHtml(successCount, requiredSuccesses, chatData?.speaker?.alias)
    : '';

  const messageData = await createDiceRollChatMessage(
    rolls,
    diceHtml + modifierNoteHtml + totalsLineHtml + evadeResultHtml,
    flavor,
    chatData
  );

  if (rerollType) {
    messageData.flags ??= {};
    messageData.flags[game.system.id] ??= {};
    messageData.flags[game.system.id].rollData = {
      type: rerollType,
      rolls,
      modifier,
      painPenalty,
      requiredSuccesses,
      rerollCount: 0,
      ...(rerollContext ? { context: rerollContext } : {})
    };
  }

  return [successCount, messageData, rolls];
}

/**
 * Rolls chance dice (success if any die is a 6) and returns the formatted chat message data.
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Chat message settings that will be merged with the resulting HTML
 * @returns {Promise<[result: boolean, chatMessageData: object]>}
 */
export async function createChanceDiceRollMessageData(rollCount, flavor, chatData) {
  if (rollCount > 999) {
    throw new Error('You cannot roll more than 999 dice');
  }

  const rolls = await rollDice(rollCount);

  const hasSix = rolls.some(roll => roll === 6);
  const stylingFunction = roll => roll === 6 ? 'maxcd' : 'failcd';
  const content = (hasSix ? `<b>Chance Roll Success!</b>` : `<b>Chance Roll Failure</b>`)
    + buildDiceHtml(rolls, stylingFunction);

  const messageData = await createDiceRollChatMessage(rolls, content, flavor, chatData);

  return [hasSix, messageData];
}


/**
 * @param {number} effectiveness Effectiveness as a number: -Infinity or -2 to +2
 * @returns {string | undefined}
 */
export function getEffectivenessText(effectiveness) {
  switch (effectiveness) {
    case 1:
      return "It's super effective! (+1)";
    case 2:
      return "It's super effective! (+2)";
    case 3:
      return "It's super effective! (+3)";
    case -1:
      return "It's not very effective... (-1)";
    case -2:
      return "It's not very effective... (-2)";
    case -3:
      return "It's not very effective... (-3)";
    case -Infinity:
      return "It doesn't affect the target...";
    default:
      return undefined;
  }
}

/* -------------------------------------------- */
/*  Item Usage Lines (gear Items)                */
/* -------------------------------------------- */

/**
 * Adapted from parseExpressionForRollCountAndComment above, but resolves each term via
 * Actor#getAttributeOrSkill (a superset covering derived stats too - Def, Sp.Def, Initiative,
 * Evade, Clash Physical/Special) instead of the narrower attribute+skill-only lookup /sc uses.
 * Only produces a total number - callers decide what it means (dice pool, flat damage, heal amount).
 * @param {string} expr Expression such as `2 + Dexterity`
 * @param {Actor} actor The actor to resolve stat names against.
 * @returns {Promise<{total: number, comment: string}>}
 */
async function parseUsageLineExpression(expr, actor) {
  expr = (expr ?? '').trim();
  let [exprWithoutComment, comment] = expr.split('#');
  let total = 0;
  for (const rawTerm of exprWithoutComment.split('+')) {
    const term = rawTerm.trim();
    if (!term) continue;
    const asInt = parseInt(term);
    if (!isNaN(asInt)) {
      total += asInt;
      continue;
    }
    if (!actor) {
      throw new Error('No actor selected');
    }
    const stat = actor.getAttributeOrSkill(term);
    if (stat) total += stat.value;
  }
  return { total, comment: comment?.trim() ?? exprWithoutComment };
}

/**
 * Builds a temporary, never-persisted Move-shaped Item so Usage Lines can call the real
 * rollDamage()/rollAccuracy()/PokeroleItem#applyHeal() unmodified instead of reimplementing them.
 * Never saved to the actor.
 * @param {PokeroleItem} sourceItem The gear Item this line belongs to.
 * @param {Actor} actor The actor using the item.
 * @param {{name?: string, system?: object}} overrides
 * @returns {PokeroleItem}
 */
function buildVirtualMoveItem(sourceItem, actor, overrides = {}) {
  return new PokeroleItem({
    name: overrides.name ?? sourceItem.name,
    type: 'move',
    img: sourceItem.img,
    system: {
      power: 0, dmgMod1: '', category: 'physical', type: 'none',
      target: 'Foe', attributes: {}, damagePool: { formula: 'standard' },
      heal: { type: 'none' }, accAttr1: '', accSkill1: '',
      ...overrides.system
    }
  }, { parent: actor });
}

/**
 * Resolves the single actor a line's formula reads stats from (Roll/Accuracy lines, and the base
 * pool computation for Heal/Damage lines before rollDamage()/applyHeal() take over targeting).
 * @param {object} line
 * @param {Actor} actor The item's user.
 * @returns {Actor | null} `null` (with an error notification) if `target: 'target'` but nothing is targeted.
 */
function resolveUsageLineActor(line, actor) {
  if (line.target !== 'target') return actor;
  const targeted = Array.from(game.user.targets).find(t => t.actor);
  if (!targeted) {
    ui.notifications.error('Select a target first.');
    return null;
  }
  return targeted.actor;
}

/**
 * Executes a 'roll' Usage Line - a bare /sc-style roll with no downstream effect (requirement:
 * Roll lines have no Fixed option and never apply healing/damage/game-state changes). The chat
 * flavor always shows the formula itself (like a plain /sc roll does), in addition to the line's
 * label if it has one.
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 */
export async function rollUsageLine(item, line, actor) {
  const formulaActor = resolveUsageLineActor(line, actor);
  if (!formulaActor) return false;
  const { total } = await parseUsageLineExpression(line.formula, formulaActor);
  const formulaText = line.formula?.trim();
  const label = line.label || item.name;
  const flavor = formulaText ? `${label} (${formulaText})` : label;
  const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor, token: actor.token }) };
  await successRoll(total, flavor, chatData);
  return true;
}

/**
 * Executes an 'accuracy' Usage Line by rolling it through the real rollAccuracy(), with the dice
 * pool pre-computed from the line's formula instead of a Move's fixed attribute+skill pair.
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 * @param {TokenDocument} token The actor's token.
 */
export async function rollUsageLineAccuracy(item, line, actor, token) {
  const formulaActor = resolveUsageLineActor(line, actor);
  if (!formulaActor) return false;
  const { total } = await parseUsageLineExpression(line.formula, formulaActor);
  const virtualItem = buildVirtualMoveItem(item, actor, {
    name: line.label || `${item.name} - Accuracy`,
    system: { target: line.target === 'user' ? 'Self' : 'All Foes' }
  });
  return rollAccuracy(virtualItem, actor, token, virtualItem.canBeClashed(), virtualItem.canBeEvaded(), true, total);
}

/**
 * Executes a 'damage' Usage Line by rolling it through the real rollDamage(). Roll mode pre-computes
 * a dice pool from the line's formula, fed in as the virtual item's `power` (rolled normally, subject
 * to Defenses unless Ignore Defenses is set). Fixed mode instead uses Move's own `damagePool: {formula:
 * 'fixed'}` mechanism (the same one Dragon Rage/Sonic Boom-style moves use) so the configured amount is
 * dealt directly with no roll - this never subtracts Defense (inherent to what "fixed damage" means in
 * this system, same as a real Move's Fixed damage pool), so Ignore Defenses has no effect in Fixed mode.
 * Both modes still apply type effectiveness for the chosen type/category like a real Move would - to
 * emulate flat/raw damage, set the line's Type to 'none'.
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 * @param {TokenDocument} token The actor's token.
 */
export async function rollUsageLineDamage(item, line, actor, token) {
  const dmg = line.damage;
  const baseSystem = {
    category: dmg.category,
    type: dmg.type,
    target: line.target === 'user' ? 'Self' : 'All Foes',
    attributes: { ignoreDefenses: !!dmg.ignoreDefenses }
  };

  let system;
  if (dmg.mode === 'fixed') {
    system = { ...baseSystem, power: 0, damagePool: { formula: 'fixed', amount: dmg.amount } };
  } else {
    const formulaActor = resolveUsageLineActor(line, actor);
    if (!formulaActor) return false;
    const power = (await parseUsageLineExpression(line.formula, formulaActor)).total;
    system = { ...baseSystem, power };
  }

  const virtualItem = buildVirtualMoveItem(item, actor, {
    name: line.label || `${item.name} - Damage`,
    system
  });
  return rollDamage(virtualItem, actor, token);
}

/**
 * Executes a 'heal' Usage Line - Fixed mode heals a flat amount, Roll mode rolls the formula first
 * (successes = HP healed) then applies that amount through the real PokeroleItem#applyHeal().
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 * @param {TokenDocument} token The actor's token.
 */
export async function applyUsageLineHeal(item, line, actor, token) {
  let amount;
  if (line.heal.mode === 'fixed') {
    amount = line.heal.amount;
  } else {
    const formulaActor = resolveUsageLineActor(line, actor);
    if (!formulaActor) return false;
    const { total } = await parseUsageLineExpression(line.formula, formulaActor);
    const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor, token }) };
    amount = await successRoll(total, `${line.label || 'Heal'} roll`, chatData);
  }

  const virtualItem = buildVirtualMoveItem(item, actor, {
    name: line.label || `${item.name} - Heal`,
    system: {
      target: line.target === 'user' ? 'Self' : 'All Allies',
      heal: { type: 'custom', amount, willPointCost: 0, target: line.target === 'user' ? 'user' : 'targets' }
    }
  });
  return virtualItem.applyHeal(actor, Array.from(game.user.targets));
}

/**
 * Resolves every actor a Usage Line's effect should apply to. Heal Status/Effects lines don't
 * delegate to a real Move mechanism (unlike Damage/Heal/Accuracy, which get multi-targeting for
 * free from rollDamage()/applyHeal()'s own internals), so this is their own multi-target loop.
 * @param {object} line
 * @param {Actor} actor The item's user.
 * @returns {Actor[]}
 */
function resolveUsageLineTargetActors(line, actor) {
  if (line.target !== 'target') return [actor];
  return Array.from(game.user.targets).filter(t => t.actor).map(t => t.actor);
}

/**
 * Executes a 'healStatus' Usage Line - removes each configured ailment (if present) from every
 * resolved target, immediately (no roll). Reuses PokeroleActor#removeAilment() unmodified.
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 * @param {TokenDocument} token The actor's token.
 */
export async function applyUsageLineHealStatus(item, line, actor, token) {
  const ailments = line.healStatus?.ailments ?? [];
  if (ailments.length === 0) {
    return ui.notifications.warn('No ailments configured on this line.');
  }
  const targets = resolveUsageLineTargetActors(line, actor);
  if (targets.length === 0) {
    return ui.notifications.error('Select a target first.');
  }

  let content = '';
  for (const targetActor of targets) {
    const cured = ailments.filter(key => targetActor.hasAilment(key));
    for (const key of cured) {
      await targetActor.removeAilment(key);
    }
    const curedLabels = cured.map(key => game.i18n.localize(POKEROLE.i18n.ailments[key]));
    content += cured.length > 0
      ? `<p>${targetActor.name} was cured of: ${curedLabels.join(', ')}.</p>`
      : `<p>${targetActor.name} had none of the listed status conditions.</p>`;
  }

  await ChatMessage.implementation.create({
    content,
    flavor: `${line.label || item.name} - Heal Status`,
    speaker: ChatMessage.implementation.getSpeaker({ actor, token })
  });
  return true;
}

/**
 * Executes an 'effects' Usage Line - posts one button per unconditional effect and one button per
 * chance-dice-gated group, reusing the existing generic `applyEffect`/`chanceDiceRollEffect` chat
 * actions (module/pokerole.mjs) completely unmodified - the same markup shape Move's own Effects tab
 * produces via buildAccuracyResultHtml() below. The line's single `target` field is synthesized into
 * every effect's `affects`, since Usage Lines don't expose Move's per-effect targeting.
 * @param {PokeroleItem} item The gear Item.
 * @param {object} line The usage line being executed.
 * @param {Actor} actor The actor using the item.
 * @param {TokenDocument} token The actor's token.
 */
export async function rollUsageLineEffects(item, line, actor, token) {
  const groups = line.effectGroups ?? [];
  const affects = line.target === 'user' ? 'user' : 'targets';
  const tagEffect = effect => ({ ...effect, affects });

  const unconditionalEffects = groups
    .filter(group => group.condition.type === 'none')
    .flatMap(group => group.effects)
    .map(tagEffect);
  const chanceDiceGroups = groups
    .filter(group => group.condition.type === 'chanceDice')
    .map(group => ({ ...group, effects: group.effects.map(tagEffect) }));

  if (unconditionalEffects.length === 0 && chanceDiceGroups.length === 0) {
    return ui.notifications.warn('No effects configured on this line.');
  }

  const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';
  let html = '<div class="pokerole"><div class="action-buttons">';
  for (const effect of unconditionalEffects) {
    html += `<button class="chat-action" data-action="applyEffect" data-actor-id="${actor.id}" ${dataTokenUuid} data-effect='${JSON.stringify(effect)}' data-might-target-user="true">
  ${PokeroleItem.formatEffect(effect)}
</button>`;
  }
  for (const group of chanceDiceGroups) {
    html += `<button class="chat-action" data-action="chanceDiceRollEffect" data-actor-id="${actor.id}" ${dataTokenUuid} data-effect-group='${JSON.stringify(group)}' data-might-target-user="true">
  ${PokeroleItem.formatChanceDiceGroup(group)}
</button>`;
  }
  html += '</div></div>';

  await ChatMessage.implementation.create({
    content: html,
    flavor: `${line.label || item.name} - Effects`,
    speaker: ChatMessage.implementation.getSpeaker({ actor, token })
  });
  return true;
}
