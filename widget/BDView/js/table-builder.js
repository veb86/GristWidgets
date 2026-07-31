(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.TableBuilder = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  var DEVICE_COLUMNS = [
    { title: 'Наименование', field: 'name' },
    { title: 'Модель', field: 'model' },
    { title: 'Производитель', field: 'manufacturer' }
  ];

  function field(parameterId) { return 'parameter_' + parameterId; }

  function column(title, columnField, sorter) {
    return {
      title: title,
      field: columnField,
      sorter: sorter,
      headerFilter: 'input',
      headerFilterFunc: 'like',
      headerFilterLiveFilter: true,
      headerSort: true
    };
  }

  function columns(parameters) {
    var deviceColumns = DEVICE_COLUMNS.map(function(deviceColumn) {
      return column(deviceColumn.title, deviceColumn.field, 'string');
    });
    var parameterColumns = (parameters || []).map(function(parameter) {
      var sorter = parameter.dataType === 'float' || parameter.dataType === 'int' ? 'number' : 'string';
      return column(parameter.name + (parameter.unit ? ', ' + parameter.unit : ''), field(parameter.id), sorter);
    });
    return deviceColumns.concat(parameterColumns);
  }

  function rows(devices, parameters, valueMap) {
    return (devices || []).map(function(device) {
      var deviceId = DataUtils.normalizeId(device.id);
      var values = valueMap.get(deviceId) || new Map();
      var row = { id: deviceId };
      DEVICE_COLUMNS.forEach(function(deviceColumn) {
        var value = device[deviceColumn.field];
        row[deviceColumn.field] = value === null || value === undefined ? '' : value;
      });
      (parameters || []).forEach(function(parameter) {
        row[field(parameter.id)] = values.has(parameter.id) ? values.get(parameter.id) : '';
      });
      return row;
    });
  }

  return { columns: columns, rows: rows, field: field };
});
