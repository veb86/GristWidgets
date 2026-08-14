(function(root, factory) {
  'use strict';
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevDataUtils = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  /** Преобразует столбцы Grist в массив записей. */
  function toRows(tableData) {
    if (!tableData || !Array.isArray(tableData.id)) return [];
    var columns = Object.keys(tableData).filter(function(name) {
      return Array.isArray(tableData[name]);
    });
    return tableData.id.map(function(recordId, index) {
      var row = { id: recordId };
      columns.forEach(function(name) { row[name] = tableData[name][index]; });
      return row;
    });
  }

  /** Считает пустое значение минимальным при сортировке. */
  function compareSort(left, right) {
    var leftEmpty = left === null || left === undefined || left === '';
    var rightEmpty = right === null || right === undefined || right === '';
    if (leftEmpty || rightEmpty) return leftEmpty === rightEmpty ? 0 : leftEmpty ? -1 : 1;
    var leftNumber = Number(left);
    var rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    return String(left).localeCompare(String(right), 'ru', { numeric: true });
  }

  /** Сортирует по sort1, sort2 и исходной позиции. */
  function sortParameters(rows) {
    return (rows || []).map(function(row, index) {
      return { row: row, index: index };
    }).sort(function(left, right) {
      return compareSort(left.row.sort1, right.row.sort1) ||
        compareSort(left.row.sort2, right.row.sort2) || left.index - right.index;
    }).map(function(item) { return item.row; });
  }

  /** Возвращает уникальные имена таблиц-источников. */
  function sourceNames(rows) {
    var unique = new Set();
    (rows || []).forEach(function(row) {
      var name = typeof row.parametr_column === 'string' ? row.parametr_column.trim() : '';
      if (name) unique.add(name);
    });
    return Array.from(unique);
  }

  return { toRows: toRows, sortParameters: sortParameters, sourceNames: sourceNames };
});
