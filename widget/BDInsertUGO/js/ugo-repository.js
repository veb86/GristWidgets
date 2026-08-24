(function(root, factory) {
  'use strict';
  var dataUtils = root.BDInsertUGODataUtils;
  if (!dataUtils && typeof require === 'function') dataUtils = require('./data-utils.js');
  var moduleValue = factory(dataUtils);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.BDInsertUGORepository = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';
  var SOURCE_TABLE = 'InsertUGO';
  var SYSTEM_TABLE = 'SYSTEM';
  var SYSTEM_PARAM = 'nameUGO';

  function loadTable(gristApi, name, errorMessage) {
    return gristApi.docApi.fetchTable(name).catch(function() { throw new Error(errorMessage); });
  }

  function detectValueColumn(table, recordIndex) {
    var preferred = ['value', 'string_value', 'val', 'значение'];
    var columns = Object.keys(table || {}).filter(function(column) { return column !== 'id' && column !== 'param'; });
    for (var i = 0; i < preferred.length; i++) {
      if (columns.indexOf(preferred[i]) !== -1) return preferred[i];
    }
    return columns.find(function(column) { return Array.isArray(table[column]) && recordIndex < table[column].length; }) || null;
  }

  function create(gristApi) {
    if (!gristApi || !gristApi.docApi) throw new Error('Grist API недоступен');

    async function load() {
      var tables = await Promise.all([
        loadTable(gristApi, SOURCE_TABLE, 'Не найдена таблица InsertUGO'),
        loadTable(gristApi, SYSTEM_TABLE, 'Не найдена таблица SYSTEM')
      ]);
      var insertRecords = DataUtils.rows(tables[0]);
      var systemRecords = DataUtils.rows(tables[1]);
      var systemIndex = systemRecords.findIndex(function(record) { return record.param === SYSTEM_PARAM; });
      if (systemIndex < 0) throw new Error('В таблице SYSTEM отсутствует параметр nameUGO');
      var valueColumn = detectValueColumn(tables[1], systemIndex);
      if (!valueColumn) throw new Error('В таблице SYSTEM не найден столбец значения');
      return {
        insertRecords: insertRecords,
        systemRecord: systemRecords[systemIndex],
        valueColumn: valueColumn,
        selectedValue: systemRecords[systemIndex][valueColumn]
      };
    }

    function saveSelection(systemRecord, valueColumn, value) {
      if (!systemRecord || DataUtils.normalizeId(systemRecord.id) === null) {
        return Promise.reject(new Error('В таблице SYSTEM отсутствует параметр nameUGO'));
      }
      var fields = {};
      fields[valueColumn] = value === null || value === undefined ? '' : value;
      return gristApi.docApi.applyUserActions([
        ['UpdateRecord', SYSTEM_TABLE, systemRecord.id, fields]
      ]);
    }

    return { load: load, saveSelection: saveSelection };
  }

  return { create: create, detectValueColumn: detectValueColumn };
});
