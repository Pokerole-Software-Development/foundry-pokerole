/**
 * TEMPORARY V13 compatibility shim - DELETE this file once V13 support is dropped (see
 * release_notes.md's Notes section), then in effects.mjs revert the 4 `showIcon: SHOW_ICON_ALWAYS`
 * call sites back to `showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS` and remove its import, and
 * in actor.mjs remove applyV13IconDurationCompat's import and unwrap its one call site.
 *
 * Foundry V14 added ActiveEffect#showIcon (this system's shadow icon-only effects - ailments,
 * pain penalty, custom effects, stat changes - all set it to ALWAYS), letting a token icon show
 * regardless of duration. V13 has no such field **at all** - CONST.ACTIVE_EFFECT_SHOW_ICON itself
 * is undefined there, so referencing `.ALWAYS` on it directly throws (not just gets ignored) -
 * see Issue #145.
 */

// Safe stand-in for CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS - undefined (and harmlessly ignored by
// ActiveEffect's schema) under V13 instead of throwing.
export const SHOW_ICON_ALWAYS = CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS;

/** V13 has no showIcon override, so instead falls back to only showing an icon if the effect isTemporary (has a real, finite duration) - give shadow icon-effects a very long one there so they still show. */
export function applyV13IconDurationCompat(effectData) {
  if (game.release.generation >= 14) return effectData;
  // An effectively-permanent, non-combat-dependent duration (seconds, not rounds - rounds only
  // resolve to a finite value while a Combat is active, which token status icons shouldn't
  // depend on) - just enough to satisfy isTemporary so V13 shows the icon. This system removes
  // these shadow effects itself via _doSyncIconEffects()'s diffing, not natural expiry.
  return { ...effectData, duration: { seconds: 999999999 } };
}
