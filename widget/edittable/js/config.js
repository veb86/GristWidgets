/**
 * Модуль конфигурации виджета редактируемой таблицы
 *
 * Этот модуль управляет настройками виджета, такими как выбранная таблица.
 *
 * @module ConfigModule
 */

var ConfigModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var selectedTableId = null; // ID выбранной таблицы

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Получить ID выбранной таблицы
   *
   * @returns {string|null} ID выбранной таблицы или null, если не выбрана
   */
  function getSelectedTableId() {
    return selectedTableId;
  }

  /**
   * Установить ID выбранной таблицы
   *
   * @param {string} tableId - ID таблицы для выбора
   */
  function setSelectedTableId(tableId) {
    selectedTableId = tableId;
    console.log('Выбрана таблица:', tableId);
  }

  /**
   * Загрузить настройки из локального хранилища
   */
  function loadSettings() {
    // В будущем можно добавить сохранение настроек в localStorage
    console.log('Настройки загружены');
  }

  /**
   * Сохранить настройки в локальное хранилище
   */
  function saveSettings() {
    // В будущем можно добавить сохранение настроек в localStorage
    console.log('Настройки сохранены');
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getSelectedTableId: getSelectedTableId,
    setSelectedTableId: setSelectedTableId,
    loadSettings: loadSettings,
    saveSettings: saveSettings
  };
})();