/**
 * DialogV2 that edits a Pokémon's raw `system.evolutions[]` array - no in-game editor existed
 * before this, the data was only ever populated by the external data-build pipeline. One-shot
 * save dialog (not a live sheet tab like the Custom Effect rules editor): rows are added/removed
 * client-side by cloning a hidden template row, and on Save the whole array is rebuilt directly
 * from whatever `.evolution-editor-row` elements are present in the DOM at that moment.
 */
export class EvolutionsEditorDialog extends foundry.applications.api.DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pokerole", "evolutions-editor"],
  };

  static TEMPLATE_PATH = "systems/pokerole/templates/actor/evolutions-editor.hbs";

  static DIRECTION_CHOICES = { to: "To (evolves into)", from: "From (evolved from)" };
  static KIND_CHOICES = {
    level: "Level", stone: "Stone", item: "Item", stat: "Stat",
    special: "Special", trade: "Trade", mega: "Mega", form: "Form"
  };
  static SPEED_CHOICES = { fast: "Fast", medium: "Medium", slow: "Slow" };

  /**
   * Create and show the Evolutions editor for a Pokémon.
   * @param {PokeroleActor} actor
   * @returns {Promise<boolean>} Whether the list was saved
   */
  static async show(actor) {
    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATE_PATH, {
      rows: actor.system.evolutions ?? [],
      templateRow: { direction: "to", species: "", kind: "level", speed: "fast", item: "", stat: "", value: "", special: "" },
      directionChoices: this.DIRECTION_CHOICES,
      kindChoices: this.KIND_CHOICES,
      speedChoices: this.SPEED_CHOICES
    });

    const result = await this.wait({
      window: {
        title: `Evolutions - ${actor.name}`,
        resizable: true
      },
      position: { width: 820 },
      content,
      buttons: [
        {
          action: 'save',
          label: 'Save',
          default: true,
          callback: (event, button, dialog) => dialog.element
        }
      ],
      render: (event, dialog) => this._setupDialogListeners(dialog.element),
      rejectClose: false
    });

    if (!result) return false;

    const html = result[0] ?? result;
    const rows = [];
    // Scoped to .evolution-editor-rows specifically, not the whole dialog - the hidden template
    // row used for cloning lives in a separate .evolution-editor-row-template wrapper and must
    // never be read back as real data.
    for (const rowEl of html.querySelectorAll('.evolution-editor-rows .evolution-editor-row')) {
      const species = rowEl.querySelector('.ee-species').value.trim();
      if (!species) continue;

      const kind = rowEl.querySelector('.ee-kind').value;
      const row = {
        direction: rowEl.querySelector('.ee-direction').value,
        species,
        kind,
        item: null, speed: null, stat: null, value: null, special: null
      };
      if (kind === 'level') {
        row.speed = rowEl.querySelector('.ee-speed').value;
      } else if (['stone', 'item', 'trade', 'mega'].includes(kind)) {
        row.item = rowEl.querySelector('.ee-item').value.trim() || null;
      } else if (kind === 'stat') {
        row.stat = rowEl.querySelector('.ee-stat').value.trim() || null;
        const value = parseInt(rowEl.querySelector('.ee-value').value);
        row.value = Number.isNaN(value) ? null : value;
      } else if (kind === 'special') {
        row.special = rowEl.querySelector('.ee-special').value.trim() || null;
      }
      rows.push(row);
    }

    await actor.update({ "system.evolutions": rows });
    return true;
  }

  /**
   * Wire the Add-row button (clones the hidden template row) and every row's delete button
   * (including ones added later, via delegation).
   * @param {HTMLElement} html
   * @private
   */
  static _setupDialogListeners(html) {
    const rowsContainer = html.querySelector('.evolution-editor-rows');
    const templateRow = html.querySelector('.evolution-editor-row-template .evolution-editor-row');

    html.querySelector('.evolution-editor-add')?.addEventListener('click', () => {
      const clone = templateRow.cloneNode(true);
      rowsContainer.appendChild(clone);
    });

    rowsContainer.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.evolution-editor-delete');
      if (deleteBtn) {
        deleteBtn.closest('.evolution-editor-row').remove();
      }
    });
  }
}
