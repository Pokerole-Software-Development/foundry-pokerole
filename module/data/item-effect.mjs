/**
 * Data model for Custom Effect items, which apply a list of rules to an actor via _applyEffects().
 */
import { PokeroleItemBaseData } from "./item-base.mjs";
import { migrateRuleKinds } from "./fields.mjs";

const { BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemEffectData extends PokeroleItemBaseData {

  /** @override */
  static migrateData(source) {
    migrateRuleKinds(source);
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...super.defineSchema(),

      enabled: new BooleanField({ initial: true }),
      visible: new BooleanField({ initial: true }),

      // Each rule is {attribute, operator: 'add'|'replace', value}, kept as a loose object since `attribute` is a free-form path (e.g. 'system.attributes.strength.value').
      rules: new ArrayField(new ObjectField())
    };
  }
}
