# Release v0.6.8

## Changelog
- Fix skills/attributes showing "[object Object]" instead of their base number (#121).
- Fix the "Fainted" status icon no longer covering the whole token.
- Fix permission errors and duplicate effects when a GM changes ailments/effects on another player's actor while both are connected.
- Fix the Effect sheet's Rules tab columns not aligning and the delete icon wrapping to its own line (part of #98).
- Fix the Move sheet leaving empty space in Play mode (#96).

## Notes
Please ensure you backup your existing module folder before updating.

# Release v0.6.7

## Changelog
- Fix Foundry v13 compatibility broken by the v0.6.6 QA fixes (`/sc`/`/cd` chat commands and custom attribute/skill deletion both relied on v14-only APIs with no fallback).

## Notes
Please ensure you backup your existing module folder before updating.

# Release v0.6.6

## Changelog
QA follow-up pass on the v0.6.5 pre-release build.

- Fix error when toggling a status effect icon from the Token HUD (#120).
- Fix custom attributes and skills not being creatable on Actor sheets (#119).
- Fix Status Effects panel spacing/layout in the Token HUD (#118).
- Fix "Create Folder" button missing from the Actors/Items/Scenes directories (#117).
- Fix deprecation warning when deleting a custom attribute or skill.
- Fix `/sc` and `/cd` chat commands not being recognized.

## Notes
Please ensure you backup your existing module folder before updating.
