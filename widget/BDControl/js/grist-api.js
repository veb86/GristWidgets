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
  var groupCharacteristicsData = [];
  var characteristicsData = [];
  var deviceCharacteristicsData = [];
  var dataReadyCallback = null;
  var dataLoaded = {
    deviceGroups: false,
    devices: false,
    systemParams: false,
    groupCharacteristics: false,
    characteristics: false,
    deviceCharacteristics: false
  };
  var onSystemChangeCallback = null;

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
   * @param {Function} onSystemChange - Callback при изменении SYSTEM
   */
  function initializeGrist(onReadyCallback, onSystemChange) {
    dataReadyCallback = onReadyCallback;
    onSystemChangeCallback = onSystemChange;

    // Инициализируем Grist с минимальными настройками
    // Важно: не передавать функции которые нельзя клонировать
    grist.ready({
      requiredAccess: 'full'
    });

    currentAccessLevel = 'full';
    console.log('Grist API инициализирован');

    // Подписка на изменения через grist.onRecord для текущей таблицы
    // Это работает когда виджет привязан к таблице
    grist.onRecord(function(record, mappings) {
      console.log('Запись изменена:', record, mappings);
      // Проверяем не изменился ли selectedGroupID
      if (onSystemChangeCallback) {
        // Перезагружаем SYSTEM чтобы получить актуальные данные
        loadSystemTable().then(function() {
          onSystemChangeCallback(systemParamsData);
        });
      }
    });

    // Загружаем все таблицы через docApi для первичной инициализации
    loadAllTables();
  }

  /**
   * Загрузить все таблицы через docApi
   */
  async function loadAllTables() {
    console.log('Загрузка таблиц через docApi.fetchTable...');

    try {
      // Загружаем все таблицы параллельно
      // Имена таблиц должны точно совпадать с именами в Grist (чувствительно к регистру!)
      // Обязательные таблицы: Device_groups, Device, SYSTEM
      // Опциональные таблицы: Group_Characteristics, Characteristics, Device_characteristics
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
        }),
        loadTableWithTransform('Group_Characteristics', function(data) {
          groupCharacteristicsData = data;
          dataLoaded.groupCharacteristics = true;
          console.log('Group_Characteristics:', data.length, 'записей');
        }, false), // необязательная
        loadTableWithTransform('Characteristics', function(data) {
          characteristicsData = data;
          dataLoaded.characteristics = true;
          console.log('Characteristics:', data.length, 'записей');
        }, false), // необязательная
        loadTableWithTransform('Device_characteristics', function(data) {
          deviceCharacteristicsData = data;
          dataLoaded.deviceCharacteristics = true;
          console.log('Device_characteristics:', data.length, 'записей');
        }, false) // необязательная
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
   * @param {boolean} required - Обязательная ли таблица (по умолчанию true)
   */
  async function loadTableWithTransform(tableName, callback, required) {
    try {
      console.log('[GristApi] Загрузка таблицы:', tableName);
      var data = await grist.docApi.fetchTable(tableName);
      var transformed = transformTableData(data);
      console.log('[GristApi] Таблица ' + tableName + ' загружена:', transformed.length + ' записей');
      callback(transformed);
    } catch (error) {
      if (required !== false) {
        console.error('[GristApi] Ошибка загрузки таблицы ' + tableName + ':', error.message);
      } else {
        console.warn('[GristApi] Таблица ' + tableName + ' не найдена или пуста:', error.message);
      }
      callback([]);
    }
  }

  /**
   * Загрузить таблицу SYSTEM
   * @returns {Promise<Array>} Данные SYSTEM
   */
  async function loadSystemTable() {
    try {
      console.log('[GristApi] Перезагрузка SYSTEM...');
      var data = await grist.docApi.fetchTable('SYSTEM');
      systemParamsData = transformTableData(data);
      console.log('[GristApi] SYSTEM перезагружена:', systemParamsData.length, 'записей');
      return systemParamsData;
    } catch (error) {
      console.error('[GristApi] Ошибка перезагрузки SYSTEM:', error.message);
      return [];
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
   * Получить данные Group_Characteristics
   * @returns {Array} Массив записей
   */
  function getGroupCharacteristics() {
    return groupCharacteristicsData;
  }

  /**
   * Получить данные Characteristics
   * @returns {Array} Массив характеристик
   */
  function getCharacteristics() {
    return characteristicsData;
  }

  /**
   * Получить данные Device_characteristics
   * @returns {Array} Массив значений характеристик устройств
   */
  function getDeviceCharacteristics() {
    return deviceCharacteristicsData;
  }

  /**
   * Получить характеристики для конкретной группы устройств
   * @param {number} groupId - ID группы устройств
   * @returns {Array} Массив характеристик с настройками видимости
   */
  function getCharacteristicsForGroup(groupId) {
    if (groupId === null || groupId === undefined) {
      return [];
    }

    // Преобразуем groupId к числу для корректного сравнения
    var groupIdNum = parseInt(groupId, 10);

    // Фильтруем Group_Characteristics по group_id
    var groupChars = groupCharacteristicsData.filter(function(gc) {
      var gcGroupId = parseInt(gc.group_id, 10);
      return gcGroupId === groupIdNum;
    });

    // Для каждой характеристики получаем подробную информацию
    return groupChars.map(function(gc) {
      var characteristic = characteristicsData.find(function(c) {
        var cId = parseInt(c.id, 10);
        var gcCharId = parseInt(gc.characteristic_id, 10);
        return cId === gcCharId;
      });

      return {
        id: gc.id,
        characteristic_id: gc.characteristic_id,
        group_id: gc.group_id,
        code: characteristic ? characteristic.code : null,
        name: characteristic ? characteristic.name : null,
        data_type: characteristic ? characteristic.data_type : 'string',
        unit: characteristic ? characteristic.unit : '',
        is_visible: gc.is_visible !== false, // по умолчанию true
        sort_order: gc.sort_order || 0
      };
    }).sort(function(a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }

  /**
   * Получить значение характеристики для устройства
   * @param {number} deviceId - ID устройства
   * @param {number} characteristicId - ID характеристики
   * @returns {*} Значение характеристики или null
   */
  function getCharacteristicValue(deviceId, characteristicId) {
    // Преобразуем к числам для корректного сравнения
    var deviceIdNum = parseInt(deviceId, 10);
    var characteristicIdNum = parseInt(characteristicId, 10);

    var deviceChar = deviceCharacteristicsData.find(function(dc) {
      var dcDeviceId = parseInt(dc.device_id, 10);
      var dcCharId = parseInt(dc.characteristic_id, 10);
      return dcDeviceId === deviceIdNum && dcCharId === characteristicIdNum;
    });

    if (!deviceChar) return null;

    // Получаем тип данных характеристики из Characteristics
    var characteristic = characteristicsData.find(function(c) {
      return parseInt(c.id, 10) === characteristicIdNum;
    });
    
    var dataType = characteristic ? characteristic.data_type : null;

    // Возвращаем значение в зависимости от data_type
    if (dataType === 'float') {
      return deviceChar.value_float !== undefined && deviceChar.value_float !== null 
        ? deviceChar.value_float 
        : null;
    }
    
    if (dataType === 'integer') {
      return deviceChar.value_int !== undefined && deviceChar.value_int !== null 
        ? deviceChar.value_int 
        : null;
    }
    
    if (dataType === 'string') {
      return deviceChar.value_string !== undefined && deviceChar.value_string !== null && deviceChar.value_string !== ''
        ? deviceChar.value_string 
        : null;
    }
    
    if (dataType === 'bool' || dataType === 'boolean') {
      return deviceChar.value_bool !== undefined && deviceChar.value_bool !== null 
        ? deviceChar.value_bool 
        : null;
    }

    // Если data_type не указан, пробуем угадать по приоритету
    if (deviceChar.value_string !== undefined && deviceChar.value_string !== null && deviceChar.value_string !== '') {
      return deviceChar.value_string;
    }
    if (deviceChar.value_float !== undefined && deviceChar.value_float !== null) {
      return deviceChar.value_float;
    }
    if (deviceChar.value_int !== undefined && deviceChar.value_int !== null) {
      return deviceChar.value_int;
    }
    if (deviceChar.value_bool !== undefined && deviceChar.value_bool !== null) {
      return deviceChar.value_bool;
    }

    return null;
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
    getSystemParamValue: getSystemParamValue,
    setOnSystemChangeCallback: function(callback) {
      onSystemChangeCallback = callback;
    },
    loadSystemTable: loadSystemTable,
    getGroupCharacteristics: getGroupCharacteristics,
    getCharacteristics: getCharacteristics,
    getDeviceCharacteristics: getDeviceCharacteristics,
    getCharacteristicsForGroup: getCharacteristicsForGroup,
    getCharacteristicValue: getCharacteristicValue
  };
})();
