(function(root, factory) {
  'use strict';

  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelDevTableBuilder = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var SERVICE_WIDTH = 42;

  /** Возвращает данные строки, выбранной в служебной ячейке. */
  function rowData(cell) {
    return cell.getRow().getData();
  }

  /** Создаёт неизменяемый служебный столбец с кнопкой. */
  function serviceColumn(title, cssClass, handler) {
    return {
      title: title,
      formatter: function() { return '<button type="button">' + title + '</button>'; },
      width: SERVICE_WIDTH,
      minWidth: SERVICE_WIDTH,
      maxWidth: SERVICE_WIDTH,
      headerSort: false,
      editor: false,
      hozAlign: 'center',
      headerHozAlign: 'center',
      cssClass: 'service-cell ' + cssClass,
      cellClick: function(event, cell) { handler(rowData(cell)); }
    };
  }

  /** Выбирает стандартный редактор Tabulator для значения столбца. */
  function editorFor(name) {
    if (name === 'id') return false;
    return name === 'quantity' ? 'number' : 'input';
  }

  /** Создаёт редактируемый столбец Grist. */
  function dataColumn(definition, editHandler) {
    return {
      title: definition.title,
      field: definition.field,
      headerSort: true,
      editor: editorFor(definition.field),
      cellEdited: editHandler
    };
  }

  /** Формирует колонки: X, все Grist-колонки и кнопки после quantity. */
  function columns(definitions, handlers) {
    var result = [serviceColumn('X', 'service-cell--remove', handlers.remove)];
    definitions.forEach(function(definition) {
      result.push(dataColumn(definition, handlers.edit));
      if (definition.field !== 'quantity') return;
      result.push(serviceColumn('+', 'service-cell--increase', handlers.increase));
      result.push(serviceColumn('-', 'service-cell--decrease', handlers.decrease));
    });
    return result;
  }

  return { columns: columns };
});
