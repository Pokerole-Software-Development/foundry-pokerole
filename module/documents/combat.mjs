/** Extensions to Foundry's combat systems */
export class PokeroleCombat extends Combat {
  /** @override */
  async combatStart() {
    await super.combatStart();
    this.resetActionCounters();
  }

  /** @override */
  async nextRound() {
    let shouldContinue = false;
    await Dialog.confirm({
      title: game.i18n.localize('POKEROLE.CombatNextRoundDialogTitle'),
      content: game.i18n.localize(`<p>${game.i18n.localize('POKEROLE.CombatNextRoundDialogContent')}</p>`),
      yes: () => shouldContinue = true,
    });

    if (shouldContinue) {
      await super.nextRound();
      this.resetActionCounters();
    }
  }

  static registerHooks() {
    Hooks.on('renderCombatTracker', (tracker, elem) => {
      // Add a button that allows going back to the first combatant in initiative order
      const resetRoundButton = document.createElement('a');
      resetRoundButton.dataset.tooltip = game.i18n.localize('POKEROLE.CombatResetRound');

      const icon = document.createElement('i');
      icon.classList.add('fas');
      icon.classList.add('fa-repeat');

      resetRoundButton.appendChild(icon);

      elem.find('#combat-controls').append(resetRoundButton);

      resetRoundButton.addEventListener('click', () => {
        game.combat.resetRound();
      });
    });
  }

  /** Go back to the start of a round */
  async resetRound() {
    const updateData = { round: this.round, turn: 0 };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll("POKEROLE.combatResetRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** Reset action counters at the start of a new round */
  resetActionCounters() {
    for (const combatant of this.combatants) {
      const scene = game.scenes.get(combatant.sceneId);
      if (!scene) continue;
      const token = scene.tokens.get(combatant.tokenId);
      if (!token) continue;

      if (token.actor.isOwner) {
        token.actor.resetActionCount();
      }
    }
  }
}

