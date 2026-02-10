/**
 * Модуль для работы с данными Grist
 * Отвечает за загрузку и обновление данных в таблице
 */

const DataModule = {
  /**
   * Устанавливает имя таблицы для использования
   * @param {string} tableName - Название таблицы
   */
  setTableName(tableName) {
    CONFIG.TABLE_NAME = tableName;
    console.log(`Имя таблицы установлено в: ${tableName}`);
  },

  /**
   * Получает список доступных таблиц
   * @returns {Promise<Array<string>>} Массив названий таблиц
   */
  async getAvailableTables() {
    try {
      const tables = await grist.docApi.listTables();
      return tables;
    } catch (error) {
      console.error('Ошибка при получении списка таблиц:', error);
      throw new Error('Не удалось получить список доступных таблиц');
    }
  },

  /**
   * Проверяет существование таблицы
   * @param {string} tableName - Название таблицы для проверки
   * @returns {Promise<boolean>} true если таблица существует
   */
  async tableExists(tableName) {
    try {
      const tables = await this.getAvailableTables();
      return tables.includes(tableName);
    } catch (error) {
      console.error('Ошибка при проверке существования таблицы:', error);
      return false;
    }
  },

  /**
   * Загружает все данные из таблицы AllDevice
   * @returns {Promise<Object>} Объект с данными таблицы
   */
  async loadAllDevices() {
    try {
      // Проверяем, существует ли таблица
      const tableExists = await this.tableExists(CONFIG.TABLE_NAME);
      if (!tableExists) {
        // Если таблица не существует, выводим все доступные таблицы в консоль
        const availableTables = await this.getAvailableTables();
        console.log('Доступные таблицы в документе Grist:', availableTables);

        // Ищем таблицу, которая может быть заменой для AllDevice
        let foundTable = null;
        for (const table of availableTables) {
          if (table.toLowerCase().includes(CONFIG.TABLE_NAME.toLowerCase()) ||
              table.toLowerCase().replace(/\s/g, '').includes(CONFIG.TABLE_NAME.toLowerCase().replace(/\s/g, ''))) {
            foundTable = table;
            break;
          }
        }

        // Если не нашли точное совпадение по части имени, ищем другие варианты
        if (!foundTable) {
          for (const table of availableTables) {
            if (table.toLowerCase().includes('alldata') ||
                table.toLowerCase().includes('device') ||
                table.toLowerCase().includes('all')) {
              foundTable = table;
              break;
            }
          }
        }

        if (foundTable) {
          console.warn(`Таблица "${CONFIG.TABLE_NAME}" не найдена, используется "${foundTable}" вместо неё.`);
          CONFIG.TABLE_NAME = foundTable; // Обновляем имя таблицы
        } else {
          throw new Error(`Таблица "${CONFIG.TABLE_NAME}" не найдена. Доступные таблицы: ${availableTables.join(', ')}`);
        }
      }

      const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
      return tableData;
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      throw new Error(`Не удалось загрузить данные из таблицы ${CONFIG.TABLE_NAME}: ${error.message}`);
    }
  },

  /**
   * Преобразует данные таблицы в удобный формат
   * @param {Object} tableData - Сырые данные из Grist
   * @returns {Array<Object>} Массив устройств с удобной структурой
   */
  transformTableData(tableData) {
    console.log('transformTableData: начали преобразование данных');
    console.log('transformTableData: структура tableData:', Object.keys(tableData));

    // Проверим, какие колонки действительно существуют в данных
    console.log('transformTableData: проверка существующих колонок:');
    for (const [key, value] of Object.entries(CONFIG.COLUMNS)) {
      const exists = tableData[value] !== undefined;
      console.log(`  ${key} ('${value}'): ${exists ? 'найдена' : 'НЕ НАЙДЕНА'}`);
      if (exists && tableData[value].length > 0) {
        console.log(`    Пример значения: "${tableData[value][0]}"`);
      }
    }

    // Автоматическое определение правильных имен колонок
    const columnMapping = this.autoDetectColumnNames(tableData);
    console.log('transformTableData: автоматически определенные колонки:', columnMapping);

    // Проверим, какие колонки были найдены и какие значения они содержат
    for (const [logicalName, actualName] of Object.entries(columnMapping)) {
      if (actualName && tableData[actualName]) {
        console.log(`transformTableData: колонка ${logicalName} -> ${actualName}, пример значения: "${tableData[actualName][0]}"`);
      } else {
        console.log(`transformTableData: колонка ${logicalName} -> НЕ НАЙДЕНА`);
      }
    }

    const devices = [];
    const rowCount = tableData.id ? tableData.id.length : 0;
    console.log(`transformTableData: найдено ${rowCount} записей`);

    for (let i = 0; i < rowCount; i++) {
      const device = {
        rowId: tableData.id[i],
        deviceName: tableData[columnMapping.deviceName]?.[i] || '',
        parentId: tableData[columnMapping.parentId]?.[i] || null,
        canBeHead: tableData[columnMapping.canBeHead]?.[i] || false,
        onlyGUpath: tableData[columnMapping.onlyGUpath]?.[i] || '',
        fullpath: tableData[columnMapping.fullpath]?.[i] || '',
        headDeviceName: tableData[columnMapping.headDeviceName]?.[i] || '',
        ngHeadDevice: tableData[columnMapping.ngHeadDevice]?.[i] || '',
        nmoBaseName: tableData[columnMapping.nmoBaseName]?.[i] || '',
        level1: tableData[columnMapping.level1]?.[i] || '',
        level2: tableData[columnMapping.level2]?.[i] || '',
        level3: tableData[columnMapping.level3]?.[i] || '',
        power: tableData[columnMapping.power]?.[i] || 0
      };

      if (i < 5) { // Логируем только первые 5 устройств для отладки
        console.log(`transformTableData: устройство ${i+1}:`, device);
      }

      devices.push(device);
    }

    console.log(`transformTableData: завершено преобразование, создано ${devices.length} устройств`);
    return devices;
  },

  /**
   * Автоматически определяет правильные имена колонок в таблице
   * @param {Object} tableData - Сырые данные из Grist
   * @returns {Object} Карта соответствия типов колонок их реальным именам
   */
  autoDetectColumnNames(tableData) {
    const columnNames = Object.keys(tableData);
    const mapping = {};

    // Поиск колонки с названием устройства
    const deviceNameVariants = ['deviceName', 'name', 'device', 'DeviceName', 'NAME', 'Device', 'realnamedev', 'RealNameDev', 'realNameDev'];
    mapping.deviceName = this.findBestMatch(columnNames, deviceNameVariants);

    // Поиск колонки с родительским ID
    const parentIdVariants = ['parentId', 'ParentId', 'parent_id', 'parentID', 'Parent_ID', 'parent'];
    mapping.parentId = this.findBestMatch(columnNames, parentIdVariants);

    // Поиск колонки с флагом возможности быть головным
    const canBeHeadVariants = ['icanbeheadunit', 'canBeHead', 'can_be_head', 'CanBeHead', 'isHead', 'IsHead'];
    mapping.canBeHead = this.findBestMatch(columnNames, canBeHeadVariants);

    // Поиск колонки с путем только через ГУ
    const onlyGUpathVariants = ['onlyGUpath', 'onlygu', 'onlyGU', 'OnlyGUpath', 'only_Gu_Path', 'onlyGUPath'];
    mapping.onlyGUpath = this.findBestMatch(columnNames, onlyGUpathVariants);

    // Поиск колонки с полным путем
    const fullpathVariants = ['fullpath', 'full_path', 'Fullpath', 'FullPath', 'path', 'Path'];
    mapping.fullpath = this.findBestMatch(columnNames, fullpathVariants);

    // Поиск колонки с именем головного устройства
    const headDeviceNameVariants = ['HeadDeviceName', 'headDeviceName', 'head_device_name', 'Head_Device_Name', 'headDevice', 'HeadDeviceName'];
    mapping.headDeviceName = this.findBestMatch(columnNames, headDeviceNameVariants);

    // Поиск колонки с NG головным устройством
    const ngHeadDeviceVariants = ['NGHeadDevice', 'ngHeadDevice', 'ng_head_device', 'NG_Head_Device', 'nghead', 'NGHeadDevice'];
    mapping.ngHeadDevice = this.findBestMatch(columnNames, ngHeadDeviceVariants);

    // Поиск колонки с базовым именем НМО
    const nmoBaseNameVariants = ['NMO_BaseName', 'nmoBaseName', 'nmo_base_name', 'NMOBaseName', 'nmobase', 'NMO_BaseName'];
    mapping.nmoBaseName = this.findBestMatch(columnNames, nmoBaseNameVariants);

    // Поиск колонки с мощностью
    const powerVariants = ['Power', 'power', 'POWER', 'Мощность', 'мощность', 'Power_', 'Power_'];
    mapping.power = this.findBestMatch(columnNames, powerVariants);

    // Поиск колонок уровней
    const level1Variants = ['1level', 'level1', 'Level1', 'level_1', 'Level_1', 'first_level', 'level_1_', 'Level1_'];
    mapping.level1 = this.findBestMatch(columnNames, level1Variants);

    const level2Variants = ['2level', 'level2', 'Level2', 'level_2', 'Level_2', 'second_level', 'level_2_', 'Level2_'];
    mapping.level2 = this.findBestMatch(columnNames, level2Variants);

    const level3Variants = ['3level', 'level3', 'Level3', 'level_3', 'Level_3', 'third_level', 'level_3_', 'Level3_'];
    mapping.level3 = this.findBestMatch(columnNames, level3Variants);

    // Проверяем, все ли колонки были найдены, и если нет - используем резервный поиск
    if (!mapping.deviceName) {
      mapping.deviceName = this.findFallbackColumn(tableData, 'deviceName');
    }
    if (!mapping.parentId) {
      mapping.parentId = this.findFallbackColumn(tableData, 'parentId');
    }
    if (!mapping.canBeHead) {
      mapping.canBeHead = this.findFallbackColumn(tableData, 'canBeHead');
    }

    return mapping;
  },

  /**
   * Находит лучшее совпадение для колонки среди возможных вариантов
   * @param {Array<string>} availableColumns - Доступные колонки
   * @param {Array<string>} variants - Возможные варианты названий
   * @returns {string|undefined} Найденное имя колонки или undefined
   */
  findBestMatch(availableColumns, variants) {
    // Сначала ищем точное совпадение
    for (const variant of variants) {
      if (availableColumns.includes(variant)) {
        return variant;
      }
    }

    // Затем ищем частичное совпадение (без учета регистра)
    for (const variant of variants) {
      const lowerVariant = variant.toLowerCase();
      const match = availableColumns.find(col => col.toLowerCase() === lowerVariant);
      if (match) {
        return match;
      }
    }

    // Если ничего не найдено, возвращаем undefined
    return undefined;
  },

  /**
   * Находит наиболее подходящую колонку для типа данных, если точные совпадения не найдены
   * @param {Object} tableData - Данные таблицы
   * @param {string} columnType - Тип колонки для поиска
   * @returns {string|undefined} Найденное имя колонки или undefined
   */
  findFallbackColumn(tableData, columnType) {
    const columnNames = Object.keys(tableData).filter(name => name !== 'id' && name !== 'manualSort'); // Исключаем служебные колонки

    for (const colName of columnNames) {
      const sampleValue = tableData[colName][0]; // Берем первый элемент для проверки

      switch(columnType) {
        case 'deviceName':
          // Ищем колонку с текстовыми значениями, содержащими буквы (включая кириллицу)
          if (typeof sampleValue === 'string' && sampleValue.trim() !== '' &&
              (/[a-zA-Zа-яА-ЯЁё]/.test(sampleValue) || sampleValue.includes(' '))) {
            return colName;
          }
          break;
        case 'parentId':
          // Ищем колонку с числовыми значениями или null/undefined
          if (typeof sampleValue === 'number' || sampleValue === null || sampleValue === undefined) {
            return colName;
          }
          break;
        case 'canBeHead':
          // Ищем колонку с булевыми значениями или числами 0/1
          if (typeof sampleValue === 'boolean' || (typeof sampleValue === 'number' && [0, 1].includes(sampleValue))) {
            return colName;
          }
          break;
      }
    }

    return undefined;
  },

  /**
   * Обновляет пути для устройства в таблице
   * @param {number} rowId - ID записи в таблице
   * @param {string} onlyGUpath - Путь через головные устройства
   * @param {string} fullpath - Полный путь
   * @returns {Promise<void>}
   */
  async updateDevicePaths(rowId, onlyGUpath, fullpath) {
    // Получаем текущие данные таблицы, чтобы определить правильные имена колонок
    const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
    const columnMapping = this.autoDetectColumnNames(tableData);

    try {
      const updates = {};
      updates[columnMapping.onlyGUpath || CONFIG.COLUMNS.ONLY_GU_PATH] = onlyGUpath;
      updates[columnMapping.fullpath || CONFIG.COLUMNS.FULL_PATH] = fullpath;

      await grist.docApi.applyUserActions([
        ['UpdateRecord', CONFIG.TABLE_NAME, rowId, updates]
      ]);
    } catch (error) {
      console.error(`Ошибка при обновлении путей для rowId ${rowId}:`, error);
      throw error;
    }
  },

  /**
   * Обновляет пути для нескольких устройств пакетом
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async updateDevicePathsBatch(updates) {
    console.log(`updateDevicePathsBatch: отправка ${updates.length} обновлений в таблицу ${CONFIG.TABLE_NAME}`);

    // Получаем текущие данные таблицы, чтобы определить правильные имена колонок
    const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
    const columnMapping = this.autoDetectColumnNames(tableData);

    try {
      const actions = updates.map(update => {
        console.log(`updateDevicePathsBatch: подготовка обновления для rowId ${update.rowId}: onlyGUpath="${update.onlyGUpath}", fullpath="${update.fullpath}"`);
        return [
          'UpdateRecord',
          CONFIG.TABLE_NAME,
          update.rowId,
          {
            [columnMapping.onlyGUpath || CONFIG.COLUMNS.ONLY_GU_PATH]: update.onlyGUpath,
            [columnMapping.fullpath || CONFIG.COLUMNS.FULL_PATH]: update.fullpath
          }
        ];
      });

      console.log(`updateDevicePathsBatch: выполнение ${actions.length} действий обновления`);
      await grist.docApi.applyUserActions(actions);
      console.log(`updateDevicePathsBatch: успешно выполнено обновление ${updates.length} записей`);
    } catch (error) {
      console.error('Ошибка при пакетном обновлении путей:', error);
      throw error;
    }
  },

  /**
   * Обновляет уровни групп для нескольких устройств пакетом
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async updateDeviceGroupsBatch(updates) {
    // Получаем текущие данные таблицы, чтобы определить правильные имена колонок
    const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
    const columnMapping = this.autoDetectColumnNames(tableData);

    try {
      const actions = updates.map(update => {
        // Создаем объект обновления только для существующих колонок
        const updateFields = {};

        if (columnMapping.level1) {
          updateFields[columnMapping.level1] = update.level1;
        } else {
          console.warn(`Колонка level1 не найдена в таблице ${CONFIG.TABLE_NAME}`);
        }

        if (columnMapping.level2) {
          updateFields[columnMapping.level2] = update.level2;
        } else {
          console.warn(`Колонка level2 не найдена в таблице ${CONFIG.TABLE_NAME}`);
        }

        if (columnMapping.level3) {
          updateFields[columnMapping.level3] = update.level3;
        } else {
          console.warn(`Колонка level3 не найдена в таблице ${CONFIG.TABLE_NAME}`);
        }

        // Если нет ни одной колонки для обновления, возвращаем пустое действие
        if (Object.keys(updateFields).length === 0) {
          console.error('Нет подходящих колонок для обновления уровней групп');
          return null;
        }

        return [
          'UpdateRecord',
          CONFIG.TABLE_NAME,
          update.rowId,
          updateFields
        ];
      }).filter(action => action !== null); // Фильтруем null действия

      if (actions.length > 0) {
        await grist.docApi.applyUserActions(actions);
      } else {
        console.warn('Нет действий для обновления уровней групп');
      }
    } catch (error) {
      console.error('Ошибка при пакетном обновлении групп:', error);
      throw error;
    }
  },

  /**
   * Обновляет мощности для нескольких устройств пакетом
   * @param {Array<Object>} updates - Массив обновлений
   * @returns {Promise<void>}
   */
  async updateDevicePowerBatch(updates) {
    // Получаем текущие данные таблицы, чтобы определить правильные имена колонок
    const tableData = await grist.docApi.fetchTable(CONFIG.TABLE_NAME);
    const columnMapping = this.autoDetectColumnNames(tableData);

    try {
      const actions = updates.map(update => {
        // Создаем объект обновления только для существующей колонки мощности
        const updateFields = {};

        if (columnMapping.power) {
          updateFields[columnMapping.power] = update.power;
        } else {
          console.warn(`Колонка power не найдена в таблице ${CONFIG.TABLE_NAME}`);
          return null;
        }

        return [
          'UpdateRecord',
          CONFIG.TABLE_NAME,
          update.rowId,
          updateFields
        ];
      }).filter(action => action !== null); // Фильтруем null действия

      if (actions.length > 0) {
        await grist.docApi.applyUserActions(actions);
      } else {
        console.warn('Нет действий для обновления мощностей');
      }
    } catch (error) {
      console.error('Ошибка при пакетном обновлении мощностей:', error);
      throw error;
    }
  },

  /**
   * Создаёт словарь устройств по ID для быстрого доступа
   * @param {Array<Object>} devices - Массив устройств
   * @returns {Map<number, Object>} Словарь устройств
   */
  createDeviceMap(devices) {
    console.log(`createDeviceMap: создание карты устройств из ${devices.length} элементов`);
    const deviceMap = new Map();

    devices.forEach(device => {
      deviceMap.set(device.rowId, device);
    });

    console.log(`createDeviceMap: карта устройств создана, размер: ${deviceMap.size}`);

    // Выведем несколько примеров для проверки
    const sampleEntries = Array.from(deviceMap.entries()).slice(0, 3);
    sampleEntries.forEach(([key, value]) => {
      console.log(`createDeviceMap: пример записи - ID: ${key}, устройство: "${value.deviceName}", родитель: ${value.parentId}, может быть головным: ${value.canBeHead}`);
    });

    return deviceMap;
  }
};
