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
  ]);
};
