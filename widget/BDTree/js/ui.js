/**
 * Модуль для работы с пользовательским интерфейсом
 *
 * Этот модуль отвечает за отрисовку дерева через jsTree,
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
  var treeContainer = null;
  var selectedInfoElement = null;
  var messageContainer = null;
  var isInitialized = false;

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

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
   * Сохранить выбор в Grist
   * @param {number} groupId - ID выбранной группы
   */
  async function saveToGrist(groupId) {
    try {
      console.log('[UI] Сохранение в Grist: selectedGroupID =', groupId);
      await GristApiModule.setSelectedGroupId(groupId);
      console.log('[UI] selectedGroupID сохранён:', groupId);
    } catch (error) {
      console.error('[UI] Ошибка сохранения в Grist:', error);
      showMessage('Ошибка сохранения: ' + error.message, 'error');
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

    // Находим группу в данных
    var groups = GristApiModule.getDeviceGroups();
    var group = groups.find(function(g) {
      return g.id === selectedGroupId;
    });

    if (group) {
      selectedInfoElement.textContent = group.name + ' (' + group.code + ')';
      selectedInfoElement.classList.add('has-value');
    } else {
      selectedInfoElement.textContent = 'Группа удалена';
      selectedInfoElement.classList.remove('has-value');
    }
  }

  /**
   * Обработчик выбора узла
   * @param {Object} node - Узел jsTree
   */
  function handleNodeSelect(node) {
    console.log('[UI] Выбор узла:', node);
    console.log('[UI] Данные узла:', node.data);
    console.log('[UI] ID узла:', node.id);
    
    // Получаем ID группы из data узла
    var groupId = null;
    
    // Пробуем получить из data.devGroupId
    if (node.data && node.data.devGroupId !== undefined) {
      groupId = node.data.devGroupId;
      console.log('[UI] ID из data.devGroupId:', groupId);
    }
    // Пробуем получить из li_attr
    else if (node.li_attr && node.li_attr['data-group-id']) {
      groupId = parseInt(node.li_attr['data-group-id'], 10);
      console.log('[UI] ID из li_attr:', groupId);
    }
    // Пробуем получить из id узла
    else if (node.id) {
      groupId = parseInt(node.id, 10);
      console.log('[UI] ID из node.id:', groupId);
    }
    
    console.log('[UI] Финальный ID группы:', groupId);

    if (groupId && !isNaN(groupId)) {
      selectedGroupId = groupId;
      updateSelectedInfo();
      saveToGrist(groupId);
    } else {
      console.error('[UI] Не удалось получить ID группы из узла:', node);
      showMessage('Ошибка: не удалось определить ID группы', 'error');
    }
  }

  /**
   * Отрисовать дерево
   */
  function render() {
    hideMessage();

    if (!treeContainer) {
      console.error('[UI] tree-root не найден');
      return;
    }

    var groups = GristApiModule.getDeviceGroups();

    // Проверка на пустые данные
    if (!groups || groups.length === 0) {
      treeContainer.innerHTML = '<div class="empty-state">' +
        '<div class="empty-state-icon">🌳</div>' +
        '<p>Нет данных для отображения</p>' +
        '</div>';
      return;
    }

    // Устанавливаем данные в Tree модуль
    TreeModule.setGroups(groups);

    // Уничтожаем старое дерево если есть
    TreeModule.destroy();

    // Инициализируем jsTree
    TreeModule.initJsTree('#tree-root', handleNodeSelect);

    isInitialized = true;

    // Выделяем текущий узел после инициализации с задержкой
    setTimeout(function() {
      if (selectedGroupId) {
        updateSelectedInfo();
        console.log('[UI] Выделение узла:', selectedGroupId);
        TreeModule.selectNode(selectedGroupId);
      }
    }, 200);

    // Статистика
    var stats = TreeModule.getTreeStats();
    console.log('[UI] Дерево отрисовано:', stats);
  }

  /**
   * Показать состояние загрузки
   */
  function showLoading() {
    if (!treeContainer) return;
    treeContainer.innerHTML = '<div class="loading">Загрузка данных...</div>';
  }

  /**
   * Перерисовать дерево (обновление данных)
   */
  function refresh() {
    if (isInitialized) {
      TreeModule.destroy();
      render();
    }
  }

  /**
   * Развернуть все узлы
   */
  function expandAll() {
    TreeModule.openAll();
  }

  /**
   * Свернуть все узлы
   */
  function collapseAll() {
    TreeModule.closeAll();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeUI: initializeUI,
    setSelectedGroupId: setSelectedGroupId,
    updateSelectedInfo: updateSelectedInfo,
    handleNodeSelect: handleNodeSelect,
    render: render,
    showLoading: showLoading,
    refresh: refresh,
    expandAll: expandAll,
    collapseAll: collapseAll
  };
})(GristApiModule, TreeModule, ConfigModule);
