/**
 * Модуль управления конфигурацией виджета визуализации однолинейной схемы
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
  var DEFAULT_LAYOUT = 'vertical'; // 'vertical' или 'horizontal'
  var DEFAULT_SCALE = 1.0;
  var DEFAULT_GROUP_BY_FEEDER = true;
  var DEFAULT_TABLE = 'schema';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущая конфигурация виджета
   */
  var config = {
    layout: DEFAULT_LAYOUT,
    scale: DEFAULT_SCALE,
    groupByFeeder: DEFAULT_GROUP_BY_FEEDER,
    table: DEFAULT_TABLE
  };

  // Значения по умолчанию для настроек
  var defaultOptions = {
    layout: DEFAULT_LAYOUT,
    groupByFeeder: DEFAULT_GROUP_BY_FEEDER,
    scale: DEFAULT_SCALE,
    table: DEFAULT_TABLE
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

  /**
   * Установить конфигурацию из внешнего источника
   * @param {Object} newConfig - Новый объект конфигурации
   */
  function setConfig(newConfig) {
    if (newConfig && typeof newConfig === 'object') {
      // Обновляем только те поля, которые существуют в нашей конфигурации
      Object.keys(config).forEach(function(key) {
        if (newConfig.hasOwnProperty(key)) {
          config[key] = newConfig[key];
        }
      });
      console.log('Конфигурация обновлена:', config);
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getConfig: getConfig,
    getConfigValue: getConfigValue,
    setConfigValue: setConfigValue,
    setConfig: setConfig
  };
})();