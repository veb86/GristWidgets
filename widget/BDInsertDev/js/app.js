(function(root) {
  'use strict';
  var container = document.getElementById('parameter-list');
  var statusElement = document.getElementById('status');
  var dialog = root.InsertDevSourceDialog.create(document.getElementById('source-dialog'));
  var api = root.InsertDevGristApi.create(root.grist);
  var currentData = { parameters: [], sources: new Map(), errors: new Map() };
  var monitor = root.InsertDevDataMonitor.create(api.load, render, showLoadError);

  /** Показывает сообщение состояния. */
  function showStatus(message, kind) {
    statusElement.textContent = message || '';
    statusElement.className = 'status' + (kind ? ' status--' + kind : '');
  }

  /** Показывает ошибку полной загрузки InsertDev. */
  function showLoadError(error) {
    console.error('[BDInsertDev] Не удалось обновить данные', error);
    showStatus('Не удалось загрузить InsertDev: ' + error.message, 'error');
  }

  /** Перестраивает интерфейс по свежим данным. */
  function render(data) {
    currentData = data;
    if (document.activeElement && document.activeElement.matches('.value-input:not([readonly])')) {
      return;
    }
    root.InsertDevParameterView.render(container, data.parameters, data.sources, {
      save: saveValue,
      openLookup: openLookup
    });
    var messages = Array.from(data.errors.values());
    showStatus(messages.join('. '), messages.length ? 'error' : '');
  }

  /** Проверяет и сохраняет обычный ввод. */
  async function saveValue(parameter, rawValue, element) {
    var result = root.InsertDevValueLogic.parse(parameter.type, rawValue);
    if (!result.ok) {
      showStatus(result.message, 'error');
      element.classList.add('value-input--invalid');
      element.focus();
      return false;
    }
    element.classList.remove('value-input--invalid');
    return persist(parameter, result.value);
  }

  /** Сохраняет значение и обновляет интерфейс. */
  async function persist(parameter, value, element) {
    if (element) element.disabled = true;
    showStatus('Сохранение…', 'info');
    try {
      await api.update(parameter.id, parameter.type, value);
      showStatus('Сохранено', 'success');
      await monitor.refresh();
      return true;
    } catch (error) {
      console.error('[BDInsertDev] Не удалось сохранить значение', error);
      var message = 'Не удалось сохранить изменение: ' + error.message;
      showStatus(message, 'error');
      return false;
    } finally {
      if (element) element.disabled = false;
    }
  }

  /** Открывает источник либо показывает ошибку таблицы. */
  function openLookup(parameter) {
    var tableName = String(parameter.parametr_column || '').trim();
    if (currentData.errors.has(tableName)) {
      showStatus(currentData.errors.get(tableName), 'error');
      return;
    }
    dialog.open(parameter, currentData.sources.get(tableName) || [], function(row, controls) {
      selectLookup(parameter, row, controls);
    });
  }

  /** Проверяет и сохраняет code выбранной строки. */
  async function selectLookup(parameter, row, controls) {
    var selection = root.InsertDevValueLogic.lookupSelection(row);
    if (!selection.ok) {
      controls.error(selection.message);
      return;
    }
    var parsed = root.InsertDevValueLogic.parse(parameter.type, selection.value);
    if (!parsed.ok) {
      controls.error(parsed.message);
      return;
    }
    var saved = await persist(parameter, parsed.value);
    if (saved) controls.close();
  }

  /** Подключает Grist Desktop и автообновление. */
  function initialize() {
    root.grist.ready({ requiredAccess: 'full' });
    root.grist.onRecords(function() { monitor.refresh(); });
    monitor.start();
  }

  initialize();
})(typeof globalThis !== 'undefined' ? globalThis : this);
