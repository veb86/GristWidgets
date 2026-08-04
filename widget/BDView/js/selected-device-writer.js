(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelectedDeviceWriter = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function create(gristApi) {
    var pending = Promise.resolve();

    return async function add(deviceId) {
      var operation = pending.then(async function() {
        var normalizedDeviceId = DataUtils.normalizeId(deviceId);
        if (normalizedDeviceId === null) throw new Error('Некорректный идентификатор устройства');

        var table = await gristApi.docApi.fetchTable('SelDevices');
        var rows = DataUtils.rows(table);
        var existing = rows.find(function(row) {
          return DataUtils.normalizeId(row.dev_id) === normalizedDeviceId;
        });

        if (existing) {
          var quantity = Number(existing.quantity);
          if (!Number.isFinite(quantity)) quantity = 0;
          await gristApi.docApi.applyUserActions([
            ['UpdateRecord', 'SelDevices', existing.id, { quantity: quantity + 1 }]
          ]);
          return { created: false, quantity: quantity + 1 };
        }

        await gristApi.docApi.applyUserActions([
          ['AddRecord', 'SelDevices', null, { dev_id: normalizedDeviceId, quantity: 1 }]
        ]);
        return { created: true, quantity: 1 };
      });

      pending = operation.catch(function() {});
      return operation;
    };
  }

  return { create: create };
});
