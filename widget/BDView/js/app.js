(function(root) {
  'use strict';
  var refreshNumber = 0;
  var addSelectedDevice = null;

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
      TableView.rebuild(
        TableBuilder.columns(parameters, selectDevice),
        TableBuilder.rows(devices, parameters, values),
        selectDevice
      );
      message(parameters.length ? '' : 'Для выбранной категории столбцы не настроены.', parameters.length ? '' : 'info');
      document.getElementById('summary').textContent = 'Устройств: ' + devices.length;
    } catch (error) {
      console.error('[BDView] Не удалось перестроить таблицу', error);
      TableView.clear();
      message('Не удалось загрузить данные: ' + error.message, 'error');
    }
  }

  async function selectDevice(deviceId) {
    try {
      var result = await addSelectedDevice(deviceId);
      message('Устройство добавлено. Количество: ' + result.quantity, 'success');
    } catch (error) {
      console.error('[BDView] Не удалось добавить устройство', error);
      message('Не удалось добавить устройство: ' + error.message, 'error');
    }
  }

  function initialize() {
    grist.ready({ requiredAccess: 'full' });
    addSelectedDevice = SelectedDeviceWriter.create(grist);
    TableView.clear();
    SystemMonitor.create(grist, load, {
      onError: function(error) { message('Не удалось прочитать SYSTEM: ' + error.message, 'error'); }
    }).start();
  }

  root.BDViewApp = { initialize: initialize, load: load, selectDevice: selectDevice };
  document.addEventListener('DOMContentLoaded', initialize);
})(typeof globalThis !== 'undefined' ? globalThis : this);
