(function(root, factory) {
  'use strict';
  var dataUtils = root.BDInsertUGODataUtils;
  if (!dataUtils && typeof require === 'function') dataUtils = require('./data-utils.js');
  var moduleValue = factory(dataUtils);
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.BDInsertUGOTree = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function compare(a, b) {
    function rank(value) {
      if (value === null || value === undefined || value === '') return Number.POSITIVE_INFINITY;
      var number = Number(value);
      return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
    }
    return rank(a.sort1) - rank(b.sort1) ||
      rank(a.sort2) - rank(b.sort2) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'ru');
  }

  function build(records) {
    var source = Array.isArray(records) ? records : [];
    var byId = new Map();
    source.forEach(function(record) {
      var id = DataUtils.normalizeId(record.id);
      if (id !== null) byId.set(id, Object.assign({}, record, { id: id, children: [] }));
    });

    var roots = [];
    var attached = new Set();
    byId.forEach(function(node) {
      var parentId = DataUtils.normalizeId(node.parent_id);
      var parent = byId.get(parentId);
      if (parent && parent.id !== node.id && !wouldCycle(node.id, parent.id, byId)) {
        parent.children.push(node);
        attached.add(node.id);
      }
    });
    byId.forEach(function(node) { if (!attached.has(node.id)) roots.push(node); });

    function sort(nodes) {
      nodes.sort(compare);
      nodes.forEach(function(node) { sort(node.children); });
    }
    sort(roots);
    return roots;
  }

  function wouldCycle(childId, parentId, byId) {
    var visited = new Set([childId]);
    var current = parentId;
    while (current !== null) {
      if (visited.has(current)) return true;
      visited.add(current);
      var record = byId.get(current);
      current = record ? DataUtils.normalizeId(record.parent_id) : null;
    }
    return false;
  }

  function findByDxf(records, dxf) {
    if (dxf === null || dxf === undefined || dxf === '') return null;
    return (records || []).find(function(record) { return String(record.ugo_dxf || '') === String(dxf); }) || null;
  }

  function ancestorIds(records, selectedId) {
    var byId = new Map();
    (records || []).forEach(function(record) { byId.set(DataUtils.normalizeId(record.id), record); });
    var result = [];
    var visited = new Set();
    var current = byId.get(DataUtils.normalizeId(selectedId));
    while (current) {
      var parentId = DataUtils.normalizeId(current.parent_id);
      if (parentId === null || visited.has(parentId)) break;
      visited.add(parentId);
      result.unshift(parentId);
      current = byId.get(parentId);
    }
    return result;
  }

  return { build: build, compare: compare, findByDxf: findByDxf, ancestorIds: ancestorIds };
});
