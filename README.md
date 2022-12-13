# Pokérole

Work-in-progress [FoundryVVT](https://foundryvtt.com/) system for [Pokérole](https://www.pokeroleproject.com/). **Note that this system is in early development, using it in actual games is not recommended as features are missing and non-backwards compatible changes to data will occur.**

Partially based on [Boilerplate](https://gitlab.com/asacolips-projects/foundry-mods/boilerplate) and [dnd5e](https://github.com/foundryvtt/dnd5e).

## Usage

### Trainer character creation
Trainer sheets are not yet supported, but you can create a Pokémon sheet in the "Actors" tab and add all missing skills in the meantime.

### Pokémon character creation

Open the compendium in the second tab from the right and go to the "Pokémon" tab. Right-click a Pokémon you'd like to use and click "Import". The newly imported Pokémon will now show up in the Actors tab. Click the "Rank" dropdown menu to choose a starting rank and distribute skills and attributes.

### Success-based rolls
Pokérole is a d6-based role-playing system, where most rolls are based on successes. Whether action rolls are successful is determined by how many of the rolled dice (also referred to as the "dice pool") come up as 4 or higher.

This system adds a custom chat command for convenient success-based rolls: Enter `/sc` followed by a space and the number of dice you want to roll in the chat. While a token is selected, you can also enter a formula based on your attributes and skills, such as `/sc dexterity+channel+2`.

## Tips
- Assign characters to each user by right-clicking their name under "Players" in the bottom right and selecting "User Configuration". This allows players to roll without selecting a token.
- You can skip the dialogue for accuracy rolls by holding the Shift key while clicking the "Roll Accuracy" button
- Right-click any tab on the right to open it in a movable window. Especially useful to show the chat while in combat.

## Recommended modules

This system implements special support for the following optional modules:
- [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/): Adds 3D animation to dice rolls. Custom roll commands such as `/sc` are supported.
- [PopOut](https://foundryvtt.com/packages/popout): Allows displaying documents in a separate window.

The following modules are known to work and provide useful functionality:
- [Quick Insert - Search Widget](https://foundryvtt.com/packages/quick-insert): Adds a search tool that can be accessed with Ctrl+Space. Useful for searching through the large compendiums.
- [Next Up](https://foundryvtt.com/packages/Next-Up): Adds a config option to automatically open the active combatant's character sheet. Useful for Storytellers in battle.

## Development

### Compiling the CSS

This repo includes both CSS for the theme and SCSS source files. If you're new to CSS, it's probably easier to just work in those files directly and delete the SCSS directory. If you're interested in using a CSS preprocessor to add support for nesting, variables, and more, you can run `npm install` in this directory to install the dependencies for the scss compiler. After that, just run `npm run gulp` to compile the SCSS and start a process that watches for new changes.

### Installation from source

Run `npm run build`, then copy/symlink this folder to `[Foundry data directory]/Data/systems/pokerole`.
