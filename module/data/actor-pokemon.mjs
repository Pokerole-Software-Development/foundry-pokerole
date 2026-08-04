/**
 * Data model for Pokemon actors, extending the shared actor base with species/type/skill fields.
 */
import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleActorBaseData } from "./actor-base.mjs";
import { vitaminAttributeStateField } from "./fields.mjs";

const { NumberField, StringField, BooleanField, ObjectField, ArrayField, SchemaField } = foundry.data.fields;

export class PokeroleActorPokemonData extends PokeroleActorBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      trainingPoints: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      pokedexId: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      species: new StringField({ required: true, initial: "" }),
      pokedexCategory: new StringField({ required: true, initial: "" }),
      pokedexDescription: new StringField({ required: true, initial: "" }),

      type1: new StringField({ required: true, initial: "none", choices: Object.keys(POKEROLE.typeMatchups) }),
      type2: new StringField({ required: true, initial: "none", choices: Object.keys(POKEROLE.typeMatchups) }),
      type3: new StringField({ required: true, initial: "none", choices: Object.keys(POKEROLE.typeMatchups) }),
      hasThirdType: new BooleanField({ initial: false }),

      height: new NumberField({ required: true, initial: 0, min: 0 }),
      weight: new NumberField({ required: true, initial: 0, min: 0 }),
      recommendedRank: new StringField({ required: true, initial: "none", choices: POKEROLE.ranks }),

      // Heterogeneous shape (varies by `kind`) sourced from the compendium build - see helpers/config.mjs buildEvolutionDisplayData().
      evolutions: new ArrayField(new ObjectField()),
      // Baked in by the Pokerole-Data build pipeline (not derived from `evolutions` - there's no in-game
      // way to edit that array, so this needs to be a real, directly-editable field for GMs to manage
      // evolution pace on homebrew/edited Pokémon). Used by the future Learn-Move TP cost feature.
      evolutionStage: new StringField({ required: true, initial: "final", choices: ["first", "second", "final"] }),

      // Mechanical vitamin/Rare Candy state (Issue #132) - Pokémon-only, applied via PokeroleActor#_applyEffects().
      // Rare Candy is a strict upgrade over Vitamin (same value bonus, plus a max bonus), not independent.
      vitamins: new SchemaField({
        strength: vitaminAttributeStateField(),
        dexterity: vitaminAttributeStateField(),
        vitality: vitaminAttributeStateField(),
        special: vitaminAttributeStateField(),
        insight: vitaminAttributeStateField(),
        hp: new BooleanField({ required: true, initial: false }),
        willpower: new BooleanField({ required: true, initial: false })
      }),

      // Loose objects (not SchemaField) so custom skills/attributes can be added - see prepareBaseData().
      skills: new ObjectField({ required: true, initial: {} }),
      extra: new ObjectField({ required: true, initial: {} })
    };
  }

  /** @override Migrates the brief single-state string (`'none'|'vitamin'|'rareCandy'`) back to the current independent `{vitamin, rareCandy}` checkboxes. */
  static migrateData(source) {
    if (source.vitamins) {
      for (const key of ['strength', 'dexterity', 'vitality', 'special', 'insight']) {
        const value = source.vitamins[key];
        if (typeof value === 'string') {
          source.vitamins[key] = { vitamin: value === 'vitamin', rareCandy: value === 'rareCandy' };
        }
      }
    }
    return super.migrateData(source);
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    for (const key of POKEROLE.pokemonSkills) {
      this.skills[key] ??= { value: 0, min: 0, max: 5 };
    }
    for (const key of POKEROLE.extraAttributes) {
      this.extra[key] ??= { value: 2, min: 0, max: 5 };
    }
  }
}
