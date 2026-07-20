/** ApplicationV2 settings-menu dialogs registered by this system (currently just the Ailments menu). */

/**
 * Settings menu for the "Ailments Constants" homebrew options (burnConst/frozenConst/paralysisConst).
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class PokeroleAilmentsMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'pokerole-ailments',
    tag: 'form',
    classes: ['pokerole', 'standard-form'],
    window: {
      title: 'POKEROLE - Ailment settings',
      icon: 'fas fa-wrench'
    },
    position: {
      width: 500,
      height: 'auto'
    },
    form: {
      handler: PokeroleAilmentsMenu.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/pokerole/templates/settings/settings-ailments.hbs'
    }
  };

  /** @override */
  async _prepareContext(options) {
    return {
      burnConst: game.settings.get('pokerole', 'burnConst'),
      frozenConst: game.settings.get('pokerole', 'frozenConst'),
      paralysisConst: game.settings.get('pokerole', 'paralysisConst')
    };
  }

  /**
   * Persist a changed setting whenever the form is submitted (on every change, see submitOnChange above).
   */
  static async #onSubmit(event, form, formData) {
    for (const [key, value] of Object.entries(formData.object)) {
      await game.settings.set('pokerole', key, value);
    }
  }
}
