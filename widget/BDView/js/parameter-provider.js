(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.ParameterProvider = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function valueOf(record, dataType) {
    if (dataType === 'float' && record.value_float !== null && record.value_float !== undefined) return record.value_float;
    if (dataType === 'int' && record.value_int !== null && record.value_int !== undefined) return record.value_int;
    if ((dataType === 'string' || dataType === 'text') && record.value_string !== null && record.value_string !== undefined) return record.value_string;
    if (record.value_string !== null && record.value_string !== undefined && record.value_string !== '') return record.value_string;
    if (record.value_float !== null && record.value_float !== undefined) return record.value_float;
    if (record.value_int !== null && record.value_int !== undefined) return record.value_int;
    return '';
  }

  function mapForDevices(deviceParameters, deviceIds, parameters) {
    var allowed = new Set((deviceIds || []).map(DataUtils.normalizeId));
    var types = new Map((parameters || []).map(function(parameter) {
      return [DataUtils.normalizeId(parameter.id), parameter.dataType || parameter.data_type];
    }));
    var result = new Map();
    (deviceParameters || []).forEach(function(record) {
      var deviceId = DataUtils.normalizeId(record.device_id);
      if (!allowed.has(deviceId)) return;
      if (!result.has(deviceId)) result.set(deviceId, new Map());
      var parameterId = DataUtils.normalizeId(record.parameter_id);
      result.get(deviceId).set(parameterId, valueOf(record, types.get(parameterId)));
    });
    return result;
  }

  return { mapForDevices: mapForDevices, valueOf: valueOf };
});
