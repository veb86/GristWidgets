(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.ColumnProvider = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function forCategory(categoryParameters, parameters, selectedId) {
    selectedId = DataUtils.normalizeId(selectedId);
    var parameterMap = new Map((parameters || []).map(function(parameter) {
      return [DataUtils.normalizeId(parameter.id), parameter];
    }));
    return (categoryParameters || [])
      .filter(function(link) { return DataUtils.normalizeId(link.category_id) === selectedId; })
      .sort(function(a, b) { return Number(a.manualSort || 0) - Number(b.manualSort || 0); })
      .map(function(link) {
        var parameterId = DataUtils.normalizeId(link.parameter_id);
        var parameter = parameterMap.get(parameterId);
        return parameter && {
          id: parameterId,
          name: parameter.name || ('Параметр ' + parameterId),
          unit: parameter.unit || '',
          dataType: parameter.data_type || 'string'
        };
      })
      .filter(Boolean);
  }

  return { forCategory: forCategory };
});
