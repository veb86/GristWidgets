(function(root, factory) {
  'use strict';
  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.BDInsertUGOTreeView = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function create(container, onSelect) {
    var selectedId = null;

    function render(nodes, expandedIds) {
      container.textContent = '';
      if (!nodes.length) {
        var empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Нет данных для отображения';
        container.appendChild(empty);
        return;
      }
      container.appendChild(list(nodes, new Set(expandedIds || [])));
      select(selectedId);
    }

    function list(nodes, expanded) {
      var element = document.createElement('ul');
      element.className = 'ugo-tree';
      nodes.forEach(function(node) {
        var item = document.createElement('li');
        item.dataset.id = String(node.id);
        var row;
        if (node.children.length) {
          row = document.createElement('details');
          if (expanded.has(node.id)) row.open = true;
          var summary = document.createElement('summary');
          summary.appendChild(button(node));
          row.appendChild(summary);
          row.appendChild(list(node.children, expanded));
        } else {
          row = button(node);
          row.classList.add('leaf');
        }
        item.appendChild(row);
        element.appendChild(item);
      });
      return element;
    }

    function button(node) {
      var element = document.createElement('button');
      element.type = 'button';
      element.className = 'tree-node';
      element.dataset.id = String(node.id);
      element.textContent = node.name || '(без имени)';
      element.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        select(node.id);
        onSelect(node);
      });
      return element;
    }

    function select(id) {
      selectedId = id === null || id === undefined ? null : Number(id);
      container.querySelectorAll('.tree-node').forEach(function(element) {
        var selected = selectedId !== null && Number(element.dataset.id) === selectedId;
        element.classList.toggle('selected', selected);
        element.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      if (selectedId !== null) {
        var selectedElement = container.querySelector('.tree-node[data-id="' + selectedId + '"]');
        if (selectedElement) selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }

    return { render: render, select: select };
  }

  return { create: create };
});
