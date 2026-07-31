(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.DeviceProvider = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function forCategories(devices, categoryIds) {
    var allowed = new Set((categoryIds || []).map(DataUtils.normalizeId));
    return (devices || []).filter(function(device) {
      return allowed.has(DataUtils.normalizeId(device.categories_id));
    });
  }

  return { forCategories: forCategories };
});
