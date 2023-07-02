/** Register integrations with third-party modules */
export function registerIntegrationHooks() {
  // Item Piles module integration (https://fantasycomputer.works/FoundryVTT-ItemPiles/#/api)
  Hooks.once('item-piles-ready', async () => {
    game.itempiles.API.addSystemIntegration({
      VERSION: "1",
      ACTOR_CLASS_TYPE: 'pokemon',
      ITEM_QUANTITY_ATTRIBUTE: 'system.quantity',
      ITEM_PRICE_ATTRIBUTE: 'system.price',
      CURRENCY_DECIMAL_DIGITS: 1,
      ITEM_FILTERS: [{
        path: 'type',
        filters: 'move,ability,effect'
      }],
      ITEM_SIMILARITIES: ['type', 'name'],
      CURRENCIES: [{
        type: 'attribute',
        name: 'Money',
        img: 'systems/pokerole/images/icons/money.png',
        abbreviation: '{#}P',
        primary: true,
        exchangeRate: 1,
        data: {
          path: 'system.money'
        }
      }]
    });
  });
}
