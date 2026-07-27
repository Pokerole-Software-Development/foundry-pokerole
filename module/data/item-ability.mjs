/**
 * Data model for Ability items.
 */
import { PokeroleItemBaseData } from "./item-base.mjs";
import { migrateRuleKinds } from "./fields.mjs";

const { BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemAbilityData extends PokeroleItemBaseData {

  /** @override */
  static migrateData(source) {
    migrateRuleKinds(source);
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...super.defineSchema(),

      enabled: new BooleanField({ initial: true }),
      // Rules only apply while this ability is the actor's active ability (see PokeroleActor#activeAbility).
      rules: new ArrayField(new ObjectField())
    };
  }
}
