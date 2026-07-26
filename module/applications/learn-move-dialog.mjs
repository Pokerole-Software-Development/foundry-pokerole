/**
 * DialogV2 shown when a Pokémon spends Training Points to learn a new move - picks which move to
 * learn (cost depends on evolution stage + whether the move's rank is current or previous), and,
 * if the Pokémon's learned-move count is already at capacity (Insight + LEARNED_MOVES_BONUS),
 * which learned move to forget in its place. Maneuver moves and moves above the Pokémon's current
 * rank ("Overrank", a separate future mechanic) are excluded entirely.
 */
import { POKEROLE } from "../helpers/config.mjs";

export class LearnMoveDialog extends foundry.applications.api.DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "learn-move"],
  };

  static TEMPLATE_PATH = "systems/pokerole/templates/actor/learn-move.hbs";

  /**
   * Create and show the Learn Move dialog for a Pokémon.
   * @param {PokeroleActor} actor - The Pokémon learning a move
   * @returns {Promise<boolean>} Whether a move was learned
   */
  static async show(actor) {
    const currentRankIndex = POKEROLE.ranks.indexOf(actor.system.rank);

    const learnableMoves = actor.items.filter(i =>
      i.type === 'move' &&
      !i.system.learned &&
      !i.system.attributes.maneuver &&
      POKEROLE.ranks.indexOf(i.system.rank) <= currentRankIndex
    );

    if (learnableMoves.length === 0) {
      ui.notifications.warn("No learnable moves available - add a move to this Pokémon first, at or below its current rank.");
      return false;
    }

    const costTable = POKEROLE.learnMoveTrainingPointCost[actor.system.evolutionStage];
    const moveChoices = {};
    const moveCosts = {};
    for (const move of learnableMoves) {
      const cost = move.system.rank === actor.system.rank ? costTable.current : costTable.previous;
      moveCosts[move.id] = cost;
      moveChoices[move.id] = `${move.name} (${cost} TP)`;
    }

    const learnedMoves = actor.items.filter(i => i.type === 'move' && i.system.learned && !i.system.attributes.maneuver);
    const maxLearnedMoves = (actor.system.attributes.insight?.value ?? 0) + POKEROLE.CONST.LEARNED_MOVES_BONUS;
    const atCapacity = learnedMoves.length >= maxLearnedMoves;

    const replaceChoices = {};
    for (const move of learnedMoves) {
      replaceChoices[move.id] = move.name;
    }

    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATE_PATH, {
      moveChoices,
      atCapacity,
      replaceChoices,
      trainingPoints: actor.system.trainingPoints,
      learnedCount: learnedMoves.length,
      maxLearnedMoves
    });

    const result = await this.wait({
      window: {
        title: "Learn Move"
      },
      content,
      buttons: [
        {
          action: 'learn',
          label: 'Learn',
          default: true,
          callback: (event, button, dialog) => dialog.element
        }
      ],
      render: (event, dialog) => this._setupDialogListeners(dialog.element, moveCosts, actor.system.trainingPoints, atCapacity),
      rejectClose: false
    });

    if (!result) return false;

    const formElement = result[0]?.querySelector('form') ?? result.querySelector('form');
    const formData = new foundry.applications.ux.FormDataExtended(formElement).object;
    const moveId = formData.moveToLearn;
    const replaceId = formData.moveToReplace;
    const cost = moveCosts[moveId];

    if (!moveId || cost === undefined) return false;
    if (actor.system.trainingPoints < cost) return false;
    if (atCapacity && !replaceId) return false;

    await actor.items.get(moveId).update({ system: { learned: true, usedInRound: false, overrank: false } });
    if (replaceId) {
      await actor.items.get(replaceId).update({ system: { learned: false, usedInRound: false, overrank: false } });
    }
    await actor.update({ 'system.trainingPoints': actor.system.trainingPoints - cost });
    return true;
  }

  /**
   * Live-update the displayed cost and the Learn button's disabled state as selections change.
   * @param {HTMLElement} html
   * @param {Object<string, number>} moveCosts - move id -> TP cost
   * @param {number} trainingPoints - the actor's current Training Points
   * @param {boolean} atCapacity - whether a replacement move is required
   * @private
   */
  static _setupDialogListeners(html, moveCosts, trainingPoints, atCapacity) {
    const moveSelect = html.querySelector('[name="moveToLearn"]');
    const replaceSelect = html.querySelector('[name="moveToReplace"]');
    const costDisplay = html.querySelector('.learn-move-cost');
    const learnButton = html.querySelector('button[data-action="learn"]');

    const updateState = () => {
      const cost = moveCosts[moveSelect?.value] ?? 0;
      if (costDisplay) costDisplay.textContent = cost;
      const hasEnoughTP = trainingPoints >= cost;
      const hasReplacement = !atCapacity || !!replaceSelect?.value;
      if (learnButton) learnButton.disabled = !hasEnoughTP || !hasReplacement;
    };

    moveSelect?.addEventListener('change', updateState);
    replaceSelect?.addEventListener('change', updateState);
    updateState();
  }
}
