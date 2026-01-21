/**
 * Главный модуль приложения
 *
 * Координирует работу всех модулей и управляет жизненным циклом приложения.
 * Отвечает за инициализацию, настройку обработчиков событий и обновление данных.
 *
 * @module AppController
 */

var AppController = (function() {
  'use strict';

  // ========================================
  // КОНСТАНТЫ
  // ========================================

  // Задержка перед первой загрузкой данных (мс)
  var INITIAL_LOAD_DELAY = 500;

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ========================================

  /**
   * Инициализировать приложение
   *
   * Основная точка входа. Запускает все необходимые модули
   * и настраивает обработчики событий.
   */
  async function initialize() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===');

    try {
      // Проверяем доступность Grist API
      if (typeof grist === 'undefined') {
        UIModule.showError('Grist API не загружен');
        return;
      }

      // Инициализируем Grist API
      await GristAPIModule.initialize();
      console.log('Grist API инициализирован');

      // Инициализируем UI
      UIModule.initializeTree();
      ConfigModule.setInputsFromConfig();

      // Настраиваем обработчики событий
      setupEventHandlers();

      // Загружаем данные с задержкой
      setTimeout(function() {
        loadAndRenderTree();
      }, INITIAL_LOAD_DELAY);

    } catch (error) {
      console.error('Ошибка инициализации:', error);
      UIModule.showError('Ошибка инициализации: ' + error.message);
    }
  }

  // ========================================
  // НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
  // ========================================

  /**
   * Настроить обработчики событий UI
   *
   * Связывает элементы интерфейса с обработчиками.
   */
  function setupEventHandlers() {
    // Кнопка настроек
    $('#settings-toggle').on('click', function() {
      UIModule.toggleSettingsPanel();
    });

    // Изменение полей настроек
    var settingsFields = '#field-id, #field-parent, #field-flag, #field-display, #target-table';
    $(settingsFields).on('change', handleSettingsChange);

    // Обновление данных из Grist
    GristAPIModule.subscribeToRecordChanges(function() {
      console.log('Данные обновились в Grist, перестраиваем дерево');
      loadAndRenderTree();
    });

    console.log('Обработчики событий настроены');
  }

  /**
   * Обработчик изменения настроек
   *
   * Вызывается при изменении любого поля настроек.
   */
  function handleSettingsChange() {
    console.log('Настройки изменены');

    // Обновляем конфигурацию из полей ввода
    ConfigModule.updateConfigFromInputs();

    // Перестраиваем дерево с новой конфигурацией
    loadAndRenderTree();
  }

  // ========================================
  // ЗАГРУЗКА И ОТОБРАЖЕНИЕ ДАННЫХ
  // ========================================

  /**
   * Загрузить данные и отобразить дерево
   *
   * Основной рабочий цикл приложения:
   * 1. Загрузка данных из Grist
   * 2. Построение иерархии
   * 3. Обновление UI
   */
  async function loadAndRenderTree() {
    try {
      // Показываем индикатор загрузки
      UIModule.clearError();
      UIModule.showLoading('Загрузка данных...');

      // Получаем текущую конфигурацию
      var config = ConfigModule.getConfig();
      console.log('Используется конфигурация:', config);

      // Загружаем данные из Grist
      var records = await GristAPIModule.loadTableData();

      if (records.length === 0) {
        UIModule.updateStatus('Нет данных для отображения');
        return;
      }

      console.log('Загружено записей:', records.length);

      // Строим иерархию
      var hierarchy = HierarchyModule.buildHierarchy(records, config);

      if (hierarchy.rootNodes.length === 0) {
        var message = 'Нет устройств с ' + config.flagField + ' = true';
        UIModule.updateStatus(message);
        return;
      }

      console.log('Иерархия построена:', {
        totalNodes: Object.keys(hierarchy.nodesMap).length,
        rootNodes: hierarchy.rootNodes.length
      });

      // Обновляем дерево в UI
      UIModule.updateTree(hierarchy);

    } catch (error) {
      console.error('Ошибка загрузки и рендеринга:', error);
      UIModule.showError('Ошибка: ' + error.message);
    }
  }

  /**
   * Перезагрузить данные
   *
   * Публичный метод для принудительной перезагрузки дерева.
   */
  function reload() {
    console.log('Принудительная перезагрузка данных');
    loadAndRenderTree();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initialize: initialize,
    reload: reload
  };
})();

// ========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ========================================

/**
 * Запускаем приложение при готовности DOM
 */
$(document).ready(function() {
  console.log('DOM загружен, запуск приложения...');
  AppController.initialize();
});
