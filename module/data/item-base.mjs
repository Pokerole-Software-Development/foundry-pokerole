/**
 * Base data model for Item documents; type-specific data models extend this.
 */
const { StringField, HTMLField } = foundry.data.fields;

/**
 * Fields shared by all Item types (`item`, `move`, `ability`, `effect`); type-specific subclasses extend this and add their own fields.
 */
export class PokeroleItemBaseData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      source: new StringField({ required: true, initial: "Homebrew" })
    };
  }
}
