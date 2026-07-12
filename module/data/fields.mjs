const { SchemaField, NumberField } = foundry.data.fields;

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
