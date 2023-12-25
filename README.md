# Pokérole

Work-in-progress [FoundryVTT](https://foundryvtt.com/) system for [Pokérole](https://www.pokeroleproject.com/). **Note that this system is in early development, using it in actual games is not recommended as features are missing and non-backwards compatible changes to data will occur.**

Partially based on [Boilerplate](https://gitlab.com/asacolips-projects/foundry-mods/boilerplate) and [dnd5e](https://github.com/foundryvtt/dnd5e). Powered by [Pokerole-Data](https://github.com/Willowlark/Pokerole-Data).

## Installation
Open the *Game Systems* tab and click *Install System*, then enter `https://raw.githubusercontent.com/tech-ticks/foundry-pokerole/main/system.json` as the manifest URL and click *Install*.

## Usage

### Trainer character creation
Trainer sheets are not yet supported, but you can create a Pokémon sheet in the "Actors" tab and add all missing skills in the meantime.

### Pokémon character creation

Open the compendium in the second tab from the right and go to the "Pokémon" tab. Right-click a Pokémon you'd like to use and click "Import". The newly imported Pokémon will now show up in the Actors tab. Click the "Rank" dropdown menu to choose a starting rank and distribute skills and attributes.

### Success-based rolls
Pokérole is a d6-based role-playing system, where most rolls are based on successes. Whether action rolls are successful is determined by how many of the rolled dice (also referred to as the "dice pool") come up as 4 or higher.

This system adds a custom chat command for convenient success-based rolls: Enter `/sc` (or `/successroll`) followed by a space and the number of dice you want to roll in the chat. While a token is selected, you can also enter a formula based on your attributes and skills, such as `/sc dexterity+channel+2`.

Some effects require chance dice rolls instead of success-based rolls. These rolls succeed when any of the rolled dice come up as a 6. You can use the command `/cd` (or `/chancedice`) followed by a number or formula to roll with this behavior.

## Tips
- Click the icon on a move on the character sheet to automatically roll for accuracy and damage.
- You can configure the combat tracker to show a tracked value for each character: click the Cog icon (Combat Tracker Settings) in the "Combat Encounters" tab to select a resource like `hp.value`.
- Drag moves, items and abilities from a character sheet into the macro bar at the bottom of the screen to activate the item's effects via hotkeys.
- Assign characters to each user by right-clicking their name under "Players" in the bottom right and selecting "User Configuration". This allows players to roll without selecting a token.
- You can skip the dialog for accuracy rolls and attribute checks by holding the Shift key while clicking the "Roll Accuracy" button or an attribute in the character sheet.
- Right-click any tab on the right to open it in a movable window. Especially useful to show the chat while in combat.
- Use the "Select Targets" tool under "Token Controls" to automatically apply damage to enemy tokens on damage rolls.

## Recommended modules

This system implements special support for the following optional modules:
- [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/): Adds 3D animation to dice rolls. Custom roll commands such as `/sc` are supported.
- [Item Piles](https://foundryvtt.com/packages/item-piles): Adds lootable objects that can be added to the canvas, item trading between players, merchants and more. If this module is installed, it is automatically configured with the right settings to work with this system.
- [PopOut](https://foundryvtt.com/packages/popout): Allows displaying documents in a separate window.

The following modules are known to work and provide useful functionality:
- [Quick Insert - Search Widget](https://foundryvtt.com/packages/quick-insert): Adds a search tool that can be accessed with Ctrl+Space. Useful for searching through the large compendiums.
- [Next Up](https://foundryvtt.com/packages/Next-Up): Adds a config option to automatically open the active combatant's character sheet. Useful for Storytellers in battle.

## Development

### Compiling the CSS

This repository includes SCSS files that must be compiled to CSS. Run `npm install` followed by `npm run gulp` to automatically watch for changes in SCSS files.

### Installation from source

Run `npm install` followed by `npm run build`, then copy/symlink this folder to `[Foundry data directory]/Data/systems/pokerole`.
