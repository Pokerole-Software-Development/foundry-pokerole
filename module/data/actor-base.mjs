import { POKEROLE } from "../helpers/config.mjs";
import { resourceField, attributeField, scaleField, plusMinusField } from "./fields.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, ObjectField, HTMLField } = foundry.data.fields;

/**
 * Fields shared by both `pokemon` and `trainer` actors.
 * Type-specific subclasses (PokeroleActorPokemonData, PokeroleActorTrainerData)
 * extend this and override individual keys as needed (e.g. attribute caps, skills).
 */
export class PokeroleActorBaseData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      hp: resourceField(0, 0),
      will: resourceField(0, 3),
      rank: new StringField({ required: true, initial: "none", choices: POKEROLE.ranks }),
      personality: new StringField({ required: true, initial: "hardy", choices: Object.keys(POKEROLE.natureConfidence) }),
      gender: new StringField({ required: true, initial: "neutral", choices: POKEROLE.genders }),
      baseHp: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      actionCount: resourceField(0, 5),
      canClash: new BooleanField({ initial: true }),
      canEvade: new BooleanField({ initial: true }),
      money: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),

      attributes: new SchemaField({
        strength: attributeField(10),
        dexterity: attributeField(10),
        vitality: attributeField(10),
        special: attributeField(10),
        insight: attributeField(10)
      }),

      social: new SchemaField(
        Object.fromEntries(POKEROLE.socialAttributes.map(key => [key, scaleField(1, 5)]))
      ),

      // Ailments have varying shapes (type, inflictedByUuid, moveUuid...), so they're
      // kept as loose objects rather than a strict schema for now.
      ailments: new ArrayField(new ObjectField()),

      customInitiativeMod: new NumberField({ required: true, integer: true, initial: 0 }),
      biography: new HTMLField({ required: true, initial: "" }),
      source: new StringField({ required: true, initial: "Homebrew" }),

      // IDs of the currently equipped/active Item (type 'item') and Ability (type 'ability').
      // No `choices` possible (they're per-actor Item ids) - resolve via PokeroleActor#activeItem/
      // #activeAbility getters rather than reading this raw id directly.
      activeItem: new StringField({ required: false, blank: true, initial: "" }),
      activeAbility: new StringField({ required: false, blank: true, initial: "" }),

      // Which attribute/derived stat received a "permanent" vitamin boost - display-only
      // indicator (the star icon in actor-attributes.hbs), doesn't affect any real calculation,
      // so no `choices` restriction (the two places that compare against this aren't even
      // consistent with each other about what the valid set is).
      avitamin: new StringField({ required: false, blank: true, initial: "" }),
      bvitamin: new StringField({ required: false, blank: true, initial: "" }),

      // Free-text character trait shown on the Biography tab
      trait: new StringField({ required: false, blank: true, initial: "" }),

      // Whether this actor is a "shiny"/variant color - shows a special icon on the header
      varicolor: new BooleanField({ initial: false }),

      // Persisted inputs for temporary combat modifiers. Their `.value` (plus - minus)
      // is recomputed every prepareBaseData() cycle and is NOT part of the schema.
      accuracyMod: plusMinusField(),
      statChanges: new SchemaField({
        strength: plusMinusField(),
        dexterity: plusMinusField(),
        special: plusMinusField(),
        def: plusMinusField(),
        spDef: plusMinusField()
      })
    };
  }

  /** @override */
  prepareBaseData() {
    this.statChanges = foundry.utils.mergeObject(this.statChanges ?? {}, {
      strength: { stat: 'system.attributes.strength.value' },
      dexterity: { stat: 'system.attributes.dexterity.value' },
      special: { stat: 'system.attributes.special.value' },
      def: { stat: 'system.derived.def.value' },
      spDef: { stat: 'system.derived.spDef.value' }
    });

    for (const statChange of Object.values(this.statChanges)) {
      statChange.plus ??= 0;
      statChange.minus ??= 0;
      statChange.value = statChange.plus - statChange.minus;
    }

    this.accuracyMod.plus ??= 0;
    this.accuracyMod.minus ??= 0;
    this.accuracyMod.value = this.accuracyMod.plus - this.accuracyMod.minus;
  }

  /** @override */
  prepareDerivedData() {
    const { totalPassiveIncrease, skillLimit } = POKEROLE.rankProgression[this.rank ?? 'none'] ?? [0, 0];

    for (const skill of Object.values(this.skills)) {
      skill.max = skillLimit;
    }

    if (game.settings.get('pokerole', 'forceAttributeHP') === 'vitality') {
      this.hp.max = this.baseHp + this.attributes.vitality.value + totalPassiveIncrease;
    } else if (game.settings.get('pokerole', 'forceAttributeHP') === 'insight') {
      this.hp.max = this.baseHp + this.attributes.insight.value + totalPassiveIncrease;
    } else if (game.settings.get('pokerole', 'forceAttributeHP') === 'higher') {
      this.hp.max = this.baseHp + Math.max(this.attributes.vitality.value, this.attributes.insight.value) + totalPassiveIncrease;
    } else if (game.settings.get('pokerole', 'specialDefenseStat') === 'insight') {
      this.hp.max = this.baseHp + Math.max(this.attributes.vitality.value, this.attributes.insight.value) + totalPassiveIncrease;
    } else {
      this.hp.max = this.baseHp + this.attributes.vitality.value + totalPassiveIncrease;
    }

    // TP Support Will+
    this.will.max = (this.willbonus ?? 0) + this.attributes.insight.value + POKEROLE.CONST.MAX_WILL_BONUS + totalPassiveIncrease;

    // Stat changes need to be applied manually here because derived stats are created
    // before `_applyEffects` runs on the Document
    const strength = Math.max(this.attributes.strength.value + this.statChanges.strength.value, 1);
    const dexterity = Math.max(this.attributes.dexterity.value + this.statChanges.dexterity.value, 1);
    const special = Math.max(this.attributes.special.value + this.statChanges.special.value, 1);

    this.derived = {
      initiative: {
        value: dexterity + this.skills.alert.value + this.customInitiativeMod + totalPassiveIncrease
      },
      evade: {
        value: dexterity + this.skills.evasion.value
      },
      clashPhysical: {
        value: strength + (this.skills?.clash?.value ?? 0)
      },
      clashSpecial: {
        value: special + (this.skills?.clash?.value ?? 0)
      },
      searchForCover: {
        value: this.attributes.insight.value + this.skills.alert.value
      },
      runAway: {
        value: this.attributes.dexterity.value + this.skills.athletic.value
      },
      def: {
        value: this.attributes.vitality.value + totalPassiveIncrease
      }
    };

    if (this.skills?.medicine?.value !== undefined) { // Pokémon don't have Medicine
      this.derived.useItem = { value: this.social.clever.value + this.skills.medicine.value };
    }

    if (game.settings.get('pokerole', 'specialDefenseStat') === 'insight') {
      this.derived.spDef = { value: this.attributes.insight.value + totalPassiveIncrease };
    } else {
      this.derived.spDef = { value: this.attributes.vitality.value + totalPassiveIncrease };
    }
  }
}
