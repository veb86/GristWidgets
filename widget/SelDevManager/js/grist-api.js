(function(root, factory) {
  'use strict';

  var dataUtils = root.SelDevDataUtils;
  if (!dataUtils && typeof require === 'function') dataUtils = require('./data-utils.js');
  var moduleValue = factory(dataUtils);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelDevGristApi = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  var TABLE_NAME = 'SelDevices';

  /** Создаёт изолированный интерфейс всех операций с Grist API. */
  function create(gristApi) {
    if (!gristApi || !gristApi.docApi) throw new Error('Grist API недоступен');

    /** Загружает всю таблицу и готовит строки для Tabulator. */
    async function load() {
      var table = await gristApi.docApi.fetchTable(TABLE_NAME);
      return { table: table, rows: DataUtils.toRows(table) };
    }

    /** Записывает изменённое значение одного обычного столбца. */
    async function update(recordId, columnName, value) {
      var values = {};
      values[columnName] = value;
      return gristApi.docApi.applyUserActions([
        ['UpdateRecord', TABLE_NAME, recordId, values]
      ]);
    }

    /** Удаляет одну запись таблицы. */
    async function remove(recordId) {
      return gristApi.docApi.applyUserActions([
        ['RemoveRecord', TABLE_NAME, recordId]
      ]);
    }

    /** Удаляет переданные записи одним пакетным действием. */
    async function removeAll(recordIds) {
      if (!Array.isArray(recordIds) || recordIds.length === 0) return;
      return gristApi.docApi.applyUserActions([
        ['BulkRemoveRecord', TABLE_NAME, recordIds]
      ]);
    }

    return { load: load, update: update, remove: remove, removeAll: removeAll };
  }

  return { TABLE_NAME: TABLE_NAME, create: create };
});
