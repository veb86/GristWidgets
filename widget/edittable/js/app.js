/**
 * Главный модуль приложения для редактируемой таблицы
 *
 * Этот модуль координирует работу всех других модулей и управляет
 * основным потоком приложения.
 *
 * @module AppModule
 */

var AppModule = (function() {
  'use strict';

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
  // ========================================

  /**
   * Инициализировать приложение
   *
   * Эта функция вызывается при загрузке страницы и запускает
   * инициализацию всех модулей.
   */
  function initialize() {
    console.log('Инициализация приложения...');

    // Инициализируем модули в правильном порядке
    UIModule.initialize();
    ConfigModule.loadSettings();

    // Инициализируем Grist API
    GristAPIModule.initialize().then(function() {
      console.log('Grist API готов');

      // Загружаем список таблиц
      loadAvailableTables();

    }).catch(function(error) {
      console.error('Ошибка инициализации Grist API:', error);
      UIModule.showError('Не удалось подключиться к Grist: ' + error.message);
    });
  }

  // ========================================
  // ЗАГРУЗКА СПИСКА ТАБЛИЦ
  // ========================================

  /**
   * Загрузить список доступных таблиц
   */
  function loadAvailableTables() {
    UIModule.showLoading('Загрузка списка таблиц...');

    GristAPIModule.loadAvailableTables().then(function(tables) {
      UIModule.populateTableSelect(tables);
      UIModule.updateStatus('Список таблиц загружен');
    }).catch(function(error) {
      UIModule.showError('Не удалось загрузить список таблиц: ' + error.message);
    });
  }

  // ========================================
  // ЗАГРУЗКА ДАННЫХ ВЫБРАННОЙ ТАБЛИЦЫ
  // ========================================

  /**
   * Загрузить данные выбранной таблицы
   */
  function loadSelectedTable() {
    var tableId = ConfigModule.getSelectedTableId();

    if (!tableId) {
      UIModule.updateStatus('Выберите таблицу');
      return;
    }

    UIModule.showLoading('Загрузка данных таблицы...');

    GristAPIModule.loadTableData(tableId).then(function(tableData) {
      UIModule.displayTableData(tableData);
      UIModule.updateStatus('Таблица загружена');
    }).catch(function(error) {
      UIModule.showError('Не удалось загрузить данные таблицы: ' + error.message);
    });
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initialize: initialize,
    loadAvailableTables: loadAvailableTables,
    loadSelectedTable: loadSelectedTable
  };
})();

// ========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ========================================

// Запускаем приложение при загрузке страницы
$(document).ready(function() {
  AppModule.initialize();
});