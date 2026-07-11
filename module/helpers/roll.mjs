import { PokeroleItem } from "../documents/item.mjs";
import {
  calcDualTypeMatchupScore,
  calcTripleTypeMatchupScore,
  getConfusionModifier,
  POKEROLE
} from "./config.mjs";
import { bulkApplyDamageValidated, bulkApplyHp, createHealMessage } from "./damage.mjs";

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
export async function successRollAttributeSkill(attribute, skill, chatData, poolModifier = 0, constantModifier = 0, rerollBonus = 0, rerollType = null) {
  if (poolModifier != 0) {
    let sign = poolModifier >= 0 ? '+' : '';
    return successRoll(attribute.value + skill.value + poolModifier, `${attribute.name}+${skill.name}${sign}${poolModifier}`, chatData, constantModifier, rerollBonus, rerollType);
  } else {
    return successRoll(attribute.value + skill.value, `${attribute.name}+${skill.name}`, chatData, constantModifier, rerollBonus, rerollType);
  }
}

/**
 * Reroll up to `count` of the failed (<4) dice in an existing roll chat message, appending
 * fresh dice the same way the pre-roll "Reroll" bonus already does (see buildDiceHtml()).
 * Only usable once per message (rollData.rerolled) and only for roll types whose entire
 * content is the dice block - see ROLL_TYPES_SUPPORTING_FULL_CONTENT_REROLL.
 * @param {ChatMessage} message
 * @param {number} count
 */
