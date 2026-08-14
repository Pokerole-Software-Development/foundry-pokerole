/**
 * Data model for Item-type items (held items, key items, medicine, etc.).
 */
import { POKEROLE } from "../helpers/config.mjs";
import { PokeroleItemBaseData } from "./item-base.mjs";
import { migrateRuleKinds } from "./fields.mjs";

const { NumberField, StringField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;

export class PokeroleItemItemData extends PokeroleItemBaseData {

  /** @override */
  static migrateData(source) {
    migrateRuleKinds(source);
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...super.defineSchema(),

      quantity: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      weight: new NumberField({ required: true, initial: 0, min: 0 }),
      // null means no fixed gold price (e.g. "Not for Sale").
      price: new NumberField({ required: true, integer: true, initial: 0, min: 0, nullable: true }),
      pocket: new StringField({ required: true, initial: "item", choices: Object.keys(POKEROLE.itemCategory) }),

      enabled: new BooleanField({ initial: true }),
      // Rules only apply while this item is the actor's equipped item (see PokeroleActor#activeItem).
      rules: new ArrayField(new ObjectField()),

      // Whether using this item consumes one Quantity (with a confirm-to-use prompt), deleting the
      // item entirely once Quantity reaches 0. See PokeroleItem#useConsumable().
      consumable: new BooleanField({ initial: false }),
      // Configurable "Usage Lines" - each posts its own button on a follow-up chat card when the
      // item is used (see PokeroleItem#postUsageLinesCard()/#executeUsageLine()). Heterogeneous
      // per-kind shape, kept loose like `rules` above - the Usage Lines editor on the Properties tab
      // (item-item-sheet.mjs) is the source of truth for row shape, not this schema. Row shape:
      //   { kind: 'roll'|'heal'|'damage'|'accuracy'|'healStatus'|'effects', label, target: 'user'|'target', formula,
      //     heal: { mode: 'roll'|'fixed', amount },
      //     damage: { mode: 'roll'|'fixed', amount, type, category, ignoreDefenses },
      //     healStatus: { ailments: string[] },
      //     effectGroups: [{ condition: {type:'none'|'chanceDice', amount?}, effects: [{type:'ailment'|'statChange', ailment?, stat?, amount?}] }] }
      //   effectGroups mirrors Move's own field (item-move.mjs) but drops the per-effect `affects` -
      //   the whole line's `target` above governs who every effect in every group applies to.
      usageLines: new ArrayField(new ObjectField())
    };
  }
}
