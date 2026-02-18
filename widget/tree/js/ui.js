/**
 * Модуль управления пользовательским интерфейсом
 *
 * Этот модуль отвечает за отображение дерева и управление
 * элементами интерфейса. Использует библиотеку jsTree для
 * визуализации иерархической структуры.
 *
 * @module UIModule
 */

var UIModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var isInitialized = false;
  var currentHierarchy = null;

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ========================================

  /**
   * Инициализировать дерево jsTree
   *
   * Создает пустое дерево с базовыми настройками.
   * Должна быть вызвана один раз при загрузке приложения.
   */
  function initializeTree() {
    if (isInitialized) {
      return;
    }

    console.log('Инициализация дерева jsTree...');

    $('#tree').jstree({
      'core': {
        'data': [],
        'check_callback': true,
        'themes': {
          'responsive': false,
          'dots': true,
          'icons': true
        }
      },
      'plugins': ['types', 'search'],
      'types': {
        'default': {
          'icon': 'jstree-folder'
        },
        'file': {
          'icon': 'jstree-file'
        }
      }
    });

    // Обработчик выбора узла
    $('#tree').on('select_node.jstree', handleNodeSelection);

    isInitialized = true;
    console.log('Дерево инициализировано');
  }

  /**
   * Проверить, инициализировано ли дерево
   *
   * @returns {boolean} true, если дерево инициализировано
   */
  function isTreeInitialized() {
    return isInitialized;
  }

  // ========================================
  // ОБНОВЛЕНИЕ ДЕРЕВА
  // ========================================

  /**
   * Обновить дерево новыми данными
   *
   * Преобразует данные иерархии в формат jsTree и обновляет
   * визуальное представление.
   *
   * @param {Object} hierarchy - Объект иерархии с nodesMap и rootNodes
   */
  function updateTree(hierarchy) {
    try {
      currentHierarchy = hierarchy;

      var jsTreeData = buildJsTreeData(hierarchy);
      console.log('Данные для jsTree построены:', jsTreeData.length, 'корневых узлов');

      var $tree = $('#tree');
      var jsTree = $tree.jstree(true);

      if (jsTree) {
        // Обновляем существующее дерево
        jsTree.settings.core.data = jsTreeData;
        jsTree.refresh(true);
      } else {
        // Инициализируем новое дерево
        initializeTree();
        jsTree = $tree.jstree(true);
        jsTree.settings.core.data = jsTreeData;
        jsTree.refresh(true);
      }

      var nodeCount = Object.keys(hierarchy.nodesMap).length;
      updateStatus('Дерево построено. Узлов: ' + nodeCount);

    } catch (error) {
      console.error('Ошибка обновления дерева:', error);
      showError('Ошибка обновления дерева: ' + error.message);
    }
  }

  /**
   * Построить данные для jsTree из иерархии
   *
   * Рекурсивно преобразует внутреннюю структуру дерева
   * в формат, понятный библиотеке jsTree.
   *
   * @param {Object} hierarchy - Объект иерархии
   * @returns {Array} Массив узлов для jsTree
   */
  function buildJsTreeData(hierarchy) {
    var nodesMap = hierarchy.nodesMap;
    var rootNodes = hierarchy.rootNodes;

    /**
     * Рекурсивно построить узел jsTree
     *
     * @param {Object} node - Узел из nodesMap
     * @returns {Object} Узел для jsTree
     */
    function buildJsTreeNode(node) {
      var jsTreeNode = {
        id: node.id.toString(),
        text: node.text,
        state: { opened: true },
        data: {
          recordId: node.recordId,
          nodeId: node.id,
          children: node.children || []
        }
      };

      // Рекурсивно добавляем детей
      if (node.children && node.children.length > 0) {
        jsTreeNode.children = [];

        node.children.forEach(function(childId) {
          var childNode = nodesMap[childId];
          if (childNode) {
            jsTreeNode.children.push(buildJsTreeNode(childNode));
          }
        });

        jsTreeNode.icon = 'jstree-folder';
      } else {
        jsTreeNode.icon = 'jstree-file';
      }

      return jsTreeNode;
    }

    // Строим массив корневых узлов для jsTree
    var jsTreeData = [];
    rootNodes.forEach(function(rootNode) {
      jsTreeData.push(buildJsTreeNode(rootNode));
    });

    return jsTreeData;
  }

  // ========================================
  // ОБРАБОТКА СОБЫТИЙ
  // ========================================

  /**
   * Обработчик выбора узла в дереве
   *
   * Вызывается при клике на узел дерева.
   * Навигирует к записи в Grist, записывает имя узла в таблицу SYSTEM и применяет фильтр.
   *
   * @param {Event} e - Событие
   * @param {Object} data - Данные узла от jsTree
   */
  function handleNodeSelection(e, data) {
    try {
      var node = data.node;
      console.log('Выбран узел:', node);

      if (!node || !node.data) {
        return;
      }

      var recordId = node.data.recordId;
      var nodeId = node.data.nodeId;
      var childrenIds = node.data.children || [];

      // Навигируем к записи в Grist
      if (recordId) {
        GristAPIModule.navigateToRecord(recordId).catch(function(err) {
          console.warn('Ошибка навигации к записи:', err);
        });
      }

      // Записываем имя узла в таблицу SYSTEM
      writeToSystemTable(node);

      // Применяем фильтр к связанным виджетам
      applyFilterForNode(nodeId, childrenIds);

    } catch (error) {
      console.error('Ошибка обработки выбора узла:', error);
    }
  }

  // Константы для имен столбцов в таблице SYSTEM
  var FNAME_COLUMN = 'fname';
  var FVALUE_COLUMN = 'fvalue';

  /**
   * Записать имя узла в таблицу SYSTEM
   *
   * @param {Object} node - Узел дерева
   */
  async function writeToSystemTable(node) {
    try {
      // Получаем имя узла для записи
      var nodeName = node.text || node.id || 'Unknown';

      // Проверяем, существует ли таблица SYSTEM
      var systemTableExists = await checkTableExists('SYSTEM');

      if (!systemTableExists) {
        // Если таблица SYSTEM не существует, создаем её
        try {
          await grist.docApi.applyUserActions([
            ['AddTable', 'SYSTEM', [
              { id: FNAME_COLUMN, type: 'Text', title: 'Field Name' },
              { id: FVALUE_COLUMN, type: 'Text', title: 'Field Value' }
            ]]
          ]);
        } catch (createError) {
          console.error('Ошибка создания таблицы SYSTEM:', createError);
          throw createError;
        }
      }

      // Проверяем, есть ли уже запись с нужным fname в таблице SYSTEM
      var systemData;
      var fnameRecordId = null;

      try {
        systemData = await grist.docApi.fetchTable('SYSTEM');

        // Ищем существующую запись с нужным fname
        if (systemData && systemData[FNAME_COLUMN] !== undefined) {
          for (var i = 0; i < systemData[FNAME_COLUMN].length; i++) {
            if (systemData[FNAME_COLUMN][i] === 'ShieldName') {
              fnameRecordId = systemData.id[i];
              break;
            }
          }
        }
      } catch (error) {
        // Если таблица SYSTEM не существует, создаем с нужными столбцами
        systemData = null;
      }

      // Подготовим действия для обновления или создания записи
      var actions = [];

      if (fnameRecordId !== null) {
        // Обновляем существующую запись
        var updateRecord = {};
        updateRecord[FNAME_COLUMN] = 'ShieldName';
        updateRecord[FVALUE_COLUMN] = nodeName;
        actions.push(['UpdateRecord', 'SYSTEM', fnameRecordId, updateRecord]);
      } else {
        // Создаем новую запись
        var addRecord = {};
        addRecord[FNAME_COLUMN] = 'ShieldName';
        addRecord[FVALUE_COLUMN] = nodeName;
        actions.push(['AddRecord', 'SYSTEM', null, addRecord]);
      }

      // Выполняем действия
      await grist.docApi.applyUserActions(actions);

      console.log('Запись в таблицу SYSTEM выполнена: ShieldName=' + nodeName);
      updateStatus('Элемент "' + nodeName + '" записан в таблицу SYSTEM');

    } catch (error) {
      console.error('Ошибка при записи в таблицу SYSTEM:', error);
      updateStatus('Ошибка записи в SYSTEM: ' + error.message);
    }
  }

  /**
   * Проверить, существует ли таблица
   *
   * @param {string} tableName - Имя таблицы
   * @returns {Promise<boolean>} Существует ли таблица
   */
  async function checkTableExists(tableName) {
    try {
      // Получаем список всех таблиц
      var tables = await grist.docApi.listTables();
      // Проверяем, есть ли таблица в списке
      return tables.includes(tableName);
    } catch (error) {
      console.error('Ошибка проверки существования таблицы:', error);
      return false;
    }
  }

  /**
   * Применить фильтр для выбранного узла
   *
   * Получает список всех потомков и применяет фильтр.
   *
   * @param {string} nodeId - ID выбранного узла
   * @param {Array} directChildren - Прямые потомки узла
   */
  function applyFilterForNode(nodeId, directChildren) {
    if (!currentHierarchy) {
      console.warn('Иерархия не загружена');
      return;
    }

    // Получаем текущую конфигурацию для получения целевой таблицы
    var config = ConfigModule.getConfig();
    var targetTable = config.targetTable;

    // Получаем все ID для фильтрации (выбранный + все рекурсивные потомки)
    var allIds = [nodeId];

    // Рекурсивно собираем всех потомков
    var descendants = HierarchyModule.getAllDescendants(
      nodeId,
      currentHierarchy.nodesMap
    );

    allIds = allIds.concat(descendants);

    // Получаем текущую конфигурацию для информации о целевой таблице (для отладки)
    var config = ConfigModule.getConfig();
    var targetTable = config.targetTable;

    if (targetTable && targetTable.trim()) {
      console.info('Выбрана целевая таблица для фильтрации (в настоящее время фильтрация применяется к текущей таблице):', targetTable);
    }

    console.log('Применение фильтра:', {
      selected: nodeId,
      descendants: descendants,
      total: allIds.length
    });

    // Отправляем фильтр в Grist (фильтрация применяется к текущей таблице)
    GristAPIModule.applyFilter(allIds).catch(function(err) {
      console.warn('Ошибка применения фильтра:', err);
    });
  }

  // ========================================
  // СТАТУС-БАР
  // ========================================

  /**
   * Обновить текст статус-бара
   *
   * @param {string} message - Сообщение для отображения
   */
  function updateStatus(message) {
    $('#status-text').text(message);
    $('.loading').hide();
  }

  /**
   * Показать состояние загрузки
   *
   * @param {string} message - Сообщение о загрузке
   */
  function showLoading(message) {
    message = message || 'Загрузка данных...';
    $('#status-text').text(message);
    $('.loading').show();
  }

  /**
   * Показать сообщение об ошибке
   *
   * @param {string} message - Сообщение об ошибке
   */
  function showError(message) {
    $('#status').addClass('error');
    $('#status-text').text(message);
    $('.loading').hide();
  }

  /**
   * Очистить состояние ошибки
   */
  function clearError() {
    $('#status').removeClass('error');
  }

  // ========================================
  // ПАНЕЛЬ НАСТРОЕК
  // ========================================

  /**
   * Показать панель настроек
   */
  function showSettingsPanel() {
    $('#settings-panel').addClass('visible');
    $('#tree').addClass('with-settings');
  }

  /**
   * Скрыть панель настроек
   */
  function hideSettingsPanel() {
    $('#settings-panel').removeClass('visible');
    $('#tree').removeClass('with-settings');
  }

  /**
   * Переключить видимость панели настроек
   */
  function toggleSettingsPanel() {
    var panel = $('#settings-panel');
    panel.toggleClass('visible');

    var tree = $('#tree');
    if (panel.hasClass('visible')) {
      tree.addClass('with-settings');
    } else {
      tree.removeClass('with-settings');
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeTree: initializeTree,
    isTreeInitialized: isTreeInitialized,
    updateTree: updateTree,
    updateStatus: updateStatus,
    showLoading: showLoading,
    showError: showError,
    clearError: clearError,
    showSettingsPanel: showSettingsPanel,
    hideSettingsPanel: hideSettingsPanel,
    toggleSettingsPanel: toggleSettingsPanel
  };
})();
