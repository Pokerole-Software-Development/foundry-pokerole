export async function successRollFromChatMessage(expr, actor, chatData) {
  expr = expr.trim();

  let exprSplit = expr.split('+');
  let rollCount = 0;
  for (let i = 0; i < exprSplit.length; i++) {
    let statName = exprSplit[i].toLowerCase();
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

  return successRoll(rollCount, expr, chatData);
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

export async function rollAccuracy(item, actor, showPopup = true) {
  let { accMod1, accMod2 } = item.system;
  if (accMod2 == !accMod1) {
    accMod1 = accMod2;
    accMod2 = undefined;
  }

  let baseFormula = '';
  let dicePool = 0;
  if (accMod1) {
    baseFormula = accMod1;
    dicePool += actor.getIntrinsicOrSocialAttribute(accMod1)?.value ?? 0;

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

  const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
  await successRoll(dicePool, `Accuracy roll: ${item.name}`, chatData, constantBonus);
}

const DAMAGE_ROLL_DIALOGUE_TEMPLATE = "systems/pokerole/templates/chat/damage-roll.html";

export async function rollDamage(item, actor) {
  let baseFormula = `${item.system.power}-[def/sp.def]`;
  if (item.system.dmgMod) {
    baseFormula = `${item.system.dmgMod}+${item.system.power}-[def/sp.def]`;
  }

  const content = await renderTemplate(DAMAGE_ROLL_DIALOGUE_TEMPLATE, {
    baseFormula,
    enemyDef: 0,
    stab: item.system.stab,
    effectiveness: 'neutral',
    effectivenessList: {
      doubleNotVeryEffective: 'Double Not Very Effective (-2)',
      notVeryEffective: 'Not Very Effective (-1)',
      neutral: 'Neutral',
      superEffective: 'Super Effective (+1)',
      doubleSuperEffective: 'Double Super Effective (+2)',
    }
  });

  // Create the Dialog window and await submission of the form
  const [result, isCrit] = await new Promise(resolve => {
    new Dialog({
      title: `Damage roll: ${item.name}`,
      content,
      buttons: {
        crit: {
          label: "Critical Hit",
          callback: html => resolve([html, true]),
        },
        normal: {
          label: "Normal",
          callback: html => resolve([html, false]),
        },
      },
      close: () => resolve([undefined, false]),
    }, { popOutModuleDisable: true }).render(true);
  });

  if (result) {
    const formElement = result[0].querySelector('form');
    const formData = new FormDataExtended(formElement).object;
    let { enemyDef, stab, effectiveness, poolBonus, constantBonus } = formData;
    poolBonus ??= 0;
    constantBonus ??= 0;

    poolBonus -= enemyDef;
    if (stab) {
      poolBonus += 1;
    }
    if (isCrit) {
      poolBonus += 2;
    }

    let rollCount = (item.system.power ?? 0) + poolBonus;
    if (item.system.dmgMod) {
      rollCount += actor.getIntrinsicOrSocialAttribute(item.system.dmgMod)?.value ?? 0;
    }

    const chatData = { speaker: ChatMessage.implementation.getSpeaker({ actor }) };
    const [rollResult, messageData] = await createSuccessRollMessageData(rollCount, `Damage roll: ${item.name}`, chatData, constantBonus);

    let damage = 1; // Dealt damage is always at least 1
    let effectiveHtml = '';
    if (rollResult > 0) {
      damage = rollResult;

      switch (effectiveness) {
        case 'superEffective':
          effectiveHtml = "<p><b>It's super effective! (+1)</b></p>";
          damage += 1;
          break;
        case 'doubleSuperEffective':
          effectiveHtml = "<p><b>It's super effective! (+2)</b></p>";
          damage += 2;
          break;
        case 'notVeryEffective':
          effectiveHtml = "<p><b>It's not very effective... (-1)</b></p>";
          damage -= 1;
          break;
        case 'notVeryEffective':
          effectiveHtml = "<p><b>It's not very effective... (-2)</b></p>";
          damage -= 2;
          break;
        case 'immune':
          effectiveHtml = "<p><b>It doesn't affect the target...</b></p>";
          damage -= 2;
          break;
      }
    }

    const critText = isCrit ? 'A critical hit! ' : '';

    messageData.content += `<hr>${effectiveHtml}<p class="pokerole roll-highlight">${critText}The attack deals ${damage} damage!</p>`;

    await ChatMessage.create(messageData);
  }
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

  if (game.dice3d.show) {
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
