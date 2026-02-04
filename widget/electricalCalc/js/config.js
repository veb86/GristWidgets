/**
 * Модуль конфигурации виджета
 *
 * Отвечает за хранение и управление настройками виджета.
 * Все настройки виджета централизованы в этом модуле.
 *
 * @module ConfigModule
 */

var ConfigModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущая конфигурация виджета
   * @type {Object}
   */
  let currentConfig = {
    // Имя таблицы SYSTYM для получения параметров
    systemTable: 'SYSTYM',

    // Имя таблицы AllDevGroup для получения данных устройств
    dataTable: 'AllDevGroup',

    // Имя параметра в таблице SYSTYM для поиска имени щита
    shieldParamName: 'ShieldName',

    // Столбец в SYSTYM, где находятся имена параметров
    systemFnameColumn: 'fname',

    // Столбец в SYSTYM, где находятся значения параметров
    systemFvalueColumn: 'fvalue',

    // Столбец в AllDevGroup для фильтрации по пути
    pathColumn: 'onlyGUpath',

    // Разделитель в пути
    pathSeparator: '\\'
  };

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Получить текущую конфигурацию
   * @returns {Object} Объект конфигурации
   */
  function getConfig() {
    return Object.assign({}, currentConfig);
  }

  /**
   * Установить новую конфигурацию
   * @param {Object} newConfig - Новая конфигурация
   */
  function setConfig(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') {
      console.warn('Некорректная конфигурация:', newConfig);
      return;
    }

    // Обновляем только существующие поля
    Object.keys(newConfig).forEach(key => {
      if (currentConfig.hasOwnProperty(key)) {
        currentConfig[key] = newConfig[key];
      }
    });

    console.log('Конфигурация обновлена:', currentConfig);
  }

  /**
   * Получить значение конкретного параметра конфигурации
   * @param {string} key - Ключ параметра
   * @param {*} defaultValue - Значение по умолчанию
   * @returns {*} Значение параметра
   */
  function getConfigValue(key, defaultValue) {
    return currentConfig.hasOwnProperty(key) ? currentConfig[key] : defaultValue;
  }

  /**
   * Установить значение конкретного параметра конфигурации
   * @param {string} key - Ключ параметра
   * @param {*} value - Новое значение
   */
  function setConfigValue(key, value) {
    currentConfig[key] = value;
    console.log(`Параметр конфигурации "${key}" установлен:`, value);
  }

  /**
   * Сбросить конфигурацию к значениям по умолчанию
   */
  function resetConfig() {
    currentConfig = {
      systemTable: 'SYSTYM',
      dataTable: 'AllDevGroup',
      shieldParamName: 'ShieldName',
      systemFnameColumn: 'fname',
      systemFvalueColumn: 'fvalue',
      pathColumn: 'onlyGUpath',
      pathSeparator: '\\'
    };
    console.log('Конфигурация сброшена к значениям по умолчанию');
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getConfig: getConfig,
    setConfig: setConfig,
    getConfigValue: getConfigValue,
    setConfigValue: setConfigValue,
    resetConfig: resetConfig
  };
})();
