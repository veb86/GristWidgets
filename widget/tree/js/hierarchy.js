/**
 * Модуль построения иерархического дерева
 *
 * Этот модуль отвечает за логику построения дерева устройств
 * на основе родительско-дочерних связей. Включает фильтрацию
 * по флагу, создание карты узлов и обработку циклических ссылок.
 *
 * @module HierarchyModule
 */

var HierarchyModule = (function() {
  'use strict';

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Построить иерархическое дерево из записей
   *
   * Основной метод модуля. Принимает плоский массив записей
   * и конфигурацию, возвращает структуру дерева.
   *
   * @param {Array} records - Массив всех записей из таблицы
   * @param {Object} config - Объект конфигурации полей
   * @returns {Object} Объект с картой узлов и корневыми элементами
   */
  function buildHierarchy(records, config) {
    console.log('=== ПОСТРОЕНИЕ ИЕРАРХИИ ===');
    console.log('Всего записей:', records.length);
    console.log('Конфигурация:', config);

    // Шаг 1: Фильтруем записи по флагу icanbeheadunit = -1
    var filteredRecords = filterRecordsByFlag(records, config);
    console.log('После фильтрации по флагу:', filteredRecords.length);

    // Шаг 2: Создаем карту узлов по идентификатору
    var nodesMap = createNodesMap(filteredRecords, config);
    console.log('Создано узлов:', Object.keys(nodesMap).length);

    // Шаг 3: Устанавливаем связи родитель-ребенок
    linkParentChild(nodesMap, filteredRecords, config);

    // Шаг 4: Определяем корневые узлы
    var rootNodes = findRootNodes(nodesMap);
    console.log('Найдено корневых узлов:', rootNodes.length);

    // Шаг 5: Проверяем и обрабатываем циклические ссылки
    handleCyclicReferences(nodesMap, rootNodes);

    return {
      nodesMap: nodesMap,
      rootNodes: rootNodes
    };
  }

  // ========================================
  // ПРИВАТНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Фильтровать записи по флагу участия в иерархии
   *
   * ВАЖНО: Флаг должен быть равен true для головных устройств
   * Ранее использовалось числовое значение -1, теперь булевый тип.
   *
   * @param {Array} records - Все записи
   * @param {Object} config - Конфигурация
   * @returns {Array} Отфильтрованные записи
   */
  function filterRecordsByFlag(records, config) {
    // Для булевого поля всегда фильтруем по true
    var flagValue = true;

    return records.filter(function(record) {
      var recordFlagValue = record[config.flagField];

      // Проверяем, что значение флага определено
      if (recordFlagValue === undefined || recordFlagValue === null) {
        return false;
      }

      // Для булевого поля проверяем, является ли значение истинным
      return Boolean(recordFlagValue) === flagValue;
    });
  }

  /**
   * Создать карту узлов из записей
   *
   * Преобразует плоский массив записей в карту объектов узлов,
   * где ключ - это идентификатор устройства.
   *
   * @param {Array} records - Отфильтрованные записи
   * @param {Object} config - Конфигурация
   * @returns {Object} Карта узлов {id: node}
   */
  function createNodesMap(records, config) {
    var nodesMap = {};

    records.forEach(function(record) {
      var nodeId = record[config.idField];

      // Пропускаем записи без идентификатора
      if (!nodeId) {
        return;
      }

      // Получаем текст для отображения
      var displayText = record[config.displayField] || nodeId;

      // Создаем объект узла
      nodesMap[nodeId] = {
        id: nodeId,
        text: displayText,
        parentId: null,
        children: [],
        recordId: record.id,
        data: record
      };
    });

    return nodesMap;
  }

  /**
   * Установить связи между родительскими и дочерними узлами
   *
   * Проходит по всем записям и создает связи parent-child
   * на основе поля HeadDeviceName.
   *
   * @param {Object} nodesMap - Карта узлов
   * @param {Array} records - Записи
   * @param {Object} config - Конфигурация
   */
  function linkParentChild(nodesMap, records, config) {
    records.forEach(function(record) {
      var nodeId = record[config.idField];
      var parentId = record[config.parentField];

      // Пропускаем записи без ID или без родителя
      if (!nodeId || !parentId) {
        return;
      }

      var node = nodesMap[nodeId];
      var parentNode = nodesMap[parentId];

      // Проверяем, что оба узла существуют в карте
      if (node && parentNode) {
        // Устанавливаем ссылку на родителя
        node.parentId = parentId;

        // Добавляем текущий узел в список детей родителя
        if (parentNode.children.indexOf(nodeId) === -1) {
          parentNode.children.push(nodeId);
        }
      }
    });
  }

  /**
   * Найти корневые узлы (без родителей)
   *
   * Корневой узел - это узел, у которого либо нет родителя,
   * либо родитель не существует в карте узлов.
   *
   * @param {Object} nodesMap - Карта узлов
   * @returns {Array} Массив корневых узлов
   */
  function findRootNodes(nodesMap) {
    var rootNodes = [];

    Object.values(nodesMap).forEach(function(node) {
      // Узел корневой, если у него нет parentId или родитель не найден
      if (!node.parentId || !nodesMap[node.parentId]) {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  /**
   * Обработать циклические ссылки в дереве
   *
   * Использует алгоритм поиска в глубину (DFS) для обнаружения циклов.
   * При обнаружении цикла выводит предупреждение в консоль.
   *
   * @param {Object} nodesMap - Карта узлов
   * @param {Array} rootNodes - Массив корневых узлов
   */
  function handleCyclicReferences(nodesMap, rootNodes) {
    var visited = new Set();
    var recursionStack = new Set();

    /**
     * Проверить узел на наличие цикла (DFS)
     *
     * @param {string} nodeId - ID узла
     * @returns {boolean} true, если найден цикл
     */
    function hasCycle(nodeId) {
      // Если узел уже в стеке рекурсии - найден цикл
      if (recursionStack.has(nodeId)) {
        console.warn('Обнаружен цикл в узле:', nodeId);
        return true;
      }

      // Если узел уже посещен ранее - цикла нет
      if (visited.has(nodeId)) {
        return false;
      }

      // Помечаем узел как посещенный
      visited.add(nodeId);
      recursionStack.add(nodeId);

      var node = nodesMap[nodeId];

      // Рекурсивно проверяем всех детей
      if (node && node.children) {
        for (var i = 0; i < node.children.length; i++) {
          if (hasCycle(node.children[i])) {
            return true;
          }
        }
      }

      // Убираем узел из стека рекурсии
      recursionStack.delete(nodeId);
      return false;
    }

    // Проверяем все корневые узлы
    rootNodes.forEach(function(rootNode) {
      hasCycle(rootNode.id);
    });
  }

  /**
   * Получить всех потомков узла (рекурсивно)
   *
   * Возвращает массив ID всех дочерних элементов
   * на всех уровнях вложенности.
   *
   * @param {string} nodeId - ID узла
   * @param {Object} nodesMap - Карта узлов
   * @returns {Array<string>} Массив ID потомков
   */
  function getAllDescendants(nodeId, nodesMap) {
    var descendants = [];
    var node = nodesMap[nodeId];

    if (!node || !node.children || node.children.length === 0) {
      return descendants;
    }

    // Добавляем прямых потомков
    node.children.forEach(function(childId) {
      descendants.push(childId);

      // Рекурсивно добавляем потомков потомков
      var childDescendants = getAllDescendants(childId, nodesMap);
      descendants = descendants.concat(childDescendants);
    });

    return descendants;
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    buildHierarchy: buildHierarchy,
    getAllDescendants: getAllDescendants
  };
})();
