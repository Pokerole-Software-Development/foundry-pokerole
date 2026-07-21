/** ApplicationV2 settings-menu dialogs registered by this system, grouping related world/user settings out of the flat Configure Settings list. */

/** Shared per-setting metadata (localized label/hint, pulled straight from the setting's own registration so labels never drift out of sync). */
function settingMeta(key) {
  const def = game.settings.settings.get(`pokerole.${key}`);
  return {
    key,
    value: game.settings.get('pokerole', key),
    label: game.i18n.localize(def.name),
    hint: game.i18n.localize(def.hint),
    choices: def.choices
  };
}

/** Persist every changed setting whenever the form is submitted (submitOnChange, shared by all menus below). */
async function onSubmitSettings(event, form, formData) {
  for (const [key, value] of Object.entries(formData.object)) {
    await game.settings.set('pokerole', key, value);
  }
}

/**
 * Settings menu for optional/homebrew rules from the rulebook - stat calculation, combat mechanics,
 * cosmetic options, and the ailment homebrew constants (formerly its own separate "Ailments" menu).
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class PokeroleRegionalRulesMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'pokerole-regional-rules',
    tag: 'form',
    classes: ['pokerole', 'standard-form'],
    window: {
      title: 'POKEROLE - Regional Rules',
      icon: 'fas fa-book',
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    },
    form: {
      handler: onSubmitSettings,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/pokerole/templates/settings/settings-regional-rules.hbs',
      scrollable: ['']
    }
  };

  /** @override */
  async _prepareContext(options) {
    return {
      specialDefenseStat: settingMeta('specialDefenseStat'),
      forceAttributeHP: settingMeta('forceAttributeHP'),
      sharedMultiTargetDamage: settingMeta('sharedMultiTargetDamage'),
      disablePainPenalty: settingMeta('disablePainPenalty'),
      genderOption: settingMeta('genderOption'),
      burnConst: settingMeta('burnConst'),
      frozenConst: settingMeta('frozenConst'),
      paralysisConst: settingMeta('paralysisConst')
    };
  }
}

/**
 * Settings menu for GM-facing world display options (token overlays, chat message behavior).
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class PokeroleDisplayOptionsMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'pokerole-display-options',
    tag: 'form',
    classes: ['pokerole', 'standard-form'],
    window: {
      title: 'POKEROLE - Display Options',
      icon: 'fas fa-eye',
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    },
    form: {
      handler: onSubmitSettings,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/pokerole/templates/settings/settings-display-options.hbs',
      scrollable: ['']
    }
  };

  /** @override */
  async _prepareContext(options) {
    return {
      autoBuff: settingMeta('autoBuff'),
      showPainPenaltyIcon: settingMeta('showPainPenaltyIcon'),
      suppressTokenBarChatMessage: settingMeta('suppressTokenBarChatMessage')
    };
  }
}

/**
 * Settings menu for personal sheet preferences (Play/Edit defaults, bubbles). Not restricted -
 * these are `scope: 'user'` settings every player should be able to set for themselves.
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class PokeroleSheetPreferencesMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'pokerole-sheet-preferences',
    tag: 'form',
    classes: ['pokerole', 'standard-form'],
    window: {
      title: 'POKEROLE - Sheet Preferences',
      icon: 'fas fa-address-card',
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    },
    form: {
      handler: onSubmitSettings,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/pokerole/templates/settings/settings-sheet-preferences.hbs',
      scrollable: ['']
    }
  };

  /** @override */
  async _prepareContext(options) {
    return {
      showBubbles: settingMeta('showBubbles'),
      defaultActorSheetMode: settingMeta('defaultActorSheetMode'),
      defaultItemSheetMode: settingMeta('defaultItemSheetMode')
    };
  }
}

/**
 * Settings menu for combat/roll automation rules (action counters, target limits, rerolls).
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class PokeroleAutomationMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'pokerole-automation',
    tag: 'form',
    classes: ['pokerole', 'standard-form'],
    window: {
      title: 'POKEROLE - Automation',
      icon: 'fas fa-robot',
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    },
    form: {
      handler: onSubmitSettings,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/pokerole/templates/settings/settings-automation.hbs',
      scrollable: ['']
    }
  };

  /** @override */
  async _prepareContext(options) {
    return {
      combatResourceAutomation: settingMeta('combatResourceAutomation'),
      enforceSingleTargetLimit: settingMeta('enforceSingleTargetLimit'),
      enforceTargetLimit: settingMeta('enforceTargetLimit'),
      maxRerollsPerMessage: settingMeta('maxRerollsPerMessage')
    };
  }
}
