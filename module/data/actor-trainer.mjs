import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleActorBaseData } from "./actor-base.mjs";
import { attributeField } from "./fields.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, ObjectField, DocumentUUIDField } = foundry.data.fields;

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

      // Loose objects (not SchemaField) so custom skills/attributes can be added - see prepareBaseData().
      skills: new ObjectField({ required: true, initial: {} }),
      extra: new ObjectField({ required: true, initial: {} }),

      // UUIDs of up to 6 owned Pokémon Actors that make up this Trainer's team (Team tab)
      team: new ArrayField(new DocumentUUIDField({ type: "Actor", embedded: false }), { max: 6 })
    };
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    for (const key of POKEROLE.trainerSkills) {
      this.skills[key] ??= { value: 0, min: 0, max: 5 };
    }
  }
}
