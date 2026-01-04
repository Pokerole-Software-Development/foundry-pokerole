import { POKEROLE } from "../helpers/config.mjs";

/**
 * Dialog for handling actor rank advancement with attribute and skill point allocation
 * @extends {foundry.applications.api.DialogV2}
 */
export class AdvancementDialog extends foundry.applications.api.DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "advancement"],
  };
  
  static TEMPLATE_PATH = "systems/pokerole/templates/actor/advancement.hbs";

  /**
   * Create and show an advancement dialog for an actor
   * @param {PokeroleActor} actor - The actor being advanced
   * @param {string} oldRank - The actor's current rank
   * @param {string} newRank - The rank to advance to
   * @returns {Promise<boolean>} Whether the advancement was completed (true) or cancelled (false)
   */
  static async show(actor, oldRank, newRank) {
    foundry.utils.mergeObject(actor, actor.original); // setting Original Numbers

    const oldRankIndex = POKEROLE.ranks.indexOf(oldRank);
    const newRankIndex = POKEROLE.ranks.indexOf(newRank);

    const oldRankName = game.i18n.localize(POKEROLE.i18n.ranks[oldRank]) ?? oldRank;
    const newRankName = game.i18n.localize(POKEROLE.i18n.ranks[newRank]) ?? newRank;

    const totalProgression = {
      attributePoints: 0,
      skillPoints: 0,
      socialPoints: 0,
    };

    for (let i = oldRankIndex + 1; i <= newRankIndex; i++) {
      const progression = POKEROLE.rankProgression[POKEROLE.ranks[i]];
      totalProgression.attributePoints += progression.attributePoints;
      totalProgression.skillPoints += progression.skillPoints;
      totalProgression.socialPoints += progression.socialPoints;
    }

    const { skillLimit: oldSkillLimit } = POKEROLE.rankProgression[oldRank] ?? undefined;
    const { skillLimit } = POKEROLE.rankProgression[newRank] ?? undefined;

    const oldMaxHp = actor.system.hp.max;
    const oldMaxWill = actor.system.will.max;

    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATE_PATH, {
      progression: totalProgression,
      skillLimit,
      oldSkillLimit,
      showSkillLimit: skillLimit !== oldSkillLimit,
      oldMaxHp,
      oldMaxWill,
      attributes: actor.system.attributes,
      social: actor.system.social,
      skills: actor.system.skills,
    });

    const dialogueProgression = {
      ...totalProgression,
      oldMaxHp,
      oldMaxWill,
    };

    // Create the DialogV2 window and await submission of the form
    const result = await this.wait({
      window: {
        title: `Advancement: ${oldRankName} → ${newRankName} rank`
      },
      content,
      buttons: [
        {
          action: 'skip',
          label: 'Skip',
          callback: () => 'skip'
        },
        {
          action: 'apply',
          label: 'Apply',
          default: true,
          callback: (event, button, dialog) => {
            const html = dialog.element;
            let forceApply = html.querySelector('.force-check').checked;
            if ((dialogueProgression.attributePoints > 0 || dialogueProgression.skillPoints > 0 || dialogueProgression.socialPoints > 0) && !forceApply) {
              html.querySelectorAll('.form-footer button').forEach(btn => btn.disabled = false);
              ui.notifications.error("You must distribute all available points before applying changes, or check 'Force Apply' to proceed anyway.");
              throw new Error("Not all points have been distributed");
            }
            // Disabled elements are excluded from form data
            html.querySelectorAll('input[type="text"]').forEach(input => input.disabled = false);
            return html;
          }
        }
      ],
      render: (event, dialog) => this._setupDialogListeners(dialog.element, dialogueProgression),
      rejectClose: false,
      modal: true
    });

    if (result === 'skip') {
      // User clicked "Skip" - update rank without applying stat changes
      await actor.update({ 'system.rank': newRank });
      return true;
    } else if (result) {
      // User clicked "Apply" - apply stat changes and update rank
      const formElement = result[0]?.querySelector('form') ?? result.querySelector('form');
      const formData = new foundry.applications.ux.FormDataExtended(formElement).object;
      // Include the new rank in the update
      formData.rank = newRank;
      await actor.update({ system: formData });
      return true;
    } else {
      // User cancelled (closed dialog) - don't update anything
      return false;
    }
  }

  /**
   * Set up event listeners and interaction for the advancement dialog
   * @param {HTMLElement} html - The dialog's HTML element
   * @param {Object} progression - The progression data tracking points
   * @private
   */
  static _setupDialogListeners(html, progression) {
    let vitalityDelta = 0;
    let insightDelta = 0;

    html.querySelectorAll('.max-hp-box, .max-will-box').forEach(el => el.style.display = 'none');
    html.querySelectorAll('.max-hp-box, .max-will-box').forEach(el => el.disabled = true);

    const updateCounters = () => {
      const forceLimit = html.querySelector('.force-limit')?.checked ?? false;

      html.querySelector('.pointsleft.attributes').textContent = progression.attributePoints;
      html.querySelector('.pointsleft.social').textContent = progression.socialPoints;
      html.querySelector('.pointsleft.skills').textContent = progression.skillPoints;

      // Handle attribute buttons with limit checking
      html.querySelectorAll('.attributes.list .form-group').forEach(group => {
        const input = group.querySelector('input[type="text"]');
        const increaseBtn = group.querySelector('button.increase');
        const decreaseBtn = group.querySelector('button.decrease');
        
        if (input && increaseBtn && decreaseBtn) {
          const currentValue = parseInt(input.value);
          const min = parseInt(input.dataset.min);
          const max = parseInt(input.dataset.max);
          
          // Disable increase if no points left OR at max (unless force limit is enabled)
          increaseBtn.disabled = progression.attributePoints <= 0 || (!forceLimit && currentValue >= max);
          
          // Disable decrease if at minimum
          decreaseBtn.disabled = currentValue <= min;
        }
      });

      // Handle social attribute buttons with limit checking
      html.querySelectorAll('.social.list .form-group').forEach(group => {
        const input = group.querySelector('input[type="text"]');
        const increaseBtn = group.querySelector('button.increase');
        const decreaseBtn = group.querySelector('button.decrease');
        
        if (input && increaseBtn && decreaseBtn) {
          const currentValue = parseInt(input.value);
          const min = parseInt(input.dataset.min);
          const max = parseInt(input.dataset.max);
          
          // Disable increase if no points left OR at max (unless force limit is enabled)
          increaseBtn.disabled = progression.socialPoints <= 0 || (!forceLimit && currentValue >= max);
          
          // Disable decrease if at minimum
          decreaseBtn.disabled = currentValue <= min;
        }
      });
      
      // Handle skill buttons with limit checking
      html.querySelectorAll('.skills.list .form-group').forEach(group => {
        const input = group.querySelector('input[type="text"]');
        const increaseBtn = group.querySelector('button.increase');
        const decreaseBtn = group.querySelector('button.decrease');
        
        if (input && increaseBtn && decreaseBtn) {
          const currentValue = parseInt(input.value);
          const min = parseInt(input.dataset.min);
          const max = parseInt(input.dataset.max);
          
          // Disable increase if no points left OR at max (unless force limit is enabled)
          increaseBtn.disabled = progression.skillPoints <= 0 || (!forceLimit && currentValue >= max);
          
          // Disable decrease if at minimum
          decreaseBtn.disabled = currentValue <= min;
        }
      });

      let newHp = progression.oldMaxHp + vitalityDelta;
      let newWill = progression.oldMaxWill + insightDelta;

      html.querySelector('.max-hp').textContent = newHp;
      html.querySelector('.max-will').textContent = newWill;
      if (progression.oldMaxHp == newHp) {
        html.querySelector('.max-hp-box').style.display = 'none';
      } else {
        html.querySelector('.max-hp-box').style.display = '';
      }

      if (progression.oldMaxWill == newWill) {
        html.querySelector('.max-will-box').style.display = 'none';
      } else {
        html.querySelector('.max-will-box').style.display = '';
      }
    };
    updateCounters();

    // Update counters when force limit checkbox changes
    const forceLimitCheckbox = html.querySelector('.force-limit');
    if (forceLimitCheckbox) {
      forceLimitCheckbox.addEventListener('change', () => {
        updateCounters();
      });
    }

    html.addEventListener('click', (event) => {
      const button = event.target.closest('.increase, .decrease');
      if (!button) return;
      
      const { target: targetName, kind } = button.dataset;
      const target = html.querySelector(`[name="${targetName}"]`);
      const deltaTarget = html.querySelector(`[data-delta-target="${targetName}"]`);
      const sign = button.classList.contains('increase') ? 1 : -1;

      let intValue = parseInt(target.value);
      let min = parseInt(target.dataset.min);
      let forceLimit = html.querySelector('.force-limit').checked;

      if ((intValue + sign <= parseInt(target.dataset.max) || forceLimit || (!forceLimit && sign < 0)) && intValue + sign >= min) {
        let newValue = intValue + sign;
        target.value = newValue;

        let delta = newValue - min;
        deltaTarget.innerText = `(+${delta})`;

        switch (kind) {
          case 'attributes':
            progression.attributePoints -= sign;
            if (targetName === 'attributes.insight.value') {
              insightDelta = delta;
            }
            if (targetName === 'attributes.vitality.value') {
              vitalityDelta = delta;
            }
            break;
          case 'social':
            progression.socialPoints -= sign;
            break;
          case 'skills':
            progression.skillPoints -= sign;
            break;
        }
        updateCounters();
      }
    });
  }
}
