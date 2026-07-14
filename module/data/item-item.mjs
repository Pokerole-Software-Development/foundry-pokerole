import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleItemBaseData } from "./item-base.mjs";

const { NumberField, StringField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemItemData extends PokeroleItemBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      quantity: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      weight: new NumberField({ required: true, initial: 0, min: 0 }),
      // null means no fixed gold price (e.g. "Not for Sale") - see rarity for the source's rarity tier instead.
      price: new NumberField({ required: true, integer: true, initial: 0, min: 0, nullable: true }),
      rarity: new StringField({ required: false, blank: true, initial: "" }),
      pocket: new StringField({ required: true, initial: "item", choices: Object.keys(POKEROLE.itemCategory) }),

      enabled: new BooleanField({ initial: true }),
      // Rules only apply while this item is the actor's equipped item (see PokeroleActor#activeItem).
      rules: new ArrayField(new ObjectField())
    };
  }
}
