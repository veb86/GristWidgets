/**
 * Модуль управления конфигурацией виджета BDControl
 *
 * Этот модуль отвечает за хранение и управление настройками виджета.
 * Предоставляет API для получения и изменения конфигурации.
 *
 * @module ConfigModule
 */

var ConfigModule = (function() {
  'use strict';

  // ========================================
  // КОНСТАНТЫ
  // ========================================

  // Значения по умолчанию
  var DEFAULT_SORT_FIELD = 'manualSort';
  var DEFAULT_SORT_DIRECTION = 'asc';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущая конфигурация виджета
   */
  var config = {
    sortField: DEFAULT_SORT_FIELD,
    sortDirection: DEFAULT_SORT_DIRECTION
  };

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Получить текущую конфигурацию
   *
   * Возвращает копию объекта конфигурации, чтобы избежать
   * случайных изменений извне.
   *
   * @returns {Object} Объект конфигурации
   */
  function getConfig() {
    return Object.assign({}, config);
  }

  /**
   * Получить значение конкретного поля конфигурации
   *
   * @param {string} fieldName - Имя поля
   * @returns {*} Значение поля или undefined
   */
  function getConfigValue(fieldName) {
    return config[fieldName];
  }

  /**
   * Установить значение конкретного поля конфигурации
   *
   * @param {string} fieldName - Имя поля
   * @param {*} value - Новое значение
   */
  function setConfigValue(fieldName, value) {
    if (config.hasOwnProperty(fieldName)) {
      config[fieldName] = value;
      console.log('Поле конфигурации обновлено:', fieldName, '=', value);
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getConfig: getConfig,
    getConfigValue: getConfigValue,
    setConfigValue: setConfigValue
  };
})();
