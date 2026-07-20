/**
 * Data model for Ability items.
 */
import { PokeroleItemBaseData } from "./item-base.mjs";

const { BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemAbilityData extends PokeroleItemBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      enabled: new BooleanField({ initial: true }),
      // Rules only apply while this ability is the actor's active ability (see PokeroleActor#activeAbility).
      rules: new ArrayField(new ObjectField())
    };
  }
}
