/**
 * Post a plain chat message for a Training Points action (Rank Up, Retrain, Learn Move, Overrank),
 * always stating the actual TP spent so a GM scanning the log notices free adjustments.
 * @param {PokeroleActor} actor
 * @param {string} text
 */
export async function postTrainingChatMessage(actor, text) {
  await ChatMessage.implementation.create({
    content: `<div class="pokerole"><p>${text}</p></div>`,
    speaker: ChatMessage.implementation.getSpeaker({ actor })
  });
}
