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

  /** Преобразует значение Quantity в допустимое целое число не меньше единицы. */
  function normalizeQuantity(value) {
    var quantity = Number(value);
    if (!Number.isFinite(quantity)) return 1;
    return Math.max(1, Math.trunc(quantity));
  }

  return {
    columnNames: columnNames,
    toRows: toRows,
    normalizeQuantity: normalizeQuantity
  };
});
