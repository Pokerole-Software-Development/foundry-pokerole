import { calcDualTypeMatchupScore, getLocalizedPainPenaltiesForSelect, POKEROLE } from "./config.mjs";
import { bulkApplyHp, createHealMessage } from "./damage.mjs";

/**
 * Success roll from a chat expression
 * @param {String} expr Expression such as `Dexterity+Alert+2`
 * @param {Actor | undefined} actor The actor to roll as.
 * @param {Object} chatData Settings passed to `ChatMessage.create`
 * @returns 
 */
export async function successRollFromExpression(expr, actor, chatData) {
  expr = expr.trim();

  let [exprWithoutComment, comment] = expr.split('#');
  comment = comment?.trim() ?? undefined;

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

    for (let [key, value] of Object.entries({...actor.getIntrinsicOrSocialAttributes(), ...actor.system.skills})) {
      if (key.toLowerCase() == statName) {
        console.log(`${key}=${value.value}`);
        rollCount += value.value;
      }
    }
  }

  return successRoll(rollCount, comment ?? expr, chatData);
}

// attribute = { name: String, value: number };
export async function successRollAttribute(attribute, chatData) {
  return successRoll(attribute.value, attribute.name, chatData);
}

// attribute, skill = { name: String, value: number };
export async function successRollAttributeSkill(attribute, skill, chatData, poolModifier = 0, constantModifier = 0) {
  if (poolModifier != 0) {
    let sign = poolModifier >= 0 ? '+' : '';
    return successRoll(attribute.value + skill.value + poolModifier, `${attribute.name}+${skill.name}${sign}${poolModifier}`, chatData, constantModifier);
  } else {
    return successRoll(attribute.value + skill.value, `${attribute.name}+${skill.name}`, chatData, constantModifier);
  }
}

const ATTRIBUTE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/attribute-roll.html";

/**
 * Roll an attribute for successes with an optional dialog.
 * @param {{name: string, value: string}} attribute 
 * @param {{painPenalty: string, confusionPenalty: bool}} options
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
  let painPenalty = 'none';
  let confusionPenalty = options.confusionPenalty ?? false;
  if (enablePainPenalty && options?.painPenalty) {
    painPenalty = options?.painPenalty;
  }

  if (showPopup) {
    const content = await renderTemplate(ATTRIBUTE_ROLL_DIALOGUE_TEMPLATE, {
      attribute: `${attribute.name} (${attribute.value})`,
      enablePainPenalty,
      painPenalty,
      painPenalties: getLocalizedPainPenaltiesForSelect(),
      confusionPenalty,
    });

    // Create the Dialog window and await submission of the form
    const result = await new Promise(resolve => {
      new Dialog({
        title: `Attribute roll: ${attribute.name}`,
        content,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve(html),
          },
        },
        default: 'roll',
        close: () => resolve(undefined),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (!result) return false;

    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;

    poolBonus = formData.poolBonus ?? 0;
    constantBonus = formData.constantBonus ?? 0;
    painPenalty = formData.painPenalty ?? 'none';
    confusionPenalty = formData.confusionPenalty ?? false;
  }

  if (confusionPenalty) {
    constantBonus--;
  }

  const constantBonusWithPainPenalty = constantBonus - POKEROLE.painPenalties[painPenalty];
  await successRoll(attribute.value + poolBonus, attribute.name, chatData, constantBonusWithPainPenalty);

  return true;
}

const SKILL_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/skill-roll.html";

/**
 * Show a dialog for rolling successes based on a skill.
 * @param {{name: string, value: string}} skill 
 * @param {Object} attributes The list of attributes to choose from
 * @param {{painPenalty: string, confusionPenalty: bool}} options
 * @param {Object} chatData
 * @returns {boolean} `true` if accuracy was rolled, `false` if cancelled
 */
