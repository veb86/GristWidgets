/**
 * Модуль для генерации INSERT_DEV JSON
 * Собирает данные из таблиц SelDevices, SelDevicesSet, SYSTEM, InsertDev
 * и формирует JSON для вставки устройства
 */

const InsertDevGenerator = {
  // Константы для трансформации
  TRANSFORM_CONSTANTS: {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0
  },

  /**
   * Загружает данные из всех необходимых таблиц
   * @returns {Promise<Object>} Объект с данными из всех таблиц
   */
  async loadAllData() {
    console.log('InsertDevGenerator: загрузка данных из таблиц...');
    
    const tables = {};
    
    // Загружаем таблицу SelDevices
    try {
      tables.selDevices = await grist.docApi.fetchTable('SelDevices');
      console.log('InsertDevGenerator: SelDevices загружена,', tables.selDevices.id?.length || 0, 'записей');
    } catch (error) {
      console.warn('InsertDevGenerator: таблица SelDevices не найдена:', error.message);
      tables.selDevices = { id: [], dev_id: [], name: [], quantity: [], manufacturer: [], model: [], unit: [] };
    }

    // Загружаем таблицу SelDevicesSet
    try {
      tables.selDevicesSet = await grist.docApi.fetchTable('SelDevicesSet');
      console.log('InsertDevGenerator: SelDevicesSet загружена,', tables.selDevicesSet.id?.length || 0, 'записей');
    } catch (error) {
      console.warn('InsertDevGenerator: таблица SelDevicesSet не найдена:', error.message);
      tables.selDevicesSet = { id: [], namecol: [], view: [], name: [], sort: [], codezcad: [] };
    }

    // Загружаем таблицу SYSTEM
    try {
      tables.system = await grist.docApi.fetchTable('SYSTEM');
      console.log('InsertDevGenerator: SYSTEM загружена,', tables.system.id?.length || 0, 'записей');
    } catch (error) {
      console.warn('InsertDevGenerator: таблица SYSTEM не найдена:', error.message);
      tables.system = { id: [], param: [], value: [], C: [] };
    }

    // Загружаем таблицу InsertDev
    try {
      tables.insertDev = await grist.docApi.fetchTable('InsertDev');
      console.log('InsertDevGenerator: InsertDev загружена,', tables.insertDev.id?.length || 0, 'записей');
    } catch (error) {
      console.warn('InsertDevGenerator: таблица InsertDev не найдена:', error.message);
      tables.insertDev = { id: [], parameter: [], value_float: [], value_int: [], value_string: [], value_boolean: [], unit: [], sort1: [], sort2: [], codezcad: [], type: [], parametr_column: [] };
    }

    return tables;
  },

  /**
   * Получает имя устройства из таблицы SYSTEM (параметр nameUGO)
   * @param {Object} systemData - Данные таблицы SYSTEM
   * @returns {string} Имя устройства
   */
  getDeviceName(systemData) {
    const nameUGORow = systemData.id?.findIndex((_, i) => 
      systemData.param?.[i] === 'nameUGO'
    );
    
    if (nameUGORow !== undefined && nameUGORow >= 0 && systemData.value?.[nameUGORow]) {
      return systemData.value[nameUGORow];
    }
    
    return 'UNKNOWN_DEVICE';
  },

  /**
   * Формирует параметры спецификации для одной строки SelDevices
   * @param {Object} deviceRow - Строка из SelDevices
   * @param {Object} selDevicesSetData - Данные SelDevicesSet
   * @param {number} rowIndex - Индекс строки (для формирования VSPECIFICATION{N})
   * @returns {Array<Array<string>>} Массив параметров [["PARAM1", "value1"], ...]
   */
  buildSpecificationParams(deviceRow, selDevicesSetData, rowIndex) {
    const params = [];
    const prefix = `VSPECIFICATION${rowIndex}_`;
    
    // Проходим по всем строкам SelDevicesSet
    const setRows = selDevicesSetData.id || [];
    
    for (let i = 0; i < setRows.length; i++) {
      const codezcad = selDevicesSetData.codezcad?.[i];
      
      if (codezcad && codezcad.trim() !== '') {
        // Формируем кодовое имя параметра
        const paramName = prefix + codezcad;
        
        // Получаем значение из соответствующего столбца SelDevices
        const colName = selDevicesSetData.namecol?.[i];
        let value = '';
        
        if (colName === 'dev_id') {
          value = deviceRow.dev_id || '';
        } else if (colName === 'name') {
          value = deviceRow.name || '';
        } else if (colName === 'quantity') {
          value = deviceRow.quantity || '';
        } else if (colName === 'manufacturer') {
          value = deviceRow.manufacturer || '';
        } else if (colName === 'model') {
          value = deviceRow.model || '';
        } else if (colName === 'unit') {
          value = deviceRow.unit || '';
        }
        
        // Определяем тип значения
        let typedValue = value;
        if (typeof value === 'number') {
          typedValue = `INTEGER_${value}`;
        } else if (typeof value === 'boolean') {
          typedValue = value ? 'BOOLEAN_1' : 'BOOLEAN_0';
        } else if (value === '1' || value === 'true') {
          typedValue = 'BOOLEAN_1';
        } else if (value === '0' || value === 'false') {
          typedValue = 'BOOLEAN_0';
        } else if (/^\d+$/.test(String(value))) {
          typedValue = `INTEGER_${value}`;
        } else {
          typedValue = String(value);
        }
        
        params.push([paramName, typedValue]);
      }
    }
    
    return params;
  },

  /**
   * Получает дополнительные параметры из таблицы InsertDev
   * @param {Object} insertDevData - Данные таблицы InsertDev
   * @returns {Array<Array<string>>} Массив дополнительных параметров
   */
  getInsertDevParams(insertDevData) {
    const params = [];
    const rows = insertDevData.id || [];
    
    for (let i = 0; i < rows.length; i++) {
      const parameter = insertDevData.parameter?.[i];
      const codezcad = insertDevData.codezcad?.[i];
      const type = insertDevData.type?.[i];
      
      if (!parameter || !codezcad) continue;
      
      let value = null;
      
      // Получаем значение в зависимости от типа
      if (type === 'float') {
        const floatValue = insertDevData.value_float?.[i];
        if (floatValue !== null && floatValue !== undefined && floatValue !== '') {
          value = `FLOAT_${floatValue}`;
        }
      } else if (type === 'int') {
        const intValue = insertDevData.value_int?.[i];
        if (intValue !== null && intValue !== undefined && intValue !== '') {
          value = `INTEGER_${intValue}`;
        }
      } else if (type === 'string') {
        const stringValue = insertDevData.value_string?.[i];
        if (stringValue !== null && stringValue !== undefined && stringValue !== '') {
          value = stringValue;
        }
      } else if (type === 'boolean') {
        const boolValue = insertDevData.value_boolean?.[i];
        if (boolValue !== null && boolValue !== undefined) {
          value = boolValue ? 'BOOLEAN_1' : 'BOOLEAN_0';
        }
      }
      
      if (value !== null) {
        params.push([codezcad, value]);
      }
    }
    
    return params;
  },

  /**
   * Генерирует INSERT_DEV JSON для всех устройств из SelDevices
   * @returns {Promise<Array>} Массив JSON объектов INSERT_DEV
   */
  async generateInsertDevJSON() {
    console.log('InsertDevGenerator: начало генерации INSERT_DEV JSON...');
    
    // Загружаем все данные
    const tables = await this.loadAllData();
    
    // Получаем имя устройства из SYSTEM
    const deviceName = this.getDeviceName(tables.system);
    console.log('InsertDevGenerator: имя устройства из SYSTEM:', deviceName);
    
    // Получаем константы трансформации
    const { x, y, scaleX, scaleY, rotate } = this.TRANSFORM_CONSTANTS;
    
    // Собираем ВСЕ параметры спецификаций в один общий массив
    const allSpecParams = [];
    const devices = tables.selDevices.id || [];
    
    for (let i = 0; i < devices.length; i++) {
      const deviceRow = {
        dev_id: tables.selDevices.dev_id?.[i],
        name: tables.selDevices.name?.[i],
        quantity: tables.selDevices.quantity?.[i],
        manufacturer: tables.selDevices.manufacturer?.[i],
        model: tables.selDevices.model?.[i],
        unit: tables.selDevices.unit?.[i]
      };
      
      console.log('InsertDevGenerator: обработка устройства', i + 1, ':', deviceRow);
      
      // Формируем параметры спецификации для этой строки
      // rowIndex начинается с 1
      const specParams = this.buildSpecificationParams(deviceRow, tables.selDevicesSet, i + 1);
      
      // Добавляем параметры этого устройства в общий массив
      allSpecParams.push(...specParams);
    }
    
    // Получаем дополнительные параметры из InsertDev (один раз для всех)
    const insertDevParams = this.getInsertDevParams(tables.insertDev);
    console.log('InsertDevGenerator: дополнительные параметры InsertDev:', insertDevParams.length);
    
    // Объединяем все параметры спецификаций с параметрами InsertDev
    const allParams = [...allSpecParams, ...insertDevParams];
    
    // Формируем ЕДИНУЮ запись INSERT_DEV со всеми параметрами
    const insertDevRecord = [
      deviceName,
      x,
      y,
      scaleX,
      scaleY,
      rotate,
      allParams
    ];
    
    console.log('InsertDevGenerator: сформирована запись INSERT_DEV с', allParams.length, 'параметрами');
    
    return insertDevRecord;
  },

  /**
   * Отправляет INSERT_DEV JSON на сервер ZCAD через /ipc
   * @returns {Promise<Object>} Результат отправки
   */
  async sendInsertDevToServer() {
    try {
      console.log('InsertDevGenerator: отправка INSERT_DEV JSON на сервер...');
      
      const insertDevRecord = await this.generateInsertDevJSON();
      
      if (!insertDevRecord || insertDevRecord.length === 0) {
        throw new Error('Нет данных для отправки. Таблица SelDevices пуста.');
      }
      
      // Формируем команду для IPC
      const commandId = 'insertdev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
      
      const requestBody = {
        id: commandId,
        cmd: 'INSERT_DEV',
        args: insertDevRecord
      };
      
      console.log('InsertDevGenerator: отправка команды:', requestBody);
      
      // Используем текущий origin для отправки
      const url = window.location.origin + '/ipc';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log('InsertDevGenerator: получен ответ:', result);
        
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания ответа от ZCAD');
        }
        
        throw new Error(`Ошибка соединения: ${error.message}`);
      }
    } catch (error) {
      console.error('InsertDevGenerator: ошибка при отправке INSERT_DEV:', error);
      throw error;
    }
  }
};
