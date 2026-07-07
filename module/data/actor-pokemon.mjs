import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleActorBaseData } from "./actor-base.mjs";
import { scaleField } from "./fields.mjs";

const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;

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

      skills: new SchemaField(
        Object.fromEntries(POKEROLE.pokemonSkills.map(key => [key, scaleField(0, 5)]))
      ),

      extra: new SchemaField(
        Object.fromEntries(POKEROLE.extraAttributes.map(key => [key, scaleField(2, 5)]))
      )
    };
  }
}
