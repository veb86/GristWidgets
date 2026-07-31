(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.TableBuilder = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function field(parameterId) { return 'parameter_' + parameterId; }

  function columns(parameters) {
    return (parameters || []).map(function(parameter) {
      return {
        title: parameter.name + (parameter.unit ? ', ' + parameter.unit : ''),
        field: field(parameter.id),
        sorter: parameter.dataType === 'float' || parameter.dataType === 'int' ? 'number' : 'string',
        headerFilter: 'input',
        headerFilterFunc: 'like',
        headerFilterLiveFilter: true,
        headerSort: true
      };
    });
  }

  function rows(devices, parameters, valueMap) {
    return (devices || []).map(function(device) {
      var deviceId = DataUtils.normalizeId(device.id);
      var values = valueMap.get(deviceId) || new Map();
      var row = { id: deviceId };
      (parameters || []).forEach(function(parameter) {
        row[field(parameter.id)] = values.has(parameter.id) ? values.get(parameter.id) : '';
      });
      return row;
    });
  }

  return { columns: columns, rows: rows, field: field };
});