export async function successRollSkillDialog(skill, attributes, options, chatData) {
  const content = await renderTemplate(SKILL_ROLL_DIALOGUE_TEMPLATE, {
    skill: `${skill.name} (${skill.value})`,
    attributes: Object.keys(attributes).reduce((curr, name) => {
      curr[name] = name;
      return curr;
    }, {}),
    painPenalty: options?.painPenalty ?? 'none',
    painPenalties: getLocalizedPainPenaltiesForSelect(),
    confusionPenalty: options.confusionPenalty
  });

  // Create the Dialog window and await submission of the form
  const result = await new Promise(resolve => {
    new Dialog({
      title: `Skill roll: ${skill.name}`,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: html => resolve(html),
        },
      },
      default: 'roll',
      close: () => resolve(undefined),
      render: html => {
        // Hide pain penalty `select` on certain attributes
        const formGroup = html.find('select[name=painPenalty]').closest('.form-group');
        html.find('select[name=attribute]').change(evt => {
          if (POKEROLE.painPenaltyExcludedAttributes.includes(evt.target.value)) {
            $(formGroup).slideUp({ duration: 200 });
          } else {
            $(formGroup).slideDown({ duration: 200 });
          }
        });
      },
    }, { popOutModuleDisable: true }).render(true);
  });

  if (!result) return;

  const formElement = result[0].querySelector('form');
  const formData = new FormDataExtended(formElement).object;

  let attributeName = formData.attribute;
  let poolBonus = formData.poolBonus ?? 0;
  let constantBonus = formData.constantBonus ?? 0;

  if (formData.confusionPenalty) {
    constantBonus--;
  }

  let painPenalty = formData.painPenalty;
  // Certain attributes are exempt from pain penalties  
  if (POKEROLE.painPenaltyExcludedAttributes.includes(attributeName)) {
    painPenalty = 'none';
  }

  const constantBonusWithPainPenalty = constantBonus - POKEROLE.painPenalties[painPenalty];
  await successRollAttributeSkill(
    { name: attributeName, value: attributes[attributeName].value },
    skill,
    chatData,
    poolBonus,
    constantBonusWithPainPenalty
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
  let { accMod1, accMod2 } = item.system;
  accMod1 = accMod1.trim();
  accMod2 = accMod2.trim();
  if (accMod2 == !accMod1) {
    accMod1 = accMod2;
    accMod2 = undefined;
  }

  let baseFormula = '';
  if (accMod1) {
    baseFormula = accMod1;

    if (accMod2) {
      baseFormula += `+${accMod2}`;
    }
  }

  let dicePool = actor.getAccuracyPoolForMove(item);

  let poolBonus = 0;
  let constantBonus = 0;
  let enablePainPenalty = !POKEROLE.painPenaltyExcludedAttributes.includes(accMod1);
  let painPenalty = actor.system.painPenalty ?? 'none';
  if (!enablePainPenalty) {
    painPenalty = 'none';
  }
  let requiredSuccesses = Math.max(actor.system.actionCount.value, 0);

  if (showPopup) {
    const content = await renderTemplate(ACCURACY_ROLL_DIALOGUE_TEMPLATE, {
      baseFormula,
      accuracyMod: actor.system.accuracyMod.value,
      accuracyReduction: item.system.attributes.accuracyReduction,
      requiredSuccesses,
      enablePainPenalty,
      painPenalty,
      painPenalties: getLocalizedPainPenaltiesForSelect(),
      confusionPenalty: actor.hasAilment('confused')
    });

    // Create the Dialog window and await submission of the form
    const result = await new Promise(resolve => {
      new Dialog({
        title: `Accuracy roll: ${item.name}`,
        content,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve(html),
          },
        },
        default: 'roll',
        close: () => resolve(undefined),
      }, { popOutModuleDisable: true }).render(true);
    });

    if (!result) return false;

    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;
    poolBonus = formData.poolBonus ?? 0;
    constantBonus = formData.constantBonus ?? 0;
    painPenalty = formData.painPenalty ?? 'none';

    if (formData.requiredSuccesses !== undefined) {
      requiredSuccesses = formData.requiredSuccesses;
    }

    if (formData.confusionPenalty) {
      constantBonus--;
    }
  }

  dicePool += poolBonus;
  if (item.system.attributes.accuracyReduction) {
    constantBonus -= item.system.attributes.accuracyReduction;
  }
  if (actor.system.accuracyMod.value) {
    constantBonus += actor.system.accuracyMod.value;
  }

  const constantBonusWithPainPenalty = constantBonus - POKEROLE.painPenalties[painPenalty];

  let chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
  const [rollResult, newChatData] = await createSuccessRollMessageData(dicePool, `Accuracy roll: ${item.name}`, chatData,
    constantBonusWithPainPenalty);
  chatData = newChatData;

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
  html += '</div></div>';

  newChatData.content += html;

  await ChatMessage.create(newChatData);
  return true;
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
  if (item.system.dmgMod) {
    baseFormula = `${item.system.dmgMod}+${item.system.power}-[def/sp.def]+[STAB]`;
  }

  let selectedTokens = Array.from(game.user.targets)
    .filter(token => token.actor);
  if (
    ['Foe', 'Random Foe', 'All Foes', 'Battlefield (Foes)'].includes(item.system.target)
  ) {
    // Exclude the current actor from the list if it can't target itself
    selectedTokens = selectedTokens.filter(token => token.actor._id !== actor.id);
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
  const defaultPainPenalty = actor.system.painPenalty ?? 'none';

  const content = await renderTemplate(DAMAGE_ROLL_DIALOGUE_TEMPLATE, {
    baseFormula,
    enemyDef: 0,
    ignoreDefenses: item.system.attributes?.ignoreDefenses,
    stab: item.system.stab,
    effectiveness: 'neutral',
    effectivenessList: {
      doubleNotVeryEffective: 'Double Not Very Effective (-2)',
      notVeryEffective: 'Not Very Effective (-1)',
      neutral: 'Neutral',
      superEffective: 'Super Effective (+1)',
      doubleSuperEffective: 'Double Super Effective (+2)',
    },
    targetNames,
    hasLeechHeal: shouldApplyLeechHeal,
    painPenalty: defaultPainPenalty,
    painPenalties: getLocalizedPainPenaltiesForSelect(),
  });

  // Create the Dialog window and await submission of the form
  const [result, damageType] = await new Promise(resolve => {
    new Dialog({
      title: `Damage roll: ${item.name}`,
      content,
      buttons: {
        holdBack: {
          label: "Hold Back",
          callback: html => resolve([html, 'holdBack']),
        },
        normal: {
          label: "Normal",
          callback: html => resolve([html, 'normal']),
        },
        crit: {
          label: "Critical Hit",
          callback: html => resolve([html, 'crit']),
        },
      },
      default: 'normal',
      close: () => resolve([undefined, false]),
    }, { popOutModuleDisable: true }).render(true);
  });

  if (!result) return false;

  const formElement = result[0].querySelector('form');
  const formData = new FormDataExtended(formElement).object;
  let { enemyDef, stab, effectiveness, painPenalty, poolBonus, constantBonus, applyLeechHeal } = formData;
  poolBonus ??= 0;
  constantBonus ??= 0;

  if (painPenalty) {
    constantBonus -= POKEROLE.painPenalties[painPenalty];
  }

  if (stab) {
    poolBonus += 1;
  }
  if (damageType === 'crit') {
    poolBonus += 2;
  }

  let rollCountBeforeDef = (item.system.power ?? 0) + poolBonus;
  if (item.system.dmgMod) {
    rollCountBeforeDef += actor.getAnyAttribute(item.system.dmgMod)?.value ?? 0;
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
  if (selectedTokens.length === 0) {
    let rollCount = rollCountBeforeDef - enemyDef;

    const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus);
    html += '<hr>' + messageDataPart.content;

    damage = 1;
    
    if (rollResult > 0) {
      damage = rollResult;
      damage = Math.max(Math.floor(damage * damageFactor), 1);

      let effectivenessLevel = 0;

      switch (effectiveness) {
        case 'superEffective':
          effectivenessLevel = 1;
          break;
        case 'doubleSuperEffective':
          effectivenessLevel = 2;
          break;
        case 'notVeryEffective':
          effectivenessLevel = -1;
          break;
        case 'doubleNotVeryEffective':
          effectivenessLevel = -2;
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
      damage += effectivenessLevel;
    }
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
      const rollCount = rollCountBeforeDef - defStat;

      const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus);
      html += '<hr>' + messageDataPart.content;

      damage = rollResult;
      damage = Math.max(Math.floor(damage * damageFactor), 1);
      let effectiveness = calcDualTypeMatchupScore(
        item.system.type,
        defender.system.type1,
        defender.system.type2
      );

      if (rollResult > 0) {
        damage += effectiveness;
        if (effectiveness !== 0) {
          html += `<p><b>${getEffectivenessText(effectiveness)}</b></p>`;
        }
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
      const dataTokenUuid = token ? `data-token-uuid="${token.uuid}"` : undefined;
      html += `<button class="chat-action" data-action="recoil" data-actor-id="${actor.id}"
          ${dataTokenUuid} data-damage="${damage}">Roll Recoil Damage</button>`;
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
 * @param {number} damage The damage dealt by the attack (serves as the dice pool for recoil)
 */
export async function rollRecoil(actor, token, damage) {
  const chatData = {
    speaker: ChatMessage.implementation.getSpeaker({ token, actor })
  };
  const [result, newChatData] = await createSuccessRollMessageData(damage, 'Recoil', chatData); 

  if (result > 0) {
    const oldHp = actor.system.hp.value;
    const newHp = Math.max(oldHp - result, 0);

    await bulkApplyHp([{
      token, actor, hp: newHp
    }]);
  
    newChatData.content += `<p>${actor.name} took ${result} damage from recoil.</p>`;

    if (newHp === 0 && oldHp > 0) {
      newChatData.content += `<p><b>${actor.name} fainted!</b></p>`;
    }
  } else {
    newChatData.content += `<p>${actor.name} didn't take any recoil damage.</p>`;
  }

  await ChatMessage.implementation.create(newChatData);
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
export async function successRoll(rollCount, flavor, chatData, modifier = 0) {
  const [result, messageData] = await createSuccessRollMessageData(rollCount, flavor, chatData, modifier);
  await ChatMessage.implementation.create(messageData);
  return result;
}

/**
 * Rolls for successes and returns the formatted chat message data.
 * @param {number} rollCount The number of dice to roll
 * @param {string} flavor Displayed flavor text
 * @param {Object} chatData Chat message settings that will be merged with the resulting HTML
 * @param {number} modifier Constant number added to the result
 * @returns {Promise<[result: number, chatMessageData: object]>}
 */
export async function createSuccessRollMessageData(rollCount, flavor, chatData, modifier = 0) {
  if (rollCount > 999) {
    throw new Error('You cannot roll for successes with more than 999 dice');
  }

  let text = '<div class="dice-tooltip"><div class="dice"><ol class="dice-rolls">';

  let rolls = [];
  let successCount = 0;
  for (let i = 0; i < rollCount; i++) {
    let roll = await new Roll('d6').evaluate({ async: true });
    let classes = roll.total > 3 ? 'max' : '';
    text += `<li class="roll die d6 ${classes}">${roll.total}</li>`;
    rolls.push(roll.total);
    if (roll.total > 3) {
      successCount++;
    }
  }

  text += '</ol></div></div>';

  const result = successCount + modifier;

  let messageData = {
    content: `<b>${result} successes</b>${text}`,
    flavor,

    ...chatData
  };
  const rollMode = game.settings.get('core', 'rollMode');
  messageData = ChatMessage.implementation.applyRollMode(messageData, rollMode);

  // 3D dice are capped at 50 to keep things from getting to crazy
  if (game.dice3d?.show && rolls.length <= 50) {
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
    }
    await game.dice3d.show(
      data,
      game.user,
      true,
      messageData.whisper?.length > 0 ? messageData.whisper : undefined);
  }

  return [result, messageData];
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
    case -1:
      return "It's not very effective... (-1)";
    case -2:
      return "It's not very effective... (-2)";
    case -Infinity:
      return "It doesn't affect the target...";
    default:
      return undefined;
  }
}
