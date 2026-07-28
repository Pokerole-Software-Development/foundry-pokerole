/**
 * DialogV2 shown to reset a Pokémon's base data to a DIFFERENT species' compendium entry -
 * "evolve" (or more generally "become this other Pokémon"). Lets the user browse any Actor
 * compendium/entry (defaulting to a listed evolution target if provided), compares base stats
 * side by side, offers image/nature toggles, and on confirm rewrites species data, prunes/adds
 * moves, wipes abilities, and chains into an Advancement dialog so Rank points can be re-spent.
 */
import { POKEROLE, getLocalizedType, buildEvolutionDisplayData } from "../helpers/config.mjs";
import { postTrainingChatMessage } from "../helpers/chat.mjs";
import { AdvancementDialog } from "./advancement-dialog.mjs";

const INDEX_FIELDS = { fields: ['system.pokedexId'] };

export class EvolveDialog extends foundry.applications.api.DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "evolve"],
  };

  static TEMPLATE_PATH = "systems/pokerole/templates/actor/evolve.hbs";

  /**
   * Create and show the Evolve dialog for a Pokémon.
   * @param {PokeroleActor} actor - The Pokémon being evolved/reworked into another species
   * @param {string} [prefilledSpecies] - A species name to preselect, e.g. from a listed evolution
   * @returns {Promise<boolean>} Whether the evolution was completed
   */
  static async show(actor, prefilledSpecies) {
    const actorPacks = game.packs.filter(p => p.documentName === "Actor");
    if (!actorPacks.length) {
      ui.notifications.warn("No Actor compendiums are available to evolve from.");
      return false;
    }

    let defaultPack = actorPacks[0];
    let defaultEntry;
    if (prefilledSpecies) {
      const found = await this._findEntryBySpecies(actorPacks, prefilledSpecies);
      if (found) {
        defaultPack = found.pack;
        defaultEntry = found.entry;
      }
    }
    if (!defaultEntry) {
      await defaultPack.getIndex(INDEX_FIELDS);
      defaultEntry = this._sortedEntries(defaultPack)[0];
    }

    if (!defaultEntry) {
      ui.notifications.warn("No compendium entries found.");
      return false;
    }

    const packChoices = {};
    for (const pack of actorPacks) packChoices[pack.collection] = pack.metadata.label;

    const evolutionTargets = (actor.system.evolutions ?? [])
      .filter(e => e.direction === 'to')
      .map(e => {
        const display = buildEvolutionDisplayData(e);
        if (!display) return null;
        return { species: e.species, kindLabel: display.kindLabel, detail: display.detail };
      })
      .filter(Boolean);
    const defaultTarget = await defaultPack.getDocument(defaultEntry._id);

    // "Current" column: look up the actor's OWN species in a compendium too, so both sides show
    // pure species-template baselines - the live actor's numbers can be inflated by Vitamins/
    // StatChanges/Custom Effects, and the point of this comparison is "how would this improve at
    // a base level", not "vs my current combat-boosted numbers". Falls back to the actor itself
    // (still preferring its `.base` field, see _buildComparisonData) if no match is found.
    const currentFound = await this._findEntryBySpecies(actorPacks, actor.system.species);
    const currentTemplate = currentFound ? await currentFound.pack.getDocument(currentFound.entry._id) : actor;

    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATE_PATH, {
      actorName: actor.name,
      packChoices,
      selectedPack: defaultPack.collection,
      entryChoices: this._buildEntryChoices(defaultPack),
      selectedEntry: defaultEntry._id,
      evolutionTargets,
      natures: this._natureChoices(),
      current: this._buildComparisonData(currentTemplate),
      target: this._buildComparisonData(defaultTarget),
      targetName: defaultTarget.name
    });

    const result = await this.wait({
      window: {
        title: `Evolve ${actor.name}`
      },
      position: { width: 760 },
      content,
      buttons: [
        {
          action: 'evolve',
          label: 'Evolve',
          default: true,
          callback: (event, button, dialog) => dialog.element
        }
      ],
      render: (event, dialog) => this._setupDialogListeners(dialog.element),
      rejectClose: false
    });

    if (!result) return false;

    const formElement = result[0]?.querySelector('form') ?? result.querySelector('form');
    const formData = new foundry.applications.ux.FormDataExtended(formElement).object;

    const pack = game.packs.get(formData.pack);
    const target = pack ? await pack.getDocument(formData.entry) : null;
    if (!target) {
      ui.notifications.warn("No target Pokémon selected.");
      return false;
    }

    const originalRank = actor.system.rank;

    const updateData = {
      "system.species": target.system.species,
      "system.pokedexId": target.system.pokedexId,
      "system.rank": "none",
      "system.activeAbility": "",
      "system.attributes": target.system.attributes,
      "system.social": this._valueOnly(target.system.social),
      "system.skills": this._valueOnly(target.system.skills),
      "system.baseHp": target.system.baseHp,
      "system.hp": target.system.hp,
      "system.will": target.system.will,
      "system.type1": target.system.type1,
      "system.type2": target.system.type2,
      "system.type3": target.system.type3,
      "system.hasThirdType": target.system.hasThirdType,
      "system.evolutionStage": target.system.evolutionStage,
      "system.recommendedRank": target.system.recommendedRank,
      "system.pokedexCategory": target.system.pokedexCategory,
      "system.pokedexDescription": target.system.pokedexDescription,
      "system.height": target.system.height,
      "system.weight": target.system.weight,
      "system.evolutions": target.system.evolutions,
      "system.source": target.system.source
    };
    if (formData.changeImage) updateData.img = target.img;
    if (formData.nature) updateData["system.personality"] = formData.nature;

    await actor.update(updateData);

    // Moves: keep everything already learned, drop the rest of the old movepool, then add the
    // target's moves - skipping any whose name already matches a move we just kept.
    const learnedNames = actor.items.filter(i => i.type === 'move' && i.system.learned).map(i => i.name);
    const unlearnedMoveIds = actor.items.filter(i => i.type === 'move' && !i.system.learned).map(i => i.id);
    if (unlearnedMoveIds.length) {
      await actor.deleteEmbeddedDocuments("Item", unlearnedMoveIds);
    }

    // Abilities: full wipe and replace, same as the Reworking macro.
    const abilityIds = actor.items.filter(i => i.type === 'ability').map(i => i.id);
    if (abilityIds.length) {
      await actor.deleteEmbeddedDocuments("Item", abilityIds);
    }

    const newMoves = target.items.filter(i => i.type === 'move' && !learnedNames.includes(i.name));
    const newAbilities = target.items.filter(i => i.type === 'ability');
    await actor.createEmbeddedDocuments("Item", [...newMoves, ...newAbilities]);

    await postTrainingChatMessage(actor, `${actor.name} evolved into ${target.name}.`);

    // Rank was reset to "none" above - immediately reopen Advancement so the player can re-spend
    // the full point pool back up to their original rank, for free (see AdvancementDialog.show).
    await AdvancementDialog.show(actor, 'none', originalRank);

    return true;
  }

  /**
   * Finds an index entry matching a species name across a set of packs, checking each pack in
   * order and returning the first match.
   * @param {CompendiumCollection[]} packs
   * @param {string} species
   * @returns {Promise<{pack: CompendiumCollection, entry: object}|null>}
   * @private
   */
  static async _findEntryBySpecies(packs, species) {
    for (const pack of packs) {
      await pack.getIndex(INDEX_FIELDS);
      const entry = pack.index.contents.find(e => e.name === species);
      if (entry) return { pack, entry };
    }
    return null;
  }

  /**
   * A pack's index entries sorted by Pokédex number (entries missing one sort last).
   * @param {CompendiumCollection} pack
   * @private
   */
  static _sortedEntries(pack) {
    return [...pack.index.contents].sort((a, b) => (a.system?.pokedexId ?? Infinity) - (b.system?.pokedexId ?? Infinity));
  }

  /**
   * @param {object} entry - an index entry, with `system.pokedexId` present (see INDEX_FIELDS)
   * @private
   */
  static _formatEntryLabel(entry) {
    return entry.system?.pokedexId != null ? `#${entry.system.pokedexId} ${entry.name}` : entry.name;
  }

  /**
   * @param {CompendiumCollection} pack
   * @returns {Object<string, string>} entry id -> "#pokedexId name", sorted by pokedexId, for a select's options
   * @private
   */
  static _buildEntryChoices(pack) {
    const choices = {};
    for (const entry of this._sortedEntries(pack)) choices[entry._id] = this._formatEntryLabel(entry);
    return choices;
  }

  /**
   * @returns {Object<string, string>} nature key -> localized label, plus a blank "no change" option
   * @private
   */
  static _natureChoices() {
    const choices = { "": "No change" };
    for (const nature of Object.keys(POKEROLE.natureConfidence)) {
      choices[nature] = game.i18n.localize(POKEROLE.i18n.natures[nature]) ?? nature;
    }
    return choices;
  }

  /**
   * Strips a `{value, min, max}`-shaped field group down to just `{value}` for each key - used when
   * writing Skills/Social back to the actor. Their `.max` is either purely Rank-derived
   * (`skill.max = skillLimit` in `prepareDerivedData()`, see `actor-base.mjs`) or a fixed schema
   * constant, never something a reset action should persist itself - the compendium's own copy is
   * only a template placeholder (e.g. every skill shows max:5 there) and writing it directly into
   * `_source` would silently stick, since the actor sheet's disabled edit-mode max input reads
   * `_source` directly rather than the live derived value (to avoid a different, already-fixed
   * corruption bug). `PokeroleActor#resetAttributes()` already follows this same value-only
   * convention for Skills/Social/Attributes.
   * @param {Object<string, {value: number}>} fields
   * @private
   */
  static _valueOnly(fields) {
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, { value: field.value }]));
  }

  /**
   * Pulls the fields shown in the before/after comparison table out of a live actor or a fetched
   * compendium document. Uses each attribute's `.base` (the species baseline, untouched by Rank-Up
   * allocation or Vitamin/StatChange/Custom Effect overrides) rather than `.value`, since the point
   * of this comparison is the base-level stat change, not the actor's current combat-boosted state.
   * `.label` similarly isn't part of any DataModel's prepareDerivedData() - it's bolted on ad-hoc by
   * the actor sheet's own context-prep, which a freshly-fetched compendium document never goes
   * through - so it's built explicitly here instead of trusted to already exist (same lookup
   * `_showSettings()` uses).
   * @param {PokeroleActor} doc
   * @private
   */
  static _buildComparisonData(doc) {
    const s = doc.system;
    const attributes = {};
    for (const [key, attribute] of Object.entries(s.attributes)) {
      attributes[key] = {
        label: game.i18n.localize(POKEROLE.i18n.attributes[key]) ?? key,
        value: attribute.base ?? attribute.value,
        max: attribute.max
      };
    }
    return {
      attributes,
      hp: s.hp,
      will: s.will,
      types: [s.type1, s.type2, s.type3].filter(t => t && t !== 'none').map(getLocalizedType).join(' / ')
    };
  }

  /**
   * Wire the compendium/entry pickers (including dynamic repopulation of the entry select when the
   * compendium changes) and the evolution quick-pick buttons.
   * @param {HTMLElement} html
   * @private
   */
  static _setupDialogListeners(html) {
    const packSelect = html.querySelector('[name="pack"]');
    const entrySelect = html.querySelector('[name="entry"]');

    const repopulateEntries = async (packId, selectId) => {
      const pack = game.packs.get(packId);
      if (!pack) return;
      await pack.getIndex(INDEX_FIELDS);
      entrySelect.innerHTML = '';
      for (const entry of this._sortedEntries(pack)) {
        const option = document.createElement('option');
        option.value = entry._id;
        option.textContent = this._formatEntryLabel(entry);
        entrySelect.appendChild(option);
      }
      if (selectId) entrySelect.value = selectId;
      await this._refreshTargetColumn(html, pack, entrySelect.value);
    };

    packSelect?.addEventListener('change', () => repopulateEntries(packSelect.value));
    entrySelect?.addEventListener('change', () => this._refreshTargetColumn(html, game.packs.get(packSelect.value), entrySelect.value));

    html.querySelectorAll('.evolve-quickpick').forEach(btn => {
      btn.addEventListener('click', async () => {
        const species = btn.dataset.species;
        const found = await this._findEntryBySpecies(game.packs.filter(p => p.documentName === "Actor"), species);
        if (!found) {
          ui.notifications.warn(`No compendium entry named "${species}" found.`);
          return;
        }
        packSelect.value = found.pack.collection;
        await repopulateEntries(found.pack.collection, found.entry._id);
      });
    });
  }

  /**
   * Live-updates the "target" comparison column when the picked species changes.
   * @param {HTMLElement} html
   * @param {CompendiumCollection} pack
   * @param {string} entryId
   * @private
   */
  static async _refreshTargetColumn(html, pack, entryId) {
    if (!pack || !entryId) return;
    const target = await pack.getDocument(entryId);
    if (!target) return;

    html.querySelector('.evolve-target-name').textContent = target.name;
    const data = this._buildComparisonData(target);
    html.querySelector('.evolve-target-types').textContent = data.types;
    for (const key of Object.keys(data.attributes)) {
      const cell = html.querySelector(`.evolve-target-${key}`);
      if (cell) cell.textContent = `${data.attributes[key].value} / ${data.attributes[key].max}`;
    }
    html.querySelector('.evolve-target-hp').textContent = `${data.hp.value} / ${data.hp.max}`;
    html.querySelector('.evolve-target-will').textContent = `${data.will.value} / ${data.will.max}`;
  }
}
