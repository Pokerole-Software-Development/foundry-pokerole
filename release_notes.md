# Release v0.6.8

## Changelog
- **Foundry V14 Compatibility**: full migration to Foundry v14 - Actor/Item data now use DataModel/TypeDataModel schemas instead of the legacy template.json, all dialogs converted to DialogV2/ApplicationV2, and numerous v14-only API fixes across ActiveEffects and chat messages. Still compatible with v13 (#84, #83, #108, #106).
- **Item/Move/Effect Reordering**: drag-and-drop reordering within a list works again - it silently stopped working after the V13 migration (#106).
- **Auto-Added Maneuver Moves**: newly created Pokémon/Trainer actors automatically get the 11 universal maneuver moves (Struggle, Clash, Evasion, Run Away, etc.) (#109, #80).
- **Sheet Usability**: ability/held-item/biography fields stay editable in Play mode, dialogs are non-modal where appropriate, and each user can set their own default Play/Edit sheet mode (#103, #104, #105).
- **Target Limit Settings**: two new world settings let a GM enforce rank-based target limits on multi-target moves, and restrict single-target moves to exactly one target (#37).
- **Bugs & Fixes**: numerous stability and compatibility fixes across character sheets, chat commands, damage rolls, and multi-client synchronization (#89, #96, #98, #100, #117, #118, #119, #120, #121).

## Developer Notes
- **Team Tab (Prototype)**: Trainer sheets can manage a team of up to 6 Pokémon with drag-and-drop, live stat sync, and drag-to-canvas token creation. Hidden behind "Enable Developer Options" - still in development, not yet production-ready.
- Pre-release and legacy builds are now clearly labeled with a distinct version/description, and the CI workflow supports pinned-manifest prerelease/legacy release types.

## Notes
Please ensure you backup your existing module folder before updating.
This system remains compatible with Foundry V13, but V13 support is expected to end in an upcoming release.
