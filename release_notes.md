# Release v0.7.0

## Changelog
- **Pain Penalty Rework**: Pain Penalty level is now derived automatically from HP, shown as a token icon (toggleable in settings) and a "Pain Resisted" field on the sheet. Spend Willpower to resist points of Pain Penalty, and its effect is now shown directly in roll chat messages (#123).
- **Reroll From Chat**: reroll failed dice on any Attribute, Skill, Accuracy, Clash, or Damage roll straight from the chat message's context menu - one reroll per message, updates the message in place (#124).
- **Damage Pool Formulas**: moves whose damage doesn't follow the standard power+stat formula (Super Fang, Horn Drill, Dragon Rage, Heavy Slam, and similar) can now be configured directly on the Move sheet instead of needing special-cased code.
- **Native HP Bar Support**: dragging a token's HP bar directly on the canvas (or a third-party module modifying it) now triggers the same fainting/Pain Penalty/healing logic as the "Apply Damage"/"Apply Healing" chat buttons, instead of being exclusive to our own UI.
- **Move Sheet Layout**: reorganized the Attributes tab for readability - related fields grouped together, Reaction/Late Reaction combined into one row.
- **Bugs & Fixes**: a heal landing exactly on max HP incorrectly said "already has full HP"; quick-ailment-list icons were invisible in Light theme.

## Notes
Please ensure you backup your existing module folder before updating.
This system remains compatible with Foundry V13, but V13 support is expected to end in an upcoming release.
