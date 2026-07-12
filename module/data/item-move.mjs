import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleItemBaseData } from "./item-base.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;

/** A free-text attribute/skill name used to build a Move's accuracy or damage pool (e.g. 'strength') */
function poolRefField() {
  return new StringField({ required: false, nullable: true, blank: true, initial: null });
}

export class PokeroleItemMoveData extends PokeroleItemBaseData {

  /** Migrate pre-v14 raw `target` values (e.g. "User" -> "Self") to their current equivalents. */
  static migrateData(source) {
    const targetMigrations = {
      "User": "Self",
      "One Ally": "Ally",
      "User and Allies": "All Allies",
      "Battlefield (Foes)": "Foe's Battlefield",
      "Battlefield and Area": "Ally's Battlefield"
    };
    if (source.target in targetMigrations) {
      source.target = targetMigrations[source.target];
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...super.defineSchema(),

      type: new StringField({ required: true, initial: "none", choices: Object.keys(POKEROLE.typeMatchups) }),
      category: new StringField({ required: true, initial: "physical", choices: POKEROLE.moveCategories }),
      target: new StringField({ required: true, initial: "Foe", choices: POKEROLE.moveTargets }),
      power: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      effect: new StringField({ required: true, initial: "" }),

      accAttr1: poolRefField(),
      accSkill1: poolRefField(),
      dmgMod1: poolRefField(),
      accAttr1var: poolRefField(),
      accSkill1var: poolRefField(),
      dmgMod1var: poolRefField(),

      attributes: new SchemaField({
        accuracyReduction: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        reactionMove: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        lateReactionMove: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        ...Object.fromEntries(POKEROLE.moveFlags.map(key => [key, new BooleanField({ initial: false })]))
      }),

      heal: new SchemaField({
        type: new StringField({ required: true, initial: "none", choices: POKEROLE.healTypes }),
        amount: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        willPointCost: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
        target: new StringField({ required: true, initial: "targets", choices: POKEROLE.effectTargets })
      }),

      // Heterogeneous shapes (condition.type: 'none'|'chanceDice', effects[].type: 'ailment'|'statChange'
      // with different sub-fields each) - kept loose like Actor#ailments rather than a strict schema.
      effectGroups: new ArrayField(new ObjectField()),

      // These 4 fields aren't declared in the legacy template.json at all, but are read/written
      // throughout actor-sheet.mjs and item.mjs (learning moves, tracking round usage, rank grouping).
      // They MUST be declared here or a strict schema would silently drop them.
      rank: new StringField({ required: true, initial: "starter", choices: [...POKEROLE.ranks.slice(1), "maneuver"] }),
      learned: new BooleanField({ initial: false }),
      usedInRound: new BooleanField({ initial: false }),
      overrank: new BooleanField({ initial: false })
    };
  }
}
