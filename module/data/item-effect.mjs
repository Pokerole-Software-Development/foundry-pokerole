import { PokeroleItemBaseData } from "./item-base.mjs";

const { BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemEffectData extends PokeroleItemBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      enabled: new BooleanField({ initial: true }),
      visible: new BooleanField({ initial: true }),

      // Each rule is {attribute, operator: 'add'|'replace', value}. `attribute` is a free-form
      // path (e.g. 'system.attributes.strength.value') meant to target any actor field, so it
      // can't be restricted to a fixed set of choices - kept as a loose object like Actor#ailments.
      rules: new ArrayField(new ObjectField())
    };
  }
}
