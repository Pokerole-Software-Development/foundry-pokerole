import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleActorBaseData } from "./actor-base.mjs";
import { attributeField, scaleField } from "./fields.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, DocumentUUIDField } = foundry.data.fields;

export class PokeroleActorTrainerData extends PokeroleActorBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      baseHp: new NumberField({ required: true, integer: true, initial: 4, min: 0 }),

      // Trainers have a lower attribute cap than Pokémon, and don't use the Special stat
      attributes: new SchemaField({
        strength: attributeField(5),
        dexterity: attributeField(5),
        vitality: attributeField(5),
        special: attributeField(0, 0),
        insight: attributeField(5)
      }),

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
        Object.fromEntries(POKEROLE.trainerSkills.map(key => [key, scaleField(0, 5)]))
      ),

      // Trainers don't have Happiness/Loyalty, but the key is kept for parity with Pokémon
      extra: new SchemaField({}),

      // UUIDs of up to 6 owned Pokémon Actors that make up this Trainer's team (Team tab)
      team: new ArrayField(new DocumentUUIDField({ type: "Actor", embedded: false }), { max: 6 })
    };
  }
}
