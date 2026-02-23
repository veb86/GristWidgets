/**
 * Модуль для работы с деревом групп на базе jsTree
 *
 * Этот модуль отвечает за преобразование данных в формат jsTree
 * и управление деревом через API jsTree.
 *
 * @module TreeModule
 */

var TreeModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var groupsData = [];
  var jstreeInstance = null;
  var nodesMap = {};

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Построить HTML текст узла
   * Формат: <русский текст> <английский код>
   * @param {Object} group - Группа
   * @returns {string} HTML текст
   */
  function buildNodeText(group) {
    var name = escapeHtml(group.name || '');
    var code = escapeHtml(group.code || '');
    
    // Если есть и имя и код, показываем оба
    if (name && code) {
      return '<span class="node-name">' + name + '</span>' +
             '<span class="node-separator">—</span>' +
             '<span class="node-code">' + code + '</span>';
    }
    // Только имя
    if (name) {
      return '<span class="node-name">' + name + '</span>';
    }
    // Только код
    if (code) {
      return '<span class="node-code">' + code + '</span>';
    }
    return '';
  }

  /**
   * Экранировать HTML
   * @param {string} text - Текст
   * @returns {string} Экранированный текст
   */
  function escapeHtml(text) {
    if (!text) return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  /**
   * Создать карту узлов из групп
   * @param {Array} groups - Массив групп
   * @returns {Object} Карта узлов
   */
  function createNodesMap(groups) {
    var map = {};
    
    groups.forEach(function(group) {
      map[group.id] = {
        id: group.id,
        text: buildNodeText(group),
        code: group.code || '',
        name: group.name || '',
        parentId: group.parent_id || 0,
        children: [],
        recordId: group.id
      };
    });
    
    return map;
  }

  /**
   * Установить связи родитель-потомок
   * @param {Object} map - Карта узлов
   * @param {Array} groups - Исходные группы
   */
  function linkParentChild(map, groups) {
    groups.forEach(function(group) {
      var nodeId = group.id;
      var parentId = group.parent_id || 0;
      
      if (parentId !== 0 && map[parentId]) {
        map[nodeId].parentId = parentId;
        if (map[parentId].children.indexOf(nodeId) === -1) {
          map[parentId].children.push(nodeId);
        }
      }
    });
  }

  /**
   * Найти корневые узлы
   * @param {Object} map - Карта узлов
   * @returns {Array} Массив корневых узлов
   */
  function findRootNodes(map) {
    var roots = [];
    
    Object.values(map).forEach(function(node) {
      if (!node.parentId || !map[node.parentId]) {
        roots.push(node);
      }
    });
    
    return roots;
  }

  /**
   * Рекурсивно построить узел для jsTree
   * @param {Object} node - Узел из карты
   * @param {Object} map - Карта узлов
   * @returns {Object} Узел для jsTree
   */
  function buildJsTreeNode(node, map) {
    var hasChildren = node.children && node.children.length > 0;
    
    var jsTreeNode = {
      id: String(node.id),
      text: node.text,
      state: { 
        opened: true,
        selected: false
      },
      data: {
        devGroupId: node.id,
        code: node.code,
        name: node.name,
        recordId: node.recordId,
        children: node.children
      },
      li_attr: {
        'data-group-id': node.id
      },
      a_attr: {
        'href': '#',
        'data-group-id': node.id
      }
    };
    
    // Рекурсивно добавляем детей
    if (hasChildren) {
      jsTreeNode.children = [];
      node.children.forEach(function(childId) {
        var childNode = map[childId];
        if (childNode) {
          jsTreeNode.children.push(buildJsTreeNode(childNode, map));
        }
      });
      jsTreeNode.icon = 'jstree-folder';
    } else {
      jsTreeNode.icon = 'jstree-file';
    }
    
    return jsTreeNode;
  }

  /**
   * Преобразовать данные в формат jsTree
   * @param {Array} groups - Массив групп
   * @returns {Array} Массив узлов в формате jsTree
   */
  function convertToJsTreeData(groups) {
    if (!groups || groups.length === 0) {
      return [];
    }

    // Сортируем по manualSort
    groups.sort(function(a, b) {
      return (a.manualSort || 0) - (b.manualSort || 0);
    });

    // Создаём карту узлов
    nodesMap = createNodesMap(groups);
    
    // Устанавливаем связи
    linkParentChild(nodesMap, groups);
    
    // Находим корневые узлы
    var rootNodes = findRootNodes(nodesMap);
    
    // Строим дерево для jsTree
    var jsTreeData = [];
    rootNodes.forEach(function(rootNode) {
      jsTreeData.push(buildJsTreeNode(rootNode, nodesMap));
    });
    
    return jsTreeData;
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Установить данные групп
   * @param {Array} groups - Массив групп
   */
  function setGroups(groups) {
    groupsData = groups;
  }

  /**
   * Инициализировать jsTree
   * @param {string} containerId - ID контейнера
   * @param {Function} onSelect - Callback при выборе узла
   * @returns {Object} Экземпляр jsTree
   */
  function initJsTree(containerId, onSelect) {
    var treeData = convertToJsTreeData(groupsData);

    $(containerId).jstree({
      core: {
        data: treeData,
        themes: {
          name: 'default',
          responsive: false,  // ОТКЛЮЧАЕМ responsive режим
          dots: false,
          icons: true
        },
        animation: 150,
        check_callback: true
      },
      plugins: ['types', 'wholerow'],
      types: {
        'default': {
          icon: 'jstree-folder'
        },
        'file': {
          icon: 'jstree-file'
        }
      },
      wholerow: {
        stripes: false
      }
    });

    // Получаем экземпляр jsTree после инициализации
    jstreeInstance = $(containerId).jstree(true);

    // Обработчик выбора узла
    $(containerId).on('select_node.jstree', function(event, data) {
      if (onSelect && data.node) {
        onSelect(data.node);
      }
    });

    return jstreeInstance;
  }

  /**
   * Выбрать узел по ID
   * @param {number|string} nodeId - ID узла
   */
  function selectNode(nodeId) {
    if (!jstreeInstance || typeof jstreeInstance.get_node !== 'function') {
      console.warn('[TreeModule] jsTree не инициализирован');
      return;
    }

    var node = jstreeInstance.get_node(String(nodeId));
    if (node) {
      jstreeInstance.select_node(node);
      // open_to может быть недоступен сразу, используем альтернативный подход
      setTimeout(function() {
        if (jstreeInstance) {
          if (typeof jstreeInstance.open_to === 'function') {
            jstreeInstance.open_to(nodeId);
          } else if (typeof jstreeInstance.open_node === 'function') {
            jstreeInstance.open_node(nodeId);
          }
        }
      }, 50);
    }
  }

  /**
   * Снять выделение со всех узлов
   */
  function deselectAll() {
    if (!jstreeInstance) return;
    jstreeInstance.deselect_all();
  }

  /**
   * Развернуть все узлы
   */
  function openAll() {
    if (!jstreeInstance) return;
    jstreeInstance.open_all();
  }

  /**
   * Свернуть все узлы
   */
  function closeAll() {
    if (!jstreeInstance) return;
    jstreeInstance.close_all();
  }

  /**
   * Получить выбранный узел
   * @returns {Object|null} Выбранный узел
   */
  function getSelectedNode() {
    if (!jstreeInstance) return null;
    var selected = jstreeInstance.get_selected(true);
    return selected && selected.length > 0 ? selected[0] : null;
  }

  /**
   * Получить ID выбранного узла
   * @returns {number|null} ID узла
   */
  function getSelectedNodeId() {
    var node = getSelectedNode();
    return node ? parseInt(node.data.devGroupId, 10) : null;
  }

  /**
   * Обновить данные дерева
   * @param {Array} groups - Новые данные групп
   */
  function updateData(groups) {
    setGroups(groups);
    destroy();
  }

  /**
   * Уничтожить дерево
   */
  function destroy() {
    if (jstreeInstance) {
      $(jstreeInstance.element).jstree('destroy');
      jstreeInstance = null;
    }
    nodesMap = {};
  }

  /**
   * Получить статистику дерева
   * @returns {Object} Статистика
   */
  function getTreeStats() {
    var totalNodes = groupsData.length;
    var rootNodes = groupsData.filter(function(g) {
      return !g.parent_id || g.parent_id === 0;
    }).length;

    var maxDepth = 0;

    function calculateDepth(nodes, depth) {
      if (!nodes || nodes.length === 0) return depth;
      var max = depth;
      nodes.forEach(function(node) {
        if (node.children && node.children.length > 0) {
          var d = calculateDepth(node.children, depth + 1);
          if (d > max) max = d;
        }
      });
      return max;
    }

    var treeData = convertToJsTreeData(groupsData);
    maxDepth = calculateDepth(treeData, 1);

    return {
      totalNodes: totalNodes,
      rootNodes: rootNodes,
      maxDepth: maxDepth
    };
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    setGroups: setGroups,
    initJsTree: initJsTree,
    selectNode: selectNode,
    deselectAll: deselectAll,
    openAll: openAll,
    closeAll: closeAll,
    getSelectedNode: getSelectedNode,
    getSelectedNodeId: getSelectedNodeId,
    updateData: updateData,
    destroy: destroy,
    getTreeStats: getTreeStats,
    convertToJsTreeData: convertToJsTreeData,
    nodesMap: nodesMap
  };
})();
