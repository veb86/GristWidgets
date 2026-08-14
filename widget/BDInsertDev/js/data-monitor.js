(function(root, factory) {
  'use strict';
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.InsertDevDataMonitor = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  var DEFAULT_INTERVAL = 1000;

  /** Создаёт сигнатуру для поиска внешних изменений. */
  function signature(data) {
    return JSON.stringify({
      parameters: data.parameters,
      sources: Array.from(data.sources.entries()),
      errors: Array.from(data.errors.entries())
    });
  }

  /** Сообщает только о реальных изменениях Grist. */
  function create(loader, onChange, onError, interval) {
    var timer = null;
    var stopped = true;
    var previous = null;
    var loading = false;

    /** Выполняет один защищённый цикл чтения. */
    async function check(force) {
      if (loading || (stopped && !force)) return;
      loading = true;
      try {
        var data = await loader();
        var next = signature(data);
        if (force || next !== previous) {
          previous = next;
          await onChange(data);
        }
      } catch (error) {
        if (onError) onError(error);
      } finally {
        loading = false;
        if (!stopped) timer = setTimeout(check, interval || DEFAULT_INTERVAL);
      }
    }

    return {
      start: function() { if (stopped) { stopped = false; check(true); } },
      refresh: function() { return check(true); },
      stop: function() { stopped = true; if (timer) clearTimeout(timer); }
    };
  }

  return { create: create, signature: signature };
});
