/** Register integrations with third-party modules */
export function registerIntegrationHooks() {
  // Item Piles module integration (https://fantasycomputer.works/FoundryVTT-ItemPiles/#/api)
  Hooks.once('item-piles-ready', async () => {
    const promises = [
      game.itempiles.API.setActorClassType('pokemon'),
      game.itempiles.API.setItemQuantityAttribute('system.quantity'),
      game.itempiles.API.setItemPriceAttribute('system.price'),
      game.itempiles.API.setCurrencyDecimalDigits(1),
      game.itempiles.API.setItemFilters([{
        path: "type",
        filters: "move,ability,effect"
      }]),
      game.itempiles.API.setItemSimilarities(['type', 'name'])
    ];

    // Don't overwrite existing currencies to allow customization
    if (!game.itempiles.API.CURRENCIES?.length) {
      promises.push(game.itempiles.API.setCurrencies([{
        type: 'attribute',
        name: 'Money',
        img: 'systems/pokerole/images/icons/money.png',
        abbreviation: '{#}P',
        primary: true,
        exchangeRate: 1,
        data: {
          path: 'system.money'
        }
      }]));
    }

    await Promise.all(promises);
  });
}
