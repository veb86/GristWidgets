(function(root, factory) {
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.BDViewDataUtils = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function rows(tableData) {
    if (!tableData || !Array.isArray(tableData.id)) return [];
    var columns = Object.keys(tableData).filter(function(column) { return column !== 'id'; });
    return tableData.id.map(function(id, index) {
      var row = { id: id };
      columns.forEach(function(column) {
        row[column] = Array.isArray(tableData[column]) ? tableData[column][index] : undefined;
      });
      return row;
    });
  }

  function normalizeId(value) {
    if (Array.isArray(value) && value[0] === 'L') value = value[1];
    if (value === null || value === undefined || value === '') return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return { rows: rows, normalizeId: normalizeId };
});
