(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SystemMonitor = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function selectedGroupId(records) {
    var record = (records || []).find(function(item) { return item.param === 'selectedGroupID'; });
    return record ? DataUtils.normalizeId(record.value) : null;
  }

  function create(gristApi, onChange, options) {
    options = options || {};
    var interval = options.interval || 750;
    var timer = null;
    var stopped = true;
    var current;

    async function check() {
      if (stopped) return;
      try {
        var next = selectedGroupId(DataUtils.rows(await gristApi.docApi.fetchTable('SYSTEM')));
        if (next !== current) {
          current = next;
          await onChange(next);
        }
      } catch (error) {
        if (options.onError) options.onError(error);
      } finally {
        if (!stopped) timer = setTimeout(check, interval);
      }
    }

    return {
      start: function() { if (stopped) { stopped = false; check(); } },
      stop: function() { stopped = true; if (timer) clearTimeout(timer); },
      check: check
    };
  }

  return { create: create, selectedGroupId: selectedGroupId };
});