export async function rerollFailedDice(message, count) {
  const rollData = message.getFlag('pokerole', 'rollData');
  if (!rollData || rollData.rerolled) return;

  const { rolls, modifier, type, context } = rollData;
  const failedCount = rolls.filter(roll => roll < 4).length;
  count = Math.max(0, Math.min(count, failedCount));
  if (count === 0) return;

  const rollsRE = await rollDice(count);
  const successCount = Math.min(rolls.filter(roll => roll > 3).length + rollsRE.filter(roll => roll > 3).length, rolls.length) + modifier;

  const stylingFunction = roll => roll > 3 ? 'max' : '';
  const contentSuccess = `<b>${successCount} successes (${count} Reroll${count === 1 ? '' : 's'})</b><p><i>(Rerolled)</i></p>`;
  const diceHtml = buildDiceHtml(rolls, stylingFunction, rollsRE);

  let content = contentSuccess + diceHtml;
  if (type === 'accuracy') {
    content += await buildAccuracyRerollContent(successCount, context);
  } else if (type === 'clash') {
    const { expectedSuccesses, successResultHtml, failureResultHtml } = context;
    content += successCount >= expectedSuccesses ? successResultHtml : failureResultHtml;
  }

  await animateDiceRoll(rollsRE, message.whisper);

  await message.update({
    content,
    'flags.pokerole.rollData': {
      ...rollData,
      rolls: [...rolls, ...rollsRE],
      rerolled: true
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
  const rollData = message?.getFlag('pokerole', 'rollData');
  if (!rollData || rollData.rerolled) return;

  const failedCount = rollData.rolls.filter(roll => roll < 4).length;
  if (failedCount === 0) {
    return ui.notifications.warn("There are no failed dice to reroll.");
  }

  const content = await foundry.applications.handlebars.renderTemplate(REROLL_DIALOGUE_TEMPLATE, { failedCount });

  const formData = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Reroll Failed Dice' },
    classes: ['standard-form'],
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

const ATTRIBUTE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/attribute-roll.html";

/**
 * Roll an attribute for successes with an optional dialog.
 * @param {{name: string, value: string}} attribute
 * @param {{painPenalty: number, confusionPenalty: bool, userRank: string}} options
 * @param {boolean} showPopup If `false`, the popup is skipped and default values are assumed
 * @param {Object} chatData
 * @returns {boolean} `true` if the user has rolled, `false` if cancelled
 */
export async function successRollAttributeDialog(attribute, options, chatData, showPopup = true) {
  let poolBonus = 0;
  let constantBonus = 0;

  // Pain penalties aren't applied to certain attributes
  const enablePainPenalty = !POKEROLE.painPenaltyExcludedAttributes
    .includes(attribute.name);
  const painPenalty = enablePainPenalty ? (options?.painPenalty ?? 0) : 0;
  let confusionModifier = getConfusionModifier(options.userRank) ?? 1;
  let confusionPenalty = options.confusionPenalty ?? false;
  let rerollBonus = 0;

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
    rerollBonus = formData.rerollBonus ?? 0;
  }

  if (confusionPenalty) {
    constantBonus -= confusionModifier;
  }

  const constantBonusWithPainPenalty = constantBonus - painPenalty;
  await successRoll(attribute.value + poolBonus, attribute.name, chatData, constantBonusWithPainPenalty, rerollBonus, 'attribute');

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
  let rerollBonus = formData.rerollBonus ?? 0;

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
    rerollBonus,
    'skill'
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
 * @returns {boolean} `true` if accuracy was rolled, `false` if cancelled
 */
export async function rollAccuracy(item, actor, actorToken, canBeClashed, canBeEvaded, showPopup = true) {
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

  let dicePool = actor.getAccuracyPoolForMove(item);

  let poolBonus = 0;
  let constantBonus = 0;
  let rerollBonus = 0;
  let enablePainPenalty = !(POKEROLE.painPenaltyExcludedAttributes.includes(accAttr1) || POKEROLE.painPenaltyExcludedAttributes.includes(accAttr1var));
  const painPenalty = enablePainPenalty ? actor.system.derived.painPenalty.effective : 0;
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
    rerollBonus = formData.rerollBonus ?? 0;

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
    constantBonusWithPainPenalty, rerollBonus, 'accuracy', rerollContext);

  chatData = newChatData;

  newChatData.content += buildAccuracyResultHtml({
    rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken
  });

  await ChatMessage.create(newChatData);
  return true;
}

/**
 * Builds the requirement text + action-buttons HTML that follows an accuracy roll's dice
 * block - shared between the initial roll and a post-hoc chat reroll so both stay in sync.
 * @param {{rollResult: number, requiredSuccesses: number, canBeClashed: boolean, canBeEvaded: boolean, actor: Actor, item: PokeroleItem, actorToken: TokenDocument | undefined}} params
 */
function buildAccuracyResultHtml({ rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken }) {
  let html = '';
  if (requiredSuccesses === 1) {
    html += `<p>(1 success required)</p>`;
  } else {
    html += `<p>(${requiredSuccesses} successes required)</p>`;
  }
  html += '<div class="pokerole"><div class="action-buttons">';
  if (rollResult >= requiredSuccesses) {
    if (canBeClashed) {
      html += `<button class="chat-action" data-action="clash"
        data-attacker-id="${actor.uuid}" data-move-id="${item.uuid}" data-expected-successes="${rollResult}"
        >Clash</button>`;
    }
    if (canBeEvaded) {
      html += `<button class="chat-action" data-action="evade">Evade</button>`;
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

/**
 * Re-derives an accuracy roll's follow-up HTML for a reroll, from the actor/item UUIDs
 * stored in rollData.context. Returns '' if either document no longer exists.
 * @param {number} rollResult
 * @param {Object} context See buildAccuracyResultHtml() minus rollResult/actor/item/actorToken.
 */
async function buildAccuracyRerollContent(rollResult, context) {
  const { actorUuid, itemUuid, actorTokenUuid, requiredSuccesses, canBeClashed, canBeEvaded } = context;
  const actor = await fromUuid(actorUuid);
  const item = await fromUuid(itemUuid);
  if (!actor || !item) return '';
  const actorToken = actorTokenUuid ? await fromUuid(actorTokenUuid) : undefined;
  return buildAccuracyResultHtml({ rollResult, requiredSuccesses, canBeClashed, canBeEvaded, actor, item, actorToken });
}

const DAMAGE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/damage-roll.html";

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

  let { enemyDef, stab, effectiveness, poolBonus, constantBonus, applyLeechHeal, rerollBonus } = formData;
  poolBonus ??= 0;
  constantBonus ??= 0;
  constantBonus -= actor.system.derived.painPenalty.effective;

  if (stab) {
    poolBonus += POKEROLE.CONST.STAB_BONUS;
  }
  if (damageType === 'crit') {
    poolBonus += POKEROLE.CONST.CRIT_BONUS;
  }

  let rollCountBeforeDef = (item.system.power ?? 0) + poolBonus;
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

  let damageUpdates = [];
  let damage;
  let damageBeforeEffectiveness;
  if (selectedTokens.length === 0) {
    // A damaging move's dice pool is always at least 1, even if power+stat doesn't exceed the defense.
    let rollCount = Math.max(rollCountBeforeDef - enemyDef, 1);

    const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus, rerollBonus);
    html += '<hr>' + messageDataPart.content;

    damage = 1;

    if (rollResult > 0) {
      damage = rollResult;
      damage = Math.max(Math.floor(damage * damageFactor), 1);
    }

    damageBeforeEffectiveness = damage;
    let effectivenessLevel = 0;

    switch (effectiveness) {
      case 'superEffective':
        effectivenessLevel = 1;
        break;
      case 'doubleSuperEffective':
        effectivenessLevel = 2;
        break;
      case 'tripleSuperEffective':
        effectivenessLevel = 3;
        break;
      case 'notVeryEffective':
        effectivenessLevel = -1;
        break;
      case 'doubleNotVeryEffective':
        effectivenessLevel = -2;
        break;
      case 'tripleNotVeryEffective':
        effectivenessLevel = -3;
        break;
      case 'immune':
        effectivenessLevel = -Infinity;
        break;
      default:
        effectivenessLevel = 0;
        break;
    }

    if (effectivenessLevel !== 0) {
      html += `<p><b>${getEffectivenessText(effectivenessLevel)}</b></p>`;
    }

    if (rollResult <= 0 && effectivenessLevel > 0) {
      // Type advantages are only applied if one or more successes are rolled,
      // but disadvantage is always applied
      effectiveness = 0;
    }

    damage += effectivenessLevel;
    damage = Math.max(damage, 0); // Dealt damage is always at least 0

    html += `<p>${damageTypeText}The attack deals ${damage} damage!</p>`;
  } else {
    // One or more tokens to apply damage to are selected
    let leechHealHp = 0;

    for (let defenderToken of selectedTokens) {
      const defender = defenderToken.actor;
      let defStat = 0;
      if (!item.system.attributes?.ignoreDefenses) {
        defStat = item.system.category === 'special' && !item.system.attributes.resistedWithDefense
          ? defender.system.derived.spDef.value
          : defender.system.derived.def.value;
      }
      // A damaging move's dice pool is always at least 1, even if power+stat doesn't exceed the defense.
      const rollCount = Math.max(rollCountBeforeDef - defStat, 1);

      const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus, rerollBonus);
      html += '<hr>' + messageDataPart.content;

      damage = 1;

      if (rollResult > 0) {
        damage = rollResult;
        damage = Math.max(Math.floor(damage * damageFactor), 1);
      }

      damageBeforeEffectiveness = damage;
      let effectiveness = defender.system.hasThirdType ? calcTripleTypeMatchupScore(
        item.system.type,
        defender.system.type1,
        defender.system.type2,
        defender.system.type3
      ) : calcDualTypeMatchupScore(
        item.system.type,
        defender.system.type1,
        defender.system.type2
      );

      if (rollResult <= 0 && effectiveness > 0) {
        // Type advantages are only applied if one or more successes are rolled,
        // but disadvantage is always applied
        effectiveness = 0;
      }

      damage += effectiveness;
      if (effectiveness !== 0) {
        html += `<p><b>${getEffectivenessText(effectiveness)}</b></p>`;
      }

      // Damage is always at least 0
      damage = Math.max(damage, 0);
      if (damage > 0) {
        damageUpdates.push({ actorId: defender.id, tokenUuid: defenderToken.document.uuid, damage });

        html += `<p>${damageTypeText}${defender.name} took ${damage} damage!</p>`;
      } else {
        html += `<p>${damageTypeText}${defender.name} didn't take any damage.</p>`;
      }

      if (applyLeechHeal) {
        const healAmount = Math.floor(damage / 2);
        leechHealHp += healAmount;
      }
    }

    if (applyLeechHeal && leechHealHp > 0) {
      const oldHp = actor.system.hp.value;
      const newHp = Math.min(oldHp + leechHealHp, actor.system.hp.max);
      await bulkApplyHp([{ actor, token, hp: newHp }]);

      html += createHealMessage(token?.name ?? actor.name, oldHp, newHp, actor.system.hp.max);
    }
  }

  if (damage > 0) {
    html += `<div class="pokerole"><div class="action-buttons">`;
    if (damageUpdates.length > 0) {
      html += `<button class="chat-action" data-action="applyDamage"
        data-damage-updates='${JSON.stringify(damageUpdates)}'>Apply Damage</button>`;
    }
    if (item.system.attributes.recoil) {
      const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : '';
      html += `<button class="chat-action" data-action="recoil" data-actor-id="${actor.id}"
          ${dataTokenUuid} data-damage-before-effectiveness="${damageBeforeEffectiveness}">Roll Recoil Damage</button>`;
    }
    html += `</div></div>`;
  }

  await ChatMessage.create({
    ...chatData,
    content: html,
    flavor: `Damage roll: ${item.name}`
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

/**
 * Builds the dice-tooltip HTML for a set of dice results. `rollsRE` (already-rerolled dice,
 * either from the pre-roll "Reroll" bonus or a post-hoc chat reroll) are appended after
 * `rolls`, with the first `rollsRE.length` failed dice in `rolls` marked with a "rerolled"
 * class to show they've been superseded.
 * @param {Array<number>} rolls
 * @param {Function} stylingFunction Function to apply specific styling to each roll
 * @param {Array<number>} rollsRE
 * @returns {string}
 */
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

/**
 * Plays the 3D Dice Animation (if the module is active) for the given dice results only -
 * callers pass just the newly-rolled dice, not ones already shown in a previous animation.
 * @param {Array<number>} rolls
 * @param {Array<string> | undefined} whisper
 */
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
 * Utility function to create a chat message for dice rolls with specific styling.
 * @param {Array<number>} rolls Array of dice roll results
 * @param {string} content Content to display in the chat message
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Chat message settings
 * @param {Function} stylingFunction Function to apply specific styling to each roll
 * @returns {Object} Formatted chat message data
 */
async function createDiceRollChatMessage(rolls, content, flavor, chatData, stylingFunction, rollsRE = []) {
  const text = buildDiceHtml(rolls, stylingFunction, rollsRE);

  let messageData = {
    content: content + text,
    flavor,
    ...chatData
  };

  const rollMode = game.settings.get('core', 'rollMode');
  messageData = ChatMessage.implementation.applyRollMode(messageData, rollMode);

  await animateDiceRoll(rolls, messageData.whisper);

  return messageData;
}

/**
 * Roll for successes. Each of the rolled d6 count as a success if they show up as 4 or higher.
 * Also creates a chat message with the results.
 *
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @param {number} modifier Constant number added to the result
 * @returns {Promise<number>} The number of successes
 */
export async function successRoll(rollCount, flavor, chatData, modifier = 0, rerollBonus = 0, rerollType = null) {
  if (rollCount > 999) {
    throw new Error('You cannot roll more than 999 dice');
  }

  const [successCount, messageData] = await createSuccessRollMessageData(rollCount, flavor, chatData, modifier, rerollBonus, rerollType);

  await ChatMessage.implementation.create(messageData);
  return successCount;
}

/**
 * Roll for chance dice success. It's considered a success if at least one die comes out as a 6.
 * Also creates a chat message with the results.
 *
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
 * @returns {Promise<[result: number, chatMessageData: object]>}
 */
export async function createSuccessRollMessageData(rollCount, flavor, chatData, modifier = 0, reRolls = 0, rerollType = null, rerollContext = null) {
  if (rollCount > 999) {
    throw new Error('You cannot roll for successes with more than 999 dice');
  }

  const rolls = await rollDice(rollCount);
  const rollsRE = await rollDice(Math.min(reRolls, rolls.filter(roll => roll < 4).length));

  const rerollCount = rollsRE.length
  const successCount = Math.min(rolls.filter(roll => roll > 3).length + rollsRE.filter(roll => roll > 3).length, rolls.length) + modifier;

  const stylingFunction = roll => roll > 3 ? 'max' : '';

  let contentSuccess = `<b>${successCount} successes`
  if (rerollCount > 0) {
    contentSuccess += ` (${rerollCount} Rerolls of ${reRolls})</b>`
  } else {
    contentSuccess += `</b>`
  }

  const messageData = await createDiceRollChatMessage(
    rolls,
    contentSuccess,
    flavor,
    chatData,
    stylingFunction,
    rollsRE
  );

  if (rerollType) {
    messageData.flags ??= {};
    messageData.flags.pokerole ??= {};
    messageData.flags.pokerole.rollData = {
      type: rerollType,
      rolls: [...rolls, ...rollsRE],
      modifier,
      rerolled: false,
      ...(rerollContext ? { context: rerollContext } : {})
    };
  }

  return [successCount, messageData];
}

/**
 * Rolls for a chance dice success and returns the formatted chat message data.
 * A success is considered if at least one die rolls a 6.
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
  const content = hasSix ? `<b>Chance Roll Success!</b>` : `<b>Chance Roll Failure</b>`;
  const stylingFunction = roll => roll === 6 ? 'maxcd' : 'failcd';

  const messageData = await createDiceRollChatMessage(
    rolls,
    content,
    flavor,
    chatData,
    stylingFunction
  );

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
