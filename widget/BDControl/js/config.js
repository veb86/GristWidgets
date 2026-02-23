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

  // Базовые колонки которые всегда отображаются
  var BASE_COLUMNS = ['name', 'brand', 'factoryname', 'unit', 'count', 'note', 'gristHelper_Display2'];

  // Настройки видимости столбцов по умолчанию
  var DEFAULT_COLUMN_VISIBILITY = {
    // Базовые колонки
    'name': { visible: true, width: 200, title: 'Наименование' },
    'brand': { visible: true, width: 150, title: 'Модель' },
    'factoryname': { visible: true, width: 150, title: 'Производитель' },
    'unit': { visible: true, width: 80, title: 'Ед. изм.' },
    'count': { visible: true, width: 100, title: 'Количество' },
    'note': { visible: true, widthGrow: 1, title: 'Примечание' },
    'gristHelper_Display2': { visible: true, width: 150, title: 'Группа' },
    // Характеристики (добавляются динамически)
    'power': { visible: true, width: 120, title: 'Мощность', unit: 'Вт' },
    'voltage': { visible: true, width: 100, title: 'Напряжение', unit: 'В' },
    'luminous_flux': { visible: true, width: 120, title: 'Световой поток', unit: 'лм' },
    'color_temperature': { visible: true, width: 120, title: 'Температура', unit: 'К' }
  };

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  /**
   * Текущая конфигурация виджета
   */
  var config = {
    sortField: DEFAULT_SORT_FIELD,
    sortDirection: DEFAULT_SORT_DIRECTION,
    columnVisibility: JSON.parse(JSON.stringify(DEFAULT_COLUMN_VISIBILITY)),
    currentGroupId: null // ID текущей группы для контекстных настроек
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
   * Получить настройки видимости колонок
   *
   * @returns {Object} Объект с настройками видимости
   */
  function getColumnVisibility() {
    return JSON.parse(JSON.stringify(config.columnVisibility));
  }

  /**
   * Получить настройки видимости для конкретной колонки
   *
   * @param {string} columnCode - Код колонки
   * @returns {Object|undefined} Настройки колонки или undefined
   */
  function getColumnVisibilitySetting(columnCode) {
    return config.columnVisibility[columnCode];
  }

  /**
   * Установить видимость колонки
   *
   * @param {string} columnCode - Код колонки
   * @param {boolean} isVisible - Видимость
   */
  function setColumnVisibility(columnCode, isVisible) {
    if (config.columnVisibility[columnCode]) {
      config.columnVisibility[columnCode].visible = isVisible;
      console.log('Видимость колонки обновлена:', columnCode, '=', isVisible);
    }
  }

  /**
   * Установить текущую группу для контекстных настроек
   *
   * @param {number} groupId - ID группы
   */
  function setCurrentGroupId(groupId) {
    config.currentGroupId = groupId;
  }

  /**
   * Получить текущую группу
   *
   * @returns {number|null} ID группы или null
   */
  function getCurrentGroupId() {
    return config.currentGroupId;
  }

  /**
   * Сбросить настройки видимости к значениям по умолчанию
   */
  function resetColumnVisibility() {
    config.columnVisibility = JSON.parse(JSON.stringify(DEFAULT_COLUMN_VISIBILITY));
    console.log('Настройки видимости сброшены');
  }

  /**
   * Получить базовые колонки
   *
   * @returns {Array} Массив кодов базовых колонок
   */
  function getBaseColumns() {
    return BASE_COLUMNS.slice();
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    getConfig: getConfig,
    getConfigValue: getConfigValue,
    setConfigValue: setConfigValue,
    getColumnVisibility: getColumnVisibility,
    getColumnVisibilitySetting: getColumnVisibilitySetting,
    setColumnVisibility: setColumnVisibility,
    setCurrentGroupId: setCurrentGroupId,
    getCurrentGroupId: getCurrentGroupId,
    resetColumnVisibility: resetColumnVisibility,
    getBaseColumns: getBaseColumns
  };
})();
