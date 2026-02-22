/**
 * Модуль для работы с деревом групп
 *
 * Этот модуль отвечает за построение иерархической структуры
 * дерева из плоского списка групп.
 *
 * @module TreeModule
 */

var TreeModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var groupsData = [];
  var treeStructure = null;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Проверить наличие циклов в иерархии
   * @param {number} groupId - ID группы для проверки
   * @param {Set} visited - Множество посещённых узлов
   * @returns {boolean} true если обнаружен цикл
   */
  function hasCycle(groupId, visited) {
    if (visited.has(groupId)) {
      return true;
    }

    visited.add(groupId);

    var group = groupsData.find(function(g) {
      return g.id === groupId;
    });

    if (group && group.parent_id && group.parent_id !== 0) {
      return hasCycle(group.parent_id, visited);
    }

    return false;
  }

  /**
   * Сортировать группы по manualSort
   * @param {Array} groups - Массив групп для сортировки
   * @returns {Array} Отсортированный массив
   */
  function sortGroups(groups) {
    return groups.sort(function(a, b) {
      var sortA = a.manualSort || 0;
      var sortB = b.manualSort || 0;
      return sortA - sortB;
    });
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
    treeStructure = null; // Сбросить кэш дерева
  }

  /**
   * Построить дерево из плоского списка
   * @returns {Array} Массив корневых узлов дерева
   */
  function buildTree() {
    if (treeStructure) {
      return treeStructure;
    }

    if (!groupsData || groupsData.length === 0) {
      return [];
    }

    // Создаём карту children для каждого узла
    var childrenMap = {};

    // Инициализируем корневой узел
    childrenMap[0] = [];

    // Инициализируем карту для всех групп
    groupsData.forEach(function(group) {
      childrenMap[group.id] = [];
    });

    // Заполняем карту дочерних элементов
    groupsData.forEach(function(group) {
      var parentId = group.parent_id || 0;

      // Если родитель существует в карте, добавляем туда
      if (childrenMap.hasOwnProperty(parentId)) {
        childrenMap[parentId].push(group);
      } else {
        // Если родителя нет, считаем корневой узел
        childrenMap[0].push(group);
      }
    });

    // Сортируем дочерние элементы
    Object.keys(childrenMap).forEach(function(key) {
      childrenMap[key] = sortGroups(childrenMap[key]);
    });

    // Получаем корневые узлы (parent_id = 0)
    var rootNodes = childrenMap[0] || [];

    // Рекурсивно строим дерево
    function buildNode(group) {
      var node = {
        id: group.id,
        code: group.code || '',
        name: group.name || '',
        manualSort: group.manualSort || 0,
        children: [],
        hasChildren: childrenMap[group.id] && childrenMap[group.id].length > 0
      };

      // Добавляем дочерние узлы
      if (childrenMap[group.id]) {
        node.children = childrenMap[group.id].map(function(child) {
          return buildNode(child);
        });
      }

      return node;
    }

    treeStructure = rootNodes.map(function(root) {
      return buildNode(root);
    });

    return treeStructure;
  }

  /**
   * Найти узел по ID
   * @param {number} nodeId - ID узла
   * @param {Array} nodes - Массив узлов для поиска
   * @returns {Object|null} Найденный узел или null
   */
  function findNodeById(nodeId, nodes) {
    if (!nodes) {
      nodes = buildTree();
    }

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      if (node.id === nodeId) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        var found = findNodeById(nodeId, node.children);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Получить путь к узлу (массив ID от корня до узла)
   * @param {number} nodeId - ID целевого узла
   * @param {Array} nodes - Массив узлов для поиска
   * @param {Array} path - Текущий путь
   * @returns {Array|null} Массив ID или null
   */
  function getPathToNode(nodeId, nodes, path) {
    if (!nodes) {
      nodes = buildTree();
    }

    if (!path) {
      path = [];
    }

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var currentPath = path.concat([node.id]);

      if (node.id === nodeId) {
        return currentPath;
      }

      if (node.children && node.children.length > 0) {
        var found = getPathToNode(nodeId, node.children, currentPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Проверить валидность иерархии (отсутствие циклов)
   * @returns {Object} Результат проверки
   */
  function validateHierarchy() {
    var issues = [];

    groupsData.forEach(function(group) {
      // Проверка на цикл
      if (group.parent_id && group.parent_id !== 0) {
        var visited = new Set();
        if (hasCycle(group.id, visited)) {
          issues.push('Обнаружен цикл для группы: ' + group.name + ' (id=' + group.id + ')');
        }
      }

      // Проверка на ссылку на несуществующего родителя
      if (group.parent_id && group.parent_id !== 0) {
        var parentExists = groupsData.some(function(g) {
          return g.id === group.parent_id;
        });

        if (!parentExists) {
          issues.push('Группа "' + group.name + '" ссылается на несуществующего родителя (parent_id=' + group.parent_id + ')');
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues
    };
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
      if (!nodes || nodes.length === 0) return;

      nodes.forEach(function(node) {
        if (depth > maxDepth) {
          maxDepth = depth;
        }
        if (node.children && node.children.length > 0) {
          calculateDepth(node.children, depth + 1);
        }
      });
    }

    calculateDepth(buildTree(), 1);

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
    buildTree: buildTree,
    findNodeById: findNodeById,
    getPathToNode: getPathToNode,
    validateHierarchy: validateHierarchy,
    getTreeStats: getTreeStats
  };
})();
