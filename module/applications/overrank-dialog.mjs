/**
 * DialogV2 shown when a Pokémon spends Training Points to Overrank - learn a move from a rank
 * above its current one. Gated by a minimum combined Happiness+Loyalty score and TP (cost scales
 * with rank distance × evolution stage). Only one Overranked move can be known at a time - the
 * previous one, if any, is always forgotten automatically; an additional regular learned move must
 * also be forgotten if the new total would exceed the Insight+LEARNED_MOVES_BONUS cap.
 */
import { POKEROLE } from "../helpers/config.mjs";

export class OverrankDialog extends foundry.applications.api.DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "overrank"],
  };

  static TEMPLATE_PATH = "systems/pokerole/templates/actor/overrank-move.hbs";

  /**
   * Create and show the Overrank dialog for a Pokémon.
   * @param {PokeroleActor} actor - The Pokémon overranking a move
   * @returns {Promise<boolean>} Whether a move was overranked
   */
  static async show(actor) {
    // The trigger button is already disabled below this threshold - just a silent defensive backstop here.
    const happiness = actor.system.extra?.happiness?.value ?? 0;
    const loyalty = actor.system.extra?.loyalty?.value ?? 0;
    if (happiness + loyalty < 7) return false;

    const currentRankIndex = POKEROLE.ranks.indexOf(actor.system.rank);

    const overrankableMoves = actor.items.filter(i =>
      i.type === 'move' &&
      !i.system.learned &&
      !i.system.attributes.maneuver &&
      POKEROLE.ranks.indexOf(i.system.rank) > currentRankIndex
    );

    if (overrankableMoves.length === 0) {
      ui.notifications.warn("No overrankable moves available - add a move above this Pokémon's current rank first.");
      return false;
    }

    const costPerRank = POKEROLE.overrankTrainingPointCostPerRank[actor.system.evolutionStage];
    const moveChoices = {};
    const moveCosts = {};
    for (const move of overrankableMoves) {
      const rankDistance = POKEROLE.ranks.indexOf(move.system.rank) - currentRankIndex;
      const cost = costPerRank * rankDistance;
      moveCosts[move.id] = cost;
      moveChoices[move.id] = `${move.name} (${cost} TP)`;
    }

    const existingOverrank = actor.items.find(i => i.type === 'move' && i.system.overrank);
    const learnedMoves = actor.items.filter(i => i.type === 'move' && i.system.learned && !i.system.attributes.maneuver);
    const maxLearnedMoves = (actor.system.attributes.insight?.value ?? 0) + POKEROLE.CONST.LEARNED_MOVES_BONUS;
    const projectedCount = learnedMoves.length - (existingOverrank ? 1 : 0) + 1;
    const needsReplacement = projectedCount > maxLearnedMoves;

    const replaceChoices = {};
    for (const move of learnedMoves) {
      if (existingOverrank && move.id === existingOverrank.id) continue;
      replaceChoices[move.id] = move.name;
    }

    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATE_PATH, {
      moveChoices,
      existingOverrankName: existingOverrank?.name,
      needsReplacement,
      replaceChoices,
      trainingPoints: actor.system.trainingPoints,
      learnedCount: learnedMoves.length,
      maxLearnedMoves
    });

    const result = await this.wait({
      window: {
        title: "Overrank"
      },
      content,
      buttons: [
        {
          action: 'overrank',
          label: 'Overrank',
          default: true,
          callback: (event, button, dialog) => dialog.element
        }
      ],
      render: (event, dialog) => this._setupDialogListeners(dialog.element, moveCosts, actor.system.trainingPoints, needsReplacement),
      rejectClose: false
    });

    if (!result) return false;

    const formElement = result[0]?.querySelector('form') ?? result.querySelector('form');
    const formData = new foundry.applications.ux.FormDataExtended(formElement).object;
    const moveId = formData.moveToOverrank;
    const replaceId = formData.moveToReplace;
    const cost = moveCosts[moveId];

    if (!moveId || cost === undefined) return false;
    if (actor.system.trainingPoints < cost) return false;
    if (needsReplacement && !replaceId) return false;

    if (existingOverrank) {
      await existingOverrank.update({ system: { learned: false, overrank: false, usedInRound: false } });
    }
    if (replaceId) {
      await actor.items.get(replaceId).update({ system: { learned: false, usedInRound: false, overrank: false } });
    }
    await actor.items.get(moveId).update({ system: { learned: true, overrank: true, usedInRound: false } });
    await actor.update({ 'system.trainingPoints': actor.system.trainingPoints - cost });
    return true;
  }

  /**
   * Live-update the displayed cost and the Overrank button's disabled state as selections change.
   * @param {HTMLElement} html
   * @param {Object<string, number>} moveCosts - move id -> TP cost
   * @param {number} trainingPoints - the actor's current Training Points
   * @param {boolean} needsReplacement - whether an additional regular move must be forgotten
   * @private
   */
  static _setupDialogListeners(html, moveCosts, trainingPoints, needsReplacement) {
    const moveSelect = html.querySelector('[name="moveToOverrank"]');
    const replaceSelect = html.querySelector('[name="moveToReplace"]');
    const costDisplay = html.querySelector('.overrank-cost');
    const overrankButton = html.querySelector('button[data-action="overrank"]');

    const updateState = () => {
      const cost = moveCosts[moveSelect?.value] ?? 0;
      if (costDisplay) costDisplay.textContent = cost;
      const hasEnoughTP = trainingPoints >= cost;
      const hasReplacement = !needsReplacement || !!replaceSelect?.value;
      if (overrankButton) overrankButton.disabled = !hasEnoughTP || !hasReplacement;
    };

    moveSelect?.addEventListener('change', updateState);
    replaceSelect?.addEventListener('change', updateState);
    updateState();
  }
}
