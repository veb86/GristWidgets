(function(root) {
  'use strict';
  var refreshNumber = 0;

  function message(text, kind) {
    var element = document.getElementById('message');
    element.textContent = text || '';
    element.className = kind || '';
  }

  async function load(selectedId) {
    var thisRefresh = ++refreshNumber;
    if (selectedId === null) {
      TableView.clear();
      message('Выберите категорию в дереве каталога.', 'info');
      return;
    }
    message('Загрузка данных…', 'info');
    try {
      var names = ['Categories', 'CategoryParameters', 'Devices', 'Parameters', 'DeviceParameters'];
      var raw = await Promise.all(names.map(function(name) { return grist.docApi.fetchTable(name); }));
      if (thisRefresh !== refreshNumber) return;
      var data = raw.map(BDViewDataUtils.rows);
      var categoryIds = CategoryTree.descendantIds(data[0], selectedId);
      var parameters = ColumnProvider.forCategory(data[1], data[3], selectedId);
      var devices = DeviceProvider.forCategories(data[2], categoryIds);
      var values = ParameterProvider.mapForDevices(data[4], devices.map(function(device) { return device.id; }), parameters);
      TableView.rebuild(TableBuilder.columns(parameters), TableBuilder.rows(devices, parameters, values));
      message(parameters.length ? '' : 'Для выбранной категории столбцы не настроены.', parameters.length ? '' : 'info');
      document.getElementById('summary').textContent = 'Устройств: ' + devices.length;
    } catch (error) {
      console.error('[BDView] Не удалось перестроить таблицу', error);
      TableView.clear();
      message('Не удалось загрузить данные: ' + error.message, 'error');
    }
  }

  function initialize() {
    grist.ready({ requiredAccess: 'full' });
    TableView.clear();
    SystemMonitor.create(grist, load, {
      onError: function(error) { message('Не удалось прочитать SYSTEM: ' + error.message, 'error'); }
    }).start();
  }

  root.BDViewApp = { initialize: initialize, load: load };
  document.addEventListener('DOMContentLoaded', initialize);
})(typeof globalThis !== 'undefined' ? globalThis : this);
