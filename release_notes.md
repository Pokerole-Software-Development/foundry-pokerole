# Release v0.8.0

## Changelog
- **Vitamins & Rare Candy**: Pokémon have a new Training tab where each core attribute (Strength/Dexterity/Vitality/Special/Insight) can be set to Vitamin or Rare Candy, granting +1 to its current value (never exceeding its max). Rare Candy is a strict upgrade over Vitamin - it also raises the attribute's max by 1. HP and Willpower have their own checkboxes that raise their max the same way. Attribute dots show Vitamin/Rare Candy increases in yellow, distinct from other bonus sources like Custom Effects (blue) (#132).
- **Training Points (TP) Actions**: the new Training tab also holds four TP-spending actions for Pokémon - **Rank Up** (advance to the next rank and allocate its points), **Retrain** (reset Attributes/Skills to reallocate at the current rank), **Learn Move** (pick a learnable move, choosing one to forget if already at capacity), and **Overrank** (learn a move from a rank above current - requires a combined Happiness + Loyalty of at least 7; learning a new Overranked move automatically forgets the previous one). Every action's dialog has a "Don't consume TP" checkbox for free adjustments, and posts a chat message stating how much TP was actually spent.
- **Evolution Stage**: Pokémon now track an Evolution Stage (First/Second/Final), populated from compendium data and editable per-actor from Actor Settings, which sets the TP cost of Learn Move and Overrank.
- **Bugs & Fixes**: an in-combat Plus/Minus stat change on an attribute already boosted by a Vitamin (or any other prior bonus) could overwrite that bonus instead of stacking with it.

## Notes
Please ensure you backup your existing module folder before updating.
This system remains compatible with Foundry V13, but V13 support is expected to end in an upcoming release.
