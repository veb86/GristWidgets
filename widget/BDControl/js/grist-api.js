/**
 * Модуль для работы с Grist API
 *
 * Этот модуль отвечает за взаимодействие с Grist API,
 * включая получение данных через docApi.fetchTable.
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
  var devicesData = [];
  var systemParamsData = [];
  var dataReadyCallback = null;
  var dataLoaded = {
    deviceGroups: false,
    devices: false,
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
        dataLoaded.devices &&
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

    grist.ready({
      requiredAccess: 'full',
      onEditOptions: function(options) {
        console.log('Options changed:', options);
      },
      onAccessLevel: function(level) {
        currentAccessLevel = level;
        console.log('Access level set to:', level);
      }
    });

    currentAccessLevel = 'full';

    // Загружаем все таблицы через docApi
    loadAllTables();
  }

  /**
   * Загрузить все таблицы через docApi
   */
  async function loadAllTables() {
    console.log('Загрузка таблиц через docApi.fetchTable...');

    try {
      // Загружаем все три таблицы параллельно
      // Имена таблиц должны точно совпадать с именами в Grist (чувствительно к регистру!)
      var promises = [
        loadTableWithTransform('Device_groups', function(data) {
          deviceGroupsData = data;
          dataLoaded.deviceGroups = true;
          console.log('Device_groups:', data.length, 'записей');
        }),
        loadTableWithTransform('Device', function(data) {
          devicesData = data;
          dataLoaded.devices = true;
          console.log('Device:', data.length, 'записей');
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
      // Даже если есть ошибки, пробуем отрисовать с тем что есть
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
   * Получить данные устройств
   * @returns {Array} Массив устройств
   */
  function getDevices() {
    return devicesData;
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

  // ========================================
  // ЭКСПОРТ ПУБЛИЧНОГО API
  // ========================================

  return {
    initializeGrist: initializeGrist,
    getDeviceGroups: getDeviceGroups,
    getDevices: getDevices,
    getSystemParams: getSystemParams,
    transformTableData: transformTableData,
    getSystemParamValue: getSystemParamValue
  };
})();
