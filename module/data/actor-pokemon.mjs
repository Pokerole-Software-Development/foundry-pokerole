import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleActorBaseData } from "./actor-base.mjs";

const { NumberField, StringField, BooleanField, ObjectField } = foundry.data.fields;

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
      painPenalty: new StringField({ required: true, initial: "none", choices: Object.keys(POKEROLE.painPenalties) }),
      sheetskin: new StringField({ required: true, initial: "skinOld" }),

      // Kept as loose objects (not a strict SchemaField) so players can add custom skills/attributes
      // via the sheet UI - see prepareBaseData() below, which backfills the standard keys.
      skills: new ObjectField({ required: true, initial: {} }),
      extra: new ObjectField({ required: true, initial: {} })
    };
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
