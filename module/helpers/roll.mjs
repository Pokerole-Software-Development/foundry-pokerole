import { calcDualTypeMatchupScore } from "./config.mjs";

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

const SKILL_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/skill-roll.html";

export async function successRollSkillDialogue(skill, attributes, chatData) {
  const content = await renderTemplate(SKILL_ROLL_DIALOGUE_TEMPLATE, {
    skill: `${skill.name} (${skill.value})`,
    attributes: Object.keys(attributes).reduce((curr, name) => {
      curr[name] = name;
      return curr;
    }, {})
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
    }, { popOutModuleDisable: true }).render(true);
  });

  if (!result) return;

  const formElement = result[0].querySelector('form');
  const formData = new FormDataExtended(formElement).object;

  let attributeName = formData.attribute;
  let poolBonus = formData.poolBonus ?? 0;
  let constantBonus = formData.constantBonus ?? 0;

  await successRollAttributeSkill({ name: attributeName, value: attributes[attributeName].value }, skill, chatData, poolBonus, constantBonus);
}

const ACCURACY_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/accuracy-roll.html";

export async function rollAccuracy(item, actor, actorToken, canBeClashed, canBeEvaded, showPopup = true) {
  let { accMod1, accMod2 } = item.system;
  if (accMod2 == !accMod1) {
    accMod1 = accMod2;
    accMod2 = undefined;
  }

  let baseFormula = '';
  let dicePool = 0;
  if (accMod1) {
    baseFormula = accMod1;
    dicePool += actor.getAnyAttribute(accMod1)?.value ?? 0;

    if (accMod2) {
      baseFormula += `+${accMod2}`;
      dicePool += actor.getSkill(accMod2)?.value ?? 0;
    }
  }

  let poolBonus = 0;
  let constantBonus = 0;

  if (showPopup) {
    const content = await renderTemplate(ACCURACY_ROLL_DIALOGUE_TEMPLATE, {
      baseFormula,
      accuracyReduction: item.system.attributes.accuracyReduction
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

    if (!result) return;

    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;
    poolBonus = formData.poolBonus ?? 0;
    constantBonus = formData.constantBonus ?? 0;
  }

  dicePool += poolBonus;
  if (item.system.attributes.accuracyReduction) {
    constantBonus -= item.system.attributes.accuracyReduction;
  }

  let chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
  const [rollResult, newChatData] = await createSuccessRollMessageData(dicePool, `Accuracy roll: ${item.name}`, chatData, constantBonus);
  chatData = newChatData;

  let html = '<div class="pokerole"><div class="action-buttons">';
  if (rollResult > 0) {
    if (canBeClashed) {
      html += `<button class="chat-action" data-action="clash"
        data-attacker-id="${actor.uuid}" data-move-id="${item.uuid}"data-expected-successes="${rollResult}"
        >Clash</button>`;
    }
    if (canBeEvaded) {
      html += `<button class="chat-action" data-action="evade">Evade</button>`;
    }
  }
  html += '</div></div>';

  newChatData.content += html;

  await ChatMessage.create(newChatData);
}

const DAMAGE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/damage-roll.html";

export async function rollDamage(item, actor) {
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

  const targetNames = selectedTokens.map(token => token.actor.name).join(', ');

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
    targetNames
  });

  // Create the Dialog window and await submission of the form
  const [result, isCrit] = await new Promise(resolve => {
    new Dialog({
      title: `Damage roll: ${item.name}`,
      content,
      buttons: {
        normal: {
          label: "Normal",
          callback: html => resolve([html, false]),
        },
        crit: {
          label: "Critical Hit",
          callback: html => resolve([html, true]),
        },
      },
      default: 'normal',
      close: () => resolve([undefined, false]),
    }, { popOutModuleDisable: true }).render(true);
  });

  if (result) {
    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;
    let { enemyDef, stab, effectiveness, poolBonus, constantBonus, applyDamage } = formData;
    poolBonus ??= 0;
    constantBonus ??= 0;

    if (stab) {
      poolBonus += 1;
    }
    if (isCrit) {
      poolBonus += 2;
    }

    let rollCountBeforeDef = (item.system.power ?? 0) + poolBonus;
    if (item.system.dmgMod) {
      rollCountBeforeDef += actor.getAnyAttribute(item.system.dmgMod)?.value ?? 0;
    }

    if (item.system.attributes?.ignoreDefenses) {
      enemyDef = 0;
    }

    const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
    let html = '';
    const critText = isCrit ? 'A critical hit! ' : '';

    if (selectedTokens.length === 0) {
      let rollCount = rollCountBeforeDef - enemyDef;

      const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus);
      html += '<hr>' + messageDataPart.content;

      let damage = 1;
      
      if (rollResult > 0) {
        damage = rollResult;
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
      damage = Math.max(damage, 1); // Dealt damage is always at least 1

      html += `<p>${critText}The attack deals ${damage} damage!</p>`;
    } else {
      // One or more tokens to apply damage to are selected
      const hpUpdates = [];

      for (let defenderToken of selectedTokens) {
        const defender = defenderToken.actor;
        let defStat = 0;
        if (!item.system.attributes?.ignoreDefenses) {
          defStat = item.system.category === 'special'
            ? defender.system.derived.spDef.value
            : defender.system.derived.def.value;
        }
        const rollCount = rollCountBeforeDef - defStat;

        const [rollResult, messageDataPart] = await createSuccessRollMessageData(rollCount, undefined, chatData, constantBonus);
        html += '<hr>' + messageDataPart.content;

        let damage = rollResult;
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
        
        // Damage is always at least 1, unless the target is immune
        damage = Math.max(damage, effectiveness === -Infinity ? 0 : 1);
        html += `<p>${critText}${defender.name} took ${damage} damage!</p>`;

        if (applyDamage) {
          const oldHp = defender.system.hp.value;
          const hp = Math.max(oldHp - damage, 0);
          hpUpdates.push({ token: defenderToken, hp });

          if (hp === 0 && oldHp > 0) {
            html += `<p><b>${defender.name} fainted!</b></p>`;
          }
        }
      }

      if (applyDamage) {
        await bulkApplyHp(hpUpdates);
      }
    }

    await ChatMessage.create({
      ...chatData,
      content: html,
      flavor: `Damage roll: ${item.name}`
    });
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

export async function successRoll(rollCount, flavor, chatData, modifier = 0) {
  const [result, messageData] = await createSuccessRollMessageData(rollCount, flavor, chatData, modifier);
  await ChatMessage.create(messageData);
  return result;
}

/**
 * @returns [result: number, chatMessageData: object]
 */
export async function createSuccessRollMessageData(rollCount, flavor, chatData, modifier = 0) {
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
    await game.dice3d.show(data);
  }

  const result = successCount + modifier;

  let messageData = {
    content: `<b>${result} successes</b>${text}`,
    flavor,

    ...chatData
  };

  messageData = ChatMessage.implementation.applyRollMode(messageData, game.settings.get('core', 'rollMode'));

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
