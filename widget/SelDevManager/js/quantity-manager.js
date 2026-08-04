(function(root, factory) {
  'use strict';

  var dataUtils = root.SelDevDataUtils;
  if (!dataUtils && typeof require === 'function') dataUtils = require('./data-utils.js');
  var moduleValue = factory(dataUtils);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelDevQuantityManager = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  var QUANTITY_FIELD = 'quantity';

  /** Создаёт обработчики количества без зависимости от элементов интерфейса. */
  function create(api, confirmRemoval) {
    var ask = confirmRemoval || async function() { return false; };

    /** Увеличивает количество на единицу и немедленно сохраняет его. */
    async function increase(row) {
      var quantity = DataUtils.normalizeQuantity(row[QUANTITY_FIELD]) + 1;
      await api.update(row.id, QUANTITY_FIELD, quantity);
      return { removed: false, quantity: quantity };
    }

    /** Уменьшает количество или удаляет последнюю единицу после подтверждения. */
    async function decrease(row) {
      var current = DataUtils.normalizeQuantity(row[QUANTITY_FIELD]);
      if (current === 1) {
        var accepted = await ask();
        if (!accepted) return { removed: false, quantity: current };
        await api.remove(row.id);
        return { removed: true, quantity: 0 };
      }

      var quantity = current - 1;
      await api.update(row.id, QUANTITY_FIELD, quantity);
      return { removed: false, quantity: quantity };
    }

    return { increase: increase, decrease: decrease };
  }

  return { QUANTITY_FIELD: QUANTITY_FIELD, create: create };
});
