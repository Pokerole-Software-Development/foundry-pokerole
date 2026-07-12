import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleItemBaseData } from "./item-base.mjs";

const { NumberField, StringField } = foundry.data.fields;

export class PokeroleItemItemData extends PokeroleItemBaseData {

  static defineSchema() {
    return {
      ...super.defineSchema(),

      quantity: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      weight: new NumberField({ required: true, initial: 0, min: 0 }),
      price: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      pocket: new StringField({ required: true, initial: "item", choices: Object.keys(POKEROLE.itemCategory) })
    };
  }
}
