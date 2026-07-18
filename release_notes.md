# Release v0.7.0

## Changelog
- **Pain Penalty Rework**: Pain Penalty level is now derived automatically from HP, shown as a token icon (toggleable in settings) and a "Pain Resisted" field on the sheet, with its effect shown directly in roll chat messages. Spend Willpower to resist points of Pain Penalty. A new world setting can disable the mechanic entirely, and a per-actor override can manually force a Pain Penalty level regardless of HP (#123).
- **Held Item & Ability Effects**: Held Items and Abilities can now carry the same custom rule-based effects as Custom Effect items, applying automatically while equipped/active (with their own enable toggle). The sheet's Conditions and Effects tab shows a new "Held Item & Ability" panel reflecting what's currently equipped.
- **Reroll From Chat**: reroll failed dice on any Attribute, Skill, Accuracy, Clash, or Damage roll straight from the chat message's context menu - one reroll per message, updates the message in place (#124).
- **Damage Pool Formulas**: moves whose damage doesn't follow the standard power+stat formula (Super Fang, Horn Drill, Dragon Rage, Heavy Slam, and similar) can now be configured directly on the Move sheet instead of needing special-cased code.
- **Native HP Bar Support**: dragging a token's HP bar directly on the canvas (or a third-party module modifying it) now triggers the same fainting/Pain Penalty/healing logic as the "Apply Damage"/"Apply Healing" chat buttons, instead of being exclusive to our own UI.
- **Unlimited Uses**: Moves can now be flagged to skip the once-per-round usage lock, for both Accuracy rolls and Clash (#88).
- **Move Sheet Layout**: reorganized the Attributes tab for readability - related fields grouped together, Reaction/Late Reaction combined into one row.
- **Bugs & Fixes**: adding skills/attributes could fail on new actors (#138); Clash messages missing required successes (#137); wrong "full HP" message on some heals; ailment icons invisible in Light theme; Advanced rank target limit off by one; Reroll dialog input wrapping; Develop builds crashing on chat buttons.

## Notes
Please ensure you backup your existing module folder before updating.
This system remains compatible with Foundry V13, but V13 support is expected to end in an upcoming release.
