(function(root, factory) {
  'use strict';
  var moduleValue = factory(root.Tabulator);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevSourceDialog = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Tabulator) {
  'use strict';

  /** Представляет Grist Reference в читаемом табличном виде. */
  function formatReference(value, tableName) {
    if (Array.isArray(value) && value[0] === 'L') {
      var ids = value.slice(1);
      return ids.map(function(id) { return tableName + '[' + id + ']'; }).join(', ');
    }
    if (Array.isArray(value) && value[0] === 'R') {
      return (value[1] || tableName) + '[' + value[2] + ']';
    }
    if (value === null || value === undefined) return '';
    return String(value);
  }

  /** Создаёт модальное окно полной таблицы-источника. */
  function create(dialogElement) {
    var table = null;
    var selectionHandler = null;
    var errorElement = dialogElement.querySelector('[data-dialog-error]');
    var titleElement = dialogElement.querySelector('[data-dialog-title]');

    /** Закрывает окно и удаляет текущую таблицу. */
    function close() {
      if (table) table.destroy();
      table = null;
      selectionHandler = null;
      dialogElement.close();
    }

    /** Показывает сообщение, не закрывая окно. */
    function showError(message) {
      errorElement.textContent = message || '';
    }

    /** Открывает все строки и основные колонки источника. */
    function open(parameter, rows, onSelect) {
      if (table) table.destroy();
      selectionHandler = onSelect;
      showError('');
      var parameterName = parameter.parameter || 'Параметр';
      titleElement.textContent = 'Выбор значения: ' + parameterName;
      dialogElement.showModal();
      table = new Tabulator(dialogElement.querySelector('[data-source-table]'), {
        data: rows || [],
        columns: [
          { title: 'name', field: 'name' },
          { title: 'parent_id', field: 'parent_id', formatter: function(cell) {
            return formatReference(cell.getValue(), parameter.parametr_column);
          } },
          { title: 'code', field: 'code' },
          { title: 'sort1', field: 'sort1' }
        ],
        index: 'id',
        layout: 'fitColumns',
        height: '100%',
        placeholder: 'В таблице нет строк',
        pagination: false
      });
      table.on('rowClick', function(event, row) {
        if (selectionHandler) selectionHandler(row.getData(), { close: close, error: showError });
      });
    }

    dialogElement.querySelector('[data-dialog-close]').addEventListener('click', close);
    dialogElement.addEventListener('cancel', function(event) { event.preventDefault(); close(); });
    return { open: open, close: close, showError: showError };
  }

  return { create: create, formatReference: formatReference };
});
