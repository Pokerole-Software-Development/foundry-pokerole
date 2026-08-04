/**
 * Shared SchemaField factory functions reused across the actor/item data models.
 */
const { SchemaField, NumberField, BooleanField } = foundry.data.fields;

/** A {value, min, max} resource block (HP, Will, Action Count) */
export function resourceField(initialValue = 0, initialMax = 0) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, initial: initialValue, min: 0 }),
    min: new NumberField({ required: true, integer: true, initial: 0 }),
    max: new NumberField({ required: true, integer: true, initial: initialMax, min: 0 })
  });
}

/** A {value, min, max, base} attribute block (Strength, Insight, etc.) */
export function attributeField(initialMax = 10, initialValue = 1) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, initial: initialValue, min: 0 }),
    min: new NumberField({ required: true, integer: true, initial: 0 }),
    max: new NumberField({ required: true, integer: true, initial: initialMax, min: 0 }),
    base: new NumberField({ required: true, integer: true, initial: 1 })
  });
}

/** A {value, min, max} block used for Social attributes and Skills */
export function scaleField(initialValue = 0, initialMax = 5) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, initial: initialValue, min: 0 }),
    min: new NumberField({ required: true, integer: true, initial: 0 }),
    max: new NumberField({ required: true, integer: true, initial: initialMax, min: 0 })
  });
}

/** A {plus, minus} pair used for temporary stat/accuracy modifiers (see PokeroleActor#applyStatChange) */
export function plusMinusField() {
  return new SchemaField({
    plus: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
    minus: new NumberField({ required: true, integer: true, initial: 0, min: 0 })
  });
}

/**
 * One attribute's Vitamin/Rare Candy state (see PokeroleActor#_applyEffects) - independent toggles:
 * Vitamin adds to value, Rare Candy adds to both value and max, and both together stack.
 */
export function vitaminAttributeStateField() {
  return new SchemaField({
    vitamin: new BooleanField({ initial: false }),
    rareCandy: new BooleanField({ initial: false })
  });
}

/**
 * Backfills rule.kind = 'attribute' on any pre-existing rule missing it (TASK-16 - Attribute Override/
 * Type Override/Damage Pool Bonus). Existing {attribute, operator, value} rules keep working unchanged,
 * they just gain the discriminator the new rule kinds need. Shared by item-effect.mjs/item-item.mjs/item-ability.mjs.
 * @param {object} source - the item's `system` source data (not the whole item).
 */
export function migrateRuleKinds(source) {
  if (Array.isArray(source.rules)) {
    for (const rule of source.rules) {
      rule.kind ??= 'attribute';
    }
  }
}
