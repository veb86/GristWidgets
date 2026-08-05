(function(root) {
  'use strict';

  var ROW_CONFIRMATION = 'Вы уверены, что хотите удалить выбранную строку?';
  var ALL_CONFIRMATION = 'Вы уверены, что хотите удалить все строки?';
  var table = null;
  var currentRows = [];
  var currentColumns = [];
  var operationQueue = Promise.resolve();

  var dialog = root.SelDevDialog.create(document.getElementById('confirmation-dialog'));
  var api = root.SelDevGristApi.create(root.grist);
  var quantity = root.SelDevQuantityManager.create(api, function() {
    return dialog.confirm(ROW_CONFIRMATION);
  });
  var clearButton = document.getElementById('clear-button');
  var statusElement = document.getElementById('status');

  /** Показывает пользователю текущее состояние операции. */
  function showStatus(message, isError) {
    statusElement.textContent = message || '';
    statusElement.classList.toggle('status--error', Boolean(isError));
  }

  /** Выполняет изменения последовательно, чтобы быстрые клики не теряли данные. */
  function runOperation(operation) {
    var task = operationQueue.then(async function() {
      clearButton.disabled = true;
      showStatus('Сохранение…');
      try {
        await operation();
        showStatus('');
      } catch (error) {
        console.error(error);
        showStatus('Не удалось сохранить изменение: ' + error.message, true);
        await refresh();
      } finally {
        clearButton.disabled = false;
      }
    });
    operationQueue = task.catch(function() {});
    return task;
  }

  /** Возвращает обработчики служебных кнопок и обычного редактирования. */
  function handlers() {
    return {
      remove: removeRow,
      increase: function(row) { return runOperation(() => quantity.increase(row)); },
      decrease: function(row) { return runOperation(() => quantity.decrease(row)); },
      edit: saveEdit
    };
  }

  /** Создаёт Tabulator или обновляет его без полной перезагрузки страницы. */
  async function render(rows, columns) {
    var nextColumns = root.SelDevTableBuilder.columns(columns, handlers());
    if (!table) {
      table = new root.Tabulator('#device-table', {
        data: rows,
        columns: nextColumns,
        index: 'id',
        layout: 'fitDataStretch',
        placeholder: 'В таблице SelDevices нет строк',
        columnDefaults: { headerSort: true },
        movableColumns: false,
        pagination: false
      });
      return;
    }
    if (JSON.stringify(columns) !== JSON.stringify(currentColumns)) {
      table.setColumns(nextColumns);
    }
    await table.replaceData(rows);
  }

  /** Перечитывает SelDevices после внешнего уведомления Grist. */
  async function refresh() {
    try {
      var result = await api.load();
      var columns = result.columns;
      currentRows = result.rows;
      await render(currentRows, columns);
      currentColumns = columns;
    } catch (error) {
      console.error(error);
      showStatus('Не удалось загрузить SelDevices: ' + error.message, true);
    }
  }

  /** Удаляет строку только после явного подтверждения пользователя. */
  async function removeRow(row) {
    var accepted = await dialog.confirm(ROW_CONFIRMATION);
    if (!accepted) return;
    await runOperation(function() { return api.remove(row.id); });
  }

  /** Сохраняет отредактированную обычную ячейку через UpdateRecord. */
  async function saveEdit(cell) {
    var field = cell.getColumn().getField();
    if (!field || field === 'id') return;
    var row = cell.getRow().getData();
    await runOperation(async function() {
      await api.update(row.id, field, cell.getValue());
    });
  }

  /** Очищает таблицу одним BulkRemoveRecord после подтверждения. */
  async function clearAll() {
    if (currentRows.length === 0) return;
    var accepted = await dialog.confirm(ALL_CONFIRMATION);
    if (!accepted) return;
    var ids = currentRows.map(function(row) { return row.id; });
    await runOperation(function() { return api.removeAll(ids); });
  }

  /** Подключает виджет к Grist и подписывает его на изменения таблицы. */
  function initialize() {
    clearButton.addEventListener('click', clearAll);
    root.grist.ready({ requiredAccess: 'full' });
    root.grist.onRecords(function() { refresh(); });
    refresh();
  }

  initialize();
})(typeof globalThis !== 'undefined' ? globalThis : this);
