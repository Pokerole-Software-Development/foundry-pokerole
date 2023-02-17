import { POKEROLE } from "../helpers/config.mjs";

/** Extensions to Foundry's combat systems */
export class PokeroleCombat extends Combat {
  /** @override */
  async combatStart() {
    await super.combatStart();
    if (game.settings.get('pokerole', 'combatResourceAutomation')) {
      this.resetActionCounters();
    }
  }

  /** @override */
  async nextRound() {
    if (!game.settings.get('pokerole', 'combatResourceAutomation')) {
      await this.handleAilmentDamage();
      return super.nextRound();
    }

    // If combat resource automation is enabled, show a dialog to confirm resetting all resources
    let shouldContinue = false;
    await Dialog.confirm({
      title: game.i18n.localize('POKEROLE.CombatNextRoundDialogTitle'),
      content: game.i18n.localize(`<p>${game.i18n.localize('POKEROLE.CombatNextRoundDialogContent')}</p>`),
      yes: () => shouldContinue = true,
    });

    // Apply ailment damage at the end of the round
    await this.handleAilmentDamage();

    if (shouldContinue) {
      await super.nextRound();
      this.resetActionCounters();
    }
  }

  /** @override */
  async nextTurn() {
    // Mostly copied from base class
    let turn = this.turn ?? -1;

    // Determine the next turn number
    let next = turn;

    // The original implementation starts the next round on a wrap-around.
    // In Pokérole, players can use up to five actions per round where the
    // initiative order resets in each sub-round, so wrapping around to the
    // beginning feels more natural.
    for (let i = 0; i < this.turns.length; i++) { // Only skip until `turns.length` to avoid endless loops
      next += 1;
      next %= this.turns.length;

      let nextCombatant = this.turns[next];
      if (nextCombatant.isDefeated && this.settings.skipDefeated) {
        continue;
      }

      let actor = nextCombatant.token?.actor ?? nextCombatant.actor;
      if (actor?.hasAilment('flinch')) {
        let speaker = ChatMessage.implementation.getSpeaker({ actor });
        await Promise.all([
          actor.removeAilment('flinch'),
          actor.increaseActionCount(),
          ChatMessage.implementation.create({ speaker, content: `${actor.name} flinched!` }),
        ]);
        continue;
      }
      break;
    }

    // Update the document, passing data through a hook first
    const updateData = {round: this.round ?? 0, turn: next};
    const updateOptions = {advanceTime: CONFIG.time.turnTime, direction: 1};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
  }

  /** Reset action counters at the start of a new round */
  resetActionCounters() {
    for (const combatant of this.combatants) {
      if (combatant.actor?.isOwner) {
        combatant.actor.resetRoundBasedResources();
      }
    }
  }

  /**
   * Apply ailment damage to all actors at the end of the round
   */
  async handleAilmentDamage() {
    for (const combatant of this.turns) {
      // TODO: Defeated actors are not ignored here since they might still obtain Lethal Damage.
      // Revisit this again once Lethal Damage is implemented.
      const actor = combatant.token?.actor ?? combatant.actor;
      let speaker = ChatMessage.implementation.getSpeaker({ actor });

      let totalDamage = 0;
      const textLines = [];

      if (actor?.isBurned()) {
        let damage = POKEROLE.CONST.BURN1_DAMAGE;
        if (actor.hasAilment('burn3')) {
          damage = POKEROLE.CONST.BURN3_DAMAGE;
        } else if (actor.hasAilment('burn2')) {
          damage = POKEROLE.CONST.BURN2_DAMAGE;
        }

        totalDamage += damage;
        textLines.push(`${actor.name} took ${damage} damage from the burn.`);
      }

      if (actor?.isPoisoned()) {
        let damage = POKEROLE.CONST.POISON_DAMAGE;
        if (actor.hasAilment('badlyPoisoned')) {
          damage = POKEROLE.CONST.BADLY_POISONED_DAMAGE;
        }
        totalDamage += damage;
        textLines.push(`${actor.name} took ${damage} damage from the poison.`);
      }
      
      if (totalDamage > 0) {
        const damageUpdates = [{ tokenUuid: combatant.token?.uuid, actorId: actor.id, damage: totalDamage }];
        const html = `<div class="pokerole">
  <p>${textLines.join('</p><p>')}</p>

  <div class="action-buttons">
    <button class="chat-action" data-action="applyDamage" data-damage-updates='${JSON.stringify(damageUpdates)}'>
        Apply Damage
    </button>
  </div>
</div>`;
        await ChatMessage.implementation.create({ speaker, content: html });
      }
    }
  }
}

export class PokeroleCombatTracker extends CombatTracker {
  static registerHooks() {
    Hooks.on('renderCombatTracker', (tracker, elem) => {
      // Show the number of actions each combatant has taken
      for (const combatantElem of elem.find('.combatant')) {
        const combatantId = combatantElem.dataset.combatantId;
        const actor = game.combat?.combatants?.get(combatantId)?.actor;
        if (!actor) return;

        const actionCount = actor.system.actionCount.value;
        const actionMax = actor.system.actionCount.max;

        const controls = combatantElem.querySelector('.combatant-controls');
        const actionCounterElem = document.createElement('span');
        actionCounterElem.classList.add('combat-action-counter');
        actionCounterElem.textContent = `${actionCount}/${actionMax}`;

        const clashedElem = document.createElement('span');
        clashedElem.classList.add('combat-clash');
        clashedElem.textContent = 'C';
        if (actor.system.canClash) {
          clashedElem.classList.add('active');
        }

        const evadedElem = document.createElement('span');
        evadedElem.classList.add('combat-evade');
        evadedElem.textContent = 'E';
        if (actor.system.canEvade) {
          evadedElem.classList.add('active');
        }
        controls.prepend(evadedElem);
        controls.prepend(clashedElem);
        controls.prepend(actionCounterElem);
      }

      // Only add the Reset Turn button if there's actually an active encounter
      if (tracker.viewed && tracker.viewed.round && game.user.isGM) {
        // Add a button that allows going back to the first combatant in initiative order
        const resetRoundButton = document.createElement('a');
        resetRoundButton.dataset.tooltip = game.i18n.localize('POKEROLE.CombatResetRound');

        const icon = document.createElement('i');
        icon.classList.add('fas');
        icon.classList.add('fa-repeat');

        resetRoundButton.appendChild(icon);

        elem.find('#combat-controls').append(resetRoundButton);

        resetRoundButton.addEventListener('click', () => {
          game.combat.turn = -1;
          game.combat.nextTurn();
        });
      }
    });

    const debounceRenderCombatTracker = foundry.utils.debounce(() => {
      ui.combat.render();
    }, 50);

    Hooks.on('updateActor', () => {
      // Make sure to update the combat tracker whenever the action count might have changed
      debounceRenderCombatTracker();
    });
  }

  async _onToggleDefeatedStatus(combatant) {
    // We don't need to update the combatant since this happens in `applyAilment` or `removeAilment`
    const token = combatant.token;
    if (!token) return;
    if (!token.actor) return;
    
    // Apply the fainted status to the actor
    if (combatant.isDefeated) {
      await token.actor.removeAilment('fainted');
    } else {
      await token.actor.applyAilment('fainted');
    }
    
    token.object?.drawEffects();
  }
}
