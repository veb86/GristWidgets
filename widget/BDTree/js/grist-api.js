/**
 * Модуль для работы с Grist API
 *
 * Этот модуль отвечает за взаимодействие с Grist API,
 * включая получение данных и запись в таблицу SYSTEM.
 *
 * @module GristApiModule
 */

var GristApiModule = (function() {
  'use strict';

  // ========================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ========================================

  var currentAccessLevel = 'full';
  var deviceGroupsData = [];
  var systemParamsData = [];
  var dataReadyCallback = null;
  var dataLoaded = {
    deviceGroups: false,
    systemParams: false
  };

  // ========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================

  /**
   * Преобразовать данные таблицы в массив объектов
   * @param {Object} tableData - Данные таблицы из Grist
   * @returns {Array} Массив объектов
   */
  function transformTableData(tableData) {
    if (!tableData || !tableData.id || !Array.isArray(tableData.id)) {
      return [];
    }

    var columns = Object.keys(tableData).filter(function(key) {
      return key !== 'id';
    });

    var records = [];
    for (var i = 0; i < tableData.id.length; i++) {
      var record = { id: tableData.id[i] };
      columns.forEach(function(col) {
        record[col] = tableData[col][i];
      });
      records.push(record);
    }

    return records;
  }

  /**
   * Проверить готовность всех данных
   */
  function checkDataReady() {
    if (dataReadyCallback &&
        dataLoaded.deviceGroups &&
        dataLoaded.systemParams) {
      console.log('Все данные загружены');
      dataReadyCallback();
    }
  }

  // ========================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ========================================

  /**
   * Инициализировать Grist API
   * @param {Function} onReadyCallback - Callback когда все данные загружены
   */
  function initializeGrist(onReadyCallback) {
    dataReadyCallback = onReadyCallback;

    // Инициализируем Grist с минимальными настройками
    // Важно: не передавать функции которые нельзя клонировать
    grist.ready({
      requiredAccess: 'full'
    });

    currentAccessLevel = 'full';
    console.log('Grist API инициализирован');

    // Загружаем все таблицы через docApi
    loadAllTables();
  }

  /**
   * Загрузить все таблицы через docApi
   */
  async function loadAllTables() {
    console.log('Загрузка таблиц через docApi.fetchTable...');

    try {
      // Загружаем все таблицы параллельно
      var promises = [
        loadTableWithTransform('Device_groups', function(data) {
          deviceGroupsData = data;
          dataLoaded.deviceGroups = true;
          console.log('Device_groups:', data.length, 'записей');
        }),
        loadTableWithTransform('SYSTEM', function(data) {
          systemParamsData = data;
          dataLoaded.systemParams = true;
          console.log('SYSTEM:', data.length, 'записей');
        })
      ];

      await Promise.all(promises);

      console.log('Состояние загрузки:', dataLoaded);
      checkDataReady();

    } catch (error) {
      console.error('Ошибка загрузки таблиц:', error);
      checkDataReady();
    }
  }

  /**
   * Загрузить таблицу и преобразовать данные
   * @param {string} tableName - Имя таблицы
   * @param {Function} callback - Callback с преобразованными данными
   */
  async function loadTableWithTransform(tableName, callback) {
    try {
      console.log('[GristApi] Загрузка таблицы:', tableName);
      var data = await grist.docApi.fetchTable(tableName);
      var transformed = transformTableData(data);
      console.log('[GristApi] Таблица ' + tableName + ' загружена:', transformed.length + ' записей');
      callback(transformed);
    } catch (error) {
      console.error('[GristApi] Ошибка загрузки таблицы ' + tableName + ':', error.message);
      callback([]);
    }
  }

  /**
   * Получить данные групп устройств
   * @returns {Array} Массив групп
   */
  function getDeviceGroups() {
    return deviceGroupsData;
  }

  /**
   * Получить данные параметров SYSTEM
   * @returns {Array} Массив параметров
   */
  function getSystemParams() {
    return systemParamsData;
  }

  /**
   * Получить значение параметра из таблицы SYSTEM
   * @param {Array} systemRecords - Записи таблицы SYSTEM
   * @param {string} paramName - Имя параметра
   * @returns {*} Значение параметра или null
   */
  function getSystemParamValue(systemRecords, paramName) {
    if (!systemRecords || !Array.isArray(systemRecords)) {
      return null;
    }

    var record = systemRecords.find(function(r) {
      return r.param === paramName;
    });

    return record ? record.value : null;
  }

  /**
   * Получить ID записи SYSTEM по параметру
   * @param {Array} systemRecords - Записи таблицы SYSTEM
   * @param {string} paramName - Имя параметра
   * @returns {number|null} ID записи или null
   */
  function getSystemParamId(systemRecords, paramName) {
    if (!systemRecords || !Array.isArray(systemRecords)) {
      return null;
    }

    var record = systemRecords.find(function(r) {
      return r.param === paramName;
    });

    return record ? record.id : null;
  }

  /**
   * Обновить значение параметра в SYSTEM
   * @param {number} recordId - ID записи для обновления
   * @param {string} value - Новое значение
   * @returns {Promise} Результат обновления
   */
  async function updateSystemParam(recordId, value) {
    try {
      console.log('[GristApi] Обновление SYSTEM:', { id: recordId, value: value });

      var result = await grist.docApi.applyUserActions([
        ['UpdateRecord', 'SYSTEM', recordId, { value: String(value) }]
      ]);

      console.log('[GristApi] SYSTEM обновлён:', result);
      return result;
    } catch (error) {
      console.error('[GristApi] Ошибка обновления SYSTEM:', error);
      throw error;
    }
  }

  /**
   * Добавить запись в SYSTEM
   * @param {string} param - Имя параметра
   * @param {string} value - Значение параметра
   * @returns {Promise} Результат добавления
   */
  async function addSystemParam(param, value) {
    try {
      console.log('[GristApi] Добавление в SYSTEM:', { param: param, value: value });

      var result = await grist.docApi.applyUserActions([
        ['AddRecord', 'SYSTEM', null, { param: param, value: String(value) }]
      ]);

      console.log('[GristApi] Запись добавлена:', result);
      return result;
    } catch (error) {
      console.error('[GristApi] Ошибка добавления в SYSTEM:', error);
      throw error;
    }
  }

  /**
   * Установить selectedGroupID в SYSTEM
   * @param {number} groupId - ID выбранной группы
   * @returns {Promise} Результат операции
   */
  async function setSelectedGroupId(groupId) {
    var existingId = getSystemParamId(systemParamsData, 'selectedGroupID');

    if (existingId !== null) {
      return updateSystemParam(existingId, groupId);
    } else {
      return addSystemParam('selectedGroupID', groupId);
    }
  }

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeGrist: initializeGrist,
    getDeviceGroups: getDeviceGroups,
    getSystemParams: getSystemParams,
    transformTableData: transformTableData,
    getSystemParamValue: getSystemParamValue,
    getSystemParamId: getSystemParamId,
    updateSystemParam: updateSystemParam,
    addSystemParam: addSystemParam,
    setSelectedGroupId: setSelectedGroupId
  };
})();
