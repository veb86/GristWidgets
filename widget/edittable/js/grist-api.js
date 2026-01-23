/**
 * Модуль взаимодействия с Grist API для редактируемой таблицы
 *
 * Этот модуль инкапсулирует всю логику взаимодействия с Grist,
 * включая получение списка таблиц, загрузку данных и сохранение изменений.
 *
 * @module GristAPIModule
 */

var GristAPIModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var isInitialized = false;
  var availableTables = []; // Список доступных таблиц
  var currentTableData = null; // Текущие данные таблицы

  // ========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ========================================

  /**
   * Инициализировать подключение к Grist API
   *
   * Должна быть вызвана перед использованием других методов модуля.
   * Регистрирует виджет в Grist и запрашивает необходимые права доступа.
   *
   * @returns {Promise<void>}
   */
  function initialize() {
    return new Promise(function(resolve, reject) {
      try {
        if (typeof grist === 'undefined') {
          reject(new Error('Grist API не загружен'));
          return;
        }

        // Регистрация виджета с необходимыми правами доступа
        grist.ready({
          requiredAccess: 'full', // Полный доступ для чтения и записи
          columns: []
        });

        isInitialized = true;
        console.log('Grist API инициализирован');

        // Загружаем список доступных таблиц
        loadAvailableTables().then(function() {
          resolve();
        }).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Проверить, инициализирован ли модуль
   *
   * @returns {boolean} true, если модуль инициализирован
   */
  function checkInitialized() {
    if (!isInitialized) {
      console.warn('Grist API не инициализирован. Вызовите initialize() сначала.');
    }
    return isInitialized;
  }

  // ========================================
  // ЗАГРУЗКА СПИСКА ТАБЛИЦ
  // ========================================

  /**
   * Загрузить список доступных таблиц
   *
   * Получает список всех таблиц в документе Grist.
   *
   * @returns {Promise<Array>} Список таблиц
   */
  function loadAvailableTables() {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    return new Promise(function(resolve, reject) {
      try {
        console.log('Загрузка списка таблиц...');

        // Получаем список таблиц через _grist_Tables
        grist.docApi.fetchTable('_grist_Tables').then(function(tablesData) {
          availableTables = convertTablesDataToList(tablesData);
          console.log('Доступные таблицы:', availableTables);
          resolve(availableTables);
        }).catch(function(error) {
          console.error('Ошибка при загрузке списка таблиц:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Ошибка при попытке получить список таблиц:', error);
        reject(error);
      }
    });
  }

  /**
   * Преобразовать данные таблиц Grist в список объектов
   *
   * @param {Object} tablesData - Данные из _grist_Tables
   * @returns {Array} Список таблиц с id и tableId
   */
  function convertTablesDataToList(tablesData) {
    var tables = [];

    if (tablesData && tablesData.id && Array.isArray(tablesData.id)) {
      for (var i = 0; i < tablesData.id.length; i++) {
        tables.push({
          id: tablesData.id[i],
          tableId: tablesData.tableId[i] || 'Таблица ' + tablesData.id[i]
        });
      }
    }

    return tables;
  }

  /**
   * Получить список доступных таблиц
   *
   * @returns {Array} Список таблиц
   */
  function getAvailableTables() {
    return availableTables;
  }

  // ========================================
  // ЗАГРУЗКА ДАННЫХ ТАБЛИЦЫ
  // ========================================

  /**
   * Загрузить данные выбранной таблицы
   *
   * @param {string} tableId - ID таблицы для загрузки
   * @returns {Promise<Object>} Данные таблицы
   */
  function loadTableData(tableId) {
    if (!checkInitialized()) {
      throw new Error('Grist API не инициализирован');
    }

    if (!tableId) {
      throw new Error('ID таблицы не указан');
    }

    return new Promise(function(resolve, reject) {
      try {
        console.log('Загрузка данных таблицы:', tableId);

        grist.docApi.fetchTable(tableId).then(function(tableData) {
          currentTableData = tableData;
          console.log('Данные таблицы загружены:', tableData);
          resolve(tableData);
        }).catch(function(error) {
          console.error('Ошибка загрузки данных таблицы:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Ошибка при загрузке данных таблицы:', error);
        reject(error);
      }
    });
  }

  /**
   * Получить текущие данные таблицы
   *
   * @returns {Object|null} Текущие данные таблицы
   */
  function getCurrentTableData() {
    return currentTableData;
  }

  // ========================================
  // СОХРАНЕНИЕ ИЗМЕНЕНИЙ
  // ========================================

  /**
   * Сохранить изменения в таблице
   *
   * @param {string} tableId - ID таблицы
   * @param {number} recordId - ID записи
   * @param {Object} changes - Изменения в полях
   * @returns {Promise<void>}
   */
  function saveRecordChanges(tableId, recordId, changes) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    console.log('Сохранение изменений:', tableId, recordId, changes);

    // Используем applyUserActions для обновления записи
    var actions = [
      ['UpdateRecord', tableId, recordId, changes]
    ];

    return grist.docApi.applyUserActions(actions).then(function(result) {
      console.log('Изменения сохранены успешно');
      return result;
    }).catch(function(error) {
      console.error('Ошибка сохранения изменений:', error);
      throw error;
    });
  }

  /**
   * Добавить новую запись
   *
   * @param {string} tableId - ID таблицы
   * @param {Object} fields - Поля новой записи
   * @returns {Promise<void>}
   */
  function addNewRecord(tableId, fields) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    console.log('Добавление новой записи:', tableId, fields);

    var actions = [
      ['AddRecord', tableId, -1, fields]
    ];

    return grist.docApi.applyUserActions(actions).then(function(result) {
      console.log('Новая запись добавлена успешно');
      return result;
    }).catch(function(error) {
      console.error('Ошибка добавления новой записи:', error);
      throw error;
    });
  }

  /**
   * Удалить запись
   *
   * @param {string} tableId - ID таблицы
   * @param {number} recordId - ID записи
   * @returns {Promise<void>}
   */
  function deleteRecord(tableId, recordId) {
    if (!checkInitialized()) {
      return Promise.reject(new Error('Grist API не инициализирован'));
    }

    console.log('Удаление записи:', tableId, recordId);

    var actions = [
      ['RemoveRecord', tableId, recordId]
    ];

    return grist.docApi.applyUserActions(actions).then(function(result) {
      console.log('Запись удалена успешно');
      return result;
    }).catch(function(error) {
      console.error('Ошибка удаления записи:', error);
      throw error;
    });
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initialize: initialize,
    loadAvailableTables: loadAvailableTables,
    getAvailableTables: getAvailableTables,
    loadTableData: loadTableData,
    getCurrentTableData: getCurrentTableData,
    saveRecordChanges: saveRecordChanges,
    addNewRecord: addNewRecord,
    deleteRecord: deleteRecord
  };
})();