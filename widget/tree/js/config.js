/**
 * Модуль управления конфигурацией виджета
 *
 * Этот модуль отвечает за хранение и управление настройками виджета.
 * Предоставляет API для получения и изменения конфигурации полей таблицы.
 *
 * @module ConfigModule
 */

var ConfigModule = (function() {
  'use strict';

  // ========================================
  // КОНСТАНТЫ
  // ========================================

  // Значения полей по умолчанию
  var DEFAULT_ID_FIELD = 'NMO_BaseName';
  var DEFAULT_PARENT_FIELD = 'HeadDeviceName';
  var DEFAULT_FLAG_FIELD = 'icanbeheadunit';
  var DEFAULT_DISPLAY_FIELD = 'NMO_BaseName';
  var DEFAULT_TARGET_TABLE = ''; // Пустое значение означает текущую таблицу
  var DEFAULT_FLAG_VALUE = true; // Значение флага для участия в иерархии (головные устройства) - теперь булевое

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущая конфигурация виджета
   */
  var config = {
    idField: DEFAULT_ID_FIELD,
    parentField: DEFAULT_PARENT_FIELD,
    flagField: DEFAULT_FLAG_FIELD,
    displayField: DEFAULT_DISPLAY_FIELD,
    targetTable: DEFAULT_TARGET_TABLE,
    flagValue: DEFAULT_FLAG_VALUE
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
   * @param {string} fieldName - Имя поля (idField, parentField, и т.д.)
   * @returns {*} Значение поля или undefined
   */
  function getConfigValue(fieldName) {
    return config[fieldName];
  }

  /**
   * Обновить конфигурацию из полей ввода HTML
   *
   * Читает значения из элементов input на странице и обновляет
   * внутреннюю конфигурацию. Выполняет базовую валидацию.
   */
  function updateConfigFromInputs() {
    var idField = $('#field-id').val().trim();
    var parentField = $('#field-parent').val().trim();
    var flagField = $('#field-flag').val().trim();
    var displayField = $('#field-display').val().trim();
    var targetTable = $('#target-table').val().trim();

    // Валидация обязательных полей
    if (idField) {
      config.idField = idField;
    }
    if (parentField) {
      config.parentField = parentField;
    }
    if (flagField) {
      config.flagField = flagField;
    }

    // Поле отображения может быть пустым (тогда используется idField)
    config.displayField = displayField || config.idField;

    // Целевая таблица может быть пустой (тогда используется текущая таблица)
    config.targetTable = targetTable;

    console.log('Конфигурация обновлена:', config);
  }

  /**
   * Установить значения полей ввода из текущей конфигурации
   *
   * Синхронизирует HTML элементы с внутренним состоянием конфигурации.
   */
  function setInputsFromConfig() {
    $('#field-id').val(config.idField);
    $('#field-parent').val(config.parentField);
    $('#field-flag').val(config.flagField);
    $('#field-display').val(config.displayField);
    $('#target-table').val(config.targetTable);
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
   * Сбросить конфигурацию к значениям по умолчанию
   */
  function resetToDefaults() {
    config.idField = DEFAULT_ID_FIELD;
    config.parentField = DEFAULT_PARENT_FIELD;
    config.flagField = DEFAULT_FLAG_FIELD;
    config.displayField = DEFAULT_DISPLAY_FIELD;
    config.targetTable = DEFAULT_TARGET_TABLE;
    config.flagValue = DEFAULT_FLAG_VALUE;

    setInputsFromConfig();
    console.log('Конфигурация сброшена к значениям по умолчанию');
  }

  /**
   * Получить значение флага для фильтрации
   *
   * @returns {boolean} Значение флага (true)
   */
  function getFlagValue() {
    return config.flagValue;
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getConfig: getConfig,
    getConfigValue: getConfigValue,
    updateConfigFromInputs: updateConfigFromInputs,
    setInputsFromConfig: setInputsFromConfig,
    setConfigValue: setConfigValue,
    resetToDefaults: resetToDefaults,
    getFlagValue: getFlagValue
  };
})();
