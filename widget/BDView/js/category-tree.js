(function(root, factory) {
  var moduleValue = factory(root.BDViewDataUtils || (typeof require === 'function' ? require('./data-utils.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.CategoryTree = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(DataUtils) {
  'use strict';

  function descendantIds(categories, selectedId) {
    selectedId = DataUtils.normalizeId(selectedId);
    if (selectedId === null) return [];
    var children = new Map();
    (categories || []).forEach(function(category) {
      var parentId = DataUtils.normalizeId(category.parent_id);
      var id = DataUtils.normalizeId(category.id);
      if (id === null) return;
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(id);
    });
    var result = [];
    var visited = new Set();
    var pending = [selectedId];
    while (pending.length) {
      var id = pending.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      result.push(id);
      (children.get(id) || []).forEach(function(childId) { pending.push(childId); });
    }
    return result;
  }

  return { descendantIds: descendantIds };
});
