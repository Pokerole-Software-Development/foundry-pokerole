# Release v0.7.0

## Changelog
- **Pain Penalty Rework**: Pain Penalty level is now derived automatically from HP, shown as a token icon (toggleable in settings) and a "Pain Resisted" field on the sheet. Spend Willpower to resist points of Pain Penalty, and its effect is now shown directly in roll chat messages (#123).
- **Pain Penalty Settings**: new world setting to disable the Pain Penalty mechanic entirely (hides the sheet section, no calculations, no Willpower prompt), plus a per-actor override to manually force a Pain Penalty level regardless of HP.
- **Held Item & Ability Effects**: Held Items and Abilities can now carry the same custom rule-based effects as Custom Effect items, applying automatically while equipped/active (with their own enable toggle). The sheet's Conditions and Effects tab shows a new "Held Item & Ability" panel reflecting what's currently equipped.
- **Reroll From Chat**: reroll failed dice on any Attribute, Skill, Accuracy, Clash, or Damage roll straight from the chat message's context menu - one reroll per message, updates the message in place (#124).
- **Damage Pool Formulas**: moves whose damage doesn't follow the standard power+stat formula (Super Fang, Horn Drill, Dragon Rage, Heavy Slam, and similar) can now be configured directly on the Move sheet instead of needing special-cased code.
- **Native HP Bar Support**: dragging a token's HP bar directly on the canvas (or a third-party module modifying it) now triggers the same fainting/Pain Penalty/healing logic as the "Apply Damage"/"Apply Healing" chat buttons, instead of being exclusive to our own UI.
- **Unlimited Uses**: Moves can now be flagged to skip the once-per-round usage lock, for both Accuracy rolls and Clash (#88).
- **Move Sheet Layout**: reorganized the Attributes tab for readability - related fields grouped together, Reaction/Late Reaction combined into one row.
- **Bugs & Fixes**: a heal landing exactly on max HP incorrectly said "already has full HP"; quick-ailment-list icons were invisible in Light theme; Advanced rank's multi-target limit was 5 instead of 4 when "Enforce Rank Target Limit" is enabled.

## Notes
Please ensure you backup your existing module folder before updating.
This system remains compatible with Foundry V13, but V13 support is expected to end in an upcoming release.
