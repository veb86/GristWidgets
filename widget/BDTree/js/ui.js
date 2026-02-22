/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отрисовку дерева,
 * обработку событий и взаимодействие с пользователем.
 *
 * @module UIModule
 */

var UIModule = (function(GristApiModule, TreeModule, ConfigModule) {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var selectedGroupId = null;
  var expandedNodes = {};
  var treeContainer = null;
  var selectedInfoElement = null;
  var messageContainer = null;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Экранировать HTML символы
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
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
   * Показать сообщение
   * @param {string} message - Текст сообщения
   * @param {string} type - Тип сообщения (info, warning, error)
   */
  function showMessage(message, type) {
    if (!messageContainer) return;

    messageContainer.innerHTML = '<div class="message message-' + type + '">' + escapeHtml(message) + '</div>';
    messageContainer.style.display = 'block';
  }

  /**
   * Скрыть сообщение
   */
  function hideMessage() {
    if (!messageContainer) return;

    messageContainer.style.display = 'none';
    messageContainer.innerHTML = '';
  }

  /**
   * Создать HTML для узла дерева
   * @param {Object} node - Узел дерева
   * @param {number} level - Уровень вложенности
   * @returns {string} HTML строка
   */
  function createNodeHtml(node, level) {
    var hasChildren = node.children && node.children.length > 0;
    var isExpanded = expandedNodes[node.id] !== false; // По умолчанию развернуты
    var isSelected = selectedGroupId === node.id;

    // Классы для toggle кнопки
    var toggleClass = 'tree-toggle';
    if (!hasChildren) {
      toggleClass += ' leaf';
    } else if (isExpanded) {
      toggleClass += ' expanded';
    }

    // Классы для контента
    var contentClass = 'tree-node-content';
    if (isSelected) {
      contentClass += ' selected';
    }

    // Иконка узла
    var iconClass = hasChildren ? 'tree-node-icon folder' : 'tree-node-icon file';
    var iconChar = hasChildren ? '📁' : '📄';

    // Счётчик детей
    var countHtml = '';
    if (hasChildren) {
      countHtml = '<span class="tree-node-count">' + node.children.length + '</span>';
    }

    return '<li class="tree-node" data-id="' + node.id + '" data-level="' + level + '">' +
      '<div class="' + contentClass + '">' +
        '<span class="' + toggleClass + '">' + (hasChildren ? '▶' : '') + '</span>' +
        '<span class="' + iconClass + '">' + iconChar + '</span>' +
        '<span class="tree-node-text">' +
          '<span class="tree-node-code">' + escapeHtml(node.code) + '</span>' +
          '<span class="tree-node-name">' + escapeHtml(node.name) + '</span>' +
        '</span>' +
        countHtml +
      '</div>';
  }

  /**
   * Рекурсивная отрисовка дерева
   * @param {Array} nodes - Массив узлов
   * @param {number} level - Текущий уровень
   * @returns {string} HTML всех узлов
   */
  function renderNodes(nodes, level) {
    if (!nodes || nodes.length === 0) {
      return '';
    }

    var html = '<ul class="tree-children">';

    nodes.forEach(function(node) {
      html += createNodeHtml(node, level);

      // Дочерние узлы
      if (node.children && node.children.length > 0) {
        var isExpanded = expandedNodes[node.id] !== false;
        var childrenClass = 'tree-children';
        if (!isExpanded) {
          childrenClass += ' collapsed';
        }
        html += '<li class="tree-node-children" data-parent-id="' + node.id + '">' +
                '<' + childrenClass + '>' +
                  renderNodes(node.children, level + 1) +
                '</ul></li>';
      }

      html += '</li>';
    });

    html += '</ul>';

    return html;
  }

  /**
   * Обработчик клика по узлу
   * @param {Event} event
   */
  function handleNodeClick(event) {
    var nodeContent = event.target.closest('.tree-node-content');
    if (!nodeContent) return;

    var treeNode = nodeContent.closest('.tree-node');
    if (!treeNode) return;

    var nodeId = parseInt(treeNode.dataset.id, 10);

    // Переключаем выделение
    selectNode(nodeId);
  }

  /**
   * Обработчик клика по toggle кнопке
   * @param {Event} event
   */
  function handleToggleClick(event) {
    var toggle = event.target.closest('.tree-toggle');
    if (!toggle || toggle.classList.contains('leaf')) return;

    event.stopPropagation();

    var treeNode = toggle.closest('.tree-node');
    if (!treeNode) return;

    var nodeId = parseInt(treeNode.dataset.id, 10);
    var childrenLi = treeNode.querySelector('.tree-node-children');

    if (!childrenLi) return;

    var childrenUl = childrenLi.querySelector('.tree-children');
    if (!childrenUl) return;

    // Переключаем состояние
    expandedNodes[nodeId] = !expandedNodes[nodeId];
    toggle.classList.toggle('expanded', expandedNodes[nodeId]);
    childrenUl.classList.toggle('collapsed', !expandedNodes[nodeId]);
  }

  /**
   * Выбрать узел
   * @param {number} nodeId - ID узла
   */
  function selectNode(nodeId) {
    // Снимаем выделение со всех узлов
    var allNodes = treeContainer.querySelectorAll('.tree-node-content');
    allNodes.forEach(function(node) {
      node.classList.remove('selected');
    });

    // Выделяем выбранный узел
    var selectedNode = treeContainer.querySelector('.tree-node[data-id="' + nodeId + '"] .tree-node-content');
    if (selectedNode) {
      selectedNode.classList.add('selected');
    }

    // Обновляем состояние
    selectedGroupId = nodeId;
    updateSelectedInfo();

    // Записываем в SYSTEM
    saveToGrist(nodeId);

    // Разворачиваем путь к узлу
    expandPathToNode(nodeId);
  }

  /**
   * Развернуть путь к узлу
   * @param {number} nodeId - ID целевого узла
   */
  function expandPathToNode(nodeId) {
    var path = TreeModule.getPathToNode(nodeId);
    if (!path) return;

    // Разворачиваем все узлы кроме последнего
    for (var i = 0; i < path.length - 1; i++) {
      expandedNodes[path[i]] = true;
    }

    // Перерисовываем
    render();
  }

  /**
   * Сохранить выбор в Grist
   * @param {number} groupId - ID выбранной группы
   */
  async function saveToGrist(groupId) {
    try {
      await GristApiModule.setSelectedGroupId(groupId);
      console.log('[UI] selectedGroupID сохранён:', groupId);
    } catch (error) {
      console.error('[UI] Ошибка сохранения в Grist:', error);
      showMessage('Ошибка сохранения выбора: ' + error.message, 'error');
    }
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать пользовательский интерфейс
   */
  function initializeUI() {
    treeContainer = document.getElementById('tree-root');
    selectedInfoElement = document.getElementById('selected-info');
    messageContainer = document.getElementById('message-container');

    // Обработчики событий
    if (treeContainer) {
      treeContainer.addEventListener('click', function(event) {
        handleToggleClick(event);
        handleNodeClick(event);
      });
    }
  }

  /**
   * Установить выбранную группу
   * @param {number} groupId - ID группы
   */
  function setSelectedGroupId(groupId) {
    selectedGroupId = groupId !== null && groupId !== undefined ? parseInt(groupId, 10) : null;
  }

  /**
   * Обновить информацию о выбранной группе
   */
  function updateSelectedInfo() {
    if (!selectedInfoElement) return;

    if (!selectedGroupId) {
      selectedInfoElement.textContent = 'Не выбрано';
      selectedInfoElement.classList.remove('has-value');
      return;
    }

    var node = TreeModule.findNodeById(selectedGroupId);
    if (node) {
      selectedInfoElement.textContent = node.code + ' — ' + node.name;
      selectedInfoElement.classList.add('has-value');
    } else {
      selectedInfoElement.textContent = 'Группа удалена';
      selectedInfoElement.classList.remove('has-value');
    }
  }

  /**
   * Отрисовать дерево
   */
  function render() {
    hideMessage();

    if (!treeContainer) return;

    // Строим дерево
    var tree = TreeModule.buildTree();

    // Проверка на пустое дерево
    if (!tree || tree.length === 0) {
      treeContainer.innerHTML = '<div class="empty-state">' +
        '<div class="empty-state-icon">🌳</div>' +
        '<p>Нет данных для отображения</p>' +
        '</div>';
      return;
    }

    // Проверка иерархии
    var validation = TreeModule.validateHierarchy();
    if (!validation.valid) {
      console.warn('[UI] Проблемы с иерархией:', validation.issues);
      // Продолжаем отрисовку, но логируем проблемы
    }

    // Отрисовка
    treeContainer.innerHTML = renderNodes(tree, 0);

    // Выделяем текущий узел
    if (selectedGroupId) {
      updateSelectedInfo();

      // Находим и выделяем узел
      var selectedNode = treeContainer.querySelector('.tree-node[data-id="' + selectedGroupId + '"] .tree-node-content');
      if (selectedNode) {
        selectedNode.classList.add('selected');
      }

      // Разворачиваем путь
      expandPathToNode(selectedGroupId);
    }

    console.log('[UI] Дерево отрисовано');
  }

  /**
   * Показать состояние загрузки
   */
  function showLoading() {
    if (!treeContainer) return;

    treeContainer.innerHTML = '<div class="loading">Загрузка данных...</div>';
  }

  /**
   * Обновить данные и перерисовать
   * @param {Array} groups - Новые данные групп
   */
  function updateData(groups) {
    TreeModule.setGroups(groups);
    render();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    setSelectedGroupId: setSelectedGroupId,
    updateSelectedInfo: updateSelectedInfo,
    render: render,
    showLoading: showLoading,
    updateData: updateData
  };
})(GristApiModule, TreeModule, ConfigModule);
