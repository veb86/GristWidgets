(function(root) {
  'use strict';
  var repository;
  var treeView;
  var records = [];
  var systemRecord = null;
  var valueColumn = null;
  var selectedId = null;
  var refreshTimer = null;
  var refreshInProgress = false;
  var stopped = false;
  var currentFingerprint = null;
  var lastError = null;

  function message(text, kind) {
    var element = document.getElementById('message');
    element.textContent = text || '';
    element.className = kind || '';
  }

  function preview(record) {
    var image = document.getElementById('ugo-preview');
    var placeholder = document.getElementById('preview-message');
    image.hidden = true;
    image.removeAttribute('src');
    placeholder.textContent = '';
    if (!record || !record.ugo_svg) return;
    var url = BDInsertUGOSvgLoader.urlFor(record.ugo_svg, './svg/');
    if (!url) {
      placeholder.textContent = 'SVG-файл не найден';
      return;
    }
    image.onload = function() { placeholder.textContent = ''; image.hidden = false; };
    image.onerror = function() { image.hidden = true; placeholder.textContent = 'SVG-файл не найден'; };
    image.src = url;
  }

  async function select(record) {
    selectedId = record.id;
    treeView.select(selectedId);
    preview(record);
    try {
      await repository.saveSelection(systemRecord, valueColumn, record.ugo_dxf || '');
      systemRecord[valueColumn] = record.ugo_dxf || '';
      message(record.ugo_dxf ? 'Выбрано: ' + record.ugo_dxf : 'Выбрана группа без имени', 'success');
    } catch (error) {
      message('Не удалось сохранить выбор: ' + error.message, 'error');
    }
  }

  async function refresh(options) {
    options = options || {};
    if (refreshInProgress) return;
    refreshInProgress = true;
    try {
      var data = await repository.load();
      records = data.insertRecords;
      systemRecord = data.systemRecord;
      valueColumn = data.valueColumn;
      var selected = BDInsertUGOTree.findByDxf(records, data.selectedValue);
      var nextSelectedId = selected ? selected.id : null;
      var nextFingerprint = fingerprint(records);
      var changed = options.initial || nextSelectedId !== selectedId || nextFingerprint !== currentFingerprint;
      if (changed) {
        selectedId = nextSelectedId;
        treeView.render(BDInsertUGOTree.build(records), selected ? BDInsertUGOTree.ancestorIds(records, selected.id) : []);
        treeView.select(selectedId);
        preview(selected);
        if (selected && selected.name) {
          message('Выбрано: ' + selected.name, 'success');
        }
      }
      if (lastError) message('', '');
      lastError = null;
      currentFingerprint = nextFingerprint;
    } catch (error) {
      if (error.message !== lastError) message(error.message, 'error');
      lastError = error.message;
    } finally {
      refreshInProgress = false;
    }
  }

  function fingerprint(items) {
    return JSON.stringify((items || []).map(function(item) {
      return [item.id, item.name, item.parent_id, item.ugo_svg, item.ugo_dxf, item.sort1, item.sort2];
    }));
  }

  function scheduleRefresh() {
    if (stopped) return;
    refreshTimer = setTimeout(async function() {
      await refresh();
      scheduleRefresh();
    }, 1000);
  }

  async function initialize() {
    grist.ready({ requiredAccess: 'full' });
    repository = BDInsertUGORepository.create(grist);
    treeView = BDInsertUGOTreeView.create(document.getElementById('ugo-tree'), select);
    await refresh({ initial: true });
    scheduleRefresh();
  }

  function stop() {
    stopped = true;
    if (refreshTimer) clearTimeout(refreshTimer);
  }

  root.BDInsertUGOApp = { initialize: initialize, stop: stop, refresh: refresh };
  document.addEventListener('DOMContentLoaded', initialize);
  root.addEventListener('beforeunload', stop);
})(typeof globalThis !== 'undefined' ? globalThis : this);
