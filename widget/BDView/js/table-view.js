(function(root, factory) {
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.TableView = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  var table = null;

  function rebuild(columns, rows) {
    if (table) table.destroy();
    table = new Tabulator('#device-table', {
      data: rows,
      columns: columns,
      layout: 'fitDataStretch',
      height: '100%',
      placeholder: 'В выбранной категории нет устройств',
      renderVertical: 'virtual',
      columnDefaults: { headerSortStartingDir: 'asc' }
    });
    return table;
  }

  function clear() { return rebuild([], []); }
  return { rebuild: rebuild, clear: clear, getTable: function() { return table; } };
});
