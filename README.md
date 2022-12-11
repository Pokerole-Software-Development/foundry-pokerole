# Pokérole

Work-in-progress [FoundryVVT](https://foundryvtt.com/) system for [Pokérole](https://www.pokeroleproject.com/).

Partially based on [Boilerplate](https://gitlab.com/asacolips-projects/foundry-mods/boilerplate) and [dnd5e](https://github.com/foundryvtt/dnd5e).

## Compiling the CSS

This repo includes both CSS for the theme and SCSS source files. If you're new to CSS, it's probably easier to just work in those files directly and delete the SCSS directory. If you're interested in using a CSS preprocessor to add support for nesting, variables, and more, you can run `npm install` in this directory to install the dependencies for the scss compiler. After that, just run `npm run gulp` to compile the SCSS and start a process that watches for new changes.

## Installation

Copy the folder with the built CSS files to `[Foundry data directory]/Data/systems/pokerole`. This system is in early development, using it is not recommended as features are missing and non-backwards compatible changes to data will occur.
