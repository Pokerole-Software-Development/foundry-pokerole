/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return foundry.applications.handlebars.loadTemplates([
    // Actor partials.
    "systems/pokerole/templates/actor/parts/actor-items.hbs",
    "systems/pokerole/templates/actor/parts/actor-moves.hbs",
    "systems/pokerole/templates/actor/parts/actor-effects.hbs",
    "systems/pokerole/templates/actor/parts/actor-test.hbs",
    // Item partials.
    "systems/pokerole/templates/item/item-ability-sheet.hbs",
    "systems/pokerole/templates/item/item-effect-sheet.hbs",
    "systems/pokerole/templates/item/item-item-sheet.hbs",
    "systems/pokerole/templates/item/item-move-sheet.hbs",
    // Move item partials.
    "systems/pokerole/templates/item/parts/item-move-header.hbs",
    "systems/pokerole/templates/item/parts/item-move-attributes.hbs",
    "systems/pokerole/templates/item/parts/item-move-description.hbs",
    "systems/pokerole/templates/item/parts/item-move-effects.hbs",
    "systems/pokerole/templates/item/parts/item-move-tooltip.hbs",
    // Ability item partials.
    "systems/pokerole/templates/item/parts/item-ability-header.hbs",
    "systems/pokerole/templates/item/parts/item-ability-description.hbs",
    // Effect item partials.
    "systems/pokerole/templates/item/parts/item-effect-header.hbs",
    "systems/pokerole/templates/item/parts/item-effect-description.hbs",
    "systems/pokerole/templates/item/parts/item-effect-rules.hbs",
    // Item (gear) partials.
    "systems/pokerole/templates/item/parts/item-item-header.hbs",
    "systems/pokerole/templates/item/parts/item-item-description.hbs",
    "systems/pokerole/templates/item/parts/item-item-properties.hbs",
  ]);
};
