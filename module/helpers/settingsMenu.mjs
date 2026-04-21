export class ailmentsMenu extends FormApplication {
  static get defaultOptions () {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "POKEROLE - Ailment settings",
      id: 'pokerole-ailments',
      classes: ['pokerole'],
      template: 'systems/pokerole/templates/settings/settings-ailments.html',
      width: 500,
      height: 'auto',
      resizable: true,
      closeOnSubmit: false
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async getData () {
    const data = await super.getData()

    data.burnSTR = game.settings.get('pokerole', 'burnConst')
    data.frozenSPE = game.settings.get('pokerole', 'frozenConst')
    data.paralysisDEX = game.settings.get('pokerole', 'paralysisConst')

    return data
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners (html) {
    html[0].querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('change', function (event) {
        event.preventDefault()
        const data = event.target.dataset

        if (data?.id) {
          const settingId = data.id
          const value = event.target.value
          console.log(settingId, value)
          game.settings.set('pokerole', settingId, value)
        }
      })
    })

    html[0].querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', function (event) {
        event.preventDefault()
        const data = event.target.dataset

        if (data?.id) {
          const settingId = data.id
          const value = event.target.checked
          console.log(settingId, value)
          game.settings.set('pokerole', settingId, value)
        }
      })
    })
  }
}