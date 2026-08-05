(function(root, factory) {
  'use strict';

  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelDevDataUtils = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  /** Возвращает имена всех столбцов в исходном порядке Grist. */
  function columnNames(tableData) {
    if (!tableData || typeof tableData !== 'object') return [];
    return Object.keys(tableData).filter(function(name) {
      return Array.isArray(tableData[name]);
    });
  }

  /** Преобразует столбцовое представление Grist в строки Tabulator. */
  function toRows(tableData) {
    if (!tableData || !Array.isArray(tableData.id)) return [];
    var names = columnNames(tableData);
    return tableData.id.map(function(recordId, index) {
      var row = {};
      names.forEach(function(name) {
        row[name] = tableData[name][index];
      });
      row.id = recordId;
      return row;
    });
  }

  /** Формирует видимые столбцы по настройкам SelDevicesSet. */
  function configuredColumns(tableData, settingsData) {
    var sourceNames = new Set(columnNames(tableData));
    var settings = toRows(settingsData);
    var used = new Set();

    return settings.filter(function(setting) {
      var field = typeof setting.namecol === 'string' ? setting.namecol.trim() : '';
      if (!setting.view || !field || field === 'id' || field === 'manualSort') return false;
      if (!sourceNames.has(field) || used.has(field)) return false;
      used.add(field);
      return true;
    }).sort(function(left, right) {
      var leftSort = Number(left.sort);
      var rightSort = Number(right.sort);
      if (!Number.isFinite(leftSort)) leftSort = Number.MAX_SAFE_INTEGER;
      if (!Number.isFinite(rightSort)) rightSort = Number.MAX_SAFE_INTEGER;
      return leftSort - rightSort;
    }).map(function(setting) {
      var field = setting.namecol.trim();
      var title = typeof setting.name === 'string' ? setting.name.trim() : '';
      return { field: field, title: title || field };
    });
  }

  /** Преобразует значение Quantity в допустимое целое число не меньше единицы. */
  function normalizeQuantity(value) {
    var quantity = Number(value);
    if (!Number.isFinite(quantity)) return 1;
    return Math.max(1, Math.trunc(quantity));
  }

  return {
    columnNames: columnNames,
    toRows: toRows,
    configuredColumns: configuredColumns,
    normalizeQuantity: normalizeQuantity
  };
});
